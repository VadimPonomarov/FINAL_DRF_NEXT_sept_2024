"""
Django management command for encrypting API keys.
"""
from django.core.management.base import BaseCommand, CommandError
from core.security.key_encryption_tool import KeyEncryptionTool


class Command(BaseCommand):
    """Django management command for API key encryption."""
    
    help = 'Encrypt API keys for secure storage'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--interactive', '-i',
            action='store_true',
            help='Interactive mode for encrypting multiple keys'
        )
        parser.add_argument(
            '--key-name', '-k',
            type=str,
            help='Name of the API key to encrypt'
        )
        parser.add_argument(
            '--api-key', '-a',
            type=str,
            help='API key value to encrypt'
        )
        parser.add_argument(
            '--output', '-o',
            type=str,
            help='Output file to append encrypted key'
        )
        parser.add_argument(
            '--status', '-s',
            action='store_true',
            help='Show status of all API keys'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        tool = KeyEncryptionTool()
        
        try:
            if options['status']:
                tool.list_status()
            elif options['interactive']:
                tool.interactive_encrypt()
            elif options['key_name'] and options['api_key']:
                tool.encrypt_from_args(
                    options['key_name'],
                    options['api_key'],
                    options['output']
                )
            else:
                self.print_help('manage.py', 'encrypt_api_keys')
                
        except Exception as e:
            raise CommandError(f'Error encrypting API keys: {e}')
