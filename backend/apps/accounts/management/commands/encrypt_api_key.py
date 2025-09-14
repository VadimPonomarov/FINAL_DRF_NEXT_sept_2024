"""
Management command to encrypt an API key and update the .env.local file.
"""
import os
import sys
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from core.utils.encryption import encryption_service

class Command(BaseCommand):
    help = 'Encrypt an API key and update the .env.local file'
    
    def add_arguments(self, parser):
        parser.add_argument('key', type=str, help='The API key to encrypt')
        parser.add_argument(
            '--env-var', 
            type=str, 
            default='GOOGLE_MAPS_API_KEY',
            help='Environment variable name (default: GOOGLE_MAPS_API_KEY)'
        )
        parser.add_argument(
            '--env-file',
            type=str,
            default='.env.local',
            help='Path to the .env file (default: .env.local)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force overwrite if the key already exists in the .env file'
        )
    
    def handle(self, *args, **options):
        key = options['key']
        env_var = options.get('env_var', 'API_KEY')
        env_file = options.get('env_file', '.env.local')
        force = options.get('force', False)
        
        # Validate key
        if not key or not key.strip():
            raise CommandError('API key cannot be empty')
            
        # Check if the key is already encrypted (starts with the expected prefix)
        if key.startswith('gAAAAA') and not force:
            self.stdout.write(
                self.style.WARNING('The provided key appears to already be encrypted. Use --force to overwrite.')
            )
            return
        
        # Encrypt the key
        try:
            encrypted_key = encryption_service.encrypt(key)
            self.stdout.write(self.style.SUCCESS('✅ API key encrypted successfully'))
            self.stdout.write(f'Encrypted key: {encrypted_key}')
            
            # Print the key in a format that can be directly pasted into .env file
            self.stdout.write('\nAdd this to your .env.local file:')
            self.stdout.write(self.style.SUCCESS(f'{env_var}="{encrypted_key}"'))
            
            # Also save to .env.local file
            env_path = Path(env_file)
            env_content = []
            key_updated = False
            
            # Read existing environment variables if file exists
            if env_path.exists():
                with open(env_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        # Check if this line contains our environment variable
                        if line.startswith(f'{env_var}='):
                            env_content.append(f'{env_var}="{encrypted_key}"\n')
                            key_updated = True
                        elif line:  # Preserve other lines
                            env_content.append(f'{line}\n')
            
            # If the key wasn't in the file, add it
            if not key_updated:
                env_content.append(f'{env_var}="{encrypted_key}"\n')
            
            # Write back to the environment file
            try:
                with open(env_path, 'w') as f:
                    f.writelines(env_content)
                
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Successfully updated {env_file} with encrypted {env_var}')
                )
                
                self.stdout.write('\nYou can now restart your Django server for the changes to take effect.')
                
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'❌ Error writing to {env_file}: {str(e)}'))
                self.stderr.write('Please add the following line to your .env.local file manually:')
                self.stderr.write(self.style.SUCCESS(f'{env_var}="{encrypted_key}"'))
                
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            if 'encrypt' in str(e).lower():
                self.stderr.write('\nMake sure you have the cryptography package installed:')
                self.stderr.write('   pip install cryptography')
            raise CommandError('Failed to encrypt and save API key')
        
        return encrypted_key
