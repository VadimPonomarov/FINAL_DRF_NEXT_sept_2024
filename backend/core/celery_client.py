# Celery Microservice Client
# Client for interacting with autonomous Celery microservice

import os
from typing import Dict, List, Optional, Any
from celery import Celery
from loguru import logger

# =============================================================================
# CELERY CLIENT CONFIGURATION
# =============================================================================

class CeleryClient:
    """Client for interacting with autonomous Celery microservice"""
    
    def __init__(self):
        """Initialize Celery client"""
        self.broker_url = self._get_broker_url()
        self.result_backend = self._get_result_backend()
        
        # Create Celery app instance for sending tasks
        self.app = Celery('celery-client')
        self.app.conf.update(
            broker_url=self.broker_url,
            result_backend=self.result_backend,
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='UTC',
            enable_utc=True,
        )
        
        logger.info(f"🔗 Celery client initialized: {self.broker_url}")
    
    def _get_broker_url(self) -> str:
        """Get broker URL from environment"""
        rabbitmq_host = os.getenv('RABBITMQ_HOST', 'localhost')
        rabbitmq_port = os.getenv('RABBITMQ_PORT', '5672')
        rabbitmq_user = os.getenv('RABBITMQ_USER', 'admin')
        rabbitmq_password = os.getenv('RABBITMQ_PASSWORD', 'admin123')
        
        return f"pyamqp://{rabbitmq_user}:{rabbitmq_password}@{rabbitmq_host}:{rabbitmq_port}//"
    
    def _get_result_backend(self) -> str:
        """Get result backend URL from environment"""
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = os.getenv('REDIS_PORT', '6379')
        redis_db = os.getenv('REDIS_DB', '0')
        
        return f"redis://{redis_host}:{redis_port}/{redis_db}"
    
    # =============================================================================
    # EMAIL TASKS
    # =============================================================================
    
    def send_email(self, to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> str:
        """
        Send email via Celery microservice
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.email_tasks.send_email_task',
                args=[to_email, subject, body, html_body],
                queue='email'
            )
            
            logger.info(f"📧 Email task queued: {result.id} -> {to_email}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue email task: {e}")
            raise
    
    def send_bulk_email(self, email_list: List[Dict[str, str]], subject: str, body: str) -> str:
        """
        Send bulk emails via Celery microservice
        
        Args:
            email_list: List of email dictionaries
            subject: Email subject
            body: Email body
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.email_tasks.send_bulk_email_task',
                args=[email_list, subject, body],
                queue='email'
            )
            
            logger.info(f"📧 Bulk email task queued: {result.id} -> {len(email_list)} recipients")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue bulk email task: {e}")
            raise
    
    # =============================================================================
    # NOTIFICATION TASKS
    # =============================================================================
    
    def send_push_notification(self, user_tokens: List[str], title: str, body: str, data: Dict = None) -> str:
        """
        Send push notification via Celery microservice
        
        Args:
            user_tokens: List of FCM tokens
            title: Notification title
            body: Notification body
            data: Optional data payload
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.notification_tasks.send_push_notification_task',
                args=[user_tokens, title, body, data],
                queue='notifications'
            )
            
            logger.info(f"📱 Push notification task queued: {result.id} -> {len(user_tokens)} devices")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue push notification task: {e}")
            raise
    
    def send_sms(self, phone_number: str, message: str) -> str:
        """
        Send SMS via Celery microservice
        
        Args:
            phone_number: Phone number
            message: SMS message
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.notification_tasks.send_sms_task',
                args=[phone_number, message],
                queue='notifications'
            )
            
            logger.info(f"📱 SMS task queued: {result.id} -> {phone_number}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue SMS task: {e}")
            raise
    
    # =============================================================================
    # DATA PROCESSING TASKS
    # =============================================================================
    
    def process_user_data(self, user_id: int, data_type: str, data: Dict) -> str:
        """
        Process user data via Celery microservice
        
        Args:
            user_id: User ID
            data_type: Type of data to process
            data: Data to process
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.data_processing_tasks.process_user_data_task',
                args=[user_id, data_type, data],
                queue='data_processing'
            )
            
            logger.info(f"🔄 Data processing task queued: {result.id} -> user {user_id}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue data processing task: {e}")
            raise
    
    def generate_report(self, report_type: str, filters: Dict, user_id: int) -> str:
        """
        Generate report via Celery microservice
        
        Args:
            report_type: Type of report
            filters: Report filters
            user_id: User requesting the report
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.data_processing_tasks.generate_report_task',
                args=[report_type, filters, user_id],
                queue='data_processing'
            )
            
            logger.info(f"📊 Report generation task queued: {result.id} -> {report_type}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue report generation task: {e}")
            raise
    
    # =============================================================================
    # CLEANUP TASKS
    # =============================================================================
    
    def cleanup_temp_files(self, max_age_hours: int = 24) -> str:
        """
        Cleanup temporary files via Celery microservice
        
        Args:
            max_age_hours: Maximum age of files to keep
            
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.cleanup_tasks.cleanup_temp_files_task',
                args=[max_age_hours],
                queue='cleanup'
            )
            
            logger.info(f"🧹 Cleanup task queued: {result.id}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue cleanup task: {e}")
            raise
    
    def system_health_check(self) -> str:
        """
        Perform system health check via Celery microservice
        
        Returns:
            Task ID
        """
        try:
            result = self.app.send_task(
                'tasks.cleanup_tasks.system_health_check_task',
                queue='cleanup'
            )
            
            logger.info(f"🏥 Health check task queued: {result.id}")
            return result.id
            
        except Exception as e:
            logger.error(f"❌ Failed to queue health check task: {e}")
            raise
    
    # =============================================================================
    # TASK MANAGEMENT
    # =============================================================================
    
    def get_task_result(self, task_id: str) -> Any:
        """
        Get task result by ID
        
        Args:
            task_id: Task ID
            
        Returns:
            Task result
        """
        try:
            result = self.app.AsyncResult(task_id)
            return result.get(timeout=10)
            
        except Exception as e:
            logger.error(f"❌ Failed to get task result {task_id}: {e}")
            raise
    
    def get_task_status(self, task_id: str) -> str:
        """
        Get task status by ID
        
        Args:
            task_id: Task ID
            
        Returns:
            Task status
        """
        try:
            result = self.app.AsyncResult(task_id)
            return result.status
            
        except Exception as e:
            logger.error(f"❌ Failed to get task status {task_id}: {e}")
            raise
    
    def revoke_task(self, task_id: str) -> bool:
        """
        Revoke/cancel task by ID
        
        Args:
            task_id: Task ID
            
        Returns:
            Success status
        """
        try:
            self.app.control.revoke(task_id, terminate=True)
            logger.info(f"🚫 Task revoked: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to revoke task {task_id}: {e}")
            return False


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

# Create singleton instance
celery_client = CeleryClient()

# Convenience functions
def send_email(to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> str:
    """Send email via Celery microservice"""
    return celery_client.send_email(to_email, subject, body, html_body)

def send_push_notification(user_tokens: List[str], title: str, body: str, data: Dict = None) -> str:
    """Send push notification via Celery microservice"""
    return celery_client.send_push_notification(user_tokens, title, body, data)

def process_user_data(user_id: int, data_type: str, data: Dict) -> str:
    """Process user data via Celery microservice"""
    return celery_client.process_user_data(user_id, data_type, data)
