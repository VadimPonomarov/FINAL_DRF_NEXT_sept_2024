"""
Django management command for setting up user permissions and groups.
"""
from django.core.management.base import BaseCommand
from core.permissions.user_permissions import UserRoleManager


class Command(BaseCommand):
    """Django management command for setting up permissions."""
    
    help = 'Setup user permissions and groups for the platform'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of permissions and groups'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        self.stdout.write(self.style.SUCCESS('🔐 Setting up user permissions and groups'))
        self.stdout.write('=' * 50)
        
        try:
            # Setup permissions and groups
            UserRoleManager.setup_permissions()
            
            self.stdout.write(self.style.SUCCESS('✅ Permissions and groups setup completed!'))
            
            # Show created permissions
            self._show_permissions_info()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error setting up permissions: {e}'))
    
    def _show_permissions_info(self):
        """Show information about created permissions and groups."""
        self.stdout.write('\n📋 Created Permissions:')
        for codename, name in UserRoleManager.PERMISSIONS.items():
            self.stdout.write(f'• {codename}: {name}')
        
        self.stdout.write('\n👥 Created Groups:')
        for key, name in UserRoleManager.GROUPS.items():
            self.stdout.write(f'• {name} ({key})')
        
        self.stdout.write('\n🎭 User Roles:')
        self.stdout.write('• 👤 Buyer: Any user (no special permissions)')
        self.stdout.write('• 🏪 Seller: Any authenticated user (can create ads)')
        self.stdout.write('• 👨‍💼 Manager: Staff user with moderation permissions')
        self.stdout.write('• 🔑 Admin: Superuser with all permissions')

        self.stdout.write('\n📝 Next Steps:')
        self.stdout.write('1. Use "python manage.py make_manager <email>" to create managers')
        self.stdout.write('2. Any authenticated user can create ads automatically')
        self.stdout.write('3. Use Django admin to assign additional permissions manually')
