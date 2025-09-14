import logging
from django.core.management.base import BaseCommand
from core.services.email_consumer import start_email_consumer

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Starts the RabbitMQ email consumer service'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting email consumer service...'))
        try:
            start_email_consumer()
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('Stopping email consumer...'))
        except Exception as e:
            logger.error(f"Error in email consumer: {str(e)}")
            raise
