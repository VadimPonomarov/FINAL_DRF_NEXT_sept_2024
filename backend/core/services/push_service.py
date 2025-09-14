"""
Сервис для отправки push уведомлений
"""

import os
import json
import logging
import requests
from typing import Dict, List, Optional, Any
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Сервис для отправки push уведомлений"""
    
    def __init__(self):
        self.firebase_server_key = os.environ.get('FIREBASE_SERVER_KEY', '')
        self.firebase_url = 'https://fcm.googleapis.com/fcm/send'
        self.vapid_public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
        self.vapid_private_key = os.environ.get('VAPID_PRIVATE_KEY', '')
    
    def send_to_device(self, 
                      device_token: str, 
                      title: str, 
                      body: str, 
                      data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Отправка push уведомления на конкретное устройство
        
        Args:
            device_token: FCM токен устройства
            title: Заголовок уведомления
            body: Текст уведомления
            data: Дополнительные данные
        """
        if not self.firebase_server_key:
            logger.warning("⚠️ Firebase Server Key не настроен")
            return {'success': False, 'error': 'Firebase not configured'}
        
        headers = {
            'Authorization': f'key={self.firebase_server_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'to': device_token,
            'notification': {
                'title': title,
                'body': body,
                'icon': '/static/icons/notification-icon.png',
                'click_action': 'FLUTTER_NOTIFICATION_CLICK'
            }
        }
        
        if data:
            payload['data'] = data
        
        try:
            response = requests.post(
                self.firebase_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"✅ Push уведомление отправлено: {device_token[:20]}...")
            return {'success': True, 'result': result}
            
        except Exception as e:
            logger.error(f"❌ Ошибка отправки push уведомления: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_to_multiple_devices(self, 
                               device_tokens: List[str], 
                               title: str, 
                               body: str, 
                               data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Отправка push уведомления на несколько устройств"""
        if not self.firebase_server_key:
            logger.warning("⚠️ Firebase Server Key не настроен")
            return {'success': False, 'error': 'Firebase not configured'}
        
        headers = {
            'Authorization': f'key={self.firebase_server_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'registration_ids': device_tokens,
            'notification': {
                'title': title,
                'body': body,
                'icon': '/static/icons/notification-icon.png'
            }
        }
        
        if data:
            payload['data'] = data
        
        try:
            response = requests.post(
                self.firebase_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"✅ Push уведомления отправлены: {len(device_tokens)} устройств")
            return {'success': True, 'result': result}
            
        except Exception as e:
            logger.error(f"❌ Ошибка массовой отправки push: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_to_topic(self, 
                     topic: str, 
                     title: str, 
                     body: str, 
                     data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Отправка push уведомления по топику"""
        if not self.firebase_server_key:
            logger.warning("⚠️ Firebase Server Key не настроен")
            return {'success': False, 'error': 'Firebase not configured'}
        
        headers = {
            'Authorization': f'key={self.firebase_server_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'to': f'/topics/{topic}',
            'notification': {
                'title': title,
                'body': body,
                'icon': '/static/icons/notification-icon.png'
            }
        }
        
        if data:
            payload['data'] = data
        
        try:
            response = requests.post(
                self.firebase_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"✅ Push уведомление отправлено по топику: {topic}")
            return {'success': True, 'result': result}
            
        except Exception as e:
            logger.error(f"❌ Ошибка отправки push по топику: {e}")
            return {'success': False, 'error': str(e)}


# Celery задачи для асинхронной отправки push уведомлений
@shared_task(bind=True, max_retries=3)
def send_push_notification_async(self, device_token: str, title: str, body: str, data: Dict[str, Any] = None):
    """Асинхронная отправка push уведомления"""
    try:
        push_service = PushNotificationService()
        result = push_service.send_to_device(device_token, title, body, data)
        
        if not result['success']:
            raise Exception(result.get('error', 'Unknown error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Ошибка асинхронной отправки push: {e}")
        if self.request.retries < self.max_retries:
            logger.info(f"🔄 Повторная попытка {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(countdown=60 * (self.request.retries + 1))
        raise


@shared_task(bind=True, max_retries=3)
def send_bulk_push_notification_async(self, device_tokens: List[str], title: str, body: str, data: Dict[str, Any] = None):
    """Асинхронная массовая отправка push уведомлений"""
    try:
        push_service = PushNotificationService()
        result = push_service.send_to_multiple_devices(device_tokens, title, body, data)
        
        if not result['success']:
            raise Exception(result.get('error', 'Unknown error'))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Ошибка массовой отправки push: {e}")
        if self.request.retries < self.max_retries:
            logger.info(f"🔄 Повторная попытка {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(countdown=60 * (self.request.retries + 1))
        raise


# Специализированные функции для push уведомлений
class AutoriaPushNotifications:
    """Специализированные push уведомления для AutoRia"""
    
    @staticmethod
    def send_ad_approved_push(device_token: str, ad_title: str, ad_id: int):
        """Push уведомление об одобрении объявления"""
        data = {
            'type': 'ad_approved',
            'ad_id': str(ad_id),
            'action': 'open_ad'
        }
        send_push_notification_async.delay(
            device_token=device_token,
            title='✅ Объявление одобрено!',
            body=f'Ваше объявление "{ad_title}" успешно опубликовано',
            data=data
        )
    
    @staticmethod
    def send_new_message_push(device_token: str, sender_name: str, ad_title: str):
        """Push уведомление о новом сообщении"""
        data = {
            'type': 'new_message',
            'action': 'open_messages'
        }
        send_push_notification_async.delay(
            device_token=device_token,
            title='💬 Новое сообщение',
            body=f'{sender_name} написал по объявлению "{ad_title}"',
            data=data
        )
    
    @staticmethod
    def send_price_drop_alert_push(device_tokens: List[str], brand: str, model: str, new_price: str):
        """Push уведомление о снижении цены"""
        data = {
            'type': 'price_drop',
            'action': 'open_search'
        }
        send_bulk_push_notification_async.delay(
            device_tokens=device_tokens,
            title='💰 Цена снижена!',
            body=f'{brand} {model} теперь от {new_price}',
            data=data
        )
    
    @staticmethod
    def send_premium_upgrade_push(device_token: str):
        """Push уведомление об обновлении до Premium"""
        data = {
            'type': 'premium_upgrade',
            'action': 'open_premium'
        }
        send_push_notification_async.delay(
            device_token=device_token,
            title='🏆 Добро пожаловать в Premium!',
            body='Теперь вам доступна расширенная аналитика и статистика',
            data=data
        )


# Экспорт основных классов и функций
__all__ = [
    'PushNotificationService',
    'AutoriaPushNotifications',
    'send_push_notification_async',
    'send_bulk_push_notification_async'
]
