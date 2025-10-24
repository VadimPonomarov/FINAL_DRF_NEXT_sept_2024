"""
Custom JWT serializers for authentication endpoints.
"""

from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)

from apps.users.serializers import UserSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that includes user data in the token response.
    Uses email as username field to match our custom user model.
    """

    username_field = "email"

    def validate(self, attrs):
        # Get the default token data (access and refresh tokens)
        data = super().validate(attrs)

        # Add user data to the response
        user_serializer = UserSerializer(self.user)
        data["user"] = user_serializer.data

        return data


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom refresh serializer that returns both access and refresh tokens
    when ROTATE_REFRESH_TOKENS is enabled.
    """

    def validate(self, attrs):
        """Validate refresh token and return new tokens."""
        # Call parent validation first
        data = super().validate(attrs)

        # Check if token rotation is enabled in settings
        from django.conf import settings

        simple_jwt_settings = getattr(settings, "SIMPLE_JWT", {})
        rotate_refresh_tokens = simple_jwt_settings.get("ROTATE_REFRESH_TOKENS", False)

        if rotate_refresh_tokens:
            # When rotation is enabled, include the new refresh token
            # The refresh token is available as self.token after parent validation
            if hasattr(self, "token") and self.token:
                data["refresh"] = str(self.token)

        # Add success indicator
        data["success"] = True
        data["message"] = "Tokens refreshed successfully"

        return data
