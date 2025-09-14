import logging
import os
import pika
from typing import Dict, Any, Optional, Literal
from pika import ConnectionParameters, BasicProperties
from pika.exceptions import AMQPConnectionError, AMQPChannelError
from django.conf import settings
from django.template.loader import render_to_string

from config.extra_config.logger_config import logger
from core.schemas.email import SendEmailParams, MyTemplateData
from core.services.pika_helper import ConnectionFactory
from core.services.service_registry import get_service_url

class EmailService:
    """
    Service for sending emails via RabbitMQ with retry and error handling.
    """

    def __init__(self, queue_name: str = "email_queue"):
        self.queue_name = queue_name
        self.connection_params = self._get_rabbitmq_connection_params()
        self.logger = logging.getLogger(__name__)

    def _get_rabbitmq_connection_params(self) -> ConnectionParameters:
        """Get RabbitMQ connection parameters using Service Discovery."""
        try:
            # Получаем URL RabbitMQ через Service Discovery
            rabbitmq_url = get_service_url('rabbitmq')

            # Парсим URL для извлечения хоста
            if rabbitmq_url and rabbitmq_url.startswith('amqp://'):
                # Формат: amqp://host:port
                host = rabbitmq_url.replace('amqp://', '').split(':')[0]
                logger.info(f"📡 Service Discovery: Using RabbitMQ host: {host}")
                return ConnectionParameters(
                    host=host,
                    port=5672,
                    virtual_host='/',
                    credentials=pika.PlainCredentials('guest', 'guest')
                )
            else:
                logger.warning(f"⚠️ Service Discovery: Unexpected RabbitMQ URL format: {rabbitmq_url}")
                # Fallback к переменным окружения
                host = os.getenv('RABBITMQ_HOST', 'localhost')
                logger.info(f"🔄 Fallback: Using RabbitMQ host from env: {host}")
                return ConnectionParameters(
                    host=host,
                    port=int(os.getenv('RABBITMQ_PORT', 5672)),
                    virtual_host=os.getenv('RABBITMQ_VHOST', '/'),
                    credentials=pika.PlainCredentials(
                        os.getenv('RABBITMQ_USER', 'guest'),
                        os.getenv('RABBITMQ_PASSWORD', 'guest')
                    )
                )

        except Exception as e:
            logger.warning(f"⚠️ Service Discovery failed: {e}")
            # Final fallback
            host = os.getenv('RABBITMQ_HOST', 'localhost')
            logger.info(f"🔄 Final fallback: Using RabbitMQ host: {host}")
            return ConnectionParameters(
                host=host,
                port=int(os.getenv('RABBITMQ_PORT', 5672)),
                virtual_host=os.getenv('RABBITMQ_VHOST', '/'),
                credentials=pika.PlainCredentials(
                    os.getenv('RABBITMQ_USER', 'guest'),
                    os.getenv('RABBITMQ_PASSWORD', 'guest')
                )
            )
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        message: str,
        template_name: str = 'emails/base.html',
        context: Optional[Dict[str, Any]] = None,
        from_email: Optional[str] = None,
        priority: int = 3,
        html_content: Optional[str] = None
    ) -> bool:
        """
        Send an email by publishing to RabbitMQ queue.

        Args:
            to_email: Recipient email address
            subject: Email subject
            message: Plain text message
            template_name: Template to use for HTML version (ignored if html_content provided)
            context: Additional context for the template (ignored if html_content provided)
            from_email: Sender email (defaults to settings.DEFAULT_FROM_EMAIL)
            priority: Message priority (1-10, higher is more important)
            html_content: Pre-rendered HTML content (if provided, template_name and context are ignored)

        Returns:
            bool: True if message was published successfully, False otherwise
        """
        # Use provided HTML content or render from template
        if html_content:
            # Use pre-rendered HTML content as-is
            html_message = html_content
            logger.info(f"Using pre-rendered HTML content for email to {to_email}")
        else:
            # Render HTML from template
            if context is None:
                context = {}

            # Add default context
            context.update({
                'title': subject,
                'message': message,
                'site_url': getattr(settings, 'SITE_URL', 'https://example.com'),
                'logo_url': 'cid:logo'
            })

            # Render HTML content
            html_message = render_to_string(template_name, context)
            logger.info(f"Rendered HTML from template {template_name} for email to {to_email}")
        
        # Prepare email data
        email_data = SendEmailParams(
            to_email=to_email,
            subject=subject,
            from_email=from_email or settings.DEFAULT_FROM_EMAIL,
            template_data=MyTemplateData(
                title=subject,
                message=message,
                logo_url=context.get('logo_url', 'cid:logo'),
                html_content=html_message
            ).model_dump()
        )
        
        # Publish to RabbitMQ
        return self._publish_to_queue(email_data, priority)

    def send_html_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        priority: int = 5
    ) -> bool:
        """
        Send email with pre-rendered HTML content.

        This method is specifically for sending emails with ready-made HTML content,
        such as moderation notifications that are already rendered.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: Pre-rendered HTML content
            text_content: Plain text version (optional)
            from_email: Sender email (defaults to settings.DEFAULT_FROM_EMAIL)
            priority: Message priority (1-10, higher is more important)

        Returns:
            bool: True if message was published successfully, False otherwise
        """
        return self.send_email(
            to_email=to_email,
            subject=subject,
            message=text_content or self._html_to_text(html_content),
            from_email=from_email,
            priority=priority,
            html_content=html_content
        )

    def _html_to_text(self, html_content: str) -> str:
        """
        Convert HTML content to plain text.
        Simple implementation for fallback text content.
        """
        import re

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html_content)

        # Replace HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()

        return text
    
    def _publish_to_queue(self, email_data: SendEmailParams, priority: int = 3) -> bool:
        """Publish email data to RabbitMQ queue."""
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                factory = ConnectionFactory(
                    parameters=self.connection_params,
                    queue_name=self.queue_name
                )
                
                # Publish with delivery mode 2 (persistent) and priority
                factory.channel.basic_publish(
                    exchange='',
                    routing_key=self.queue_name,
                    body=email_data.model_dump_json().encode('utf-8'),
                    properties=BasicProperties(
                        delivery_mode=2,  # Make message persistent
                        priority=min(max(1, priority), 10),  # Ensure priority is between 1-10
                        content_type='application/json'
                    )
                )
                
                self.logger.info(f"Email to {email_data.to_email} published to queue")
                return True
                
            except (AMQPConnectionError, AMQPChannelError) as e:
                if attempt == max_retries - 1:
                    self.logger.error(
                        f"Failed to publish email after {max_retries} attempts: {str(e)}"
                    )
                    return False
                
                self.logger.warning(
                    f"RabbitMQ connection error (attempt {attempt + 1}/{max_retries}): {str(e)}"
                )
                import time
                time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                
            except Exception as e:
                self.logger.error(f"Unexpected error publishing email: {str(e)}")
                return False
        
        return False

# Default instance for convenience
email_service = EmailService()

# Backward compatible function
def send_email_service(
    to_email: str,
    title: str,
    message: str,
    queue_name: str = "email_queue",
    connection_parameters: Literal["localhost", "rabbitmq"] = "rabbitmq"
) -> bool:
    """Legacy function that uses the new EmailService."""
    return email_service.send_email(
        to_email=to_email,
        subject=title,
        message=message
    )
