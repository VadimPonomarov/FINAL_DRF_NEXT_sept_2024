"""
Railway production settings.

Inherits all base settings from config.settings and overrides only
Railway-specific values. All service hostnames come from environment
variables — no hardcoded values.
"""
import os
from urllib.parse import urlparse as _urlparse

# ── Inherit base settings ──────────────────────────────────────────────────────
from config.settings import *  # noqa: F401,F403

# ── Core overrides ─────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)  # noqa: F821
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = [
    *[h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()],
    '.railway.app', '.railway.internal', 'localhost', '127.0.0.1', '*',
]

# ── URL conf & WSGI ────────────────────────────────────────────────────────────
ROOT_URLCONF = 'config.urls_railway'

# ── WhiteNoise static files ────────────────────────────────────────────────────
_WN = 'whitenoise.middleware.WhiteNoiseMiddleware'
if _WN not in MIDDLEWARE:  # noqa: F821
    _SI = next((i for i, m in enumerate(MIDDLEWARE) if 'SecurityMiddleware' in m), 0)
    MIDDLEWARE.insert(_SI + 1, _WN)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# ── Database ───────────────────────────────────────────────────────────────────
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
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.environ.get('PGHOST', 'localhost'),
            'PORT': os.environ.get('PGPORT', '5432'),
            'NAME': os.environ.get('PGDATABASE', 'autoria_db'),
            'USER': os.environ.get('PGUSER', 'autoria'),
            'PASSWORD': os.environ.get('PGPASSWORD', ''),
            'OPTIONS': {'connect_timeout': 10},
            'CONN_MAX_AGE': 0,
        }
    }

# ── Cache & Redis ──────────────────────────────────────────────────────────────
_redis_url = os.environ.get('REDIS_URL', '')
_redis_host = os.environ.get('REDIS_HOST', 'localhost')
_redis_port_str = os.environ.get('REDIS_PORT', '') or '6379'

if _redis_url:
    _rp = _urlparse(_redis_url)
    REDIS_HOST = _rp.hostname or _redis_host
    REDIS_PORT = int(_rp.port or _redis_port_str)
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
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [_redis_url]},
        }
    }
else:
    REDIS_HOST = _redis_host
    REDIS_PORT = int(_redis_port_str)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'railway-cache',
        }
    }
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}

REDIS_DB = 0
REDIS_URL = _redis_url or f'redis://{REDIS_HOST}:{REDIS_PORT}/0'
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 86400

# ── Celery ─────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', os.environ.get('RABBITMQ_URL', ''))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)

# ── Security (Railway terminates SSL at load balancer) ─────────────────────────
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 0
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
X_FRAME_OPTIONS = 'SAMEORIGIN'
ADMIN_URL = os.environ.get('ADMIN_URL', 'admin/')

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if o.strip()
]
