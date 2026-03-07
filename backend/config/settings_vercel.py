"""
Vercel serverless settings.

Inherits base settings from config.settings and overrides only
Vercel-specific values. Always uses SQLite in /tmp (ephemeral,
seeded on cold start) — external databases are not reachable from
Vercel serverless functions.
"""
import os
from pathlib import Path

# ── Inherit base settings ──────────────────────────────────────────────────────
from config.settings import *  # noqa: F401,F403

# ── Core overrides ─────────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)  # noqa: F821
DEBUG = True  # Keep on for Vercel cold-start diagnosis
ALLOWED_HOSTS = ['.vercel.app', '.onrender.com', 'localhost', '127.0.0.1', '*']

# ── URL conf ───────────────────────────────────────────────────────────────────
ROOT_URLCONF = 'config.urls_vercel'

# ── Database: always SQLite in /tmp ────────────────────────────────────────────
# External DBs (Railway PG, etc.) are unreachable from Vercel serverless.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': Path('/tmp') / 'autoria.db3',
    }
}

# ── Cache ──────────────────────────────────────────────────────────────────────
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# ── Static & media paths (writable /tmp on Vercel) ─────────────────────────────
STATIC_ROOT = Path('/tmp') / 'staticfiles'
MEDIA_ROOT = Path('/tmp') / 'media'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# ── Email ──────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ── Security ───────────────────────────────────────────────────────────────────
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if o.strip()
]
