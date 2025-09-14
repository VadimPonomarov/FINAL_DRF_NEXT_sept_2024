import os
from django.urls import path, include
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

# Try to import django-ratelimit, fallback if not available
try:
    from django_ratelimit.decorators import ratelimit
    RATELIMIT_AVAILABLE = True
except ImportError:
    RATELIMIT_AVAILABLE = False
    # Create a dummy decorator if ratelimit is not available
    def ratelimit(*args, **kwargs):
        def decorator(func):
            return func
        return decorator

from .views import LogoutView
from .views.token_form_view import TokenFormView
from .docs.swagger_schemas import auth_login_schema, auth_refresh_schema
from .serializers import CustomTokenObtainPairSerializer
from core.services.security_logger import log_login_success, log_login_failed


# Conditionally apply rate limiting (skip in tests and if not available)
def conditional_ratelimit(rate):
    def decorator(cls):
        # Skip rate limiting if:
        # 1. In testing mode
        # 2. django-ratelimit not available
        # 3. Explicitly disabled
        if (not RATELIMIT_AVAILABLE or
            os.environ.get('TESTING') or
            'test' in os.environ.get('DJANGO_SETTINGS_MODULE', '') or
            os.environ.get('DISABLE_RATELIMIT', 'false').lower() == 'true'):
            return cls
        return method_decorator(ratelimit(key='ip', rate=rate, method='POST'), name='post')(cls)
    return decorator

@conditional_ratelimit('5/m')
class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    @auth_login_schema
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200:
                # Extract user from serializer
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    user = serializer.user
                    log_login_success(request, user)
            return response
        except Exception as e:
            # Log failed login attempt
            email = request.data.get('email', 'Unknown')
            log_login_failed(request, email, str(e))
            raise


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom refresh serializer that returns both access and refresh tokens
    when ROTATE_REFRESH_TOKENS is enabled.
    """
    def validate(self, attrs):
        # Call parent validation first
        data = super().validate(attrs)

        # Check if token rotation is enabled in settings
        from django.conf import settings
        simple_jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
        rotate_refresh_tokens = simple_jwt_settings.get('ROTATE_REFRESH_TOKENS', False)

        if rotate_refresh_tokens:
            # When rotation is enabled, include the new refresh token
            # The refresh token is available as self.token after parent validation
            if hasattr(self, 'token') and self.token:
                data['refresh'] = str(self.token)

        return data


@conditional_ratelimit('10/m')
class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenRefreshSerializer

    @auth_refresh_schema
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


# JWT Authentication endpoints
urlpatterns = [
    # Token form view for testing
    path('token-form/', TokenFormView.as_view(), name='token-form'),

    # JWT endpoints
    path("login", CustomTokenObtainPairView.as_view(), name="api_auth_login_create"),
    path("refresh", CustomTokenRefreshView.as_view(), name="api_auth_refresh_create"),
    path("logout", LogoutView.as_view(), name="api_auth_logout_create"),
]
