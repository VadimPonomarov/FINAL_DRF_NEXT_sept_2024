"""
Сервис для интеграции с внешним микросервисом mailing
"""

import os
import json
import logging
import requests
from typing import Dict, List, Optional, Any
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)


class MailingService:
    """Сервис для отправки email через внешний микросервис mailing"""
    
    def __init__(self):
        self.mailing_service_url = os.environ.get('MAILING_SERVICE_URL', 'http://mailing-service:8001')
        self.api_key = os.environ.get('MAILING_API_KEY', 'dev-api-key')
        self.timeout = int(os.environ.get('MAILING_TIMEOUT', '30'))
        
    def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Выполнить запрос к микросервису mailing"""
        url = f"{self.mailing_service_url}/api/v1/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}',
            'X-Service': 'autoria-backend'
        }
        
        try:
            response = requests.post(
                url, 
                json=data, 
                headers=headers, 
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Ошибка отправки email: {e}")
            raise MailingServiceError(f"Failed to send email: {e}")
    
    def send_email(self, 
                   to_email: str, 
                   subject: str, 
                   template: str, 
                   context: Dict[str, Any],
                   priority: str = 'normal') -> Dict[str, Any]:
        """
        Отправить email через микросервис mailing
        
        Args:
            to_email: Email получателя
            subject: Тема письма
            template: Название шаблона
            context: Контекст для шаблона
            priority: Приоритет (low, normal, high)
        """
        data = {
            'to_email': to_email,
            'subject': subject,
            'template': template,
            'context': context,
            'priority': priority,
            'service': 'autoria'
        }
        
        logger.info(f"📧 Отправка email: {to_email} | {subject}")
        return self._make_request('send-email', data)
    
    def send_bulk_email(self, 
                       recipients: List[str], 
                       subject: str, 
                       template: str, 
                       context: Dict[str, Any]) -> Dict[str, Any]:
        """Отправить массовую рассылку"""
        data = {
            'recipients': recipients,
            'subject': subject,
            'template': template,
            'context': context,
            'service': 'autoria'
        }
        
        logger.info(f"📧 Массовая рассылка: {len(recipients)} получателей")
        return self._make_request('send-bulk-email', data)


class MailingServiceError(Exception):
    """Исключение для ошибок микросервиса mailing"""
    pass


# Celery задачи для асинхронной отправки email
@shared_task(bind=True, max_retries=3)
def send_email_async(self, to_email: str, subject: str, template: str, context: Dict[str, Any]):
    """Асинхронная отправка email"""
    try:
        mailing_service = MailingService()
        result = mailing_service.send_email(to_email, subject, template, context)
        logger.info(f"✅ Email отправлен: {to_email}")
        return result
    except Exception as e:
        logger.error(f"❌ Ошибка отправки email: {e}")
        if self.request.retries < self.max_retries:
            logger.info(f"🔄 Повторная попытка {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(countdown=60 * (self.request.retries + 1))
        raise


@shared_task(bind=True, max_retries=3)
def send_bulk_email_async(self, recipients: List[str], subject: str, template: str, context: Dict[str, Any]):
    """Асинхронная массовая рассылка"""
    try:
        mailing_service = MailingService()
        result = mailing_service.send_bulk_email(recipients, subject, template, context)
        logger.info(f"✅ Массовая рассылка отправлена: {len(recipients)} получателей")
        return result
    except Exception as e:
        logger.error(f"❌ Ошибка массовой рассылки: {e}")
        if self.request.retries < self.max_retries:
            logger.info(f"🔄 Повторная попытка {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(countdown=60 * (self.request.retries + 1))
        raise


# Специализированные функции для отправки уведомлений
class NotificationService:
    """Сервис для отправки уведомлений пользователям"""
    
    @staticmethod
    def send_ad_approved_notification(user_email: str, ad_title: str, ad_id: int):
        """Уведомление об одобрении объявления"""
        context = {
            'ad_title': ad_title,
            'ad_id': ad_id,
            'ad_url': f"{settings.FRONTEND_URL}/ads/{ad_id}"
        }
        send_email_async.delay(
            to_email=user_email,
            subject='✅ Ваше объявление одобрено!',
            template='ad_approved',
            context=context
        )
    
    @staticmethod
    def send_ad_rejected_notification(user_email: str, ad_title: str, reason: str):
        """Уведомление об отклонении объявления"""
        context = {
            'ad_title': ad_title,
            'reason': reason,
            'support_url': f"{settings.FRONTEND_URL}/support"
        }
        send_email_async.delay(
            to_email=user_email,
            subject='❌ Ваше объявление отклонено',
            template='ad_rejected',
            context=context
        )
    
    @staticmethod
    def send_ad_needs_review_notification(user_email: str, ad_title: str):
        """Уведомление о необходимости проверки объявления"""
        context = {
            'ad_title': ad_title,
            'edit_url': f"{settings.FRONTEND_URL}/my-ads"
        }
        send_email_async.delay(
            to_email=user_email,
            subject='⏳ Ваше объявление на проверке',
            template='ad_needs_review',
            context=context
        )
    
    @staticmethod
    def send_premium_upgrade_notification(user_email: str, user_name: str):
        """Уведомление об обновлении до Premium"""
        context = {
            'user_name': user_name,
            'premium_features_url': f"{settings.FRONTEND_URL}/premium-features"
        }
        send_email_async.delay(
            to_email=user_email,
            subject='🏆 Добро пожаловать в Premium!',
            template='premium_upgrade',
            context=context
        )
    
    @staticmethod
    def send_new_message_notification(user_email: str, sender_name: str, ad_title: str):
        """Уведомление о новом сообщении"""
        context = {
            'sender_name': sender_name,
            'ad_title': ad_title,
            'messages_url': f"{settings.FRONTEND_URL}/messages"
        }
        send_email_async.delay(
            to_email=user_email,
            subject='💬 Новое сообщение по вашему объявлению',
            template='new_message',
            context=context
        )


# Экспорт основных классов и функций
__all__ = [
    'MailingService',
    'MailingServiceError',
    'NotificationService',
    'send_email_async',
    'send_bulk_email_async'
]
