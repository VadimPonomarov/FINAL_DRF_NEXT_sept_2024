"""
Celery tasks for ad moderation and notifications.
"""
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
    ModerationExchangeConfig
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
    details: Optional[Dict[str, Any]] = None
):
    """
    Celery task to send moderation notification to user via RabbitMQ.
    
    Args:
        ad_id: ID объявления
        action: Действие модерации (ModerationAction)
        status: Статус объявления (ModerationStatus)
        user_id: ID пользователя
        reason: Причина действия
        attempts_count: Количество попыток
        details: Дополнительные детали
    """
    try:
        logger.info(f"Sending user moderation notification for ad {ad_id}, action: {action}")
        
        # Получаем данные для HTML шаблона
        user = User.objects.get(id=user_id)
        from ..models import CarAd
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
                'user_email': user.email,
                'ad_title': ad.title,
                'ad_description': ad.description[:200] + "..." if len(ad.description) > 200 else ad.description,
                'template_name': f"moderation_{action.lower()}.html",
                'ad_url': f"/ads/{ad.id}/"
            }
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
            priority=5
        )
        
        if not success:
            raise Exception("Failed to publish notification to RabbitMQ")
        
        logger.info(f"Successfully sent user notification for ad {ad_id}")
        return {"status": "success", "ad_id": ad_id, "action": action}
        
    except Exception as exc:
        logger.error(f"Error sending user moderation notification: {exc}")
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
    details: Optional[Dict[str, Any]] = None
):
    """
    Celery task to send moderation notification to managers via RabbitMQ.
    
    Args:
        ad_id: ID объявления
        action: Действие модерации (ModerationAction)
        status: Статус объявления (ModerationStatus)
        user_id: ID пользователя-владельца
        reason: Причина
        attempts_count: Количество попыток
        details: Дополнительные детали
    """
    try:
        logger.info(f"Sending manager moderation notification for ad {ad_id}, action: {action}")
        
        # Create notification data
        notification_data = ModerationNotificationData(
            ad_id=ad_id,
            action=ModerationAction(action),
            status=ModerationStatus(status),
            user_id=user_id,
            reason=reason,
            attempts_count=attempts_count,
            details=details or {}
        )
        
        # Create manager notification
        notification = ManagerModerationNotification(
            data=notification_data,
            priority=8  # High priority for managers
        )
        
        # Get routing key
        config = ModerationExchangeConfig()
        routing_key = config.get_manager_routing_key(ModerationAction(action))
        
        # Publish to RabbitMQ exchange
        success = _publish_to_exchange(
            exchange=config.MANAGER_NOTIFICATIONS_EXCHANGE,
            routing_key=routing_key,
            message=notification.model_dump_json(),
            priority=8
        )
        
        if not success:
            raise Exception("Failed to publish notification to RabbitMQ")
        
        logger.info(f"Successfully sent manager notification for ad {ad_id}")
        return {"status": "success", "ad_id": ad_id, "action": action}
        
    except Exception as exc:
        logger.error(f"Error sending manager moderation notification: {exc}")
        # Retry the task
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def moderate_ad_async(self, ad_id: int):
    """
    Celery task for asynchronous ad moderation.

    This task handles complex moderation cases that couldn't be resolved synchronously:
    - Ads that need review/editing
    - Ads that reached max attempts
    - Fallback for failed sync moderation

    Args:
        ad_id: ID объявления для модерации
    """
    try:
        from .models import CarAd
        from .services.moderation import AdModerationService

        logger.info(f"Starting async moderation for ad {ad_id}")

        # Get ad
        try:
            ad = CarAd.objects.get(id=ad_id)
        except CarAd.DoesNotExist:
            logger.error(f"Ad {ad_id} not found for moderation")
            return {"status": "error", "message": "Ad not found"}

        # Check if ad is already ACTIVE (approved synchronously)
        if ad.status == CarAd.AdStatus.ACTIVE:
            logger.info(f"Ad {ad_id} already ACTIVE, skipping async moderation")
            return {
                "status": "skipped",
                "ad_id": ad_id,
                "message": "Ad already approved synchronously"
            }

        # Moderate ad (for complex cases)
        success, message, details = AdModerationService.moderate_ad(ad)

        logger.info(f"Async moderation completed for ad {ad_id}: {message}")
        return {
            "status": "success" if success else "failed",
            "ad_id": ad_id,
            "message": message,
            "details": details
        }

    except Exception as exc:
        logger.error(f"Error in async moderation for ad {ad_id}: {exc}")
        # Retry the task
        raise self.retry(exc=exc)


