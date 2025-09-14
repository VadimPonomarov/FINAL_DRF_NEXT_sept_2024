"""
RabbitMQ consumer for processing moderation notifications.
"""
import json
import logging
import time
from typing import Dict, Any, List
import pika
from pika.exceptions import AMQPConnectionError, AMQPChannelError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.template import Template, Context
from django.utils import timezone

from ..models import (
    ManagerNotificationSettings,
    ModerationNotification,
    NotificationTemplate,
    NotificationLog,
    NotificationStatus,
    NotificationMethod
)

User = get_user_model()
logger = logging.getLogger(__name__)


class ModerationNotificationConsumer:
    """
    Consumer for processing moderation notifications from RabbitMQ.
    
    Listens to manager_notifications exchange and processes notifications
    according to manager settings (email, info table, or both).
    """
    
    def __init__(self):
        # Auto-detect environment and set appropriate RabbitMQ host
        rabbitmq_host = self._get_rabbitmq_host()
        rabbitmq_port = getattr(settings, 'RABBITMQ_PORT', 5672)
        rabbitmq_user = getattr(settings, 'RABBITMQ_USER', 'guest')
        rabbitmq_password = getattr(settings, 'RABBITMQ_PASSWORD', 'guest')

        self.connection_params = pika.ConnectionParameters(
            host=rabbitmq_host,
            port=rabbitmq_port,
            credentials=pika.PlainCredentials(rabbitmq_user, rabbitmq_password),
            heartbeat=600,  # 10 minutes
            blocked_connection_timeout=300,  # 5 minutes
        )
        self.connection = None
        self.channel = None
        self.consuming = False
        self.max_retries = 3
        self.retry_delay = 5

        logger.info(f"🐰 RabbitMQ Consumer initialized - connecting to {rabbitmq_host}:{rabbitmq_port}")

    def _get_rabbitmq_host(self):
        """
        Auto-detect RabbitMQ host based on environment.

        Priority:
        1. Service Registry (Redis)
        2. RABBITMQ_HOST environment variable
        3. Django settings RABBITMQ_HOST
        4. Auto-detection based on environment
        """
        import os
        import socket
        from core.services.service_registry import ServiceRegistry

        # 1. Try Service Registry first
        try:
            registry = ServiceRegistry()
            rabbitmq_url = registry.resolve_url('rabbitmq', '')
            if rabbitmq_url and rabbitmq_url.startswith('amqp://'):
                # Extract host from amqp://rabbitmq:5672
                host = rabbitmq_url.split('://')[1].split(':')[0]
                logger.info(f"🔧 Using RabbitMQ host from Service Registry: {host}")
                return host
        except Exception as e:
            logger.debug(f"Service Registry not available for RabbitMQ: {e}")

        # 2. Check environment variable
        env_host = os.getenv('RABBITMQ_HOST')
        if env_host:
            logger.info(f"🔧 Using RabbitMQ host from environment: {env_host}")
            return env_host

        # 3. Check Django settings
        settings_host = getattr(settings, 'RABBITMQ_HOST', None)
        if settings_host:
            logger.info(f"🔧 Using RabbitMQ host from settings: {settings_host}")
            return settings_host

        # 4. Auto-detection
        hosts_to_try = [
            ('rabbitmq', 'Docker Compose service'),
            ('localhost', 'Local Docker container'),
            ('127.0.0.1', 'Local Docker container (IP)'),
        ]

        for host, description in hosts_to_try:
            if self._test_connection(host, 5672):
                logger.info(f"🎯 Auto-detected RabbitMQ host: {host} ({description})")
                return host

        # 4. Fallback to localhost
        logger.warning("⚠️ Could not auto-detect RabbitMQ host, falling back to localhost")
        logger.info("💡 Make sure RabbitMQ is running:")
        logger.info("   - Docker: docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management")
        logger.info("   - Docker Compose: docker-compose up rabbitmq")
        return 'localhost'

    def _test_connection(self, host, port, timeout=5):
        """Test if RabbitMQ is available on given host:port with proper error handling."""
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()

            if result == 0:
                logger.debug(f"✅ Socket connection test passed for {host}:{port}")
                return True
            else:
                logger.debug(f"❌ Socket connection test failed for {host}:{port}, result: {result}")
                return False

        except Exception as e:
            logger.debug(f"❌ Socket connection test exception for {host}:{port}: {e}")
            return False
    
    def _setup_connection(self):
        """Setup RabbitMQ connection and queues with retry mechanism."""
        max_retries = 10
        retry_delay = 2  # seconds

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"🔌 Attempting to connect to RabbitMQ (attempt {attempt}/{max_retries})...")

                self.connection = pika.BlockingConnection(self.connection_params)
                self.channel = self.connection.channel()

                # Declare exchange
                self.channel.exchange_declare(
                    exchange='manager_notifications',
                    exchange_type='topic',
                    durable=True
                )

                # Declare queue for moderation notifications
                self.channel.queue_declare(
                    queue='moderation_notifications',
                    durable=True
                )

                # Bind queue to exchange
                self.channel.queue_bind(
                    exchange='manager_notifications',
                    queue='moderation_notifications',
                    routing_key='manager.ad.*'
                )

                logger.info(f"✅ RabbitMQ connection established successfully on attempt {attempt}")
                return

            except Exception as e:
                logger.error(f"❌ Failed to setup RabbitMQ connection (attempt {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    logger.info(f"⏳ Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error("💥 All connection attempts failed")
                    raise
    
    def start_consuming(self):
        """Start consuming messages from RabbitMQ - runs continuously."""
        try:
            # Setup connection first if not already connected
            if not self.connection or self.connection.is_closed:
                self._setup_connection()

            self.channel.basic_qos(prefetch_count=1)
            self.channel.basic_consume(
                queue='moderation_notifications',
                on_message_callback=self.process_notification,
                auto_ack=False
            )

            self.consuming = True
            logger.info("🐰 Starting moderation notification consumer - listening for events...")

            # This blocks and keeps listening for messages
            self.channel.start_consuming()

        except KeyboardInterrupt:
            logger.info("🛑 Consumer interrupted by user")
            self.stop_consuming()
        except Exception as e:
            logger.error(f"❌ Consumer error: {e}")
            self.consuming = False
            raise
        finally:
            if self.connection and not self.connection.is_closed:
                self.connection.close()

    def stop_consuming(self):
        """Stop consuming messages gracefully."""
        if self.consuming and self.channel:
            logger.info("🛑 Stopping moderation notification consumer...")
            self.consuming = False
            self.channel.stop_consuming()

            if self.connection and not self.connection.is_closed:
                self.connection.close()

            logger.info("✅ Consumer stopped")
    
    def process_notification(self, ch, method, properties, body):
        """Process a single notification message."""
        try:
            # Parse message
            message = json.loads(body.decode('utf-8'))
            data = message.get('data', {})
            
            logger.info(f"📨 Processing notification for ad {data.get('ad_id')}")
            
            # Extract notification details
            ad_id = data.get('ad_id')
            user_id = data.get('user_id')
            action = data.get('action')
            reason = data.get('reason', '')
            
            if not all([ad_id, user_id, action]):
                logger.error(f"Missing required fields in notification: {data}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return
            
            # Get active managers with notification settings
            managers = self._get_active_managers(action)
            
            if not managers:
                logger.warning(f"No active managers found for action: {action}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            # Process notification for each manager via Celery
            success_count = 0
            for manager_settings in managers:
                try:
                    # Queue Celery task for processing
                    from ..tasks import process_moderation_notification_task
                    task = process_moderation_notification_task.delay(
                        manager_settings_id=manager_settings.id,
                        notification_data=data
                    )
                    logger.info(f"📤 Queued notification processing task {task.id} for manager {manager_settings.manager.email}")
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to queue notification for manager {manager_settings.manager.email}: {e}")

            if success_count > 0:
                logger.info(f"✅ Successfully queued notification processing for {success_count} managers")
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                logger.error("❌ Failed to queue notification processing for any manager")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            
        except Exception as e:
            logger.error(f"Error processing notification: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def _get_active_managers(self, action: str) -> List[ManagerNotificationSettings]:
        """Get active managers who should receive notifications for this action."""
        return ManagerNotificationSettings.objects.filter(
            is_active=True,
            manager__is_active=True,
            manager__is_staff=True
        ).select_related('manager').all()
    


    



def start_consumer():
    """Start the notification consumer."""
    consumer = ModerationNotificationConsumer()
    consumer.start_consuming()


if __name__ == "__main__":
    start_consumer()
