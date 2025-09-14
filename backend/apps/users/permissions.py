from rest_framework.permissions import BasePermission


class BaseUserPermission(BasePermission):
    """
    Base class for user-related permissions with shared utility methods.
    Ensures that the user is authenticated and active.
    """

    def is_authenticated(self, request):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )

    def is_superuser(self, request):
        return request.user and request.user.is_superuser

    def is_staff(self, request):
        return request.user and request.user.is_staff


class IsSuperuser(BaseUserPermission):
    """
    Grants access only to superusers.
    """

    def has_permission(self, request, view):
        return self.is_superuser(request)


class IsMeUser(BaseUserPermission):
    """
    Grants access if authenticated user's ID matches the `pk` parameter in the URL,
    and user is active.
    """

    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def has_object_permission(self, request, view, obj):
        return request.user == obj and self.is_authenticated(request)


class IsSuperUserOrMe(BaseUserPermission):
    """
    Grants access to superusers or if user is accessing their own object.
    """

    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def has_object_permission(self, request, view, obj):
        return self.is_superuser(request) or (request.user == obj)


class IsStaffUserOrMe(BaseUserPermission):
    """
    Grants access to staff/superusers, or user accessing their own object.
    """

    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def has_object_permission(self, request, view, obj):
        if self.is_superuser(request) or self.is_staff(request):
            return True
        return request.user == obj


class HasAdvancedPermission(BasePermission):
    """
    Declarative permission based on `required_permission` defined in view.
    """

    def has_permission(self, request, view):
        required = getattr(view, "required_permission", None)
        if not required:
            return True  # No specific permission required

        # Assume `user.permissions` contains list of allowed action strings
        user_perms = getattr(request.user, "permissions", [])
        return "*" in user_perms or required in user_perms
