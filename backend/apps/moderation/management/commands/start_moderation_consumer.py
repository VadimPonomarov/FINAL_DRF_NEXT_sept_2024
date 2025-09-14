"""
Django management command to start moderation notification consumer.
"""
import logging
from django.core.management.base import BaseCommand
from apps.moderation.services.notification_consumer import ModerationNotificationConsumer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Django management command to start moderation notification consumer."""
    
    help = 'Start RabbitMQ consumer for moderation notifications'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose logging'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        if options['verbose']:
            logging.basicConfig(level=logging.INFO)
        
        self.stdout.write(self.style.SUCCESS('🐰 Starting moderation notification consumer...'))
        self.stdout.write('Press Ctrl+C to stop')
        
        try:
            consumer = ModerationNotificationConsumer()
            consumer.start_consuming()
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\n🛑 Consumer stopped by user'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Consumer error: {e}'))
            logger.error(f"Consumer error: {e}", exc_info=True)