def _publish_to_exchange(
    exchange: str,
    routing_key: str,
    message: str,
    priority: int = 5
) -> bool:
    """
    Helper function to publish message to RabbitMQ exchange.
    
    Args:
        exchange: Exchange name
        routing_key: Routing key
        message: Message body (JSON)
        priority: Message priority (1-10)
        
    Returns:
        bool: True if published successfully
    """
    max_retries = 3
    connection_params = ConnectionParameters('rabbitmq')
    
    for attempt in range(max_retries):
        try:
            factory = ConnectionFactory(
                parameters=connection_params,
                queue_name="temp_publish"
            )
            
            with factory.get_connection() as connection:
                channel = connection.channel()
                
                # Ensure exchange exists
                channel.exchange_declare(
                    exchange=exchange,
                    exchange_type='topic',
                    durable=True
                )
                
                # Publish message
                channel.basic_publish(
                    exchange=exchange,
                    routing_key=routing_key,
                    body=message.encode('utf-8'),
                    properties=BasicProperties(
                        delivery_mode=2,  # Persistent
                        priority=min(max(1, priority), 10),
                        content_type='application/json',
                        headers={
                            'notification_type': 'moderation',
                            'routing_key': routing_key,
                            'exchange': exchange
                        }
                    )
                )
                
                logger.info(f"Published to {exchange}:{routing_key}")
                return True
                
        except (AMQPConnectionError, AMQPChannelError) as e:
            logger.warning(f"RabbitMQ error (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                logger.error(f"Failed to publish after {max_retries} attempts")
                return False
        except Exception as e:
            logger.error(f"Unexpected error publishing: {e}")
            return False
    
    return False


# Convenience functions for common notifications
@shared_task
def notify_ad_approved(ad_id: int, user_id: int, action: str = "auto_approved"):
    """Notify user that their ad was approved."""
    return send_user_moderation_notification.delay(
        ad_id=ad_id,
        action=action,
        status="active",
        user_id=user_id,
        reason="Оголошення схвалено та опубліковано на платформі"
    )


@shared_task
def notify_ad_needs_edit(ad_id: int, user_id: int, reason: str, attempts_count: int):
    """Notify user that their ad needs editing."""
    return send_user_moderation_notification.delay(
        ad_id=ad_id,
        action="flagged",
        status="needs_review",
        user_id=user_id,
        reason=reason,
        attempts_count=attempts_count,
        details={
            'remaining_attempts': 3 - attempts_count,
            'max_attempts': 3
        }
    )


@shared_task
def notify_ad_max_attempts_reached(ad_id: int, user_id: int, attempts_count: int):
    """Notify user and managers that max attempts reached."""
    # Notify user
    user_task = send_user_moderation_notification.delay(
        ad_id=ad_id,
        action="max_attempts_reached",
        status="rejected",
        user_id=user_id,
        reason=f"Досягнуто максимальну кількість спроб редагування ({attempts_count})",
        attempts_count=attempts_count
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
            'requires_manual_review': True,
            'max_attempts_reached': True
        }
    )
    
    return {
        'user_task_id': user_task.id,
        'manager_task_id': manager_task.id
    }


@shared_task
def notify_ad_status_changed(ad_id: int, user_id: int, new_status: str, reason: str = ""):
    """Notify user about manual status change by superuser."""
    status_messages = {
        'active': 'Ваше оголошення було схвалено модератором',
        'rejected': 'Ваше оголошення було відхилено модератором',
        'inactive': 'Ваше оголошення було деактивовано',
        'needs_review': 'Ваше оголошення потребує додаткової перевірки',
        'draft': 'Ваше оголошення переведено в статус чернетки'
    }

    message = status_messages.get(new_status, f'Статус вашого оголошення змінено на {new_status}')
    if reason:
        message += f'. Причина: {reason}'

    return send_user_moderation_notification.delay(
        ad_id=ad_id,
        action="manual_status_change",
        status=new_status,
        user_id=user_id,
        reason=message,
        details={
            'manual_moderation': True,
            'new_status': new_status,
            'reason': reason
        }
    )


@shared_task
def notify_bulk_status_changed(ad_ids: list, new_status: str, reason: str = ""):
    """Notify users about bulk status changes."""
    from .models import CarAd

    # Get all affected ads with their owners
    ads = CarAd.objects.filter(id__in=ad_ids).select_related('account__user')

    # Group by user to avoid duplicate notifications
    user_ads = {}
    for ad in ads:
        user_id = ad.account.user.id
        if user_id not in user_ads:
            user_ads[user_id] = []
        user_ads[user_id].append(ad.id)

    # Send notifications to each user
    task_ids = []
    for user_id, user_ad_ids in user_ads.items():
        if len(user_ad_ids) == 1:
            # Single ad notification
            task = notify_ad_status_changed.delay(
                ad_id=user_ad_ids[0],
                user_id=user_id,
                new_status=new_status,
                reason=reason
            )
        else:
            # Multiple ads notification
            message = f'Статус {len(user_ad_ids)} ваших оголошень змінено на {new_status}'
            if reason:
                message += f'. Причина: {reason}'

            task = send_user_moderation_notification.delay(
                ad_id=user_ad_ids[0],  # Use first ad ID as reference
                action="bulk_status_change",
                status=new_status,
                user_id=user_id,
                reason=message,
                details={
                    'bulk_operation': True,
                    'affected_ads': user_ad_ids,
                    'new_status': new_status,
                    'reason': reason
                }
            )

        task_ids.append(task.id)

    return {
        'task_ids': task_ids,
        'affected_users': len(user_ads),
        'total_ads': len(ad_ids)
    }


# Test task for debugging
@shared_task
def test_task():
    """Simple test task to verify Celery is working."""
    logger.info("Test task executed successfully")
    return {
        'status': 'success',
        'message': 'Test task completed',
        'timestamp': timezone.now().isoformat()
    }
