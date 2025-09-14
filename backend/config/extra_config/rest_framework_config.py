"""
Django REST Framework configuration.
"""

import os


def get_rest_framework_config():
    """Get REST Framework configuration based on environment."""
    is_production = os.getenv('DJANGO_ENV', 'development') == 'production'
    
    base_config = {
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'rest_framework_simplejwt.authentication.JWTAuthentication',
        ],
        'DEFAULT_PERMISSION_CLASSES': [
            'rest_framework.permissions.IsAuthenticated',
        ],
        'DEFAULT_RENDERER_CLASSES': [
            'rest_framework.renderers.JSONRenderer',
        ],
        'DEFAULT_PARSER_CLASSES': [
            'rest_framework.parsers.JSONParser',
            'rest_framework.parsers.FormParser',
            'rest_framework.parsers.MultiPartParser',
        ],
        'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
        'PAGE_SIZE': int(os.getenv('DRF_PAGE_SIZE', 20)),
        'DEFAULT_FILTER_BACKENDS': [
            'django_filters.rest_framework.DjangoFilterBackend',
            'rest_framework.filters.SearchFilter',
            'rest_framework.filters.OrderingFilter',
        ],
        'DEFAULT_THROTTLE_CLASSES': [
            'rest_framework.throttling.AnonRateThrottle',
            'rest_framework.throttling.UserRateThrottle'
        ],
        'DEFAULT_THROTTLE_RATES': {
            'anon': os.getenv('DRF_ANON_RATE', '100/hour'),
            'user': os.getenv('DRF_USER_RATE', '1000/hour'),
            'login': os.getenv('DRF_LOGIN_RATE', '5/min'),
            'register': os.getenv('DRF_REGISTER_RATE', '3/min'),
        },
        'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
        'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.coreapi.AutoSchema',
        'TEST_REQUEST_DEFAULT_FORMAT': 'json',
        'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
        'DATE_FORMAT': '%Y-%m-%d',
        'TIME_FORMAT': '%H:%M:%S',
    }
    
    # Add browsable API renderer for development
    if not is_production:
        base_config['DEFAULT_RENDERER_CLASSES'].append(
            'rest_framework.renderers.BrowsableAPIRenderer'
        )
    
    return base_config


# REST Framework configuration
REST_FRAMEWORK = get_rest_framework_config()
