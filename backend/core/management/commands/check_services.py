"""
Django management command to check external services availability.
"""
from django.core.management.base import BaseCommand
from core.utils.service_discovery import ServiceDiscovery


class Command(BaseCommand):
    """Check availability of external services."""
    
    help = 'Check availability of external services (Redis, RabbitMQ, MinIO, PostgreSQL)'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--service',
            type=str,
            help='Check specific service (redis, rabbitmq, minio, postgres)'
        )
        parser.add_argument(
            '--urls',
            action='store_true',
            help='Show service URLs'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        self.stdout.write(self.style.SUCCESS('🔍 Checking External Services'))
        self.stdout.write('=' * 50)
        
        if options['service']:
            self._check_single_service(options['service'])
        else:
            self._check_all_services()
        
        if options['urls']:
            self._show_service_urls()
    
    def _check_single_service(self, service_name):
        """Check a single service."""
        service_methods = {
            'redis': ('Redis', ServiceDiscovery.get_redis_host, 6379),
            'rabbitmq': ('RabbitMQ', ServiceDiscovery.get_rabbitmq_host, 5672),
            'minio': ('MinIO', ServiceDiscovery.get_minio_host, 9000),
            'postgres': ('PostgreSQL', ServiceDiscovery.get_postgres_host, 5432),
        }
        
        if service_name not in service_methods:
            self.stdout.write(
                self.style.ERROR(f'❌ Unknown service: {service_name}')
            )
            self.stdout.write(f'Available services: {", ".join(service_methods.keys())}')
            return
        
        display_name, get_host_method, port = service_methods[service_name]
        host = get_host_method()
        available = ServiceDiscovery.test_connection(host, port)
        
        status_icon = '✅' if available else '❌'
        status_text = 'Available' if available else 'Not available'
        status_style = self.style.SUCCESS if available else self.style.ERROR
        
        self.stdout.write(f'\n{status_icon} {display_name}:')
        self.stdout.write(f'  Host: {host}')
        self.stdout.write(f'  Port: {port}')
        self.stdout.write(f'  Status: {status_style(status_text)}')
    
    def _check_all_services(self):
        """Check all services."""
        services = ServiceDiscovery.check_all_services()
        
        for service_name, config in services.items():
            status_icon = '✅' if config['available'] else '❌'
            status_text = 'Available' if config['available'] else 'Not available'
            status_style = self.style.SUCCESS if config['available'] else self.style.ERROR
            
            self.stdout.write(f'\n{status_icon} {service_name.upper()}:')
            self.stdout.write(f'  Host: {config["host"]}')
            self.stdout.write(f'  Port: {config["port"]}')
            self.stdout.write(f'  Status: {status_style(status_text)}')
        
        # Summary
        available_count = sum(1 for s in services.values() if s['available'])
        total_count = len(services)
        
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(f'📊 Summary: {available_count}/{total_count} services available')
        
        if available_count == total_count:
            self.stdout.write(self.style.SUCCESS('🟢 All services are healthy'))
        elif available_count > 0:
            self.stdout.write(self.style.WARNING(f'🟡 {total_count - available_count} service(s) are down'))
        else:
            self.stdout.write(self.style.ERROR('🔴 All services are down'))
    
    def _show_service_urls(self):
        """Show service URLs."""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('🌐 Service URLs'))
        self.stdout.write('=' * 50)
        
        urls = ServiceDiscovery.get_service_urls()
        
        for service, url in urls.items():
            self.stdout.write(f'{service.upper()}: {url}')
        
        self.stdout.write('\n💡 Management interfaces:')
        self.stdout.write(f'  RabbitMQ: {urls["rabbitmq_management"]} (guest/guest)')
        self.stdout.write(f'  MinIO: {urls["minio_console"]} (minioadmin/minioadmin)')
