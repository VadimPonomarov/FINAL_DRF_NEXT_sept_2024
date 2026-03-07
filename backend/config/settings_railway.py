"""
Railway production settings.
Imports directly from extra_config submodules (safe — no django.conf.settings access
at import time). Cannot use 'from config.settings import *' because that triggers
EncryptionService() instantiation before settings are ready (circular import).
"""

import os

# --- Base paths & core ---
from config.extra_config.django_core import BASE_DIR, SECRET_KEY, IS_DOCKER, IS_PRODUCTION  # noqa

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    *[h.strip() for h in os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()],
    '.railway.app', '.railway.internal', 'localhost', '127.0.0.1', '*',
]

# --- Apps, middleware, templates, static ---
from config.extra_config.apps_config import (  # noqa
    INSTALLED_APPS, TEMPLATES,
    LANGUAGE_CODE, TIME_ZONE, USE_I18N, USE_TZ, DEFAULT_AUTO_FIELD, AUTH_USER_MODEL,
    STATIC_URL, STATIC_ROOT, MEDIA_URL, MEDIA_ROOT,
    WSGI_APPLICATION, ASGI_APPLICATION,
)

ROOT_URLCONF = 'config.urls_railway'

# Build middleware list and inject WhiteNoise after SecurityMiddleware
from config.extra_config.apps_config import MIDDLEWARE as _BASE_MIDDLEWARE  # noqa
MIDDLEWARE = list(_BASE_MIDDLEWARE)
_wn = 'whitenoise.middleware.WhiteNoiseMiddleware'
if _wn not in MIDDLEWARE:
    _sec = 'django.middleware.security.SecurityMiddleware'
    _idx = MIDDLEWARE.index(_sec) + 1 if _sec in MIDDLEWARE else 1
    MIDDLEWARE.insert(_idx, _wn)

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# --- Database (env_detector reads DATABASE_URL automatically) ---
from config.extra_config.db_config import DATABASES  # noqa

# --- Cache & Channels ---
from config.extra_config.cache_config import (  # noqa
    CACHES, SESSION_ENGINE, SESSION_CACHE_ALIAS, SESSION_COOKIE_AGE,
)
from config.extra_config.channels_config import CHANNEL_LAYERS  # noqa

# --- Security ---
from config.extra_config.security_config import (  # noqa
    SECURE_BROWSER_XSS_FILTER, SECURE_CONTENT_TYPE_NOSNIFF, SECURE_REFERRER_POLICY,
    SECURE_HSTS_SECONDS, SECURE_HSTS_INCLUDE_SUBDOMAINS, SECURE_HSTS_PRELOAD,
    SESSION_COOKIE_SECURE, CSRF_COOKIE_SECURE,
    SESSION_COOKIE_HTTPONLY, CSRF_COOKIE_HTTPONLY,
    SESSION_COOKIE_SAMESITE, CSRF_COOKIE_SAMESITE,
    X_FRAME_OPTIONS, FILE_UPLOAD_MAX_MEMORY_SIZE, DATA_UPLOAD_MAX_MEMORY_SIZE,
    ADMIN_URL,
)
# Railway terminates SSL at load balancer — never redirect inside container
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# --- CORS ---
from config.extra_config.cors_config import (  # noqa
    CORS_ALLOWED_ORIGINS, CORS_ALLOW_CREDENTIALS, CORS_ALLOW_ALL_ORIGINS,
    CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS,
)

# --- Logging ---
from config.extra_config.logger_config import LOGGING  # noqa
from config.extra_config.security_logging_config import SECURITY_LOGGING, SECURITY_MONITORING  # noqa

# --- REST & JWT ---
from config.extra_config.rest_framework_config import REST_FRAMEWORK  # noqa
from config.extra_config.simple_jwt_config import SIMPLE_JWT  # noqa

# --- Password validators ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- Email ---
from config.extra_config.email_config import *  # noqa

# --- Swagger ---
from config.extra_config.swagger_config import SWAGGER_SETTINGS, SWAGGER_USE_COMPAT_RENDERERS  # noqa

# --- Celery ---
from config.extra_config.constants_config import CELERY_CONFIG  # noqa
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL',
    os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@autoria-rabbitmq.railway.internal:5672//'))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND',
    os.environ.get('REDIS_URL', 'redis://autoria-redis.railway.internal:6379/0'))
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

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
