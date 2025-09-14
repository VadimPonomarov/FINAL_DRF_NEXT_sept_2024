"""
Django management command to test geocoding directly with decrypted API key.
"""

import os
from django.core.management.base import BaseCommand
from apps.accounts.utils.geocoding import geocode_address_simple
from core.utils.encryption import encryption_service


class Command(BaseCommand):
    help = 'Test geocoding directly with decrypted API key'

    def handle(self, *args, **options):
        """Test direct geocoding."""
        try:
            self.stdout.write('🗺️ ПРЯМОЕ ТЕСТИРОВАНИЕ ГЕОКОДИРОВАНИЯ')
            self.stdout.write('=' * 60)
            
            # Get and decrypt API key
            api_key = self._get_decrypted_api_key()
            if not api_key:
                return
            
            # Test geocoding with Ukrainian address
            self._test_ukrainian_geocoding(api_key)
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования: {e}')
            raise

    def _get_decrypted_api_key(self):
        """Get and decrypt the API key."""
        self.stdout.write('\n🔐 ДЕШИФРОВАНИЕ API КЛЮЧА')
        self.stdout.write('-' * 40)
        
        try:
            # Get encrypted key from environment
            encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
            if not encrypted_key:
                self.stdout.write('❌ Зашифрованный ключ не найден в переменных среды')
                return None
            
            self.stdout.write(f'📝 Зашифрованный ключ: {encrypted_key[:50]}...')
            
            # Decrypt the key
            decrypted_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
            
            self.stdout.write(f'✅ Ключ успешно дешифрован: {decrypted_key[:20]}...')
            self.stdout.write(f'📏 Длина ключа: {len(decrypted_key)} символов')
            
            return decrypted_key
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка дешифрования: {e}')
            return None

    def _test_ukrainian_geocoding(self, api_key):
        """Test geocoding with Ukrainian addresses."""
        self.stdout.write('\n🇺🇦 ТЕСТИРОВАНИЕ УКРАИНСКИХ АДРЕСОВ')
        self.stdout.write('-' * 40)
        
        test_addresses = [
            "Запорожье, Украина",  # Как в вашем примере
            "Київ, Україна",
            "вул. Хрещатик, 1, Київ, Україна",
            "Одеса, Україна",
            "Львів, Україна"
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
                    
                    # Show first few address components
                    components = result.get("address_components", [])
                    if components:
                        self.stdout.write('   🏗️ Компоненты адреса:')
                        for comp in components[:3]:
                            types = ', '.join(comp['types'])
                            self.stdout.write(f'      {comp["long_name"]} ({types})')
                else:
                    self.stdout.write('❌ Геокодирование не удалось')
                    
            except Exception as e:
                self.stdout.write(f'❌ Ошибка: {e}')

    def _test_full_geocoding_flow(self, api_key):
        """Test the full geocoding flow."""
        self.stdout.write('\n🌍 ТЕСТИРОВАНИЕ ПОЛНОГО ПОТОКА ГЕОКОДИРОВАНИЯ')
        self.stdout.write('-' * 50)
        
        from apps.accounts.utils.geocoding import get_full_geocode
        
        test_components = {
            'country': 'Україна',
            'region': 'Запорожская область',
            'locality': 'Запорожье',
            'street': 'проспект Соборный',
            'building': '1'
        }
        
        self.stdout.write('📍 Компоненты адреса:')
        for key, value in test_components.items():
            self.stdout.write(f'   {key}: {value}')
        
        try:
            result = get_full_geocode(**test_components)
            
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
                
                self.stdout.write('\n💡 СИСТЕМА ГОТОВА К РАБОТЕ!')
                self.stdout.write('   ✅ Дешифрование API ключа работает')
                self.stdout.write('   ✅ Google Maps API отвечает')
                self.stdout.write('   ✅ Стандартизация адресов функционирует')
                self.stdout.write('   ✅ Генерация хешей для аналитики работает')
                
            else:
                self.stdout.write('❌ Полное геокодирование не удалось')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка полного геокодирования: {e}')
