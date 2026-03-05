"""
Custom management command to wait for the database to be available.
"""
import sys
import time

try:
    from django.core.management.base import BaseCommand
    from modules.wait_for_db import wait_for_db
    DJANGO_AVAILABLE = True
except ImportError as e:
    DJANGO_AVAILABLE = False
    IMPORT_ERROR = str(e)


class Command(BaseCommand if DJANGO_AVAILABLE else object):
    """Wait for database to be available."""
    help = 'Waits for database to be available.'

    def __init__(self, *args, **kwargs):
        if not DJANGO_AVAILABLE:
            self.stdout = sys.stdout
            self.stderr = sys.stderr
            self.style = type('Style', (), {
                'SUCCESS': lambda x: f'[SUCCESS] {x}',
                'ERROR': lambda x: f'[ERROR] {x}'
            })()
        super().__init__(*args, **kwargs)

    def add_arguments(self, parser):
        if not DJANGO_AVAILABLE:
            import argparse
            parser = argparse.ArgumentParser(description='Wait for database to be available')
        
        parser.add_argument('--timeout', type=int, default=60,
                          help='Maximum time to wait in seconds (default: 60)')
        parser.add_argument('--interval', type=float, default=1.0,
                          help='Time to wait between retries in seconds (default: 1.0)')
        parser.add_argument('--skip-django-check', action='store_true',
                          help='Skip the Django-specific checks')

    def handle(self, *args, **options):
        if not DJANGO_AVAILABLE:
            self.stderr.write(self.style.ERROR(
                f'Django is not available: {IMPORT_ERROR}\n'
            ))
            self.stderr.write('⚠️  Attempting to continue without Django...\n')
            
            # Use the standalone wait_for_db function with skip_django_check
            from modules.wait_for_db import wait_for_db
            if wait_for_db(timeout=options.get('timeout', 60), 
                         interval=options.get('interval', 1.0),
                         skip_django_check=True):
                self.stdout.write(self.style.SUCCESS('✅ Database check completed (Django not available)'))
                return
            else:
                self.stderr.write(self.style.ERROR('❌ Database check failed'))
                sys.exit(1)
        
        # Original Django-specific code
        self.stdout.write('⌛ Waiting for database...')
        
        if wait_for_db(timeout=options['timeout'], 
                      interval=options['interval'],
                      skip_django_check=options.get('skip_django_check', False)):
            self.stdout.write(self.style.SUCCESS('✅ Database is available!'))
            return
        
        self.stderr.write(
            self.style.ERROR(f'❌ Database connection failed after {options["timeout"]} seconds')
        )
        raise SystemExit(1)
