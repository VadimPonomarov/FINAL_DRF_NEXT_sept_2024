"""
Custom JWT serializers for authentication endpoints.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.users.serializers import UserSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that includes user data in the token response.
    Uses email as username field to match our custom user model.
    """

    username_field = 'email'

    def validate(self, attrs):
        # Get the default token data (access and refresh tokens)
        data = super().validate(attrs)

        # Add user data to the response
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data

        return data
