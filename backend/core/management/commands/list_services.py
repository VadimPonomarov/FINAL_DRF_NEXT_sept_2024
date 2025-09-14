"""
Django management command для просмотра зарегистрированных сервисов в Service Registry.
"""
from django.core.management.base import BaseCommand
from core.services.service_registry import service_registry


class Command(BaseCommand):
    help = 'List all registered services in Service Registry'

    def add_arguments(self, parser):
        parser.add_argument(
            '--service',
            type=str,
            help='Show details for specific service',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output in JSON format',
        )

    def handle(self, *args, **options):
        """List registered services."""
        try:
            if options['service']:
                # Показать конкретный сервис
                self._show_service(options['service'], options['json'])
            else:
                # Показать все сервисы
                self._show_all_services(options['json'])

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))

    def _show_service(self, service_name: str, json_output: bool):
        """Show details for specific service."""
        service_config = service_registry.get_service(service_name)
        
        if not service_config:
            self.stdout.write(self.style.ERROR(f'❌ Service "{service_name}" not found'))
            return

        if json_output:
            import json
            self.stdout.write(json.dumps({service_name: service_config}, indent=2))
        else:
            self._print_service_details(service_name, service_config)

    def _show_all_services(self, json_output: bool):
        """Show all registered services."""
        services = service_registry.list_services()
        
        if not services:
            self.stdout.write('📭 No services registered in Service Registry')
            return

        if json_output:
            import json
            self.stdout.write(json.dumps(services, indent=2))
        else:
            self._print_services_table(services)

    def _print_services_table(self, services: dict):
        """Print services in a nice table format."""
        self.stdout.write('🌐 Registered Services in Service Registry:')
        self.stdout.write('=' * 80)
        
        for service_name, config in services.items():
            self._print_service_details(service_name, config)
            self.stdout.write('-' * 80)

    def _print_service_details(self, service_name: str, config: dict):
        """Print detailed service information."""
        # Основная информация
        protocol = config.get('protocol', 'http')
        host = config.get('host', 'unknown')
        port = config.get('port', 'unknown')
        service_type = config.get('service_type', 'unknown')
        
        # URL
        if port in [80, 443]:
            url = f"{protocol}://{host}"
        else:
            url = f"{protocol}://{host}:{port}"
        
        # Метаданные
        environment = config.get('environment', 'unknown')
        registered_at = config.get('registered_at', 'unknown')
        version = config.get('version', 'unknown')
        pid = config.get('pid', 'unknown')

        # Вывод информации
        self.stdout.write(f'🔧 Service: {self.style.SUCCESS(service_name)}')
        self.stdout.write(f'   📍 URL: {self.style.HTTP_INFO(url)}')
        self.stdout.write(f'   🏷️  Type: {service_type}')
        self.stdout.write(f'   🌍 Environment: {environment}')
        self.stdout.write(f'   📅 Registered: {registered_at}')
        self.stdout.write(f'   🏷️  Version: {version}')
        self.stdout.write(f'   🆔 PID: {pid}')
        
        # Дополнительные поля
        extra_fields = {k: v for k, v in config.items() 
                       if k not in ['protocol', 'host', 'port', 'service_type', 
                                   'environment', 'registered_at', 'version', 'pid']}
        
        if extra_fields:
            self.stdout.write('   📋 Additional fields:')
            for key, value in extra_fields.items():
                self.stdout.write(f'      {key}: {value}')
