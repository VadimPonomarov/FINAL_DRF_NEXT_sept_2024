"""
Django management command to test simple geocoding with requests library.
"""

from django.core.management.base import BaseCommand
from apps.accounts.utils.geocoding import geocode_address_simple, get_full_geocode
from core.security import key_manager


class Command(BaseCommand):
    help = 'Test simple geocoding functionality using requests library'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-api-key',
            action='store_true',
            help='Test API key decryption first'
        )

    def handle(self, *args, **options):
        """Test simple geocoding functionality."""
        try:
            self.stdout.write('🗺️ ТЕСТИРОВАНИЕ ПРОСТОГО ГЕОКОДИРОВАНИЯ')
            self.stdout.write('=' * 60)
            
            # Test API key decryption
            api_key = self._test_api_key_decryption()
            if not api_key:
                return
            
            if options['test_api_key']:
                self.stdout.write('✅ API ключ успешно дешифрован')
                return
            
            # Test simple geocoding
            self._test_simple_geocoding(api_key)
            
            # Test full geocoding
            self._test_full_geocoding()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования: {e}')
            raise

    def _test_api_key_decryption(self):
        """Test API key decryption."""
        self.stdout.write('\n🔐 ТЕСТИРОВАНИЕ ДЕШИФРОВАНИЯ API КЛЮЧА')
        self.stdout.write('-' * 40)
        
        try:
            api_key = key_manager.google_maps_api_key
            if api_key:
                self.stdout.write(f'✅ API ключ дешифрован: {api_key[:20]}...')
                self.stdout.write(f'📏 Длина ключа: {len(api_key)} символов')
                return api_key
            else:
                self.stdout.write('❌ Не удалось дешифровать API ключ')
                return None
        except Exception as e:
            self.stdout.write(f'❌ Ошибка дешифрования: {e}')
            return None

    def _test_simple_geocoding(self, api_key):
        """Test simple geocoding function."""
        self.stdout.write('\n🔄 ТЕСТИРОВАНИЕ ПРОСТОГО ГЕОКОДИРОВАНИЯ')
        self.stdout.write('-' * 40)
        
        test_addresses = [
            "Kyiv, Ukraine",
            "1600 Amphitheatre Parkway, Mountain View, CA",
            "вул. Хрещатик, 1, Київ, Україна",
            "Одеса, Україна"
        ]
        
        for address in test_addresses:
            self.stdout.write(f'\n📍 Тестирование: {address}')
            
            try:
                result = geocode_address_simple(address, api_key)
                
                if result:
                    self.stdout.write('✅ Геокодирование успешно!')
                    self.stdout.write(f'   🆔 Place ID: {result["place_id"]}')
                    self.stdout.write(f'   🏠 Адрес: {result["formatted_address"]}')
                    
                    location = result["geometry"]["location"]
                    self.stdout.write(f'   📍 Координаты: {location["lat"]}, {location["lng"]}')
                    
                    # Show address components
                    components = result.get("address_components", [])
                    if components:
                        self.stdout.write('   🏗️ Компоненты:')
                        for comp in components[:3]:  # Show first 3
                            types = ', '.join(comp['types'])
                            self.stdout.write(f'      {comp["long_name"]} ({types})')
                else:
                    self.stdout.write('❌ Геокодирование не удалось')
                    
            except Exception as e:
                self.stdout.write(f'❌ Ошибка: {e}')

    def _test_full_geocoding(self):
        """Test full geocoding function."""
        self.stdout.write('\n🌍 ТЕСТИРОВАНИЕ ПОЛНОГО ГЕОКОДИРОВАНИЯ')
        self.stdout.write('-' * 40)
        
        test_address_components = {
            'country': 'Україна',
            'region': 'Київська область',
            'locality': 'Київ',
            'street': 'вул. Хрещатик',
            'building': '1',
            'apartment': '10'
        }
        
        self.stdout.write('📍 Тестовые компоненты адреса:')
        for key, value in test_address_components.items():
            self.stdout.write(f'   {key}: {value}')
        
        try:
            result = get_full_geocode(**test_address_components)
            
            if result:
                self.stdout.write('\n✅ ПОЛНОЕ ГЕОКОДИРОВАНИЕ УСПЕШНО!')
                self.stdout.write(f'🆔 Place ID: {result["place_id"]}')
                self.stdout.write(f'📍 Координаты: {result["latitude"]}, {result["longitude"]}')
                self.stdout.write(f'🏠 Полный адрес: {result["formatted_address"]}')
                self.stdout.write(f'🔗 Хеш адреса: {result["address_hash"][:16]}...')
                
                self.stdout.write('\n🌍 СТАНДАРТИЗИРОВАННЫЕ КОМПОНЕНТЫ:')
                self.stdout.write(f'   Страна: {result["country"]} ({result["country_code"]})')
                self.stdout.write(f'   Регион: {result["region"]}')
                self.stdout.write(f'   Город: {result["locality"]}')
                self.stdout.write(f'   Улица: {result["street"]}')
                self.stdout.write(f'   Дом: {result["building"]}')
                self.stdout.write(f'   Квартира: {result["apartment"]}')
                
                self.stdout.write('\n💡 ПРЕИМУЩЕСТВА СИСТЕМЫ:')
                self.stdout.write('   ✅ Автоматическая стандартизация адресов в латинице')
                self.stdout.write('   ✅ Генерация уникального хеша для группировки')
                self.stdout.write('   ✅ Извлечение координат для карт')
                self.stdout.write('   ✅ Унификация данных для аналитики')
                
            else:
                self.stdout.write('❌ Полное геокодирование не удалось')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка полного геокодирования: {e}')

    def _show_api_diagnostics(self):
        """Show API diagnostics information."""
        self.stdout.write('\n🔍 ДИАГНОСТИКА API:')
        self.stdout.write('-' * 30)
        self.stdout.write('💡 Если геокодирование не работает:')
        self.stdout.write('   1. Проверьте, что Geocoding API включен в Google Cloud Console')
        self.stdout.write('   2. Убедитесь, что биллинг настроен')
        self.stdout.write('   3. Проверьте ограничения API ключа')
        self.stdout.write('   4. Убедитесь, что ключ правильно зашифрован')
        
        self.stdout.write('\n🔗 Полезные ссылки:')
        self.stdout.write('   Google Cloud Console: https://console.cloud.google.com/')
        self.stdout.write('   Geocoding API: https://developers.google.com/maps/documentation/geocoding')
