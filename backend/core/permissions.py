from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # For other methods, check if the user is the owner
        if hasattr(obj, 'user'):
            # For objects with a direct user field
            return obj.user == request.user
        elif hasattr(obj, 'adds_account') and hasattr(obj.adds_account, 'user'):
            # For contact objects that belong to an account
            return obj.adds_account.user == request.user

        return False


class ReadOnlyOrStaffWrite(permissions.BasePermission):
    """
    Permission for reference data:
    - Read access for everyone (including anonymous users)
    - Write access only for staff and superusers
    """

    def has_permission(self, request, view):
        """Allow read access to everyone, write access to staff only."""
        if request.method in permissions.SAFE_METHODS:
            return True

        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsOwnerOrSuperUserWrite(permissions.BasePermission):
    """
    Permission for ads and account data:
    - Read access for authenticated users
    - Write access only for owners and superusers
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
        elif hasattr(obj, 'adds_account'):
            # For contact objects that belong to an account
            return obj.adds_account.user == request.user

        # Default: deny access
        return False


class IsSuperUser(permissions.BasePermission):
    """
    Permission for superusers only.
    """

    def has_permission(self, request, view):
        """Check if user is superuser."""
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )


class IsPremiumUser(permissions.BasePermission):
    """
    Permission for premium account holders.

    Used for analytics and premium features access.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated and has premium account."""
        if not (request.user and request.user.is_authenticated):
            return False

        # Superusers always have access
        if request.user.is_superuser:
            return True

        # Check if user has premium account
        try:
            from apps.accounts.models import AddsAccount
            from core.enums.ads import AccountTypeEnum

            account = AddsAccount.objects.get(user=request.user)
            return account.account_type == AccountTypeEnum.PREMIUM
        except AddsAccount.DoesNotExist:
            return False
