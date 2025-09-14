"""
Django management command to fix addresses with empty locality fields.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress
from apps.accounts.utils.geocoding import get_minimal_geocode


class Command(BaseCommand):
    help = 'Fix addresses with empty locality fields'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes'
        )

    def handle(self, *args, **options):
        """Fix addresses with empty locality fields."""
        try:
            self.stdout.write('🔧 ИСПРАВЛЕНИЕ ПУСТЫХ LOCALITY')
            self.stdout.write('=' * 50)
            
            # Find addresses with empty locality but non-empty region
            empty_locality_addresses = RawAccountAddress.objects.filter(
                locality=''
            ).exclude(region='')
            
            self.stdout.write(f'📊 Найдено {empty_locality_addresses.count()} адресов с пустым locality')
            
            if empty_locality_addresses.count() == 0:
                self.stdout.write('✅ Нет адресов для исправления')
                return
            
            if options['dry_run']:
                self._show_dry_run(empty_locality_addresses)
            else:
                self._fix_empty_localities(empty_locality_addresses)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка исправления: {e}')
            raise

    def _show_dry_run(self, addresses):
        """Show what would be fixed."""
        self.stdout.write('\n🔍 АНАЛИЗ ПРОБЛЕМНЫХ ЗАПИСЕЙ')
        self.stdout.write('-' * 40)
        
        for i, address in enumerate(addresses, 1):
            self.stdout.write(f'{i}. 📍 АДРЕС #{address.id}')
            self.stdout.write(f'   region: "{address.region}"')
            self.stdout.write(f'   locality: "{address.locality}" (ПУСТОЕ)')
            self.stdout.write(f'   input_region: "{address.input_region}"')
            self.stdout.write(f'   input_locality: "{address.input_locality}"')
            self.stdout.write(f'   geo_code: "{address.geo_code}"')
            self.stdout.write(f'   coordinates: {address.latitude}, {address.longitude}')
            
            # Suggest fix strategy
            if address.input_locality:
                self.stdout.write(f'   🔧 СТРАТЕГИЯ: Использовать input_locality = "{address.input_locality}"')
            elif 'київ' in address.region.lower():
                self.stdout.write(f'   🔧 СТРАТЕГИЯ: Установить locality = "Київ" (столица региона)')
            elif 'львів' in address.region.lower():
                self.stdout.write(f'   🔧 СТРАТЕГИЯ: Установить locality = "Львів" (центр региона)')
            elif 'одес' in address.region.lower():
                self.stdout.write(f'   🔧 СТРАТЕГИЯ: Установить locality = "Одеса" (центр региона)')
            elif 'харків' in address.region.lower():
                self.stdout.write(f'   🔧 СТРАТЕГИЯ: Установить locality = "Харків" (центр региона)')
            else:
                self.stdout.write(f'   🔧 СТРАТЕГИЯ: Попробовать геокодирование только по региону')
            
            self.stdout.write('')

    def _fix_empty_localities(self, addresses):
        """Fix addresses with empty localities."""
        self.stdout.write('\n🔧 ИСПРАВЛЕНИЕ ПУСТЫХ LOCALITY')
        self.stdout.write('-' * 40)
        
        fixed_count = 0
        geocoded_count = 0
        
        for address in addresses:
            try:
                with transaction.atomic():
                    original_locality = address.locality
                    
                    # Strategy 1: Use input_locality if available
                    if address.input_locality and address.input_locality.strip():
                        address.locality = address.input_locality.strip()
                        self.stdout.write(f'✅ Адрес #{address.id}: Использован input_locality = "{address.locality}"')
                        fixed_count += 1
                    
                    # Strategy 2: Set regional center based on region name
                    elif self._set_regional_center(address):
                        self.stdout.write(f'✅ Адрес #{address.id}: Установлен центр региона = "{address.locality}"')
                        fixed_count += 1
                    
                    # Strategy 3: Try geocoding with region only
                    else:
                        geocode_result = self._try_geocoding_region(address)
                        if geocode_result:
                            address.locality = geocode_result.get('locality', '')
                            if geocode_result.get('latitude'):
                                address.latitude = geocode_result['latitude']
                            if geocode_result.get('longitude'):
                                address.longitude = geocode_result['longitude']
                            
                            self.stdout.write(f'✅ Адрес #{address.id}: Геокодирование успешно = "{address.locality}"')
                            geocoded_count += 1
                        else:
                            self.stdout.write(f'⚠️ Адрес #{address.id}: Не удалось исправить')
                            continue
                    
                    # Update geo_code if locality was fixed
                    if address.locality:
                        address.geo_code = self._generate_geo_code(address.region, address.locality)
                        address.save()
                        
                        if original_locality != address.locality:
                            self.stdout.write(f'   🔑 Новый geo_code: {address.geo_code}')
                        
            except Exception as e:
                self.stdout.write(f'❌ Ошибка исправления адреса #{address.id}: {e}')
        
        self.stdout.write(f'\n📊 РЕЗУЛЬТАТЫ:')
        self.stdout.write(f'   ✅ Исправлено через input_locality: {fixed_count}')
        self.stdout.write(f'   🌐 Исправлено через геокодирование: {geocoded_count}')
        self.stdout.write(f'   📈 Всего исправлено: {fixed_count + geocoded_count}')
        
        # Show final statistics
        self._show_final_statistics()

    def _set_regional_center(self, address):
        """Set locality to regional center based on region name."""
        region_lower = address.region.lower()
        
        regional_centers = {
            'київ': 'Київ',
            'львів': 'Львів', 
            'одес': 'Одеса',
            'харків': 'Харків',
            'дніпр': 'Дніпро',
            'запоріж': 'Запоріжжя',
            'кривий ріг': 'Кривий Ріг',
            'миколаїв': 'Миколаїв',
            'маріуполь': 'Маріуполь',
            'луганськ': 'Луганськ',
            'вінниц': 'Вінниця',
            'макіїв': 'Макіївка',
            'чернігів': 'Чернігів',
            'полтав': 'Полтава',
            'черкас': 'Черкаси',
            'житомир': 'Житомир',
            'суми': 'Суми',
            'хмельниц': 'Хмельницький',
            'чернівц': 'Чернівці',
            'рівн': 'Рівне',
            'івано-франків': 'Івано-Франківськ',
            'тернопіль': 'Тернопіль',
            'луцьк': 'Луцьк',
            'ужгород': 'Ужгород',
            'кропивниц': 'Кропивницький',
            'херсон': 'Херсон'
        }
        
        for key, center in regional_centers.items():
            if key in region_lower:
                address.locality = center
                return True
        
        return False

    def _try_geocoding_region(self, address):
        """Try geocoding with region only."""
        try:
            # Try geocoding with region + "область"
            region_query = address.region
            if 'область' not in region_query.lower():
                region_query += ' область'
            
            geocode_result = get_minimal_geocode(
                region=region_query,
                locality='центр',  # Try with "center"
                locale='uk'
            )
            
            return geocode_result
            
        except Exception as e:
            self.stdout.write(f'   ⚠️ Ошибка геокодирования: {e}')
            return None

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

    def _show_final_statistics(self):
        """Show final statistics."""
        self.stdout.write('\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:')
        self.stdout.write('-' * 40)
        
        total_addresses = RawAccountAddress.objects.count()
        empty_localities = RawAccountAddress.objects.filter(locality='').count()
        valid_localities = total_addresses - empty_localities
        unknown_locations = RawAccountAddress.objects.filter(geo_code='unknown_location').count()
        
        self.stdout.write(f'📍 Всего адресов: {total_addresses}')
        self.stdout.write(f'✅ С заполненным locality: {valid_localities}')
        self.stdout.write(f'❓ С пустым locality: {empty_localities}')
        self.stdout.write(f'🔑 С unknown_location geo_code: {unknown_locations}')
        
        if total_addresses > 0:
            valid_percent = (valid_localities / total_addresses) * 100
            self.stdout.write(f'📈 Процент с валидным locality: {valid_percent:.1f}%')
            
            if empty_localities == 0:
                self.stdout.write('🎉 Все адреса имеют заполненное поле locality!')
            elif empty_localities < 5:
                self.stdout.write('✅ Почти все адреса исправлены!')
            else:
                self.stdout.write('⚠️ Требуется дополнительная работа с адресами')
