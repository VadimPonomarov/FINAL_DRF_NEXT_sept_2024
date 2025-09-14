"""
Django management command for creating manager users.
Only admins can create managers.
"""
import getpass
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from core.utils.user_roles import UserRoleManager

User = get_user_model()


class Command(BaseCommand):
    """Django management command for creating manager users."""
    
    help = 'Create a manager user (can only be done by admin)'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--email',
            type=str,
            help='Manager email address'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            help='Manager first name'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            help='Manager last name'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Manager password (if not provided, will be prompted)'
        )
        parser.add_argument(
            '--interactive',
            action='store_true',
            help='Interactive mode for entering manager details'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        try:
            if options['interactive']:
                self._create_manager_interactive()
            else:
                email = options.get('email')
                first_name = options.get('first_name', '')
                last_name = options.get('last_name', '')
                password = options.get('password')
                
                if not email:
                    raise CommandError('Email is required. Use --email or --interactive')
                
                if not password:
                    password = getpass.getpass('Password: ')
                
                self._create_manager(email, password, first_name, last_name)
                
        except Exception as e:
            raise CommandError(f'Error creating manager: {e}')
    
    def _create_manager_interactive(self):
        """Create manager in interactive mode."""
        self.stdout.write(self.style.SUCCESS('Creating new manager user'))
        self.stdout.write('=' * 40)
        
        # Get manager details
        email = input('Email: ').strip()
        if not email:
            raise CommandError('Email is required')
        
        first_name = input('First name (optional): ').strip()
        last_name = input('Last name (optional): ').strip()
        
        # Get password
        password = getpass.getpass('Password: ')
        password_confirm = getpass.getpass('Confirm password: ')
        
        if password != password_confirm:
            raise CommandError('Passwords do not match')
        
        if len(password) < 8:
            raise CommandError('Password must be at least 8 characters long')
        
        # Confirm creation
        self.stdout.write(f'\nCreating manager:')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Name: {first_name} {last_name}'.strip())
        
        confirm = input('\nConfirm creation? (y/N): ').lower()
        if confirm != 'y':
            self.stdout.write(self.style.WARNING('Manager creation cancelled'))
            return
        
        self._create_manager(email, password, first_name, last_name)
    
    def _create_manager(self, email: str, password: str, first_name: str = '', last_name: str = ''):
        """Create a manager user."""
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            raise CommandError(f'User with email {email} already exists')
        
        try:
            with transaction.atomic():
                # Create manager user
                manager = UserRoleManager.create_manager(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Manager created successfully!\n'
                        f'Email: {manager.email}\n'
                        f'Name: {manager.get_full_name()}\n'
                        f'Role: Manager (staff)\n'
                        f'ID: {manager.id}'
                    )
                )
                
                # Show manager capabilities
                self.stdout.write('\n📋 Manager capabilities:')
                self.stdout.write('• Moderate advertisements')
                self.stdout.write('• Review flagged content')
                self.stdout.write('• Ban users (if implemented)')
                self.stdout.write('• Delete invalid ads')
                self.stdout.write('• Bypass automatic moderation')
                
                self.stdout.write(
                    self.style.WARNING(
                        '\n⚠️  Note: Only administrators can create managers'
                    )
                )
                
        except Exception as e:
            raise CommandError(f'Failed to create manager: {e}')
    
    def _validate_email(self, email: str) -> bool:
        """Basic email validation."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
