from django.core.management.base import BaseCommand
from django.urls import get_resolver

class Command(BaseCommand):
    help = 'List all URLs in the project'

    def handle(self, *args, **options):
        resolver = get_resolver()
        self.list_urls('', resolver.url_patterns)

    def list_urls(self, path, patterns, indent=0):
        for pattern in patterns:
            if hasattr(pattern, 'url_patterns'):
                # This is an include() pattern
                self.list_urls(f"{path}/{pattern.pattern}", pattern.url_patterns, indent + 1)
            else:
                # This is a URL pattern
                if 'addresses' in str(pattern.pattern) or 'addresses' in path:
                    self.stdout.write('  ' * indent + f"{path}/{pattern.pattern}")
