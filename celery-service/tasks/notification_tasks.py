# Notification Tasks for Celery Microservice
# Handles push notifications, SMS, and other notification types

import os
from typing import Dict, List
import httpx
from celery import current_app
from loguru import logger

# =============================================================================
# NOTIFICATION TASKS
# =============================================================================

@current_app.task(bind=True, queue='notifications', max_retries=3)
def send_push_notification_task(self, user_tokens: List[str], title: str, body: str, data: Dict = None):
    """
    Send push notification task
    
    Args:
        user_tokens: List of FCM tokens
        title: Notification title
        body: Notification body
        data: Optional data payload
    """
    try:
        logger.info(f"📱 Sending push notification to {len(user_tokens)} devices")
        
        # Firebase configuration
        fcm_server_key = os.getenv('FCM_SERVER_KEY', '')
        fcm_url = 'https://fcm.googleapis.com/fcm/send'
        
        if not fcm_server_key:
            logger.warning("⚠️ FCM_SERVER_KEY not configured, skipping push notification")
            return {"status": "skipped", "reason": "FCM not configured"}
        
        headers = {
            'Authorization': f'key={fcm_server_key}',
            'Content-Type': 'application/json'
        }
        
        successful_sends = 0
        failed_sends = 0
        
        for token in user_tokens:
            payload = {
                'to': token,
                'notification': {
                    'title': title,
                    'body': body
                }
            }
            
            if data:
                payload['data'] = data
            
            try:
                with httpx.Client() as client:
                    response = client.post(fcm_url, json=payload, headers=headers, timeout=30)
                    
                if response.status_code == 200:
                    successful_sends += 1
                else:
                    failed_sends += 1
                    logger.warning(f"⚠️ Failed to send to token {token[:10]}...")
                    
            except Exception as e:
                failed_sends += 1
                logger.error(f"❌ Error sending to token {token[:10]}...: {e}")
        
        logger.success(f"✅ Push notifications sent: {successful_sends} success, {failed_sends} failed")
        return {
            "status": "completed",
            "successful": successful_sends,
            "failed": failed_sends,
            "total": len(user_tokens)
        }
        
    except Exception as exc:
        logger.error(f"❌ Failed to send push notifications: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='notifications')
def send_sms_task(self, phone_number: str, message: str):
    """
    Send SMS task
    
    Args:
        phone_number: Phone number to send SMS to
        message: SMS message content
    """
    try:
        logger.info(f"📱 Sending SMS to {phone_number}")
        
        # SMS provider configuration (example with Twilio)
        twilio_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        twilio_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        twilio_from = os.getenv('TWILIO_FROM_NUMBER', '')
        
        if not all([twilio_sid, twilio_token, twilio_from]):
            logger.warning("⚠️ Twilio not configured, skipping SMS")
            return {"status": "skipped", "reason": "SMS provider not configured"}
        
        # Here you would integrate with your SMS provider
        # For example, with Twilio:
        # from twilio.rest import Client
        # client = Client(twilio_sid, twilio_token)
        # message = client.messages.create(
        #     body=message,
        #     from_=twilio_from,
        #     to=phone_number
        # )
        
        # For now, just log the SMS
        logger.info(f"📱 SMS would be sent to {phone_number}: {message}")
        
        return {"status": "success", "phone": phone_number, "message": message}
        
    except Exception as exc:
        logger.error(f"❌ Failed to send SMS: {exc}")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='notifications')
def process_notification_queue_task(self, notification_batch: List[Dict]):
    """
    Process a batch of notifications
    
    Args:
        notification_batch: List of notification dictionaries
    """
    try:
        logger.info(f"📬 Processing {len(notification_batch)} notifications")
        
        results = []
        
        for notification in notification_batch:
            notification_type = notification.get('type')
            
            if notification_type == 'email':
                from .email_tasks import send_email_task
                result = send_email_task.delay(
                    notification['to'],
                    notification['subject'],
                    notification['body']
                )
                
            elif notification_type == 'push':
                result = send_push_notification_task.delay(
                    notification['tokens'],
                    notification['title'],
                    notification['body'],
                    notification.get('data')
                )
                
            elif notification_type == 'sms':
                result = send_sms_task.delay(
                    notification['phone'],
                    notification['message']
                )
                
            else:
                logger.warning(f"⚠️ Unknown notification type: {notification_type}")
                continue
            
            results.append({
                'type': notification_type,
                'task_id': result.id
            })
        
        logger.success(f"✅ Queued {len(results)} notification tasks")
        return {"status": "success", "queued": len(results), "tasks": results}
        
    except Exception as exc:
        logger.error(f"❌ Failed to process notification queue: {exc}")
        return {"status": "failed", "error": str(exc)}
