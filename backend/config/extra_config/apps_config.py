# Django Apps Configuration
# This file defines all installed Django applications

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Points to backend/ directory

INSTALLED_APPS = [
    # Django Core Apps (admin disabled for faster startup)
    # 'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party Apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_yasg',
    'channels',
    # 'oauth2_provider',  # Убираем OAuth2 - используем только JWT
    'django_filters',
    # 'django_ratelimit',  # Temporarily disabled - needs Redis cache
    
    # Local Apps
    'core',
    'apps.accounts',
    'apps.ads',
    'apps.auth',
    'apps.chat',
    'apps.users',
    'apps.currency',
]

# Static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Middleware configuration
MIDDLEWARE = [
    'core.middlewares.cors.CORSMiddleware',  # Кастомный CORS middleware для полного контроля
    'django.middleware.security.SecurityMiddleware',
    # 'oauth2_provider.middleware.OAuth2TokenMiddleware',  # Убираем OAuth2 middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middlewares.iframe.AllowIframeMiddleware',  # Custom iframe middleware - must be AFTER XFrameOptionsMiddleware
]

# Root URL configuration
ROOT_URLCONF = 'config.urls'

# Templates configuration
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI application
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.routing.application'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'users.UserModel'
