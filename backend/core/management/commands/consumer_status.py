"""
Django management command to check consumer status.
"""
from django.core.management.base import BaseCommand
from core.consumers.manager import consumer_manager


class Command(BaseCommand):
    """Django management command to check consumer status."""
    
    help = 'Check status of RabbitMQ consumers'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed consumer information'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        self.stdout.write(self.style.SUCCESS('🐰 RabbitMQ Consumer Status'))
        self.stdout.write('=' * 50)
        
        status = consumer_manager.get_status()
        
        if not status:
            self.stdout.write(self.style.WARNING('No consumers registered'))
            return
        
        for name, info in status.items():
            # Status indicator
            if info['running'] and info['listening']:
                status_icon = '🟢'
                status_text = 'LISTENING'
                status_style = self.style.SUCCESS
            elif info['enabled']:
                status_icon = '🔴'
                status_text = 'STOPPED'
                status_style = self.style.ERROR
            else:
                status_icon = '⚫'
                status_text = 'DISABLED'
                status_style = self.style.WARNING
            
            # Basic info
            self.stdout.write(f'\n{status_icon} {name}:')
            self.stdout.write(f'  Status: {status_style(status_text)}')
            self.stdout.write(f'  Enabled: {"✅" if info["enabled"] else "❌"}')
            self.stdout.write(f'  Auto-restart: {"✅" if info["auto_restart"] else "❌"}')
            
            if options['detailed']:
                self.stdout.write(f'  Restart count: {info["restart_count"]}')
                if info['last_restart']:
                    import datetime
                    last_restart = datetime.datetime.fromtimestamp(info['last_restart'])
                    self.stdout.write(f'  Last restart: {last_restart.strftime("%Y-%m-%d %H:%M:%S")}')
        
        # Summary
        total_consumers = len(status)
        running_consumers = sum(1 for info in status.values() if info['running'])
        listening_consumers = sum(1 for info in status.values() if info['listening'])
        
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(f'📊 Summary:')
        self.stdout.write(f'  Total consumers: {total_consumers}')
        self.stdout.write(f'  Running: {running_consumers}')
        self.stdout.write(f'  Listening for events: {listening_consumers}')
        
        if listening_consumers > 0:
            self.stdout.write(self.style.SUCCESS(f'\n✅ {listening_consumers} consumer(s) actively listening for events'))
        else:
            self.stdout.write(self.style.ERROR('\n❌ No consumers are listening for events'))
        
        # Health check
        if running_consumers == total_consumers:
            self.stdout.write(self.style.SUCCESS('🟢 All consumers are healthy'))
        elif running_consumers > 0:
            self.stdout.write(self.style.WARNING(f'🟡 {total_consumers - running_consumers} consumer(s) are down'))
        else:
            self.stdout.write(self.style.ERROR('🔴 All consumers are down'))
