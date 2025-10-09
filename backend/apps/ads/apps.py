import os
from django.apps import AppConfig
from django.conf import settings


class AdsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ads'
    label = 'ads'

    def ready(self):
        # Auto-populate reference data on startup if enabled
        # Controlled by RUN_SEEDS environment variable (default: true)
        # DISABLED: Seeds now run only through docker-compose to avoid cycles
        pass

    def _run_seeds_safely(self):
        """Run seeds safely without blocking app startup."""
        try:
            # Import here to avoid circular imports
            from django.db import connection
            from django.db.utils import OperationalError
            from django.core.management import call_command

            # Check if database is accessible
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except OperationalError:
                # Database not ready, skip seeds
                print("⚠️ Database not ready, skipping seeds")
                return

            # Run seeds in a separate thread to avoid blocking startup
            import threading

            def run_seeds():
                try:
                    print("🌱 Running AutoRia seeds...")
                    call_command('init_project_data', verbosity=1)
                except Exception as e:
                    print(f"⚠️ Seeds failed: {e}")

            # Start seeds in background
            seeds_thread = threading.Thread(target=run_seeds, daemon=True)
            seeds_thread.start()

        except Exception as e:
            # Don't let seeds failure break app startup
            print(f"⚠️ Could not run seeds: {e}")

    def _should_run_seeds(self) -> bool:
        """Check if seeds should be run."""
        # Don't run during migrations or other management commands
        import sys
        if 'manage.py' in sys.argv and len(sys.argv) > 1:
            command = sys.argv[1]
            # Skip seeds for these commands
            skip_commands = [
                'migrate', 'makemigrations', 'shell', 'test',
                'collectstatic', 'createsuperuser', 'init_project_data',
                'auto_populate_references', 'create_test_users'
            ]
            if command in skip_commands:
                return False

        # Never run seeds in Docker by default
        is_docker = os.getenv('IS_DOCKER', 'false').lower() in ('true', '1', 't', 'yes')
        if is_docker:
            print("🐳 Running in Docker - seeds disabled by default")
            # In Docker, only run if explicitly enabled
            run_seeds = os.getenv('RUN_SEEDS', 'false').lower() in ('true', '1', 't', 'yes')
        else:
            # In local development, run by default
            run_seeds = os.getenv('RUN_SEEDS', 'true').lower() in ('true', '1', 't', 'yes')

        if run_seeds:
            print("🌱 Seeds enabled by RUN_SEEDS environment variable")
        else:
            print("⏭️ Seeds disabled by RUN_SEEDS environment variable")

        return run_seeds
