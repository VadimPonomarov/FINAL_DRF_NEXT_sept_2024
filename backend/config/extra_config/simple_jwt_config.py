"""
Django Simple JWT configuration.
"""

import os
from datetime import timedelta


def get_simple_jwt_config():
    """Get Simple JWT configuration based on environment."""
    
    return {
        'ACCESS_TOKEN_LIFETIME': timedelta(
            hours=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_HOURS', 12))
        ),
        'REFRESH_TOKEN_LIFETIME': timedelta(
            days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 30))
        ),
        'ROTATE_REFRESH_TOKENS': os.getenv('JWT_ROTATE_REFRESH_TOKENS', 'true').lower() == 'true',
        'BLACKLIST_AFTER_ROTATION': os.getenv('JWT_BLACKLIST_AFTER_ROTATION', 'true').lower() == 'true',
        'UPDATE_LAST_LOGIN': os.getenv('JWT_UPDATE_LAST_LOGIN', 'true').lower() == 'true',
        
        'ALGORITHM': os.getenv('JWT_ALGORITHM', 'HS256'),
        'SIGNING_KEY': os.getenv('JWT_SIGNING_KEY', os.getenv('SECRET_KEY', 'your-secret-key')),
        'VERIFYING_KEY': os.getenv('JWT_VERIFYING_KEY', None),
        'AUDIENCE': os.getenv('JWT_AUDIENCE', None),
        'ISSUER': os.getenv('JWT_ISSUER', None),
        'JSON_ENCODER': None,
        'JWK_URL': os.getenv('JWT_JWK_URL', None),
        'LEEWAY': int(os.getenv('JWT_LEEWAY', 0)),
        
        'AUTH_HEADER_TYPES': ('Bearer',),
        'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
        'USER_ID_FIELD': 'id',
        'USER_ID_CLAIM': 'user_id',
        'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
        
        'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
        'TOKEN_TYPE_CLAIM': 'token_type',
        'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
        
        'JTI_CLAIM': 'jti',
        
        'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
        'SLIDING_TOKEN_LIFETIME': timedelta(
            minutes=int(os.getenv('JWT_SLIDING_TOKEN_LIFETIME_MINUTES', 5))
        ),
        'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(
            days=int(os.getenv('JWT_SLIDING_TOKEN_REFRESH_LIFETIME_DAYS', 1))
        ),
        
        'TOKEN_OBTAIN_SERIALIZER': 'apps.auth.serializers.CustomTokenObtainPairSerializer',
        'TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenRefreshSerializer',
        'TOKEN_VERIFY_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenVerifySerializer',
        'TOKEN_BLACKLIST_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenBlacklistSerializer',
        'SLIDING_TOKEN_OBTAIN_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenObtainSlidingSerializer',
        'SLIDING_TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenRefreshSlidingSerializer',
    }


# Simple JWT configuration
SIMPLE_JWT = get_simple_jwt_config()
