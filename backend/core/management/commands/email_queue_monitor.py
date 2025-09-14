import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import pika
from django.core.management.base import BaseCommand
from pika.adapters.blocking_connection import BlockingChannel

logger = logging.getLogger(__name__)

class EmailQueueMonitor:
    """Monitor and report on email queue status."""
    
    def __init__(self, host: str = 'rabbitmq', port: int = 5672):
        self.connection_params = pika.ConnectionParameters(
            host=host,
            port=port,
            connection_attempts=3,
            retry_delay=5
        )
        self.connection = None
        self.channel = None
        
    def connect(self) -> bool:
        """Establish connection to RabbitMQ."""
        try:
            self.connection = pika.BlockingConnection(self.connection_params)
            self.channel = self.connection.channel()
            return True
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
            return False
    
    def get_queue_stats(self, queue_name: str) -> Dict[str, Any]:
        """Get statistics for a specific queue."""
        try:
            if not self.channel or self.channel.is_closed:
                if not self.connect():
                    return {}
            
            queue = self.channel.queue_declare(
                queue=queue_name,
                passive=True  # Only check if queue exists, don't create
            )
            
            return {
                'queue': queue_name,
                'messages': queue.method.message_count,
                'consumers': queue.method.consumer_count,
                'status': 'active' if queue.method.message_count > 0 else 'idle'
            }
            
        except pika.exceptions.ChannelClosedByBroker as e:
            logger.warning(f"Queue {queue_name} does not exist: {str(e)}")
            return {
                'queue': queue_name,
                'error': 'queue_does_not_exist',
                'message': str(e)
            }
        except Exception as e:
            logger.error(f"Error getting stats for queue {queue_name}: {str(e)}")
            return {
                'queue': queue_name,
                'error': 'unexpected_error',
                'message': str(e)
            }
    
    def get_all_queues(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all queues."""
        try:
            if not self.channel or self.channel.is_closed:
                if not self.connect():
                    return {}
            
            queues = {}
            for queue in self.channel.queue_declare(passive=True):
                if queue != '':
                    queues[queue] = self.get_queue_stats(queue)
            
            return queues
            
        except Exception as e:
            logger.error(f"Error getting all queues: {str(e)}")
            return {}
    
    def close(self):
        """Close the connection to RabbitMQ."""
        try:
            if self.connection and self.connection.is_open:
                self.connection.close()
        except Exception as e:
            logger.error(f"Error closing connection: {str(e)}")


class Command(BaseCommand):
    help = 'Monitor email queue statistics and health'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--queue',
            type=str,
            default='email_queue',
            help='Specific queue to monitor (default: email_queue)'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Polling interval in seconds (default: 60)'
        )
        parser.add_argument(
            '--watch',
            action='store_true',
            help='Continuously monitor the queue'
        )
    
    def handle(self, *args, **options):
        monitor = EmailQueueMonitor()
        
        if not monitor.connect():
            self.stderr.write(self.style.ERROR('Failed to connect to RabbitMQ'))
            return
        
        try:
            while True:
                stats = monitor.get_queue_stats(options['queue'])
                self.print_stats(stats)
                
                if not options['watch']:
                    break
                    
                time.sleep(options['interval'])
                
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('\nMonitoring stopped'))
        finally:
            monitor.close()
    
    def print_stats(self, stats: Dict[str, Any]):
        """Print queue statistics in a formatted way."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if 'error' in stats:
            self.stdout.write(
                self.style.ERROR(f"[{timestamp}] Error: {stats.get('message', 'Unknown error')}")
            )
            return
            
        status_style = {
            'active': self.style.WARNING,
            'idle': self.style.SUCCESS
        }.get(stats.get('status', 'unknown'), self.style.NOTICE)
        
        self.stdout.write(f"\n[{timestamp}] Queue: {stats['queue']}")
        self.stdout.write(f"Status: {status_style(stats['status'].upper())}")
        self.stdout.write(f"Messages: {self.style.NOTICE(stats['messages'])}")
        self.stdout.write(f"Consumers: {stats['consumers']}")
        
        if stats['messages'] > 1000:
            self.stdout.write(
                self.style.WARNING("Warning: High message count! Consider scaling consumers.")
            )
