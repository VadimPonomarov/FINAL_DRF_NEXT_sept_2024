"""
Centralized configuration module.
All Django settings are organized into logical modules for better maintainability.
"""

import os

# Simple configuration from environment variables (backward compatibility)
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')
BASE_URL = os.environ.get('BASE_URL', 'http://localhost:8000')

def get_api_config():
    """Simple API config function for backward compatibility"""
    class APIConfig:
        GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY
    return APIConfig()

# =============================================================================
# IMPORT ALL MODULAR CONFIGURATIONS
# =============================================================================
# Core Django apps and middleware
from .apps_config import INSTALLED_APPS, MIDDLEWARE, TEMPLATES, ROOT_URLCONF, WSGI_APPLICATION, ASGI_APPLICATION
from .apps_config import LANGUAGE_CODE, TIME_ZONE, USE_I18N, USE_TZ, DEFAULT_AUTO_FIELD, AUTH_USER_MODEL
from .apps_config import STATIC_URL, STATIC_ROOT, MEDIA_URL, MEDIA_ROOT
from .channels_config import CHANNEL_LAYERS
from .db_config import DATABASES
from .logger_config import logger, LOGGING
from .security_logging_config import SECURITY_LOGGING, SECURITY_MONITORING
from .cache_config import *
from .cors_config import *
from .security_config import *
from .email_config import *
from .rest_framework_config import REST_FRAMEWORK
from .simple_jwt_config import SIMPLE_JWT
from .swagger_config import SWAGGER_SETTINGS, SWAGGER_USE_COMPAT_RENDERERS
# Import Celery settings from constants_config
from .constants_config import CELERY_CONFIG

# Map CELERY_CONFIG to Django settings format
CELERY_TASK_SERIALIZER = CELERY_CONFIG['TASK_SERIALIZER']
CELERY_ACCEPT_CONTENT = CELERY_CONFIG['ACCEPT_CONTENT']
CELERY_RESULT_SERIALIZER = CELERY_CONFIG['RESULT_SERIALIZER']
CELERY_TIMEZONE = CELERY_CONFIG['TIMEZONE']
CELERY_ENABLE_UTC = CELERY_CONFIG['ENABLE_UTC']
CELERY_TASK_TRACK_STARTED = CELERY_CONFIG['TASK_TRACK_STARTED']
CELERY_TASK_TIME_LIMIT = CELERY_CONFIG['TASK_TIME_LIMIT']
CELERY_TASK_SOFT_TIME_LIMIT = CELERY_CONFIG['TASK_SOFT_TIME_LIMIT']
CELERY_WORKER_PREFETCH_MULTIPLIER = CELERY_CONFIG['WORKER_PREFETCH_MULTIPLIER']
CELERY_TASK_ACKS_LATE = CELERY_CONFIG['TASK_ACKS_LATE']
CELERY_WORKER_DISABLE_RATE_LIMITS = CELERY_CONFIG['WORKER_DISABLE_RATE_LIMITS']

# Email settings
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@example.com")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Broker and result backend from environment
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "pyamqp://guest:guest@rabbitmq:5672//")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

__all__ = [
    # Core Django settings
    "INSTALLED_APPS",
    "MIDDLEWARE",
    "TEMPLATES",
    "ROOT_URLCONF",
    "WSGI_APPLICATION",
    "ASGI_APPLICATION",
    "LANGUAGE_CODE",
    "TIME_ZONE",
    "USE_I18N",
    "USE_TZ",
    "DEFAULT_AUTO_FIELD",
    "AUTH_USER_MODEL",
    "STATIC_URL",
    "STATIC_ROOT",
    "MEDIA_URL",
    "MEDIA_ROOT",

    # App-specific settings
    "BASE_URL",
    "DEFAULT_FROM_EMAIL",
    "SERVER_EMAIL",
    "AUTH_PASSWORD_VALIDATORS",
    "REST_FRAMEWORK",
    "SIMPLE_JWT",
    "SWAGGER_SETTINGS",
    "SWAGGER_USE_COMPAT_RENDERERS",
    "DATABASES",
    "logger",
    "LOGGING",
    "SECURITY_LOGGING",
    "SECURITY_MONITORING",
    "CHANNEL_LAYERS",
    "GOOGLE_MAPS_API_KEY",
    "get_api_config",

    # Celery settings
    "CELERY_BROKER_URL",
    "CELERY_RESULT_BACKEND",
    "CELERY_TASK_SERIALIZER",
    "CELERY_ACCEPT_CONTENT",
    "CELERY_RESULT_SERIALIZER",
    "CELERY_TIMEZONE",
    "CELERY_ENABLE_UTC",
    "CELERY_TASK_TRACK_STARTED",
    "CELERY_TASK_TIME_LIMIT",
    "CELERY_TASK_SOFT_TIME_LIMIT",
    "CELERY_WORKER_PREFETCH_MULTIPLIER",
    "CELERY_TASK_ACKS_LATE",
    "CELERY_WORKER_DISABLE_RATE_LIMITS",
]
