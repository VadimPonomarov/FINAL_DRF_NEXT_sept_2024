"""
Django management command to encrypt the new Google Maps API key.
"""

from django.core.management.base import BaseCommand
from core.utils.encryption import encryption_service


class Command(BaseCommand):
    help = 'Encrypt new Google Maps API key'

    def handle(self, *args, **options):
        """Encrypt the new API key."""
        try:
            self.stdout.write('🔐 ШИФРОВАНИЕ НОВОГО API КЛЮЧА')
            self.stdout.write('=' * 50)
            
            # New working API key
            api_key = 'AIzaSyBvc_dfn6Vl3CfLNCESkcApicC4GwLHGYs'
            
            # Encrypt the key
            encrypted_key = encryption_service.encrypt_api_key(api_key, 'GOOGLE_MAPS_API_KEY')
            
            self.stdout.write(f'Исходный ключ: {api_key}')
            self.stdout.write(f'Зашифрованный ключ: {encrypted_key}')
            self.stdout.write('')
            self.stdout.write('📝 Обновите .env.local:')
            self.stdout.write(f'ENCRYPTED_GOOGLE_MAPS_API_KEY="{encrypted_key}"')
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка шифрования: {e}')
            raise
