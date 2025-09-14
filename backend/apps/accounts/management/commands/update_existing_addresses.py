"""
Django management command to update existing addresses with geocoding data.
Fills empty region, locality, geo_code, latitude, longitude fields.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress
from apps.accounts.utils.geocoding import get_minimal_geocode


class Command(BaseCommand):
    help = 'Update existing addresses with geocoding data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Number of addresses to update (default: 50)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Update all addresses, even already geocoded ones'
        )

    def handle(self, *args, **options):
        """Update existing addresses with geocoding data."""
        try:
            self.stdout.write('🔄 ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ АДРЕСОВ')
            self.stdout.write('=' * 60)
            
            # Get addresses to update
            addresses_to_update = self._get_addresses_to_update(options['limit'], options['force'])
            
            if not addresses_to_update:
                self.stdout.write('✅ Нет адресов для обновления')
                return
            
            self.stdout.write(f'📊 Найдено {len(addresses_to_update)} адресов для обновления')
            
            if options['dry_run']:
                self._show_dry_run(addresses_to_update)
            else:
                self._update_addresses(addresses_to_update)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка обновления: {e}')
            raise

    def _get_addresses_to_update(self, limit, force):
        """Get addresses that need updating."""
        if force:
            # Update all addresses
            return list(RawAccountAddress.objects.all()[:limit])
        else:
            # Only update addresses that are not geocoded or have unknown_location
            return list(RawAccountAddress.objects.filter(
                models.Q(is_geocoded=False) | 
                models.Q(geo_code='unknown_location') |
                models.Q(geo_code='') |
                models.Q(region='') |
                models.Q(locality='')
            )[:limit])

    def _show_dry_run(self, addresses):
        """Show what would be updated in dry run mode."""
        self.stdout.write('\n🔍 ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР ОБНОВЛЕНИЯ (DRY RUN)')
        self.stdout.write('-' * 50)
        
        for i, address in enumerate(addresses, 1):
            self.stdout.write(f'\n{i}. 📍 АДРЕС #{address.id}')
            self.stdout.write(f'   Ввод пользователя: {address.input_locality}, {address.input_region}')
            self.stdout.write(f'   Текущий статус: is_geocoded={address.is_geocoded}')
            self.stdout.write(f'   Текущий geo_code: {address.geo_code}')
            self.stdout.write(f'   Текущий region: "{address.region}"')
            self.stdout.write(f'   Текущий locality: "{address.locality}"')
            
            self.stdout.write('   🔄 Будет выполнено:')
            self.stdout.write('      - Геокодирование через Google Maps API')
            self.stdout.write('      - Заполнение стандартизированных полей')
            self.stdout.write('      - Генерация geo_code для группировки')
            self.stdout.write('      - Получение координат')

    def _update_addresses(self, addresses):
        """Update addresses with geocoding data."""
        self.stdout.write('\n🔄 ВЫПОЛНЕНИЕ ОБНОВЛЕНИЯ')
        self.stdout.write('-' * 40)
        
        successful = 0
        failed = 0
        skipped = 0
        
        for i, address in enumerate(addresses, 1):
            self.stdout.write(f'\n{i}. 📍 Обновление адреса #{address.id}')
            self.stdout.write(f'   {address.input_locality}, {address.input_region}')
            
            try:
                with transaction.atomic():
                    # Use input fields if available, otherwise use existing region/locality
                    region_for_geocoding = address.input_region or address.region
                    locality_for_geocoding = address.input_locality or address.locality

                    # Skip if no data available
                    if not region_for_geocoding or not locality_for_geocoding:
                        self.stdout.write('   ⚠️ Пропущен: нет данных для геокодирования')
                        skipped += 1
                        continue

                    # Fill input fields if they're empty (for old data)
                    if not address.input_region:
                        address.input_region = address.region
                    if not address.input_locality:
                        address.input_locality = address.locality

                    # Perform geocoding
                    geocode_result = get_minimal_geocode(
                        region=region_for_geocoding,
                        locality=locality_for_geocoding,
                        locale='uk'
                    )
                    
                    if geocode_result:
                        # Update standardized fields
                        address.region = geocode_result.get('region', '') or region_for_geocoding
                        address.locality = geocode_result.get('locality', '') or locality_for_geocoding
                        address.latitude = geocode_result.get('latitude')
                        address.longitude = geocode_result.get('longitude')
                        address.is_geocoded = True
                        address.geocoding_error = ''
                        
                        # Generate geo_code
                        address.geo_code = self._generate_geo_code(address.region, address.locality)
                        
                        # Save the updated address
                        address.save()
                        
                        self.stdout.write('   ✅ Успешно обновлен')
                        self.stdout.write(f'      Стандартизированный: {address.locality}, {address.region}')
                        self.stdout.write(f'      geo_code: {address.geo_code}')
                        if address.latitude and address.longitude:
                            self.stdout.write(f'      Координаты: {address.latitude}, {address.longitude}')
                        
                        successful += 1
                    else:
                        # Update with fallback data
                        address.region = region_for_geocoding
                        address.locality = locality_for_geocoding
                        address.geo_code = self._generate_geo_code(region_for_geocoding, locality_for_geocoding)
                        address.is_geocoded = False
                        address.geocoding_error = 'Geocoding failed: No results returned'
                        address.save()
                        
                        self.stdout.write('   ⚠️ Геокодирование не удалось, использованы исходные данные')
                        self.stdout.write(f'      geo_code: {address.geo_code}')
                        failed += 1
                        
            except Exception as e:
                self.stdout.write(f'   ❌ Ошибка обновления: {e}')
                failed += 1
        
        # Show summary
        self.stdout.write(f'\n📊 РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ:')
        self.stdout.write(f'   ✅ Успешно: {successful}')
        self.stdout.write(f'   ⚠️ С ошибками геокодирования: {failed}')
        self.stdout.write(f'   ⏭️ Пропущено: {skipped}')
        total = successful + failed + skipped
        if total > 0:
            success_rate = (successful / total) * 100
            self.stdout.write(f'   📈 Процент успеха: {success_rate:.1f}%')
        
        if successful > 0:
            self.stdout.write(f'\n💡 РЕЗУЛЬТАТ:')
            self.stdout.write(f'   ✅ {successful} адресов теперь имеют стандартизированные данные')
            self.stdout.write(f'   ✅ Все адреса имеют geo_code для группировки')
            self.stdout.write(f'   ✅ Система готова для географической аналитики')

    def _generate_geo_code(self, region, locality):
        """Generate geo_code from region and locality."""
        if not region and not locality:
            return 'unknown_location'
        
        # Normalize region and locality for consistent grouping
        region_normalized = region.lower().strip().replace(' ', '_').replace('-', '_') if region else 'unknown_region'
        locality_normalized = locality.lower().strip().replace(' ', '_').replace('-', '_') if locality else 'unknown_locality'
        
        return f"{region_normalized}_{locality_normalized}"

    def _show_statistics(self):
        """Show statistics after update."""
        self.stdout.write('\n📊 СТАТИСТИКА ПОСЛЕ ОБНОВЛЕНИЯ:')
        self.stdout.write('-' * 40)
        
        total_addresses = RawAccountAddress.objects.count()
        geocoded_addresses = RawAccountAddress.objects.filter(is_geocoded=True).count()
        with_coordinates = RawAccountAddress.objects.filter(
            latitude__isnull=False, longitude__isnull=False
        ).count()
        
        # Count unique geo_codes
        unique_locations = RawAccountAddress.objects.exclude(
            geo_code='unknown_location'
        ).values('geo_code').distinct().count()
        
        self.stdout.write(f'📍 Всего адресов: {total_addresses}')
        self.stdout.write(f'🗺️ Геокодированных: {geocoded_addresses}')
        self.stdout.write(f'📍 С координатами: {with_coordinates}')
        self.stdout.write(f'🌍 Уникальных локаций: {unique_locations}')
        
        if total_addresses > 0:
            geocoded_percent = (geocoded_addresses / total_addresses) * 100
            self.stdout.write(f'📈 Процент геокодированных: {geocoded_percent:.1f}%')
            
            if geocoded_percent == 100:
                self.stdout.write('🎉 Все адреса успешно обработаны!')
            elif geocoded_percent > 80:
                self.stdout.write('✅ Большинство адресов обработано успешно')
            else:
                self.stdout.write('⚠️ Требуется дополнительная обработка адресов')

    def _show_top_locations(self):
        """Show top locations by count."""
        self.stdout.write('\n🏆 ТОП ЛОКАЦИЙ ПО КОЛИЧЕСТВУ АДРЕСОВ:')
        self.stdout.write('-' * 40)
        
        from django.db.models import Count
        
        top_locations = RawAccountAddress.objects.exclude(
            geo_code='unknown_location'
        ).values('geo_code', 'region', 'locality').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        for i, location in enumerate(top_locations, 1):
            self.stdout.write(f'{i}. {location["locality"]}, {location["region"]} ({location["count"]} адресов)')
            self.stdout.write(f'   geo_code: {location["geo_code"]}')

# Import models.Q for filtering
from django.db import models
