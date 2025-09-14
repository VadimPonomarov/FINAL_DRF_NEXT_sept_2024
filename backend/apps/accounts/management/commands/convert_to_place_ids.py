"""
Django management command to convert existing geo_codes to Google Maps place_ids.
Gets place_id from Google Maps API based on region + locality only.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress
from apps.accounts.utils.geocoding import get_minimal_geocode


class Command(BaseCommand):
    help = 'Convert existing geo_codes to Google Maps place_ids'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be converted without making changes'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Number of addresses to process (default: 50)'
        )

    def handle(self, *args, **options):
        """Convert existing geo_codes to place_ids."""
        try:
            self.stdout.write('🗺️ КОНВЕРТАЦИЯ В GOOGLE MAPS PLACE_IDS')
            self.stdout.write('=' * 60)
            
            # Get addresses that need place_id conversion
            addresses_to_convert = self._get_addresses_to_convert(options['limit'])
            
            if not addresses_to_convert:
                self.stdout.write('✅ Все адреса уже имеют place_id или не требуют конвертации')
                return
            
            self.stdout.write(f'📊 Найдено {len(addresses_to_convert)} адресов для конвертации')
            
            if options['dry_run']:
                self._show_conversion_preview(addresses_to_convert)
            else:
                self._convert_to_place_ids(addresses_to_convert)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка конвертации: {e}')
            raise

    def _get_addresses_to_convert(self, limit):
        """Get addresses that need place_id conversion."""
        # Get addresses that don't have place_id format geo_codes
        # Place IDs typically start with letters and contain alphanumeric characters
        addresses = RawAccountAddress.objects.exclude(
            geo_code__startswith='ChIJ'  # Most place_ids start with ChIJ
        ).exclude(
            geo_code='unknown'
        ).filter(
            region__isnull=False,
            locality__isnull=False
        ).exclude(
            region='',
            locality=''
        )[:limit]
        
        return list(addresses)

    def _show_conversion_preview(self, addresses):
        """Show what would be converted."""
        self.stdout.write('\n🔍 ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР КОНВЕРТАЦИИ')
        self.stdout.write('-' * 50)
        
        for i, address in enumerate(addresses[:10], 1):  # Show first 10
            self.stdout.write(f'{i}. 📍 АДРЕС #{address.id}')
            self.stdout.write(f'   Локация: {address.locality}, {address.region}')
            self.stdout.write(f'   Текущий geo_code: "{address.geo_code}"')
            self.stdout.write(f'   🔄 Будет получен place_id от Google Maps для: {address.region} + {address.locality}')
            self.stdout.write('')
        
        if len(addresses) > 10:
            self.stdout.write(f'... и еще {len(addresses) - 10} адресов')
        
        self.stdout.write('\n💡 ПРОЦЕСС КОНВЕРТАЦИИ:')
        self.stdout.write('   1. Запрос к Google Maps API: region + locality')
        self.stdout.write('   2. Получение place_id для географической локации')
        self.stdout.write('   3. Замена geo_code на place_id')
        self.stdout.write('   4. Обновление координат (если изменились)')

    def _convert_to_place_ids(self, addresses):
        """Convert geo_codes to Google Maps place_ids."""
        self.stdout.write('\n🔄 ВЫПОЛНЕНИЕ КОНВЕРТАЦИИ В PLACE_IDS')
        self.stdout.write('-' * 50)
        
        converted_count = 0
        failed_count = 0
        place_id_map = {}
        
        for i, address in enumerate(addresses, 1):
            try:
                with transaction.atomic():
                    self.stdout.write(f'{i}. 📍 Обработка адреса #{address.id}')
                    self.stdout.write(f'   Локация: {address.locality}, {address.region}')
                    
                    # Get place_id from Google Maps based on region + locality
                    geocode_result = get_minimal_geocode(
                        region=address.region,
                        locality=address.locality,
                        locale='uk'
                    )
                    
                    if geocode_result and geocode_result.get('place_id'):
                        old_geo_code = address.geo_code
                        new_place_id = geocode_result['place_id']
                        
                        # Update address with place_id
                        address.geo_code = new_place_id
                        
                        # Update coordinates if they changed
                        if geocode_result.get('latitude'):
                            address.latitude = geocode_result['latitude']
                        if geocode_result.get('longitude'):
                            address.longitude = geocode_result['longitude']
                        
                        # Update standardized region/locality if they changed
                        if geocode_result.get('region'):
                            address.region = geocode_result['region']
                        if geocode_result.get('locality'):
                            address.locality = geocode_result['locality']
                        
                        address.save()
                        
                        self.stdout.write(f'   ✅ Конвертирован: "{old_geo_code}" → "{new_place_id}"')
                        
                        # Track place_id mapping
                        location_key = f"{address.locality}, {address.region}"
                        if new_place_id not in place_id_map:
                            place_id_map[new_place_id] = {
                                'location': location_key,
                                'count': 0
                            }
                        place_id_map[new_place_id]['count'] += 1
                        
                        converted_count += 1
                    else:
                        self.stdout.write(f'   ⚠️ Не удалось получить place_id')
                        failed_count += 1
                        
            except Exception as e:
                self.stdout.write(f'   ❌ Ошибка конвертации: {e}')
                failed_count += 1
        
        # Show results
        self._show_conversion_results(converted_count, failed_count, place_id_map)

    def _show_conversion_results(self, converted_count, failed_count, place_id_map):
        """Show conversion results."""
        self.stdout.write(f'\n📊 РЕЗУЛЬТАТЫ КОНВЕРТАЦИИ:')
        self.stdout.write('-' * 40)
        
        self.stdout.write(f'   ✅ Успешно конвертировано: {converted_count}')
        self.stdout.write(f'   ❌ Ошибок конвертации: {failed_count}')
        
        total = converted_count + failed_count
        if total > 0:
            success_rate = (converted_count / total) * 100
            self.stdout.write(f'   📈 Процент успеха: {success_rate:.1f}%')
        
        # Show place_id mapping
        if place_id_map:
            self.stdout.write('\n🗺️ ПОЛУЧЕННЫЕ PLACE_IDS:')
            self.stdout.write('-' * 30)
            
            sorted_places = sorted(
                place_id_map.items(), 
                key=lambda x: x[1]['count'], 
                reverse=True
            )
            
            for place_id, data in sorted_places[:10]:  # Show top 10
                self.stdout.write(f'{data["location"]} ({data["count"]} адресов)')
                self.stdout.write(f'   🔑 place_id: {place_id}')
                
                # Test reverse lookup
                place_info = RawAccountAddress.get_place_info_by_place_id(place_id)
                if place_info:
                    self.stdout.write(f'   📍 Google название: {place_info.get("name", "N/A")}')
                
                self.stdout.write('')
        
        # Show final statistics
        self._show_final_statistics()

    def _show_final_statistics(self):
        """Show final statistics."""
        self.stdout.write('\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:')
        self.stdout.write('-' * 40)
        
        total_addresses = RawAccountAddress.objects.count()
        place_id_addresses = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).count()
        unknown_addresses = RawAccountAddress.objects.filter(geo_code='unknown').count()
        
        self.stdout.write(f'📍 Всего адресов: {total_addresses}')
        self.stdout.write(f'🗺️ С Google place_id: {place_id_addresses}')
        self.stdout.write(f'❓ С unknown geo_code: {unknown_addresses}')
        
        if total_addresses > 0:
            place_id_percent = (place_id_addresses / total_addresses) * 100
            self.stdout.write(f'📈 Процент place_id: {place_id_percent:.1f}%')
            
            if place_id_percent == 100:
                self.stdout.write('🎉 Все адреса имеют Google place_id!')
            elif place_id_percent > 90:
                self.stdout.write('✅ Большинство адресов имеют place_id!')
            else:
                self.stdout.write('⚠️ Требуется дополнительная обработка')
        
        # Show unique place_ids
        unique_place_ids = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).values('geo_code').distinct().count()
        
        self.stdout.write(f'🌍 Уникальных place_id: {unique_place_ids}')

    def _test_place_id_functionality(self):
        """Test place_id functionality."""
        self.stdout.write('\n🧪 ТЕСТ ФУНКЦИОНАЛЬНОСТИ PLACE_ID:')
        self.stdout.write('-' * 40)
        
        # Get a sample place_id
        sample_address = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).first()
        
        if sample_address:
            place_id = sample_address.geo_code
            self.stdout.write(f'🔍 Тестирование place_id: {place_id}')
            
            # Test reverse lookup
            place_info = RawAccountAddress.get_place_info_by_place_id(place_id)
            if place_info:
                self.stdout.write('✅ Обратный поиск работает:')
                self.stdout.write(f'   Название: {place_info.get("name", "N/A")}')
                self.stdout.write(f'   Адрес: {place_info.get("formatted_address", "N/A")}')
            else:
                self.stdout.write('❌ Обратный поиск не работает')
            
            # Test grouping
            similar_addresses = sample_address.get_similar_locations()
            self.stdout.write(f'✅ Группировка: найдено {similar_addresses.count()} адресов с тем же place_id')
        else:
            self.stdout.write('⚠️ Нет place_id для тестирования')
