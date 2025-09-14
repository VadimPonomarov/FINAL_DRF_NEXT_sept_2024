"""
Utilities for managing user roles and permissions.
"""
from typing import Optional
from django.contrib.auth import get_user_model
from core.enums.ads import RoleEnum

User = get_user_model()


class UserRoleManager:
    """
    Manager for handling user roles and permissions.
    
    Role hierarchy:
    - Buyer: Any user (authenticated or anonymous) browsing the platform
    - Seller: Regular user who can create ads (user with account)
    - Manager: Staff user who moderates content (is_staff=True)
    - Admin: Superuser who can do everything (is_superuser=True)
    """
    
    @staticmethod
    def get_user_role(user) -> str:
        """
        Get the role of a user based on their permissions.
        
        Args:
            user: User instance or None for anonymous
            
        Returns:
            str: User role (buyer, seller, manager, admin)
        """
        if not user or not user.is_authenticated:
            return "buyer"  # Anonymous users are buyers
        
        if user.is_superuser:
            return RoleEnum.ADMIN
        
        if user.is_staff:
            return RoleEnum.MANAGER
        
        # Check if user has an account (can create ads)
        if hasattr(user, 'account_adds'):
            return user.account_adds.role
        
        return "buyer"  # Authenticated user without account is still a buyer
    
    @staticmethod
    def is_buyer(user) -> bool:
        """Check if user is a buyer (any user browsing the platform)."""
        return True  # Anyone can be a buyer
    
    @staticmethod
    def is_seller(user) -> bool:
        """Check if user is a seller (can create ads)."""
        if not user or not user.is_authenticated:
            return False
        return hasattr(user, 'account_adds') and user.account_adds.role in [RoleEnum.SELLER, RoleEnum.DEALER]
    
    @staticmethod
    def is_manager(user) -> bool:
        """Check if user is a manager (can moderate content)."""
        if not user or not user.is_authenticated:
            return False
        return user.is_staff and not user.is_superuser
    
    @staticmethod
    def is_admin(user) -> bool:
        """Check if user is an admin (can do everything)."""
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser
    
    @staticmethod
    def can_create_ads(user) -> bool:
        """Check if user can create advertisements."""
        return UserRoleManager.is_seller(user) or UserRoleManager.is_admin(user)
    
    @staticmethod
    def can_moderate_ads(user) -> bool:
        """Check if user can moderate advertisements."""
        return UserRoleManager.is_manager(user) or UserRoleManager.is_admin(user)
    
    @staticmethod
    def can_manage_users(user) -> bool:
        """Check if user can manage other users."""
        return UserRoleManager.is_admin(user)
    
    @staticmethod
    def can_bypass_moderation(user) -> bool:
        """Check if user can bypass automatic moderation."""
        return UserRoleManager.is_manager(user) or UserRoleManager.is_admin(user)
    
    @staticmethod
    def get_role_display_name(role: str) -> str:
        """Get display name for role."""
        role_names = {
            "buyer": "Покупець",
            RoleEnum.SELLER: "Продавець",
            RoleEnum.DEALER: "Автосалон", 
            RoleEnum.MANAGER: "Менеджер",
            RoleEnum.ADMIN: "Адміністратор"
        }
        return role_names.get(role, role)
    
    @staticmethod
    def create_manager(email: str, password: str, first_name: str = "", last_name: str = "") -> User:
        """
        Create a manager user (can only be done by admin).
        
        Args:
            email: Manager email
            password: Manager password
            first_name: Manager first name
            last_name: Manager last name
            
        Returns:
            User: Created manager user
        """
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,  # Manager is staff
            is_active=True
        )
        
        # Create account with manager role
        from apps.accounts.models import AddsAccount
        AddsAccount.objects.create(
            user=user,
            role=RoleEnum.MANAGER
        )
        
        return user
    
    @staticmethod
    def create_admin(email: str, password: str, first_name: str = "", last_name: str = "") -> User:
        """
        Create an admin user (superuser).
        
        Args:
            email: Admin email
            password: Admin password
            first_name: Admin first name
            last_name: Admin last name
            
        Returns:
            User: Created admin user
        """
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Create account with admin role
        from apps.accounts.models import AddsAccount
        AddsAccount.objects.create(
            user=user,
            role=RoleEnum.ADMIN
        )
        
        return user


# Convenience functions
def get_user_role(user) -> str:
    """Get user role."""
    return UserRoleManager.get_user_role(user)

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
