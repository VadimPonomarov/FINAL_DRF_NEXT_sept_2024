"""
Django management command to convert existing geo_codes to standardized hash codes.
Converts text-based geo_codes to 8-character SHA-256 hashes based on region + locality.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress


class Command(BaseCommand):
    help = 'Convert existing geo_codes to standardized hash codes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be converted without making changes'
        )

    def handle(self, *args, **options):
        """Convert existing geo_codes to hash codes."""
        try:
            self.stdout.write('🔄 КОНВЕРТАЦИЯ GEO_CODES В ХЕШИ')
            self.stdout.write('=' * 60)
            
            # Get all addresses that need conversion
            addresses_to_convert = RawAccountAddress.objects.exclude(
                geo_code__regex=r'^[a-f0-9]{8}$'
            ).exclude(geo_code='unknown')
            
            self.stdout.write(f'📊 Найдено {addresses_to_convert.count()} адресов для конвертации')
            
            if addresses_to_convert.count() == 0:
                self.stdout.write('✅ Все geo_codes уже в правильном формате')
                return
            
            if options['dry_run']:
                self._show_conversion_preview(addresses_to_convert)
            else:
                self._convert_geo_codes(addresses_to_convert)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка конвертации: {e}')
            raise

    def _show_conversion_preview(self, addresses):
        """Show what would be converted."""
        self.stdout.write('\n🔍 ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР КОНВЕРТАЦИИ')
        self.stdout.write('-' * 50)
        
        conversion_map = {}
        
        for i, address in enumerate(addresses[:15], 1):  # Show first 15
            old_geo_code = address.geo_code
            new_geo_code = self._generate_hash_code(address.region, address.locality)
            
            self.stdout.write(f'{i}. 📍 АДРЕС #{address.id}')
            self.stdout.write(f'   Локация: {address.locality}, {address.region}')
            self.stdout.write(f'   Старый geo_code: "{old_geo_code}"')
            self.stdout.write(f'   Новый geo_code: "{new_geo_code}"')
            
            # Track conversions for statistics
            if old_geo_code not in conversion_map:
                conversion_map[old_geo_code] = {
                    'new_code': new_geo_code,
                    'count': 0,
                    'locations': set()
                }
            conversion_map[old_geo_code]['count'] += 1
            conversion_map[old_geo_code]['locations'].add(f"{address.locality}, {address.region}")
            
            self.stdout.write('')
        
        if addresses.count() > 15:
            self.stdout.write(f'... и еще {addresses.count() - 15} адресов')
        
        # Show conversion statistics
        self._show_conversion_statistics(conversion_map)

    def _convert_geo_codes(self, addresses):
        """Convert geo_codes to hash format."""
        self.stdout.write('\n🔄 ВЫПОЛНЕНИЕ КОНВЕРТАЦИИ')
        self.stdout.write('-' * 40)
        
        converted_count = 0
        conversion_map = {}
        
        for address in addresses:
            try:
                with transaction.atomic():
                    old_geo_code = address.geo_code
                    new_geo_code = self._generate_hash_code(address.region, address.locality)
                    
                    # Update the geo_code
                    address.geo_code = new_geo_code
                    address.save()
                    
                    converted_count += 1
                    
                    # Track conversions for statistics
                    if old_geo_code not in conversion_map:
                        conversion_map[old_geo_code] = {
                            'new_code': new_geo_code,
                            'count': 0,
                            'sample_location': f"{address.locality}, {address.region}"
                        }
                    conversion_map[old_geo_code]['count'] += 1
                    
                    # Show progress for first 10 conversions
                    if converted_count <= 10:
                        self.stdout.write(f'✅ #{address.id}: "{old_geo_code}" → "{new_geo_code}"')
                        self.stdout.write(f'   {address.locality}, {address.region}')
                    elif converted_count == 11:
                        self.stdout.write('   ... (остальные конвертации выполняются)')
                        
            except Exception as e:
                self.stdout.write(f'❌ Ошибка конвертации адреса #{address.id}: {e}')
        
        self.stdout.write(f'\n📊 РЕЗУЛЬТАТЫ КОНВЕРТАЦИИ:')
        self.stdout.write(f'   ✅ Конвертировано geo_codes: {converted_count}')
        
        # Show conversion mapping
        self._show_conversion_mapping(conversion_map)
        
        # Show final statistics
        self._show_final_statistics()

    def _generate_hash_code(self, region, locality):
        """Generate 8-character hash code from region and locality."""
        import hashlib
        
        if not region and not locality:
            return 'unknown'
        
        region_clean = (region or '').lower().strip()
        locality_clean = (locality or '').lower().strip()
        location_string = f"{region_clean}|{locality_clean}"
        
        hash_object = hashlib.sha256(location_string.encode('utf-8'))
        return hash_object.hexdigest()[:8]

    def _show_conversion_statistics(self, conversion_map):
        """Show conversion statistics."""
        self.stdout.write('\n📊 СТАТИСТИКА КОНВЕРТАЦИИ:')
        self.stdout.write('-' * 40)
        
        self.stdout.write(f'🔄 Уникальных старых geo_codes: {len(conversion_map)}')
        
        # Show most frequent conversions
        sorted_conversions = sorted(
            conversion_map.items(), 
            key=lambda x: x[1]['count'], 
            reverse=True
        )
        
        self.stdout.write('\n🏆 ТОП КОНВЕРТАЦИЙ:')
        for i, (old_code, data) in enumerate(sorted_conversions[:5], 1):
            locations_str = ', '.join(list(data['locations'])[:2])
            if len(data['locations']) > 2:
                locations_str += f' и еще {len(data["locations"]) - 2}'
            
            self.stdout.write(f'{i}. "{old_code}" → "{data["new_code"]}" ({data["count"]} адресов)')
            self.stdout.write(f'   Локации: {locations_str}')

    def _show_conversion_mapping(self, conversion_map):
        """Show conversion mapping."""
        self.stdout.write('\n🗺️ КАРТА КОНВЕРТАЦИИ:')
        self.stdout.write('-' * 30)
        
        for old_code, data in list(conversion_map.items())[:10]:  # Show first 10
            self.stdout.write(f'"{old_code}" → "{data["new_code"]}" ({data["count"]} адресов)')
            self.stdout.write(f'   Пример: {data["sample_location"]}')

    def _show_final_statistics(self):
        """Show final statistics after conversion."""
        self.stdout.write('\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:')
        self.stdout.write('-' * 40)
        
        total_addresses = RawAccountAddress.objects.count()
        hash_format_addresses = RawAccountAddress.objects.filter(
            geo_code__regex=r'^[a-f0-9]{8}$'
        ).count()
        unknown_addresses = RawAccountAddress.objects.filter(geo_code='unknown').count()
        
        self.stdout.write(f'📍 Всего адресов: {total_addresses}')
        self.stdout.write(f'🔐 С хеш geo_codes: {hash_format_addresses}')
        self.stdout.write(f'❓ С unknown geo_codes: {unknown_addresses}')
        
        if total_addresses > 0:
            hash_percent = (hash_format_addresses / total_addresses) * 100
            self.stdout.write(f'📈 Процент хеш-кодов: {hash_percent:.1f}%')
            
            if hash_percent == 100:
                self.stdout.write('🎉 Все geo_codes конвертированы в хеш-формат!')
            elif hash_percent > 95:
                self.stdout.write('✅ Почти все geo_codes конвертированы!')
            else:
                self.stdout.write('⚠️ Требуется дополнительная конвертация')
        
        # Show unique hash codes
        unique_hashes = RawAccountAddress.objects.exclude(
            geo_code='unknown'
        ).values('geo_code').distinct().count()
        
        self.stdout.write(f'🌍 Уникальных географических хешей: {unique_hashes}')
        
        # Show top locations by hash
        self._show_top_hash_locations()

    def _show_top_hash_locations(self):
        """Show top locations by hash code."""
        self.stdout.write('\n🏆 ТОП ЛОКАЦИЙ (ПО ХЕШАМ):')
        self.stdout.write('-' * 35)
        
        from django.db.models import Count
        
        top_locations = RawAccountAddress.objects.exclude(
            geo_code='unknown'
        ).values('geo_code', 'region', 'locality').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        for i, location in enumerate(top_locations, 1):
            self.stdout.write(f'{i}. {location["locality"]}, {location["region"]} ({location["count"]} адресов)')
            self.stdout.write(f'   🔐 geo_hash: {location["geo_code"]}')

    def _test_hash_generation(self):
        """Test hash generation with sample data."""
        self.stdout.write('\n🧪 ТЕСТ ГЕНЕРАЦИИ ХЕШЕЙ:')
        self.stdout.write('-' * 30)
        
        test_cases = [
            ('Київська область', 'Київ'),
            ('Львівська область', 'Львів'),
            ('Одеська область', 'Одеса'),
            ('Харківська область', 'Харків'),
        ]
        
        for region, locality in test_cases:
            hash_code = self._generate_hash_code(region, locality)
            self.stdout.write(f'{locality}, {region} → {hash_code}')
        
        # Test consistency
        hash1 = self._generate_hash_code('Київська область', 'Київ')
        hash2 = self._generate_hash_code('Київська область', 'Київ')
        
        if hash1 == hash2:
            self.stdout.write('✅ Хеши консистентны (одинаковые входные данные → одинаковый хеш)')
        else:
            self.stdout.write('❌ Ошибка: хеши не консистентны!')
