"""
Django management command for making users managers.
"""
import getpass
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from core.permissions.user_permissions import UserRoleManager

User = get_user_model()


class Command(BaseCommand):
    """Django management command for making users managers."""
    
    help = 'Make a user a manager (staff with moderation permissions)'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            'email',
            type=str,
            help='Email of the user to make manager'
        )
        parser.add_argument(
            '--create',
            action='store_true',
            help='Create user if they do not exist'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            help='First name (only when creating new user)'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            help='Last name (only when creating new user)'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        email = options['email']
        
        try:
            # Try to get existing user
            try:
                user = User.objects.get(email=email)
                self.stdout.write(f'Found existing user: {user.email}')
            except User.DoesNotExist:
                if options['create']:
                    user = self._create_user(email, options)
                else:
                    raise CommandError(f'User with email {email} not found. Use --create to create new user.')
            
            # Make user a manager
            if UserRoleManager.make_manager(user):
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Successfully made {user.email} a manager!\n'
                        f'User now has staff status and moderation permissions.'
                    )
                )
                
                # Show user's new permissions
                self._show_user_permissions(user)
            else:
                raise CommandError('Failed to make user a manager')
                
        except Exception as e:
            raise CommandError(f'Error making user manager: {e}')
    
    def _create_user(self, email: str, options: dict):
        """Create a new user."""
        self.stdout.write(f'Creating new user: {email}')
        
        # Get password
        password = getpass.getpass('Password for new user: ')
        if len(password) < 8:
            raise CommandError('Password must be at least 8 characters long')
        
        # Create user
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=options.get('first_name', ''),
            last_name=options.get('last_name', ''),
            is_active=True
        )
        
        self.stdout.write(f'Created user: {user.email}')
        return user
    
    def _show_user_permissions(self, user):
        """Show user's permissions."""
        self.stdout.write('\n📋 User Permissions:')
        self.stdout.write(f'• Is staff: {"✅" if user.is_staff else "❌"}')
        self.stdout.write(f'• Is superuser: {"✅" if user.is_superuser else "❌"}')
        self.stdout.write(f'• Can create ads: ✅ (all authenticated users)')
        self.stdout.write(f'• Can moderate ads: {"✅" if UserRoleManager.can_moderate_ads(user) else "❌"}')
        self.stdout.write(f'• Can bypass moderation: {"✅" if UserRoleManager.can_bypass_moderation(user) else "❌"}')
        self.stdout.write(f'• Can delete any ad: {"✅" if UserRoleManager.can_delete_any_ad(user) else "❌"}')
        self.stdout.write(f'• Can ban users: {"✅" if UserRoleManager.can_ban_users(user) else "❌"}')
        
        # Show groups
        groups = user.groups.all()
        if groups:
            self.stdout.write(f'\n👥 Groups: {", ".join([g.name for g in groups])}')
        else:
            self.stdout.write('\n👥 Groups: None')
