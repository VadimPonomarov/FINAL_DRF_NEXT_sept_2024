"""
User permissions and role management using Django's built-in auth system.
"""
from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.permissions import BasePermission

User = get_user_model()


class UserRoleManager:
    """
    Manager for handling user roles using Django's built-in auth system.
    
    Roles:
    - Buyer: Any user (authenticated or anonymous) - no special permissions
    - Seller: User with 'can_create_ads' permission
    - Manager: Staff user with moderation permissions (is_staff=True)
    - Admin: Superuser with all permissions (is_superuser=True)
    """
    
    # Permission codenames
    PERMISSIONS = {
        'can_moderate_ads': 'Can moderate advertisements',
        'can_manage_users': 'Can manage users',
        'can_bypass_moderation': 'Can bypass automatic moderation',
        'can_delete_any_ad': 'Can delete any advertisement',
        'can_ban_users': 'Can ban users',
    }
    
    # Group names
    GROUPS = {
        'managers': 'Managers',
    }
    
    @classmethod
    def setup_permissions(cls):
        """Create custom permissions and groups."""
        from apps.ads.models import CarAdModel
        
        with transaction.atomic():
            # Get content type for ads
            ad_content_type = ContentType.objects.get_for_model(CarAdModel)
            user_content_type = ContentType.objects.get_for_model(User)
            
            # Create custom permissions
            permissions = []
            
            # Ad-related permissions
            for codename, name in cls.PERMISSIONS.items():
                if 'ad' in codename:
                    content_type = ad_content_type
                else:
                    content_type = user_content_type
                    
                permission, created = Permission.objects.get_or_create(
                    codename=codename,
                    content_type=content_type,
                    defaults={'name': name}
                )
                permissions.append(permission)
                if created:
                    print(f"Created permission: {codename}")
            
            # Create groups
            cls._create_groups(permissions)
    
    @classmethod
    def _create_groups(cls, permissions):
        """Create user groups with appropriate permissions."""
        # Managers group
        managers_group, created = Group.objects.get_or_create(
            name=cls.GROUPS['managers']
        )
        if created:
            # Managers can moderate, ban users, delete ads, bypass moderation
            manager_permissions = [
                'can_moderate_ads',
                'can_ban_users',
                'can_delete_any_ad',
                'can_bypass_moderation'
            ]
            for perm_codename in manager_permissions:
                try:
                    perm = Permission.objects.get(codename=perm_codename)
                    managers_group.permissions.add(perm)
                except Permission.DoesNotExist:
                    pass
            print(f"Created group: {cls.GROUPS['managers']}")
    
    @staticmethod
    def is_buyer(user) -> bool:
        """Check if user is a buyer (any user can browse)."""
        return True  # Anyone can be a buyer
    
    @staticmethod
    def is_seller(user) -> bool:
        """Check if user is a seller (can create ads)."""
        if not user or not user.is_authenticated:
            return False
        return True  # Any authenticated user is considered a seller
    
    @staticmethod
    def is_manager(user) -> bool:
        """Check if user is a manager (staff with moderation permissions)."""
        if not user or not user.is_authenticated:
            return False
        return user.is_staff and user.has_perm('ads.can_moderate_ads')
    
    @staticmethod
    def is_admin(user) -> bool:
        """Check if user is an admin (superuser)."""
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser
    
    @staticmethod
    def can_create_ads(user) -> bool:
        """Check if user can create advertisements."""
        if not user or not user.is_authenticated:
            return False
        return True  # Any authenticated user can create ads
    
    @staticmethod
    def can_moderate_ads(user) -> bool:
        """Check if user can moderate advertisements."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm('ads.can_moderate_ads') or user.is_superuser
    
    @staticmethod
    def can_manage_users(user) -> bool:
        """Check if user can manage other users."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm('auth.can_manage_users') or user.is_superuser
    
    @staticmethod
    def can_bypass_moderation(user) -> bool:
        """Check if user can bypass automatic moderation."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm('ads.can_bypass_moderation') or user.is_superuser
    
    @staticmethod
    def can_delete_any_ad(user) -> bool:
        """Check if user can delete any advertisement."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm('ads.can_delete_any_ad') or user.is_superuser
    
    @staticmethod
    def can_ban_users(user) -> bool:
        """Check if user can ban other users."""
        if not user or not user.is_authenticated:
            return False
        return user.has_perm('auth.can_ban_users') or user.is_superuser
    
    @staticmethod
    def get_user_role(user) -> str:
        """Get the primary role of a user."""
        if not user or not user.is_authenticated:
            return "buyer"

        if user.is_superuser:
            return "admin"

        if UserRoleManager.is_manager(user):
            return "manager"

        # Any authenticated user is a seller
        return "seller"
    
    @staticmethod
    def get_role_display_name(role: str) -> str:
        """Get display name for role."""
        role_names = {
            "buyer": "Покупець",
            "seller": "Продавець", 
            "manager": "Менеджер",
            "admin": "Адміністратор"
        }
        return role_names.get(role, role)
    

    @staticmethod
    def make_manager(user) -> bool:
        """Make user a manager by setting staff status and adding to managers group."""
        if not user or not user.is_authenticated:
            return False
        
        try:
            with transaction.atomic():
                # Set staff status
                user.is_staff = True
                user.save()
                
                # Add to managers group
                managers_group = Group.objects.get(name=UserRoleManager.GROUPS['managers'])
                user.groups.add(managers_group)
                
                return True
        except Group.DoesNotExist:
            return False
    
    @staticmethod
    def remove_manager_role(user) -> bool:
        """Remove manager role from user."""
        if not user or not user.is_authenticated:
            return False
        
        try:
            with transaction.atomic():
                # Remove staff status (unless superuser)
                if not user.is_superuser:
                    user.is_staff = False
                    user.save()
                
                # Remove from managers group
                managers_group = Group.objects.get(name=UserRoleManager.GROUPS['managers'])
                user.groups.remove(managers_group)
                
                return True
        except Group.DoesNotExist:
            return False


