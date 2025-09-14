"""
Django management command for creating admin users (superusers).
"""
import getpass
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from core.utils.user_roles import UserRoleManager

User = get_user_model()


class Command(BaseCommand):
    """Django management command for creating admin users."""
    
    help = 'Create an admin user (superuser)'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--email',
            type=str,
            help='Admin email address'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            help='Admin first name'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            help='Admin last name'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Admin password (if not provided, will be prompted)'
        )
        parser.add_argument(
            '--interactive',
            action='store_true',
            help='Interactive mode for entering admin details'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        try:
            if options['interactive']:
                self._create_admin_interactive()
            else:
                email = options.get('email')
                first_name = options.get('first_name', '')
                last_name = options.get('last_name', '')
                password = options.get('password')
                
                if not email:
                    raise CommandError('Email is required. Use --email or --interactive')
                
                if not password:
                    password = getpass.getpass('Password: ')
                
                self._create_admin(email, password, first_name, last_name)
                
        except Exception as e:
            raise CommandError(f'Error creating admin: {e}')
    
    def _create_admin_interactive(self):
        """Create admin in interactive mode."""
        self.stdout.write(self.style.SUCCESS('Creating new admin user (superuser)'))
        self.stdout.write('=' * 50)
        
        # Get admin details
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
        self.stdout.write(f'\nCreating admin (superuser):')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Name: {first_name} {last_name}'.strip())
        
        self.stdout.write(
            self.style.WARNING(
                '\n⚠️  WARNING: This user will have FULL access to the system!'
            )
        )
        
        confirm = input('\nConfirm creation? (y/N): ').lower()
        if confirm != 'y':
            self.stdout.write(self.style.WARNING('Admin creation cancelled'))
            return
        
        self._create_admin(email, password, first_name, last_name)
    
    def _create_admin(self, email: str, password: str, first_name: str = '', last_name: str = ''):
        """Create an admin user."""
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            raise CommandError(f'User with email {email} already exists')
        
        try:
            with transaction.atomic():
                # Create admin user
                admin = UserRoleManager.create_admin(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Admin created successfully!\n'
                        f'Email: {admin.email}\n'
                        f'Name: {admin.get_full_name()}\n'
                        f'Role: Administrator (superuser)\n'
                        f'ID: {admin.id}'
                    )
                )
                
                # Show admin capabilities
                self.stdout.write('\n🔑 Admin capabilities:')
                self.stdout.write('• Full access to Django admin')
                self.stdout.write('• Create and manage managers')
                self.stdout.write('• Moderate all content')
                self.stdout.write('• Manage all users')
                self.stdout.write('• Access all system features')
                self.stdout.write('• Bypass all restrictions')
                
                self.stdout.write(
                    self.style.WARNING(
                        '\n⚠️  Security note: Keep admin credentials secure!'
                    )
                )
                
        except Exception as e:
            raise CommandError(f'Failed to create admin: {e}')
