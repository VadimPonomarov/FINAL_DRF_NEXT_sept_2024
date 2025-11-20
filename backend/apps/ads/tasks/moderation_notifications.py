"""Celery tasks for manual ad moderation notifications.

This module contains notification-related Celery tasks that are used
by DRF serializers and admin moderation views. It is imported from
``apps.ads.tasks`` so that Celery autodiscovery can register these
tasks correctly.
"""

from __future__ import annotations

import logging
from typing import Optional, Dict, Any

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from pika import ConnectionParameters, BasicProperties
from pika.exceptions import AMQPConnectionError, AMQPChannelError

from core.services.pika_helper import ConnectionFactory
from core.schemas.moderation import (
    ModerationNotificationData,
    UserModerationNotification,
    ManagerModerationNotification,
    ModerationAction,
    ModerationStatus,
    ModerationExchangeConfig,
)


User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_user_moderation_notification(
    self,
    ad_id: int,
    action: str,
    status: str,
    user_id: int,
    reason: Optional[str] = None,
    attempts_count: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
):
    """Send moderation notification to user via RabbitMQ.

    This is a copy of the logic previously implemented in
    ``apps.ads.tasks`` so that it can live inside the ``tasks`` package
    and be imported without ambiguity.
    """
    try:
        logger.info("Sending user moderation notification for ad %s, action: %s", ad_id, action)

        # Получаем данные для HTML шаблона
        user = User.objects.get(id=user_id)
        from ..models import CarAd  # type: ignore

        ad = CarAd.objects.get(id=ad_id)

        # Create notification data с данными для HTML шаблона
        notification_data = ModerationNotificationData(
            ad_id=ad_id,
            action=ModerationAction(action),
            status=ModerationStatus(status),
            user_id=user_id,
            reason=reason,
            attempts_count=attempts_count,
            details={
                **(details or {}),
                # Данные для HTML шаблона email
                "user_email": user.email,
                "ad_title": ad.title,
                "ad_description": (
                    ad.description[:200] + "..." if len(ad.description) > 200 else ad.description
                ),
                "template_name": f"moderation_{action.lower()}.html",
                "ad_url": f"/ads/{ad.id}/",
            },
        )

        # Create user notification
        notification = UserModerationNotification(data=notification_data)

        # Get routing key
        config = ModerationExchangeConfig()
        routing_key = config.get_user_routing_key(ModerationAction(action))

        # Publish to RabbitMQ exchange
        success = _publish_to_exchange(
            exchange=config.USER_NOTIFICATIONS_EXCHANGE,
            routing_key=routing_key,
            message=notification.model_dump_json(),
            priority=5,
        )

        if not success:
            raise Exception("Failed to publish notification to RabbitMQ")

        logger.info("Successfully sent user notification for ad %s", ad_id)
        return {"status": "success", "ad_id": ad_id, "action": action}

    except Exception as exc:  # pragma: no cover - Celery retry path
        logger.error("Error sending user moderation notification: %s", exc)
        # Retry the task
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_manager_moderation_notification(
    self,
    ad_id: int,
    action: str,
    status: str,
    user_id: int,
    reason: Optional[str] = None,
    attempts_count: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
):
    """Send moderation notification to managers via RabbitMQ."""
    try:
        logger.info("Sending manager moderation notification for ad %s, action: %s", ad_id, action)

        notification_data = ModerationNotificationData(
            ad_id=ad_id,
            action=ModerationAction(action),
            status=ModerationStatus(status),
            user_id=user_id,
            reason=reason,
            attempts_count=attempts_count,
            details=details or {},
        )

        notification = ManagerModerationNotification(
            data=notification_data,
            priority=8,  # High priority for managers
        )

        config = ModerationExchangeConfig()
        routing_key = config.get_manager_routing_key(ModerationAction(action))

        success = _publish_to_exchange(
            exchange=config.MANAGER_NOTIFICATIONS_EXCHANGE,
            routing_key=routing_key,
            message=notification.model_dump_json(),
            priority=8,
        )

        if not success:
            raise Exception("Failed to publish notification to RabbitMQ")

        logger.info("Successfully sent manager notification for ad %s", ad_id)
        return {"status": "success", "ad_id": ad_id, "action": action}

    except Exception as exc:  # pragma: no cover - Celery retry path
        logger.error("Error sending manager moderation notification: %s", exc)
        raise self.retry(exc=exc)


@shared_task
def notify_ad_max_attempts_reached(ad_id: int, user_id: int, attempts_count: int):
    """Notify user and managers that max moderation attempts were reached."""
    # Notify user
    user_task = send_user_moderation_notification.delay(
        ad_id=ad_id,
        action="max_attempts_reached",
        status="rejected",
        user_id=user_id,
        reason=f"Досягнуто максимальну кількість спроб редагування ({attempts_count})",
        attempts_count=attempts_count,
    )

    # Notify managers
    manager_task = send_manager_moderation_notification.delay(
        ad_id=ad_id,
        action="max_attempts_reached",
        status="rejected",
        user_id=user_id,
        reason=f"Оголошення потребує перевірки після {attempts_count} невдалих спроб",
        attempts_count=attempts_count,
        details={
            "requires_manual_review": True,
            "max_attempts_reached": True,
        },
    )

    return {
        "user_task_id": user_task.id,
        "manager_task_id": manager_task.id,
    }


@shared_task
def notify_ad_status_changed(ad_id: int, user_id: int, new_status: str, reason: str = ""):
    """Notify user about manual status change by superuser."""
    status_messages = {
        "active": "Ваше оголошення було схвалено модератором",
        "rejected": "Ваше оголошення було відхилено модератором",
        "inactive": "Ваше оголошення було деактивовано",
        "needs_review": "Ваше оголошення потребує додаткової перевірки",
        "draft": "Ваше оголошення переведено в статус чернетки",
    }

    message = status_messages.get(new_status, f"Статус вашого оголошення змінено на {new_status}")
    if reason:
        message += f". Причина: {reason}"

    return send_user_moderation_notification.delay(
        ad_id=ad_id,
        action="manual_status_change",
        status=new_status,
        user_id=user_id,
        reason=message,
        details={
            "manual_moderation": True,
            "new_status": new_status,
            "reason": reason,
        },
    )


@shared_task
def notify_bulk_status_changed(ad_ids: list[int], new_status: str, reason: str = ""):
    """Notify users about bulk status changes."""
    from ..models import CarAd  # type: ignore

    # Get all affected ads with their owners
    ads = CarAd.objects.filter(id__in=ad_ids).select_related("account__user")

    # Group by user to avoid duplicate notifications
    user_ads: Dict[int, list[int]] = {}
    for ad in ads:
        user_id = ad.account.user.id
        user_ads.setdefault(user_id, []).append(ad.id)

    # Send notifications to each user
    task_ids = []
    for user_id, user_ad_ids in user_ads.items():
        if len(user_ad_ids) == 1:
            # Single ad notification
            task = notify_ad_status_changed.delay(
                ad_id=user_ad_ids[0],
                user_id=user_id,
                new_status=new_status,
                reason=reason,
            )
        else:
            # Multiple ads notification
            message = f"Статус {len(user_ad_ids)} ваших оголошень змінено на {new_status}"
            if reason:
                message += f". Причина: {reason}"

            task = send_user_moderation_notification.delay(
                ad_id=user_ad_ids[0],  # Use first ad ID as reference
                action="bulk_status_change",
                status=new_status,
                user_id=user_id,
                reason=message,
                details={
                    "bulk_operation": True,
                    "affected_ads": user_ad_ids,
                    "new_status": new_status,
                    "reason": reason,
                },
            )

        task_ids.append(task.id)

    return {
        "task_ids": task_ids,
        "affected_users": len(user_ads),
        "total_ads": len(ad_ids),
    }


def _publish_to_exchange(
    exchange: str,
    routing_key: str,
    message: str,
    priority: int = 5,
) -> bool:
    """Helper function to publish message to RabbitMQ exchange."""
    max_retries = 3
    connection_params = ConnectionParameters("rabbitmq")

    for attempt in range(max_retries):
        try:
            factory = ConnectionFactory(
                parameters=connection_params,
                queue_name="temp_publish",
            )

            with factory.get_connection() as connection:
                channel = connection.channel()

                # Ensure exchange exists
                channel.exchange_declare(
                    exchange=exchange,
                    exchange_type="topic",
                    durable=True,
                )

                # Publish message
                properties = BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,  # persistent
                    priority=priority,
                )

                channel.basic_publish(
                    exchange=exchange,
                    routing_key=routing_key,
                    body=message.encode("utf-8"),
                    properties=properties,
                )

            logger.info(
                "[ModerationNotifications] Published message to %s with routing_key=%s", exchange, routing_key
            )
            return True

        except (AMQPConnectionError, AMQPChannelError) as exc:  # pragma: no cover - network errors
            logger.error("[ModerationNotifications] Error publishing to exchange (attempt %s/%s): %s", attempt + 1, max_retries, exc)

    logger.error("[ModerationNotifications] Failed to publish message after %s attempts", max_retries)
    return False