# Convenience functions
def is_buyer(user) -> bool:
    """Check if user is buyer."""
    return UserRoleManager.is_buyer(user)

def is_seller(user) -> bool:
    """Check if user is seller."""
    return UserRoleManager.is_seller(user)

def is_manager(user) -> bool:
    """Check if user is manager."""
    return UserRoleManager.is_manager(user)

def is_admin(user) -> bool:
    """Check if user is admin."""
    return UserRoleManager.is_admin(user)

def can_create_ads(user) -> bool:
    """Check if user can create ads."""
    return UserRoleManager.can_create_ads(user)

def can_moderate_ads(user) -> bool:
    """Check if user can moderate ads."""
    return UserRoleManager.can_moderate_ads(user)

def can_bypass_moderation(user) -> bool:
    """Check if user can bypass moderation."""
    return UserRoleManager.can_bypass_moderation(user)

def get_user_role(user) -> str:
    """Get user role."""
    return UserRoleManager.get_user_role(user)


class IsSuperUser(BasePermission):
    """
    Permission class that allows access only to superusers.

    Used for sensitive operations like manual ad status management.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated and is a superuser."""
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )


class IsStaffOrSuperUser(BasePermission):
    """
    Permission class that allows access to staff users and superusers.

    Used for reference data management (vehicle characteristics, etc.).
    """

    def has_permission(self, request, view):
        """Check if user is authenticated and is staff or superuser."""
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsOwnerOrSuperUser(BasePermission):
    """
    Permission class that allows access to object owners and superusers.

    Used for account and ad management.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return bool(
            request.user and
            request.user.is_authenticated
        )

    def has_object_permission(self, request, view, obj):
        """Check if user is owner or superuser."""
        # Superusers can access everything
        if request.user.is_superuser:
            return True

        # Check ownership based on object type
        if hasattr(obj, 'account'):
            # For ads and related objects
            return obj.account.user == request.user
        elif hasattr(obj, 'user'):
            # For account objects
            return obj.user == request.user
        elif hasattr(obj, 'ad'):
            # For ad-related objects (images, etc.)
            return obj.ad.account.user == request.user

        # Default: deny access
        return False


class ReadOnlyOrStaffWrite(BasePermission):
    """
    Permission class for reference data:
    - Read access for everyone
    - Write access only for staff and superusers
    """

    def has_permission(self, request, view):
        """Allow read access to everyone, write access to staff only."""
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )
