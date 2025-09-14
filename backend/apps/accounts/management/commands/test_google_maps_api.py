"""
Django management command to test Google Maps API connectivity and permissions.
"""

import googlemaps
from django.core.management.base import BaseCommand
from core.security import key_manager


class Command(BaseCommand):
    help = 'Test Google Maps API connectivity and permissions'

    def handle(self, *args, **options):
        """Test Google Maps API."""
        try:
            self.stdout.write('🔑 ПРОВЕРКА GOOGLE MAPS API')
            self.stdout.write('=' * 50)
            
            # Get API key
            api_key = key_manager.get_key('GOOGLE_MAPS_API_KEY')
            if not api_key:
                self.stdout.write('❌ API ключ не найден или не удалось дешифровать')
                return
            
            self.stdout.write(f'✅ API ключ получен: {api_key[:20]}...')
            
            # Initialize Google Maps client
            gmaps = googlemaps.Client(key=api_key)
            
            # Test basic geocoding
            self._test_basic_geocoding(gmaps)
            
            # Test Ukrainian addresses
            self._test_ukrainian_addresses(gmaps)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования: {e}')
            raise

    def _test_basic_geocoding(self, gmaps):
        """Test basic geocoding functionality."""
        self.stdout.write('\n🔄 ТЕСТИРОВАНИЕ БАЗОВОГО ГЕОКОДИРОВАНИЯ')
        self.stdout.write('-' * 40)
        
        test_addresses = [
            'Kyiv, Ukraine',
            'New York, USA',
            'London, UK'
        ]
        
        for address in test_addresses:
            try:
                self.stdout.write(f'📍 Тестирование: {address}')
                result = gmaps.geocode(address)
                
                if result:
                    first_result = result[0]
                    self.stdout.write(f'   ✅ Успешно: {first_result["formatted_address"]}')
                    self.stdout.write(f'   🆔 Place ID: {first_result["place_id"]}')
                    location = first_result['geometry']['location']
                    self.stdout.write(f'   📍 Координаты: {location["lat"]}, {location["lng"]}')
                else:
                    self.stdout.write(f'   ❌ Нет результатов')
                    
            except googlemaps.exceptions.ApiError as e:
                self.stdout.write(f'   ❌ API ошибка: {e}')
                self._diagnose_api_error(e)
                return False
            except Exception as e:
                self.stdout.write(f'   ❌ Общая ошибка: {e}')
                return False
        
        return True

    def _test_ukrainian_addresses(self, gmaps):
        """Test geocoding with Ukrainian addresses."""
        self.stdout.write('\n🇺🇦 ТЕСТИРОВАНИЕ УКРАИНСКИХ АДРЕСОВ')
        self.stdout.write('-' * 40)
        
        ukrainian_addresses = [
            'Київ, Україна',
            'вул. Хрещатик, 1, Київ, Україна',
            'Одеса, Україна',
            'Львів, Україна'
        ]
        
        for address in ukrainian_addresses:
            try:
                self.stdout.write(f'📍 Тестирование: {address}')
                result = gmaps.geocode(address)
                
                if result:
                    first_result = result[0]
                    self.stdout.write(f'   ✅ Успешно: {first_result["formatted_address"]}')
                    
                    # Parse address components
                    components = first_result.get('address_components', [])
                    self.stdout.write('   🏗️ Компоненты адреса:')
                    for component in components[:3]:  # Show first 3 components
                        types = ', '.join(component['types'])
                        self.stdout.write(f'      {component["long_name"]} ({types})')
                else:
                    self.stdout.write(f'   ❌ Нет результатов')
                    
            except googlemaps.exceptions.ApiError as e:
                self.stdout.write(f'   ❌ API ошибка: {e}')
                return False
            except Exception as e:
                self.stdout.write(f'   ❌ Общая ошибка: {e}')
                return False
        
        return True

    def _diagnose_api_error(self, error):
        """Diagnose Google Maps API errors."""
        self.stdout.write('\n🔍 ДИАГНОСТИКА ОШИБКИ API:')
        self.stdout.write('-' * 30)
        
        error_str = str(error)
        
        if 'REQUEST_DENIED' in error_str:
            self.stdout.write('❌ REQUEST_DENIED - API ключ не авторизован')
            self.stdout.write('💡 Возможные решения:')
            self.stdout.write('   1. Включите Geocoding API в Google Cloud Console')
            self.stdout.write('   2. Проверьте ограничения API ключа')
            self.stdout.write('   3. Убедитесь, что биллинг настроен')
            
        elif 'OVER_QUERY_LIMIT' in error_str:
            self.stdout.write('❌ OVER_QUERY_LIMIT - превышен лимит запросов')
            self.stdout.write('💡 Возможные решения:')
            self.stdout.write('   1. Подождите до сброса лимита')
            self.stdout.write('   2. Увеличьте лимиты в Google Cloud Console')
            
        elif 'INVALID_REQUEST' in error_str:
            self.stdout.write('❌ INVALID_REQUEST - неправильный запрос')
            self.stdout.write('💡 Проверьте формат адреса')
            
        elif 'ZERO_RESULTS' in error_str:
            self.stdout.write('❌ ZERO_RESULTS - адрес не найден')
            self.stdout.write('💡 Попробуйте другой формат адреса')
            
        else:
            self.stdout.write(f'❌ Неизвестная ошибка: {error_str}')
        
        self.stdout.write('\n🔗 Полезные ссылки:')
        self.stdout.write('   Google Cloud Console: https://console.cloud.google.com/')
        self.stdout.write('   Geocoding API: https://developers.google.com/maps/documentation/geocoding')
        self.stdout.write('   API Key restrictions: https://cloud.google.com/docs/authentication/api-keys')
