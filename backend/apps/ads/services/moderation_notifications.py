"""
Сервис для отправки уведомлений о модерации через RabbitMQ
"""
import json
import logging
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class ModerationNotificationService:
    """
    Сервис для отправки уведомлений менеджерам о необходимости ручной модерации
    """
    
    @staticmethod
    def send_manual_review_request(ad_id: int, reason: str, attempts: int) -> bool:
        """
        Отправляет запрос на ручную модерацию в RabbitMQ
        
        Args:
            ad_id: ID объявления
            reason: Причина отправки на ручную модерацию
            attempts: Количество попыток автомодерации
            
        Returns:
            bool: True если сообщение отправлено успешно
        """
        try:
            # Импортируем здесь, чтобы избежать циклических импортов
            from core.services.send_email import send_email_via_rabbitmq
            
            # Формируем данные для уведомления
            notification_data = {
                'type': 'manual_moderation_request',
                'ad_id': ad_id,
                'reason': reason,
                'auto_moderation_attempts': attempts,
                'requested_at': timezone.now().isoformat(),
                'priority': 'high' if attempts >= 3 else 'normal',
                'metadata': {
                    'service': 'ads',
                    'action': 'manual_review_required',
                    'max_attempts_reached': attempts >= 3
                }
            }
            
            # Отправляем уведомление менеджерам
            success = send_email_via_rabbitmq(
                to_email='managers@autoria.com',
                subject=f'🔍 Manual Review Required - Ad #{ad_id}',
                template_name='manual_moderation_request',
                context={
                    'ad_id': ad_id,
                    'reason': reason,
                    'attempts': attempts,
                    'admin_url': f'{settings.FRONTEND_URL}/admin/ads/{ad_id}/',
                    'notification_data': notification_data
                },
                priority='high'
            )
            
            if success:
                logger.info(f"✅ Manual review request sent for ad {ad_id} after {attempts} attempts")
            else:
                logger.error(f"❌ Failed to send manual review request for ad {ad_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending manual review request for ad {ad_id}: {str(e)}")
            return False
    
    @staticmethod
    def send_moderation_status_update(ad_id: int, status: str, moderator_id: Optional[int] = None) -> bool:
        """
        Отправляет уведомление об изменении статуса модерации
        
        Args:
            ad_id: ID объявления
            status: Новый статус
            moderator_id: ID модератора (если есть)
            
        Returns:
            bool: True если сообщение отправлено успешно
        """
        try:
            from core.services.send_email import send_email_via_rabbitmq
            
            notification_data = {
                'type': 'moderation_status_update',
                'ad_id': ad_id,
                'status': status,
                'moderator_id': moderator_id,
                'updated_at': timezone.now().isoformat(),
                'metadata': {
                    'service': 'ads',
                    'action': 'status_update'
                }
            }
            
            # Отправляем уведомление автору объявления
            success = send_email_via_rabbitmq(
                to_email='user@autoria.com',  # Будет заменено на реальный email
                subject=f'📢 Ad Status Update - #{ad_id}',
                template_name='moderation_status_update',
                context={
                    'ad_id': ad_id,
                    'status': status,
                    'notification_data': notification_data
                },
                priority='normal'
            )
            
            if success:
                logger.info(f"✅ Status update notification sent for ad {ad_id}: {status}")
            else:
                logger.error(f"❌ Failed to send status update notification for ad {ad_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending status update notification for ad {ad_id}: {str(e)}")
            return False
    
    @staticmethod
    def send_manager_alert(message: str, priority: str = 'normal', metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Отправляет общее уведомление менеджерам
        
        Args:
            message: Текст сообщения
            priority: Приоритет (low, normal, high, critical)
            metadata: Дополнительные данные
            
        Returns:
            bool: True если сообщение отправлено успешно
        """
        try:
            from core.services.send_email import send_email_via_rabbitmq
            
            notification_data = {
                'type': 'manager_alert',
                'message': message,
                'priority': priority,
                'sent_at': timezone.now().isoformat(),
                'metadata': metadata or {}
            }
            
            success = send_email_via_rabbitmq(
                to_email='managers@autoria.com',
                subject=f'🚨 Manager Alert - {priority.upper()}',
                template_name='manager_alert',
                context={
                    'message': message,
                    'priority': priority,
                    'notification_data': notification_data
                },
                priority=priority
            )
            
            if success:
                logger.info(f"✅ Manager alert sent: {message[:50]}...")
            else:
                logger.error(f"❌ Failed to send manager alert: {message[:50]}...")
                
            return success
            
        except Exception as e:
            logger.error(f"❌ Error sending manager alert: {str(e)}")
            return False


# Удобные функции для быстрого использования
def notify_manual_review_required(ad_id: int, reason: str, attempts: int) -> bool:
    """Быстрая функция для отправки запроса на ручную модерацию"""
    return ModerationNotificationService.send_manual_review_request(ad_id, reason, attempts)


def notify_moderation_status_changed(ad_id: int, status: str, moderator_id: Optional[int] = None) -> bool:
    """Быстрая функция для уведомления об изменении статуса"""
    return ModerationNotificationService.send_moderation_status_update(ad_id, status, moderator_id)


def alert_managers(message: str, priority: str = 'normal', **metadata) -> bool:
    """Быстрая функция для отправки уведомления менеджерам"""
    return ModerationNotificationService.send_manager_alert(message, priority, metadata)
