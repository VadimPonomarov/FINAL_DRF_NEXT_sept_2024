# Email Tasks for Celery Microservice
# Handles all email-related background tasks

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional

from celery import current_app
from loguru import logger
import httpx

# =============================================================================
# EMAIL TASKS
# =============================================================================

@current_app.task(bind=True, queue='email', max_retries=3)
def send_email_task(self, to_email: str, subject: str, body: str, html_body: Optional[str] = None):
    """
    Send email task
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
    """
    try:
        logger.info(f"📧 Sending email to {to_email}: {subject}")
        
        # Email configuration from environment
        smtp_host = os.getenv('SMTP_HOST', 'localhost')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        from_email = os.getenv('FROM_EMAIL', 'noreply@example.com')
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email
        
        # Add plain text part
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            if smtp_user and smtp_password:
                server.starttls()
                server.login(smtp_user, smtp_password)
            
            server.send_message(msg)
        
        logger.success(f"✅ Email sent successfully to {to_email}")
        return {"status": "success", "to": to_email, "subject": subject}
        
    except Exception as exc:
        logger.error(f"❌ Failed to send email to {to_email}: {exc}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"🔄 Retrying email send (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        # Final failure
        logger.error(f"💀 Email send failed permanently after {self.max_retries} retries")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='email')
def send_bulk_email_task(self, email_list: List[Dict[str, str]], subject: str, body: str):
    """
    Send bulk emails task
    
    Args:
        email_list: List of email dictionaries with 'email' and optional 'name'
        subject: Email subject
        body: Email body
    """
    try:
        logger.info(f"📧 Sending bulk email to {len(email_list)} recipients")
        
        results = []
        for email_data in email_list:
            email = email_data.get('email')
            name = email_data.get('name', '')
            
            # Personalize body if name is provided
            personalized_body = body.replace('{{name}}', name) if name else body
            
            # Send individual email
            result = send_email_task.delay(email, subject, personalized_body)
            results.append({
                'email': email,
                'task_id': result.id
            })
        
        logger.success(f"✅ Bulk email tasks queued for {len(email_list)} recipients")
        return {"status": "success", "queued": len(email_list), "tasks": results}
        
    except Exception as exc:
        logger.error(f"❌ Failed to queue bulk emails: {exc}")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='email')
def send_notification_to_backend(self, user_id: int, notification_type: str, data: Dict):
    """
    Send notification to main backend via API
    
    Args:
        user_id: User ID to notify
        notification_type: Type of notification
        data: Notification data
    """
    try:
        backend_url = os.getenv('BACKEND_API_URL', 'http://app:8000')
        api_key = os.getenv('BACKEND_API_KEY', '')
        
        payload = {
            'user_id': user_id,
            'type': notification_type,
            'data': data,
            'source': 'celery-microservice'
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}' if api_key else ''
        }
        
        with httpx.Client() as client:
            response = client.post(
                f"{backend_url}/api/notifications/",
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
        
        logger.success(f"✅ Notification sent to backend for user {user_id}")
        return {"status": "success", "user_id": user_id, "type": notification_type}
        
    except Exception as exc:
        logger.error(f"❌ Failed to send notification to backend: {exc}")
        return {"status": "failed", "error": str(exc)}
