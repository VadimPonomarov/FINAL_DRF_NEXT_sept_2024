"""
Railway production settings.
Thin override over config.settings — only Railway-specific changes here.
All base config (INSTALLED_APPS, DATABASES, CACHES, CHANNEL_LAYERS,
CELERY_*, REST_FRAMEWORK, SIMPLE_JWT, CORS_*, LOGGING, security, email)
comes from config.settings via extra_config modules.
"""
from config.settings import *  # noqa: F401,F403

import os

# --- URL routing ---
ROOT_URLCONF = 'config.urls_railway'

# --- Allowed Hosts: extend base with Railway domains ---
ALLOWED_HOSTS += ['.railway.app', '.railway.internal', '*']  # noqa: F405

# --- SSL: Railway terminates at load balancer, never redirect inside container ---
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# --- Static files: WhiteNoise for Railway ---
_wn = 'whitenoise.middleware.WhiteNoiseMiddleware'
if _wn not in MIDDLEWARE:  # noqa: F405
    _idx = MIDDLEWARE.index('django.middleware.security.SecurityMiddleware') + 1  # noqa: F405
    MIDDLEWARE.insert(_idx, _wn)  # noqa: F405

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
