from django.core.management.base import BaseCommand
from apps.ads.models import CarAd
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Check the actual count of CarAd objects in the database and cache'

    def handle(self, *args, **options):
        # Check database
        total_ads = CarAd.objects.count()
        active_ads = CarAd.objects.filter(status='active').count()
        
        self.stdout.write(self.style.SUCCESS(f'\n📊 Database Stats:'))
        self.stdout.write(f'  Total ads: {total_ads}')
        self.stdout.write(f'  Active ads: {active_ads}')
        
        # Check cache
        cached_stats = cache.get('quick_stats')
        if cached_stats:
            self.stdout.write(self.style.WARNING(f'\n💾 Cached Stats:'))
            self.stdout.write(f'  Total ads: {cached_stats.get("total_ads", "N/A")}')
            self.stdout.write(f'  Active ads: {cached_stats.get("active_ads", "N/A")}')
            self.stdout.write(f'  Generated at: {cached_stats.get("generated_at", "N/A")}')
        else:
            self.stdout.write(self.style.WARNING(f'\n💾 No cached stats found'))
        
        # Clear cache option
        self.stdout.write(f'\n🗑️ To clear cache, run:')
        self.stdout.write(f'  python manage.py shell -c "from django.core.cache import cache; cache.delete(\'quick_stats\'); print(\'Cache cleared!\')"')

