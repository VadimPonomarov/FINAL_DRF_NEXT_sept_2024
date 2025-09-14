from django.core.management.base import BaseCommand
import pika
import time
import socket
from django.conf import settings


class Command(BaseCommand):
    help = 'Wait for RabbitMQ to become available'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=60,
            help='Maximum time to wait in seconds (default: 60)'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=3,
            help='Check interval in seconds (default: 3)'
        )

    def handle(self, *args, **options):
        timeout = options['timeout']
        interval = options['interval']
        
        self.stdout.write("🐰 Waiting for RabbitMQ to become available...")
        
        # Get RabbitMQ connection parameters
        rabbitmq_host = getattr(settings, 'RABBITMQ_HOST', 'rabbitmq')
        rabbitmq_port = getattr(settings, 'RABBITMQ_PORT', 5672)
        rabbitmq_user = getattr(settings, 'RABBITMQ_USER', 'guest')
        rabbitmq_password = getattr(settings, 'RABBITMQ_PASSWORD', 'guest')
        
        self.stdout.write(f"🔍 Checking RabbitMQ at {rabbitmq_host}:{rabbitmq_port}")
        
        start_time = time.time()
        connected = False
        
        while not connected and (time.time() - start_time) < timeout:
            try:
                # First check if port is open
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((rabbitmq_host, rabbitmq_port))
                sock.close()
                
                if result != 0:
                    raise ConnectionError(f"Port {rabbitmq_port} not accessible")
                
                # Then try actual RabbitMQ connection
                connection_params = pika.ConnectionParameters(
                    host=rabbitmq_host,
                    port=rabbitmq_port,
                    credentials=pika.PlainCredentials(rabbitmq_user, rabbitmq_password),
                    connection_attempts=1,
                    retry_delay=0,
                    socket_timeout=5
                )
                
                connection = pika.BlockingConnection(connection_params)
                channel = connection.channel()
                
                # Test that we can declare a queue
                channel.queue_declare(queue='health_check', durable=False, auto_delete=True)
                
                connection.close()
                connected = True
                
            except Exception as e:
                elapsed = int(time.time() - start_time)
                self.stdout.write(f"⏳ RabbitMQ unavailable ({elapsed}s/{timeout}s): {e}")
                time.sleep(interval)
        
        if connected:
            elapsed = int(time.time() - start_time)
            self.stdout.write(
                self.style.SUCCESS(f"✅ RabbitMQ is available! (took {elapsed}s)")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"❌ RabbitMQ connection timeout after {timeout}s")
            )
            exit(1)
