from django.core.management.base import BaseCommand
from celery import Celery
import time
from django.conf import settings


class Command(BaseCommand):
    help = 'Wait for Celery broker to become available'

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
        
        self.stdout.write("🌿 Waiting for Celery broker to become available...")
        
        # Get Celery broker URL
        broker_url = getattr(settings, 'CELERY_BROKER_URL', 'pyamqp://guest:guest@rabbitmq:5672//')
        
        self.stdout.write(f"🔍 Checking Celery broker: {broker_url}")
        
        start_time = time.time()
        connected = False
        
        while not connected and (time.time() - start_time) < timeout:
            try:
                # Create temporary Celery app
                app = Celery('health_check')
                app.conf.broker_url = broker_url
                app.conf.result_backend = getattr(settings, 'CELERY_RESULT_BACKEND', None)
                app.conf.task_always_eager = False
                app.conf.task_eager_propagates = False
                
                # Try to inspect the broker
                inspect = app.control.inspect()
                
                # Check if broker is responsive
                stats = inspect.stats()
                if stats is not None:
                    connected = True
                else:
                    raise Exception("Broker inspection returned None")
                    
            except Exception as e:
                elapsed = int(time.time() - start_time)
                self.stdout.write(f"⏳ Celery broker unavailable ({elapsed}s/{timeout}s): {e}")
                time.sleep(interval)
        
        if connected:
            elapsed = int(time.time() - start_time)
            self.stdout.write(
                self.style.SUCCESS(f"✅ Celery broker is available! (took {elapsed}s)")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"❌ Celery broker connection timeout after {timeout}s")
            )
            exit(1)
