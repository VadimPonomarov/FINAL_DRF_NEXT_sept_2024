"""
Core app configuration with automatic consumer startup.
"""
import logging
import threading
from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    """Core app configuration."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Core'
    
    def ready(self):
        """Called when Django is ready."""
        # Consumer startup moved to manage.py for better control
        logger.info("🚀 Core app ready - consumer startup handled by manage.py")

        # Register service in Redis Service Registry
        self._register_service_in_redis()

        # Auto-seed car reference data if empty (temporarily disabled)
        # self._auto_seed_car_references()
    
    def _should_start_consumers(self) -> bool:
        """Determine if consumers should be started."""
        # Don't start during migrations
        import sys
        if 'migrate' in sys.argv or 'makemigrations' in sys.argv:
            logger.info("🚫 Skipping consumer startup during migrations")
            return False
        
        # Don't start during collectstatic
        if 'collectstatic' in sys.argv:
            logger.info("🚫 Skipping consumer startup during collectstatic")
            return False
        
        # Don't start during tests
        if 'test' in sys.argv or hasattr(settings, 'TESTING'):
            logger.info("🚫 Skipping consumer startup during tests")
            return False
        
        # Check if consumers are enabled in settings
        import os
        env_value = os.getenv('ENABLE_RABBITMQ_CONSUMERS', 'true')
        setting_value = getattr(settings, 'ENABLE_RABBITMQ_CONSUMERS', True)
        logger.info(f"🔍 Environment ENABLE_RABBITMQ_CONSUMERS: {env_value}")
        logger.info(f"🔍 Django setting ENABLE_RABBITMQ_CONSUMERS: {setting_value}")

        if not setting_value:
            logger.info("🚫 RabbitMQ consumers disabled in settings")
            return False
        
        # Check if we're in a management command that shouldn't start consumers
        management_commands_to_skip = [
            'shell', 'shell_plus', 'dbshell', 'createsuperuser',
            'changepassword', 'loaddata', 'dumpdata', 'flush',
            'start_moderation_consumer'  # Don't auto-start if manually starting
        ]
        
        for cmd in management_commands_to_skip:
            if cmd in sys.argv:
                logger.info(f"🚫 Skipping consumer startup during {cmd} command")
                return False
        
        return True

    def _register_service_in_redis(self):
        """Register Django service in Redis Service Registry."""
        try:
            # Only register if not in management commands that shouldn't register
            import sys
            skip_commands = [
                'migrate', 'makemigrations', 'collectstatic', 'test',
                'shell', 'shell_plus', 'dbshell', 'createsuperuser'
            ]

            for cmd in skip_commands:
                if cmd in sys.argv:
                    logger.info(f"🚫 Skipping service registration during {cmd} command")
                    return

            # Import and register service
            from core.services.service_registry import register_current_service
            register_current_service()
            logger.info("✅ Django service registered in Redis Service Registry")

        except Exception as e:
            logger.warning(f"⚠️ Failed to register service in Redis: {e}")
            # Don't fail startup if registration fails

    def _auto_seed_car_references(self):
        """Auto-seed car reference data if tables are empty."""
        try:
            # Only import after Django is ready
            from apps.ads.models.reference import CarMarkModel
            from django.core.management import call_command

            # Check if car marks exist
            if not CarMarkModel.objects.exists():
                logger.info("🌱 Car reference data is empty, auto-seeding...")
                call_command('seed_car_references')
                logger.info("✅ Car reference data seeded successfully")
            else:
                logger.info("📚 Car reference data already exists")

        except Exception as e:
            logger.warning(f"⚠️ Could not auto-seed car reference data: {e}")
            # Don't fail startup if seeding fails
    
    def _start_consumers_delayed(self):
        """Start consumers with a small delay to ensure Django is fully ready."""
        import time
        
        # Wait a bit for Django to fully initialize
        time.sleep(2)
        
        try:
            logger.info("🎧 Starting RabbitMQ consumers for continuous event listening...")
            
            from core.consumers.manager import start_consumers
            start_consumers()
            
            logger.info("✅ RabbitMQ consumers started successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to start RabbitMQ consumers: {e}")
            # Don't raise - let Django continue running even if consumers fail
