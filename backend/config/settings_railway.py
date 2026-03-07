"""
Railway production settings.

IMPORTANT: This file MUST NOT import from any core.* module at all.
core/utils/__init__.py imports from .encryption which instantiates EncryptionService()
at module load time. EncryptionService.__init__ accesses django.conf.settings.SECRET_KEY
before settings are ready — circular import. We replicate env_detector logic inline.
"""
import os
from pathlib import Path
from urllib.parse import urlparse as _urlparse
from datetime import timedelta

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
ROOT_DIR = BASE_DIR.parent

# ── Core ───────────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key-for-development')
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = [
    *[h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()],
    '.railway.app', '.railway.internal', 'localhost', '127.0.0.1', '*',
]

# ── Apps (safe — apps_config.py only imports pathlib) ─────────────────────────
from config.extra_config.apps_config import (  # noqa: E402
    INSTALLED_APPS, TEMPLATES,
    LANGUAGE_CODE, TIME_ZONE, USE_I18N, USE_TZ, AUTH_USER_MODEL,
    STATIC_URL, STATIC_ROOT, MEDIA_URL, MEDIA_ROOT,
    WSGI_APPLICATION, ASGI_APPLICATION,
)
ROOT_URLCONF = 'config.urls_railway'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Inject WhiteNoise after SecurityMiddleware
from config.extra_config.apps_config import MIDDLEWARE as _MW  # noqa: E402
MIDDLEWARE = list(_MW)
_WN = 'whitenoise.middleware.WhiteNoiseMiddleware'
if _WN not in MIDDLEWARE:
    _SI = next((i for i, m in enumerate(MIDDLEWARE) if 'SecurityMiddleware' in m), 0)
    MIDDLEWARE.insert(_SI + 1, _WN)

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Database (inline env_detector — avoids core.utils import) ─────────────────
_db_url = os.environ.get('DATABASE_URL', '')
if _db_url and not _db_url.startswith('${{'):
    _p = _urlparse(_db_url)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': _p.hostname or 'localhost',
            'PORT': str(_p.port or 5432),
            'NAME': (_p.path or '/db').lstrip('/'),
            'USER': _p.username or 'user',
            'PASSWORD': _p.password or '',
            'OPTIONS': {
                'connect_timeout': int(os.environ.get('DB_CONNECT_TIMEOUT', 10)),
                'options': '-c search_path=public -c client_encoding=utf8',
            },
            'CONN_MAX_AGE': 0,
        }
    }
else:
    _pg_host = os.environ.get('PGHOST', os.environ.get('PGDATABASE', 'localhost'))
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': _pg_host,
            'PORT': os.environ.get('PGPORT', '5432'),
            'NAME': os.environ.get('PGDATABASE', 'autoria_db'),
            'USER': os.environ.get('PGUSER', 'autoria'),
            'PASSWORD': os.environ.get('PGPASSWORD', ''),
            'OPTIONS': {'connect_timeout': 10},
            'CONN_MAX_AGE': 0,
        }
    }

# ── Cache (inline — avoids core.utils import) ─────────────────────────────────
_redis_url = os.environ.get('REDIS_URL', '')
if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
            'KEY_PREFIX': 'autoria',
        },
        'ratelimit': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
            'KEY_PREFIX': 'autoria_rl',
        },
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'railway-cache',
        }
    }

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 86400

# Redis connection details (used by ServiceRegistry and cache)
_redis_parsed = _urlparse(_redis_url) if _redis_url else None
REDIS_HOST = (_redis_parsed.hostname if _redis_parsed else None) or os.environ.get('REDIS_HOST', 'autoria-redis.railway.internal')
REDIS_PORT = int(_redis_parsed.port or 6379) if _redis_parsed else int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = 0
REDIS_URL = _redis_url or f'redis://{REDIS_HOST}:{REDIS_PORT}/0'

# ── Channels (inline — avoids core.utils import) ──────────────────────────────
if _redis_url:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [_redis_url]},
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}
    }

# ── Security ──────────────────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
# Railway terminates SSL at load balancer — never redirect inside container
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 0  # Let Railway handle HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
X_FRAME_OPTIONS = 'SAMEORIGIN'
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
ADMIN_URL = os.environ.get('ADMIN_URL', 'admin/')

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOWED_ORIGINS = [
    'https://autoria-clone.vercel.app',
    'https://autoria-web-production.up.railway.app',
    *[o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()],
]
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type', 'dnt',
    'origin', 'user-agent', 'x-csrftoken', 'x-requested-with', 'x-api-key',
    'cache-control', 'x-frame-options',
]
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']

# ── Password validators ────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Logging (safe — logger_config.py only imports loguru) ─────────────────────
from config.extra_config.logger_config import LOGGING  # noqa: E402

# ── REST Framework (safe — only imports os) ───────────────────────────────────
from config.extra_config.rest_framework_config import REST_FRAMEWORK  # noqa: E402
from config.extra_config.simple_jwt_config import SIMPLE_JWT  # noqa: E402
from config.extra_config.swagger_config import SWAGGER_SETTINGS, SWAGGER_USE_COMPAT_RENDERERS  # noqa: E402
from config.extra_config.email_config import *  # noqa: E402,F401,F403
from config.extra_config.security_logging_config import SECURITY_LOGGING, SECURITY_MONITORING  # noqa: E402

# ── Celery (safe — constants_config.py only imports os) ───────────────────────
from config.extra_config.constants_config import CELERY_CONFIG  # noqa: E402
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL',
    os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@autoria-rabbitmq.railway.internal:5672//'))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND',
    os.environ.get('REDIS_URL', 'redis://autoria-redis.railway.internal:6379/0'))
CELERY_TASK_SERIALIZER = CELERY_CONFIG.get('TASK_SERIALIZER', 'json')
CELERY_ACCEPT_CONTENT = CELERY_CONFIG.get('ACCEPT_CONTENT', ['json'])
CELERY_RESULT_SERIALIZER = CELERY_CONFIG.get('RESULT_SERIALIZER', 'json')
CELERY_TIMEZONE = CELERY_CONFIG.get('TIMEZONE', 'UTC')
CELERY_ENABLE_UTC = CELERY_CONFIG.get('ENABLE_UTC', True)
CELERY_TASK_TRACK_STARTED = CELERY_CONFIG.get('TASK_TRACK_STARTED', True)
CELERY_TASK_TIME_LIMIT = CELERY_CONFIG.get('TASK_TIME_LIMIT', 1800)
CELERY_TASK_SOFT_TIME_LIMIT = CELERY_CONFIG.get('TASK_SOFT_TIME_LIMIT', 60)
CELERY_WORKER_PREFETCH_MULTIPLIER = CELERY_CONFIG.get('WORKER_PREFETCH_MULTIPLIER', 1)
CELERY_TASK_ACKS_LATE = CELERY_CONFIG.get('TASK_ACKS_LATE', True)
