"""
Celery tasks for moderation notifications.
"""
import logging
from typing import Dict, Any, Optional
from celery import shared_task
from django.contrib.auth import get_user_model
from django.template import Template, Context
from django.utils import timezone

from .models import (
    ManagerNotificationSettings,
    ModerationNotification,
    NotificationTemplate,
    NotificationLog,
    NotificationStatus,
    NotificationMethod
)
from core.services.send_email import email_service

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_moderation_email_task(
    self,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None,
    notification_id: int = None,
    priority: int = 5
):
    """
    Celery task to send moderation email via mailing service.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: Pre-rendered HTML content
        text_content: Plain text content (optional)
        notification_id: ID of ModerationNotification for logging
        priority: Email priority (1-10)
    """
    try:
        logger.info(f"📧 Sending moderation email to {to_email}")
        
        # Send email via mailing service
        success = email_service.send_html_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            priority=priority
        )
        
        # Log the result
        if notification_id:
            try:
                notification = ModerationNotification.objects.get(id=notification_id)
                NotificationLog.objects.create(
                    notification=notification,
                    method=NotificationMethod.EMAIL,
                    recipient=to_email,
                    status=NotificationStatus.SENT if success else NotificationStatus.FAILED,
                    error_message="" if success else "Failed to send via mailing service"
                )
            except ModerationNotification.DoesNotExist:
                logger.warning(f"Notification {notification_id} not found for logging")
        
        if success:
            logger.info(f"✅ Successfully sent moderation email to {to_email}")
            return {"status": "success", "recipient": to_email}
        else:
            raise Exception("Failed to send email via mailing service")
            
    except Exception as exc:
        logger.error(f"❌ Error sending moderation email to {to_email}: {exc}")
        
        # Log the failure
        if notification_id:
            try:
                notification = ModerationNotification.objects.get(id=notification_id)
                NotificationLog.objects.create(
                    notification=notification,
                    method=NotificationMethod.EMAIL,
                    recipient=to_email,
                    status=NotificationStatus.FAILED,
                    error_message=str(exc)
                )
            except ModerationNotification.DoesNotExist:
                pass
        
        # Retry the task
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def create_moderation_notification_task(
    self,
    manager_id: int,
    action: str,
    title: str,
    message: str,
    ad_id: int = None,
    user_id: int = None,
    data: Dict[str, Any] = None,
    priority: int = 5
):
    """
    Celery task to create moderation notification in info table.
    
    Args:
        manager_id: ID of manager to notify
        action: Moderation action type
        title: Notification title
        message: Notification message
        ad_id: Related ad ID (optional)
        user_id: Related user ID (optional)
        data: Additional data (optional)
        priority: Notification priority (1-10)
    """
    try:
        logger.info(f"📋 Creating moderation notification for manager {manager_id}")
        
        # Get manager
        try:
            manager = User.objects.get(id=manager_id, is_staff=True, is_active=True)
        except User.DoesNotExist:
            logger.error(f"Manager {manager_id} not found or not active")
            return {"status": "error", "message": "Manager not found"}
        
        # Create notification
        notification = ModerationNotification.objects.create(
            manager=manager,
            action=action,
            title=title,
            message=message,
            ad_id=ad_id,
            user_id=user_id,
            data=data or {},
            priority=priority,
            status=NotificationStatus.PENDING
        )
        
        # Log the creation
        NotificationLog.objects.create(
            notification=notification,
            method=NotificationMethod.INFO_TABLE,
            status=NotificationStatus.SENT
        )
        
        logger.info(f"✅ Created moderation notification {notification.id} for manager {manager_id}")
        return {
            "status": "success",
            "notification_id": notification.id,
            "manager_id": manager_id
        }
        
    except Exception as exc:
        logger.error(f"❌ Error creating moderation notification for manager {manager_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_moderation_notification_task(
    self,
    manager_settings_id: int,
    notification_data: Dict[str, Any]
):
    """
    Celery task to process moderation notification for a specific manager.
    
    This task handles both email and info table notifications based on manager settings.
    
    Args:
        manager_settings_id: ID of ManagerNotificationSettings
        notification_data: Notification data from RabbitMQ
    """
    try:
        logger.info(f"🔄 Processing moderation notification for manager settings {manager_settings_id}")
        
        # Get manager settings
        try:
            manager_settings = ManagerNotificationSettings.objects.select_related('manager').get(
                id=manager_settings_id,
                is_active=True
            )
        except ManagerNotificationSettings.DoesNotExist:
            logger.error(f"Manager settings {manager_settings_id} not found or not active")
            return {"status": "error", "message": "Manager settings not found"}
        
        # Check if manager should be notified for this action
        action = notification_data.get('action')
        if not manager_settings.should_notify_for_action(action):
            logger.info(f"Manager {manager_settings.manager.email} filtered out for action: {action}")
            return {"status": "filtered", "action": action}
        
        results = {}
        
        # Create info table notification (if enabled)
        if manager_settings.info_table_enabled:
            info_result = create_moderation_notification_task.delay(
                manager_id=manager_settings.manager.id,
                action=self._map_action_to_model_choice(action),
                title=self._generate_notification_title(notification_data),
                message=self._generate_notification_message(notification_data),
                ad_id=notification_data.get('ad_id'),
                user_id=notification_data.get('user_id'),
                data=notification_data,
                priority=notification_data.get('priority', 5)
            )
            results['info_table'] = info_result.id
        
        # Send email notification (if enabled)
        if manager_settings.email_enabled:
            email_result = self._send_email_notification(manager_settings, notification_data)
            results['email'] = email_result
        
        logger.info(f"✅ Processed moderation notification for manager {manager_settings.manager.email}")
        return {
            "status": "success",
            "manager_email": manager_settings.manager.email,
            "results": results
        }
        
    except Exception as exc:
        logger.error(f"❌ Error processing moderation notification: {exc}")
        raise self.retry(exc=exc)
    
    def _send_email_notification(self, manager_settings: ManagerNotificationSettings, data: Dict[str, Any]):
        """Send email notification to manager."""
        try:
            # Get email template
            template = self._get_email_template(data.get('action'))
            if not template:
                logger.warning(f"No email template found for action: {data.get('action')}")
                return None
            
            # Prepare template context
            context = self._prepare_email_context(data)
            
            # Render email content
            subject = Template(template.subject_template).render(Context(context))
            html_content = Template(template.html_template).render(Context(context))
            text_content = Template(template.text_template).render(Context(context))
            
            # Send email via Celery task
            recipient_email = manager_settings.get_notification_email()
            email_task = send_moderation_email_task.delay(
                to_email=recipient_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                priority=data.get('priority', 5)
            )
            
            logger.info(f"📧 Queued email notification for {recipient_email}")
            return email_task.id
            
        except Exception as e:
            logger.error(f"Error preparing email notification: {e}")
            return None
    
    def _map_action_to_model_choice(self, action: str) -> str:
        """Map action string to model choice."""
        action_mapping = {
            'max_attempts_reached': 'ad_max_attempts',
            'flagged': 'ad_flagged',
            'needs_review': 'ad_needs_review'
        }
        return action_mapping.get(action, 'ad_needs_review')
    
    def _get_email_template(self, action: str) -> Optional[NotificationTemplate]:
        """Get email template for action."""
        try:
            model_action = self._map_action_to_model_choice(action)
            return NotificationTemplate.objects.get(action=model_action, is_active=True)
        except NotificationTemplate.DoesNotExist:
            return None
    
    def _prepare_email_context(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context for email template rendering."""
        from django.conf import settings
        
        context = {
            'ad_id': data.get('ad_id'),
            'user_id': data.get('user_id'),
            'action': data.get('action'),
            'reason': data.get('reason', ''),
            'attempts_count': data.get('attempts_count', 0),
            'site_name': getattr(settings, 'SITE_NAME', 'Car Sales Platform'),
            'site_url': getattr(settings, 'SITE_URL', ''),
            'admin_url': f"{getattr(settings, 'SITE_URL', '')}/admin/ads/caradmodel/{data.get('ad_id')}/change/",
            'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Add additional data
        context.update(data.get('details', {}))
        
        return context
    
    def _generate_notification_title(self, data: Dict[str, Any]) -> str:
        """Generate title for notification."""
        action = data.get('action')
        ad_id = data.get('ad_id')
        
        if action == 'max_attempts_reached':
            return f"Оголошення #{ad_id} потребує ручної перевірки"
        elif action == 'flagged':
            return f"Оголошення #{ad_id} помічено для перевірки"
        else:
            return f"Дія модерації: {action} - Оголошення #{ad_id}"
    
    def _generate_notification_message(self, data: Dict[str, Any]) -> str:
        """Generate message for notification."""
        action = data.get('action')
        ad_id = data.get('ad_id')
        reason = data.get('reason', '')
        attempts_count = data.get('attempts_count', 0)
        
        if action == 'max_attempts_reached':
            return f"Оголошення #{ad_id} досягло максимальної кількості спроб редагування ({attempts_count}). Потрібна ручна перевірка модератора."
        elif action == 'flagged':
            return f"Оголошення #{ad_id} помічено системою модерації. Причина: {reason}"
        else:
            return f"Оголошення #{ad_id} потребує уваги. Причина: {reason}"
