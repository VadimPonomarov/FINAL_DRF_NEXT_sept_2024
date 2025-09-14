from django.core.management.base import BaseCommand
from django.db import connection, OperationalError
from django.db.backends.postgresql.base import DatabaseWrapper
import time

connection: DatabaseWrapper = connection

class Command(BaseCommand):
    help = 'Wait for PostgreSQL database to become available'

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

        self.stdout.write("🗄️ Waiting for PostgreSQL database...")

        start_time = time.time()
        con_db = False

        while not con_db and (time.time() - start_time) < timeout:
            try:
                connection.ensure_connection()
                con_db = True
            except OperationalError as e:
                elapsed = int(time.time() - start_time)
                self.stdout.write(f"⏳ Database unavailable ({elapsed}s/{timeout}s): {e}")
                time.sleep(interval)

        if con_db:
            elapsed = int(time.time() - start_time)
            self.stdout.write(
                self.style.SUCCESS(f"✅ Database is available! (took {elapsed}s)")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"❌ Database connection timeout after {timeout}s")
            )
            exit(1)