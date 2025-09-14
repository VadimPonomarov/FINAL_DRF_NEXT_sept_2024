"""
Django management command for showing user roles and permissions.
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from core.permissions.user_permissions import UserRoleManager

User = get_user_model()


class Command(BaseCommand):
    """Django management command for showing user roles."""
    
    help = 'Show user roles and permissions information'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--user',
            type=str,
            help='Show role for specific user email'
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show role statistics'
        )
        parser.add_argument(
            '--managers',
            action='store_true',
            help='List all managers'
        )

    
    def handle(self, *args, **options):
        """Handle the command execution."""
        if options['user']:
            self._show_user_role(options['user'])
        elif options['stats']:
            self._show_role_statistics()
        elif options['managers']:
            self._list_managers()
        else:
            self._show_general_info()
    
    def _show_general_info(self):
        """Show general role information."""
        self.stdout.write(self.style.SUCCESS('🎭 User Roles System'))
        self.stdout.write('=' * 40)

        self.stdout.write('\n📋 Available Roles:')
        self.stdout.write('• 👤 Buyer (Покупець) - Any user browsing the platform')
        self.stdout.write('• 🏪 Seller (Продавець) - Any authenticated user (can create ads)')
        self.stdout.write('• 👨‍💼 Manager (Менеджер) - Staff user who moderates content')
        self.stdout.write('• 🔑 Admin (Адміністратор) - Superuser with full access')

        self.stdout.write('\n🔐 Permission System:')
        self.stdout.write('• Based on Django auth system')
        self.stdout.write('• Uses Groups and Permissions')
        self.stdout.write('• Staff status for managers')
        self.stdout.write('• Superuser status for admins')

        self._show_role_statistics()
    
    def _show_user_role(self, email: str):
        """Show role for specific user."""
        try:
            user = User.objects.get(email=email)

            role = UserRoleManager.get_user_role(user)
            role_display = UserRoleManager.get_role_display_name(role)

            self.stdout.write(self.style.SUCCESS(f'👤 User: {user.email}'))
            self.stdout.write('=' * 30)
            self.stdout.write(f'Name: {user.get_full_name() or "N/A"}')
            self.stdout.write(f'Role: {role_display} ({role})')
            self.stdout.write(f'Active: {"✅" if user.is_active else "❌"}')
            self.stdout.write(f'Staff: {"✅" if user.is_staff else "❌"}')
            self.stdout.write(f'Superuser: {"✅" if user.is_superuser else "❌"}')

            # Show permissions
            self.stdout.write('\n🔐 Permissions:')
            permissions = [
                ('Can create ads', UserRoleManager.can_create_ads(user)),
                ('Can moderate ads', UserRoleManager.can_moderate_ads(user)),
                ('Can manage users', UserRoleManager.can_manage_users(user)),
                ('Can bypass moderation', UserRoleManager.can_bypass_moderation(user)),
                ('Can delete any ad', UserRoleManager.can_delete_any_ad(user)),
                ('Can ban users', UserRoleManager.can_ban_users(user)),
            ]

            for perm_name, has_perm in permissions:
                icon = "✅" if has_perm else "❌"
                self.stdout.write(f'• {perm_name}: {icon}')

            # Show groups
            groups = user.groups.all()
            if groups:
                group_names = [g.name for g in groups]
                self.stdout.write(f'\n👥 Groups: {", ".join(group_names)}')

        except User.DoesNotExist:
            raise CommandError(f'User with email {email} not found')
    
    def _show_role_statistics(self):
        """Show role statistics."""
        self.stdout.write('\n📊 Role Statistics:')

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()

        # Count by role
        admins = User.objects.filter(is_superuser=True, is_active=True).count()
        managers = User.objects.filter(is_staff=True, is_superuser=False, is_active=True).count()

        # Count sellers (authenticated users)
        sellers = active_users  # All authenticated users are sellers

        buyers = active_users  # All users can also be buyers

        self.stdout.write(f'Total users: {total_users}')
        self.stdout.write(f'Active users: {active_users}')
        self.stdout.write(f'🔑 Admins: {admins}')
        self.stdout.write(f'👨‍💼 Managers: {managers}')
        self.stdout.write(f'🏪 Sellers: {sellers} (all authenticated users)')
        self.stdout.write(f'👤 Buyers: {buyers} (all users can browse)')
    
    def _list_managers(self):
        """List all managers."""
        managers = User.objects.filter(
            is_staff=True,
            is_superuser=False,
            is_active=True
        ).order_by('email')

        self.stdout.write(self.style.SUCCESS('👨‍💼 Platform Managers'))
        self.stdout.write('=' * 30)

        if not managers.exists():
            self.stdout.write('No managers found.')
            self.stdout.write('\nTo create a manager:')
            self.stdout.write('python manage.py make_manager <email>')
            return

        for manager in managers:
            name = manager.get_full_name() or "No name"
            self.stdout.write(f'• {manager.email} - {name}')


