import json
import logging
import time
from typing import Dict, Any, Optional
from pika import ConnectionParameters, BasicProperties
from pika.exceptions import AMQPConnectionError, AMQPChannelError, UnroutableError
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from core.services.pika_helper import ConnectionFactory
from core.schemas.email import SendEmailParams

logger = logging.getLogger(__name__)

class EmailConsumer:
    """
    Service for consuming and processing email messages from RabbitMQ.
    Handles delivery retries and dead-letter queue routing.
    """
    
    def __init__(self):
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        self.dlq_name = 'email_dlq'
        self.retry_queue = 'email_retry'
        self.connection_params = ConnectionParameters('rabbitmq')
        self.setup_queues()

    def setup_queues(self):
        """Set up required queues and exchanges."""
        try:
            factory = ConnectionFactory(
                parameters=self.connection_params,
                queue_name='email_queue'
            )
            channel = factory.get_connection().channel()
            
            # Declare main queue with DLQ and retry settings
            channel.queue_declare(
                queue='email_queue',
                durable=True,
                arguments={
                    'x-dead-letter-exchange': '',
                    'x-dead-letter-routing-key': self.retry_queue,
                    'x-message-ttl': 86400000,  # 24 hours in ms
                }
            )
            
            # Declare retry queue
            channel.queue_declare(
                queue=self.retry_queue,
                durable=True,
                arguments={
                    'x-dead-letter-exchange': '',
                    'x-dead-letter-routing-key': 'email_queue',
                    'x-message-ttl': 300000,  # 5 minutes in ms
                    'x-max-retries': self.max_retries
                }
            )
            
            # Declare dead-letter queue
            channel.queue_declare(
                queue=self.dlq_name,
                durable=True
            )
            
            channel.close()
            
        except Exception as e:
            logger.error(f"Failed to set up queues: {str(e)}")
            raise

    def process_message(self, channel, method, properties, body):
        """Process a single email message from the queue."""
        try:
            message = json.loads(body.decode('utf-8'))
            params = SendEmailParams(**message)
            
            # Extract retry count from headers
            retry_count = 0
            if properties.headers and 'x-retry-count' in properties.headers:
                retry_count = properties.headers['x-retry-count']
            
            logger.info(f"Processing email to {params.to_email} (attempt {retry_count + 1}/{self.max_retries})")
            
            # Send the email
            success = self.send_email(params)
            
            if success:
                channel.basic_ack(delivery_tag=method.delivery_tag)
                logger.info(f"Email sent successfully to {params.to_email}")
            else:
                self.handle_failure(channel, method, properties, body, retry_count)
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid message format: {str(e)}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            self.handle_failure(channel, method, properties, body, retry_count=0)
    
    def send_email(self, params: SendEmailParams) -> bool:
        """Send an email using Django's email backend."""
        try:
            send_mail(
                subject=params.subject,
                message=params.template_data['message'],
                from_email=params.from_email,
                recipient_list=[params.to_email],
                html_message=render_to_string('emails/base.html', {
                    'title': params.template_data['title'],
                    'message': params.template_data['message']
                }),
                fail_silently=False
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {params.to_email}: {str(e)}")
            return False
    
    def handle_failure(self, channel, method, properties, body, retry_count):
        """Handle failed email delivery with retry logic."""
        retry_count += 1
        
        if retry_count >= self.max_retries:
            # Move to DLQ after max retries
            logger.warning(f"Max retries reached for message, moving to DLQ")
            self.publish_to_dlq(channel, body, properties)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        else:
            # Requeue with updated retry count
            logger.info(f"Scheduling retry {retry_count}/{self.max_retries}")
            self.requeue_with_retry(channel, body, properties, retry_count)
            channel.basic_ack(delivery_tag=method.delivery_tag)
    
    def requeue_with_retry(self, channel, body, properties, retry_count):
        """Requeue a message with updated retry count."""
        headers = properties.headers or {}
        headers['x-retry-count'] = retry_count
        
        channel.basic_publish(
            exchange='',
            routing_key='email_queue',
            body=body,
            properties=BasicProperties(
                delivery_mode=2,  # Make message persistent
                headers=headers
            )
        )
    
    def publish_to_dlq(self, channel, body, properties):
        """Publish a message to the dead-letter queue."""
        try:
            channel.basic_publish(
                exchange='',
                routing_key=self.dlq_name,
                body=body,
                properties=BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    headers=properties.headers
                )
            )
            logger.info(f"Message moved to DLQ: {self.dlq_name}")
        except Exception as e:
            logger.error(f"Failed to move message to DLQ: {str(e)}")
    
    def start_consuming(self):
        """Start consuming messages from the queue."""
        while True:
            try:
                factory = ConnectionFactory(
                    parameters=self.connection_params,
                    queue_name='email_queue',
                    callback=self.process_message
                )
                
                logger.info("Starting email consumer...")
                factory.consume()
                
            except (AMQPConnectionError, AMQPChannelError) as e:
                logger.error(f"RabbitMQ connection error: {str(e)}")
                logger.info(f"Reconnecting in {self.retry_delay} seconds...")
                time.sleep(self.retry_delay)
            except Exception as e:
                logger.error(f"Unexpected error in consumer: {str(e)}")
                logger.info(f"Restarting consumer in {self.retry_delay} seconds...")
                time.sleep(self.retry_delay)

def start_email_consumer():
    """Start the email consumer service."""
    consumer = EmailConsumer()
    consumer.start_consuming()

if __name__ == "__main__":
    start_email_consumer()
