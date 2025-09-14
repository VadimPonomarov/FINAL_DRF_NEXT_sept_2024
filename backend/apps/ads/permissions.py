"""
Custom permissions for AutoRia clone.
"""
from rest_framework import permissions


class IsStaffOrSuperUser(permissions.BasePermission):
    """
    Permission that allows access only to staff or superuser.
    Used for moderation functionality.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsSuperUser(permissions.BasePermission):
    """
    Permission that allows access only to superuser.
    Used for critical moderation actions like blocking/activating ads.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permission that allows access to object owner or staff.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions only to owner or staff
        if hasattr(obj, 'account'):
            return (
                obj.account.user == request.user or
                request.user.is_staff or
                request.user.is_superuser
            )
        
        if hasattr(obj, 'user'):
            return (
                obj.user == request.user or
                request.user.is_staff or
                request.user.is_superuser
            )
        
        return False


class IsPremiumUser(permissions.BasePermission):
    """
    Permission that allows access only to premium users and superusers.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Superusers always have access
        if request.user.is_superuser:
            return True

        try:
            from apps.accounts.models import AccountTypeEnum
            account = request.user.account
            return account.account_type == AccountTypeEnum.PREMIUM
        except:
            return False


class CanCreateAd(permissions.BasePermission):
    """
    Permission that checks if user can create new advertisement.
    Basic users can create only 1 ad, premium users - unlimited.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.method != 'POST':
            return True
        
        try:
            from apps.accounts.models import AccountTypeEnum
            from apps.ads.models import CarAd, AdStatusEnum
            
            account = request.user.account
            
            # Premium users can create unlimited ads
            if account.account_type == AccountTypeEnum.PREMIUM:
                return True
            
            # Basic users can create only 1 active ad
            active_ads_count = CarAd.objects.filter(
                account=account,
                status__in=[AdStatusEnum.ACTIVE, AdStatusEnum.PENDING]
            ).count()
            
            return active_ads_count < 1
            
        except:
            return False
