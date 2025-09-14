"""
Django management command to fix geo_codes for existing addresses.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress


class Command(BaseCommand):
    help = 'Fix geo_codes for existing addresses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes'
        )

    def handle(self, *args, **options):
        """Fix geo_codes for existing addresses."""
        try:
            self.stdout.write('🔧 ИСПРАВЛЕНИЕ GEO_CODES')
            self.stdout.write('=' * 50)
            
            # Get addresses with unknown_location geo_code
            addresses_to_fix = RawAccountAddress.objects.filter(
                geo_code='unknown_location'
            ).exclude(region='').exclude(locality='')
            
            self.stdout.write(f'📊 Найдено {addresses_to_fix.count()} адресов для исправления')
            
            if options['dry_run']:
                self._show_dry_run(addresses_to_fix)
            else:
                self._fix_geo_codes(addresses_to_fix)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка исправления: {e}')
            raise

    def _show_dry_run(self, addresses):
        """Show what would be fixed."""
        self.stdout.write('\n🔍 ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР (DRY RUN)')
        self.stdout.write('-' * 40)
        
        for i, address in enumerate(addresses[:10], 1):  # Show first 10
            new_geo_code = self._generate_geo_code(address.region, address.locality)
            self.stdout.write(f'{i}. Адрес #{address.id}')
            self.stdout.write(f'   Регион: {address.region}')
            self.stdout.write(f'   Город: {address.locality}')
            self.stdout.write(f'   Текущий geo_code: {address.geo_code}')
            self.stdout.write(f'   Новый geo_code: {new_geo_code}')
            self.stdout.write('')
        
        if addresses.count() > 10:
            self.stdout.write(f'... и еще {addresses.count() - 10} адресов')

    def _fix_geo_codes(self, addresses):
        """Fix geo_codes for addresses."""
        self.stdout.write('\n🔧 ИСПРАВЛЕНИЕ GEO_CODES')
        self.stdout.write('-' * 40)
        
        fixed_count = 0
        
        for address in addresses:
            try:
                with transaction.atomic():
                    new_geo_code = self._generate_geo_code(address.region, address.locality)
                    
                    if new_geo_code != 'unknown_location' and new_geo_code != address.geo_code:
                        address.geo_code = new_geo_code
                        address.save()
                        fixed_count += 1
                        
                        if fixed_count <= 10:  # Show first 10 fixes
                            self.stdout.write(f'✅ Адрес #{address.id}: {address.locality}, {address.region}')
                            self.stdout.write(f'   geo_code: {new_geo_code}')
                        elif fixed_count == 11:
                            self.stdout.write('   ... (остальные исправления выполняются)')
                        
            except Exception as e:
                self.stdout.write(f'❌ Ошибка исправления адреса #{address.id}: {e}')
        
        self.stdout.write(f'\n📊 РЕЗУЛЬТАТЫ:')
        self.stdout.write(f'   ✅ Исправлено geo_codes: {fixed_count}')
        
        # Show statistics
        self._show_statistics()

    def _generate_geo_code(self, region, locality):
        """Generate geo_code from region and locality."""
        if not region and not locality:
            return 'unknown_location'
        
        # Normalize region and locality for consistent grouping
        region_normalized = region.lower().strip().replace(' ', '_').replace('-', '_').replace('область', '').replace('_', '').strip() if region else 'unknown_region'
        locality_normalized = locality.lower().strip().replace(' ', '_').replace('-', '_') if locality else 'unknown_locality'
        
        # Remove empty parts
        if region_normalized:
            region_normalized = region_normalized.replace('__', '_').strip('_')
        if locality_normalized:
            locality_normalized = locality_normalized.replace('__', '_').strip('_')
        
        return f"{region_normalized}_{locality_normalized}"

    def _show_statistics(self):
        """Show statistics after fixing."""
        self.stdout.write('\n📊 СТАТИСТИКА ПОСЛЕ ИСПРАВЛЕНИЯ:')
        self.stdout.write('-' * 40)
        
        total_addresses = RawAccountAddress.objects.count()
        unknown_locations = RawAccountAddress.objects.filter(geo_code='unknown_location').count()
        valid_geo_codes = total_addresses - unknown_locations
        
        self.stdout.write(f'📍 Всего адресов: {total_addresses}')
        self.stdout.write(f'✅ С валидными geo_codes: {valid_geo_codes}')
        self.stdout.write(f'❓ С unknown_location: {unknown_locations}')
        
        if total_addresses > 0:
            valid_percent = (valid_geo_codes / total_addresses) * 100
            self.stdout.write(f'📈 Процент валидных geo_codes: {valid_percent:.1f}%')
        
        # Show top locations
        self._show_top_locations()

    def _show_top_locations(self):
        """Show top locations by geo_code."""
        self.stdout.write('\n🏆 ТОП ЛОКАЦИЙ:')
        self.stdout.write('-' * 30)
        
        from django.db.models import Count
        
        top_locations = RawAccountAddress.objects.exclude(
            geo_code='unknown_location'
        ).values('geo_code', 'region', 'locality').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        for i, location in enumerate(top_locations, 1):
            self.stdout.write(f'{i}. {location["locality"]}, {location["region"]} ({location["count"]} адресов)')
            self.stdout.write(f'   geo_code: {location["geo_code"]}')
        
        unique_locations = RawAccountAddress.objects.exclude(
            geo_code='unknown_location'
        ).values('geo_code').distinct().count()
        
        self.stdout.write(f'\n🌍 Всего уникальных локаций: {unique_locations}')
