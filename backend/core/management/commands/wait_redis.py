from django.core.management.base import BaseCommand
import redis
import time
from django.conf import settings


class Command(BaseCommand):
    help = 'Wait for Redis to become available'

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
        
        self.stdout.write("🔴 Waiting for Redis to become available...")
        
        # Get Redis connection parameters
        redis_host = getattr(settings, 'REDIS_HOST', 'redis')
        redis_port = getattr(settings, 'REDIS_PORT', 6379)
        redis_db = getattr(settings, 'REDIS_DB', 0)
        
        self.stdout.write(f"🔍 Checking Redis at {redis_host}:{redis_port}/{redis_db}")
        
        start_time = time.time()
        connected = False
        
        while not connected and (time.time() - start_time) < timeout:
            try:
                # Try to connect to Redis
                r = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    decode_responses=True
                )
                
                # Test connection with ping
                response = r.ping()
                if response:
                    connected = True
                else:
                    raise Exception("Redis ping failed")
                    
            except Exception as e:
                elapsed = int(time.time() - start_time)
                self.stdout.write(f"⏳ Redis unavailable ({elapsed}s/{timeout}s): {e}")
                time.sleep(interval)
        
        if connected:
            elapsed = int(time.time() - start_time)
            self.stdout.write(
                self.style.SUCCESS(f"✅ Redis is available! (took {elapsed}s)")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"❌ Redis connection timeout after {timeout}s")
            )
            exit(1)
