"""
Django management command to test real geocoding with working encryption.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress, AddsAccount
from apps.users.models import UserModel


class Command(BaseCommand):
    help = 'Test real geocoding with working encryption system'

    def handle(self, *args, **options):
        """Test real geocoding."""
        try:
            self.stdout.write('🌐 ТЕСТИРОВАНИЕ РЕАЛЬНОГО ГЕОКОДИРОВАНИЯ')
            self.stdout.write('=' * 60)
            
            # Test encryption first
            if not self._test_encryption():
                return
            
            # Test direct API call
            if not self._test_api_call():
                return
            
            # Test geocoding through model
            self._test_model_geocoding()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования: {e}')
            raise

    def _test_encryption(self):
        """Test encryption system."""
        self.stdout.write('\n🔐 ТЕСТИРОВАНИЕ СИСТЕМЫ ШИФРОВАНИЯ')
        self.stdout.write('-' * 40)
        
        try:
            from core.utils.encryption import encryption_service
            import os
            
            encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
            if not encrypted_key:
                self.stdout.write('❌ Нет зашифрованного ключа в переменных среды')
                return False
            
            api_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
            if api_key and len(api_key) > 20:
                self.stdout.write(f'✅ Ключ дешифрован: {api_key[:20]}...')
                self.stdout.write(f'📏 Длина: {len(api_key)} символов')
                return True
            else:
                self.stdout.write('❌ Дешифрование вернуло некорректные данные')
                return False
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка дешифрования: {e}')
            return False

    def _test_api_call(self):
        """Test direct Google Maps API call."""
        self.stdout.write('\n🌐 ТЕСТИРОВАНИЕ ПРЯМОГО ВЫЗОВА API')
        self.stdout.write('-' * 40)
        
        try:
            from core.utils.encryption import encryption_service
            import os
            import requests
            
            encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
            api_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
            
            endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": "Київ, Україна",
                "key": api_key,
                "language": "uk",
                "region": "ua"
            }
            
            response = requests.get(endpoint, params=params, timeout=10)
            data = response.json()
            
            if data.get("status") == "OK":
                self.stdout.write('✅ Google Maps API работает!')
                result = data["results"][0]
                self.stdout.write(f'📍 Результат: {result["formatted_address"]}')
                
                location = result["geometry"]["location"]
                self.stdout.write(f'🗺️ Координаты: {location["lat"]}, {location["lng"]}')
                
                # Parse components
                components = {}
                for comp in result.get("address_components", []):
                    for comp_type in comp["types"]:
                        components[comp_type] = comp["long_name"]
                
                self.stdout.write('🏗️ Компоненты:')
                for key, value in components.items():
                    if key in ['locality', 'administrative_area_level_1', 'country']:
                        self.stdout.write(f'   {key}: {value}')
                
                return True
            else:
                self.stdout.write(f'❌ API ошибка: {data.get("status")}')
                self.stdout.write(f'💬 Сообщение: {data.get("error_message", "Нет сообщения")}')
                return False
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка API вызова: {e}')
            return False

    def _test_model_geocoding(self):
        """Test geocoding through model."""
        self.stdout.write('\n🏗️ ТЕСТИРОВАНИЕ ГЕОКОДИРОВАНИЯ ЧЕРЕЗ МОДЕЛЬ')
        self.stdout.write('-' * 50)
        
        # Ensure demo account exists
        account = self._ensure_demo_account()
        
        test_locations = [
            {'input_region': 'Київська область', 'input_locality': 'Київ'},
            {'input_region': 'Одеська область', 'input_locality': 'Одеса'},
        ]
        
        for location_data in test_locations:
            self.stdout.write(f'\n📍 Тестирование: {location_data["input_locality"]}, {location_data["input_region"]}')
            
            try:
                with transaction.atomic():
                    # Create address - geocoding should happen automatically
                    address = RawAccountAddress.objects.create(
                        account=account,
                        **location_data
                    )
                    
                    if address.is_geocoded:
                        self.stdout.write('✅ Геокодирование успешно!')
                        self.stdout.write(f'   🌍 Стандартизированный: {address.locality}, {address.region}')
                        self.stdout.write(f'   🔑 geo_code: {address.geo_code}')
                        self.stdout.write(f'   📍 Координаты: {address.latitude}, {address.longitude}')
                    else:
                        self.stdout.write('❌ Геокодирование не удалось')
                        self.stdout.write(f'   💬 Ошибка: {address.geocoding_error}')
                        
            except Exception as e:
                self.stdout.write(f'❌ Ошибка создания адреса: {e}')

    def _ensure_demo_account(self):
        """Ensure demo account exists."""
        user, created = UserModel.objects.get_or_create(
            email='demo_real_geocoding@autoria.com',
            defaults={'is_active': True}
        )
        
        account, created = AddsAccount.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': 'Демо Реальное Геокодирование',
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )
        
        return account
