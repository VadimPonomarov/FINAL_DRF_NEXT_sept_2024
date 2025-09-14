"""
Django management command to diagnose encryption system issues.
"""

import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Diagnose encryption system issues'

    def handle(self, *args, **options):
        """Diagnose encryption system."""
        try:
            self.stdout.write('🔍 ДИАГНОСТИКА СИСТЕМЫ ШИФРОВАНИЯ')
            self.stdout.write('=' * 50)
            
            # Check environment variables
            encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
            self.stdout.write(f'📝 Зашифрованный ключ в .env.local: {encrypted_key[:50] if encrypted_key else "НЕТ"}...')
            
            # Check encryption_service
            self._test_encryption_service(encrypted_key)
            
            # Check key_manager
            self._test_key_manager()
            
            # Suggest solutions
            self._suggest_solutions()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка диагностики: {e}')
            raise

    def _test_encryption_service(self, encrypted_key):
        """Test encryption_service."""
        self.stdout.write('\n🔧 ТЕСТИРОВАНИЕ ENCRYPTION_SERVICE')
        self.stdout.write('-' * 40)
        
        try:
            from core.utils.encryption import encryption_service
            self.stdout.write('✅ encryption_service импортирован успешно')
            
            if encrypted_key:
                decrypted = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
                if decrypted:
                    self.stdout.write(f'✅ Дешифрование успешно: {decrypted[:20]}...')
                    self.stdout.write(f'📏 Длина ключа: {len(decrypted)} символов')
                    return decrypted
                else:
                    self.stdout.write('❌ Дешифрование вернуло None')
            else:
                self.stdout.write('❌ Нет зашифрованного ключа для тестирования')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка encryption_service: {e}')
        
        return None

    def _test_key_manager(self):
        """Test key_manager."""
        self.stdout.write('\n🔧 ТЕСТИРОВАНИЕ KEY_MANAGER')
        self.stdout.write('-' * 40)
        
        try:
            from core.security import key_manager
            self.stdout.write('✅ key_manager импортирован успешно')
            
            api_key = key_manager.google_maps_api_key
            if api_key:
                self.stdout.write(f'✅ key_manager работает: {api_key[:20]}...')
                self.stdout.write(f'📏 Длина ключа: {len(api_key)} символов')
                return api_key
            else:
                self.stdout.write('❌ key_manager вернул None')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка key_manager: {e}')
        
        return None

    def _suggest_solutions(self):
        """Suggest solutions."""
        self.stdout.write('\n💡 ПРЕДЛАГАЕМЫЕ РЕШЕНИЯ')
        self.stdout.write('-' * 40)
        
        self.stdout.write('🔧 ВАРИАНТ 1: Исправить шифрование')
        self.stdout.write('   - Проверить ключ шифрования в настройках')
        self.stdout.write('   - Перешифровать API ключ заново')
        self.stdout.write('   - Проверить совместимость версий')
        
        self.stdout.write('\n🔧 ВАРИАНТ 2: Использовать незашифрованный ключ')
        self.stdout.write('   - Добавить GOOGLE_MAPS_API_KEY в .env.local')
        self.stdout.write('   - Обновить код для использования прямого ключа')
        self.stdout.write('   - Быстрое решение для разработки')
        
        self.stdout.write('\n⚠️ РЕКОМЕНДАЦИЯ:')
        self.stdout.write('   Для быстрого решения используем незашифрованный ключ')
        self.stdout.write('   В продакшене обязательно использовать шифрование!')

    def _test_direct_api_call(self, api_key):
        """Test direct API call."""
        if not api_key:
            return
        
        self.stdout.write('\n🌐 ТЕСТИРОВАНИЕ ПРЯМОГО ВЫЗОВА API')
        self.stdout.write('-' * 40)
        
        try:
            import requests
            
            # Test geocoding call
            endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": "Київ, Україна",
                "key": api_key,
                "language": "uk"
            }
            
            response = requests.get(endpoint, params=params, timeout=10)
            data = response.json()
            
            if data.get("status") == "OK":
                self.stdout.write('✅ Google Maps API работает!')
                result = data["results"][0]
                self.stdout.write(f'📍 Результат: {result["formatted_address"]}')
                location = result["geometry"]["location"]
                self.stdout.write(f'🗺️ Координаты: {location["lat"]}, {location["lng"]}')
            else:
                self.stdout.write(f'❌ Google Maps API ошибка: {data.get("status")}')
                self.stdout.write(f'💬 Сообщение: {data.get("error_message", "Нет сообщения")}')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования API: {e}')
