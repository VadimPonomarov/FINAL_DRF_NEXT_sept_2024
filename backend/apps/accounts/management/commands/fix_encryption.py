"""
Django management command to fix and test encryption system.
"""

import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Fix and test encryption system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-only',
            action='store_true',
            help='Only test current encryption, do not fix'
        )
        parser.add_argument(
            '--re-encrypt',
            action='store_true',
            help='Re-encrypt the Google Maps API key'
        )

    def handle(self, *args, **options):
        """Fix and test encryption system."""
        try:
            self.stdout.write('🔧 ИСПРАВЛЕНИЕ СИСТЕМЫ ШИФРОВАНИЯ')
            self.stdout.write('=' * 60)
            
            # Test current system
            current_works = self._test_current_encryption()
            
            if current_works:
                self.stdout.write('✅ Система шифрования работает корректно!')
                return
            
            if options['test_only']:
                self.stdout.write('❌ Система шифрования не работает (только тестирование)')
                return
            
            # Try to fix the system
            self._fix_encryption_system()
            
            # Re-encrypt if requested
            if options['re_encrypt']:
                self._re_encrypt_api_key()
            
            # Test again
            if self._test_current_encryption():
                self.stdout.write('✅ Система шифрования исправлена и работает!')
            else:
                self.stdout.write('❌ Не удалось исправить систему шифрования')
                self._suggest_fallback()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка исправления: {e}')
            raise

    def _test_current_encryption(self):
        """Test current encryption system."""
        self.stdout.write('\n🔍 ТЕСТИРОВАНИЕ ТЕКУЩЕЙ СИСТЕМЫ')
        self.stdout.write('-' * 40)
        
        try:
            from core.utils.encryption import encryption_service
            
            # Test basic encryption/decryption
            test_data = "test_api_key_12345"
            encrypted = encryption_service.encrypt(test_data)
            decrypted = encryption_service.decrypt(encrypted)
            
            if decrypted == test_data:
                self.stdout.write('✅ Базовое шифрование/дешифрование работает')
                
                # Test API key encryption/decryption
                encrypted_api = encryption_service.encrypt_api_key(test_data, "TEST_KEY")
                decrypted_api = encryption_service.decrypt_api_key(encrypted_api, "TEST_KEY")
                
                if decrypted_api == test_data:
                    self.stdout.write('✅ Шифрование/дешифрование API ключей работает')
                    
                    # Test with real Google Maps key
                    encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
                    if encrypted_key:
                        try:
                            decrypted_real = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
                            if decrypted_real and len(decrypted_real) > 20:
                                self.stdout.write('✅ Дешифрование реального Google Maps ключа работает')
                                self.stdout.write(f'📏 Длина ключа: {len(decrypted_real)} символов')
                                return True
                            else:
                                self.stdout.write('❌ Дешифрование реального ключа вернуло некорректные данные')
                        except Exception as e:
                            self.stdout.write(f'❌ Ошибка дешифрования реального ключа: {e}')
                    else:
                        self.stdout.write('⚠️ Нет зашифрованного Google Maps ключа для тестирования')
                        return True  # Basic encryption works
                else:
                    self.stdout.write('❌ Шифрование/дешифрование API ключей не работает')
            else:
                self.stdout.write('❌ Базовое шифрование/дешифрование не работает')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования: {e}')
        
        return False

    def _fix_encryption_system(self):
        """Try to fix encryption system."""
        self.stdout.write('\n🔧 ИСПРАВЛЕНИЕ СИСТЕМЫ ШИФРОВАНИЯ')
        self.stdout.write('-' * 40)
        
        try:
            # Reinitialize encryption service
            from core.utils.encryption import encryption_service
            encryption_service._initialize_encryption()
            
            if encryption_service._fernet:
                self.stdout.write('✅ Система шифрования переинициализирована')
            else:
                self.stdout.write('❌ Не удалось переинициализировать систему шифрования')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка исправления: {e}')

    def _re_encrypt_api_key(self):
        """Re-encrypt Google Maps API key."""
        self.stdout.write('\n🔄 ПЕРЕШИФРОВАНИЕ GOOGLE MAPS API КЛЮЧА')
        self.stdout.write('-' * 40)
        
        # Use the working key we know
        api_key = 'AIzaSyBvc_dfn6Vl3CfLNCESkcApicC4GwLHGYs'
        
        try:
            from core.utils.encryption import encryption_service
            
            encrypted_key = encryption_service.encrypt_api_key(api_key, 'GOOGLE_MAPS_API_KEY')
            
            self.stdout.write('✅ Ключ перешифрован успешно')
            self.stdout.write(f'🔐 Новый зашифрованный ключ: {encrypted_key}')
            self.stdout.write('')
            self.stdout.write('📝 Обновите .env.local:')
            self.stdout.write(f'ENCRYPTED_GOOGLE_MAPS_API_KEY="{encrypted_key}"')
            
            # Test the new encrypted key
            decrypted = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
            if decrypted == api_key:
                self.stdout.write('✅ Новый зашифрованный ключ работает корректно')
            else:
                self.stdout.write('❌ Новый зашифрованный ключ не работает')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка перешифрования: {e}')

    def _suggest_fallback(self):
        """Suggest fallback solution."""
        self.stdout.write('\n💡 РЕЗЕРВНОЕ РЕШЕНИЕ')
        self.stdout.write('-' * 40)
        
        self.stdout.write('🔧 Если шифрование не работает, используйте прямой ключ:')
        self.stdout.write('')
        self.stdout.write('1. Добавьте в .env.local:')
        self.stdout.write('   GOOGLE_MAPS_API_KEY="AIzaSyBvc_dfn6Vl3CfLNCESkcApicC4GwLHGYs"')
        self.stdout.write('')
        self.stdout.write('2. Обновите код геокодирования для использования прямого ключа')
        self.stdout.write('')
        self.stdout.write('⚠️ ВНИМАНИЕ: В продакшене обязательно используйте шифрование!')

    def _test_google_maps_api(self, api_key):
        """Test Google Maps API with the key."""
        self.stdout.write('\n🌐 ТЕСТИРОВАНИЕ GOOGLE MAPS API')
        self.stdout.write('-' * 40)
        
        try:
            import requests
            
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
                return True
            else:
                self.stdout.write(f'❌ Google Maps API ошибка: {data.get("status")}')
                return False
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования API: {e}')
            return False
