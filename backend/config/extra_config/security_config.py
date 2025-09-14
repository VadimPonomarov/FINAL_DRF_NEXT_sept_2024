"""
Security configuration for Django application.
Centralized security settings including HTTPS, headers, and authentication.
"""

import os
from core.utils.environment_detector import env_detector


def get_security_config():
    """Get security configuration based on environment."""
    is_production = os.getenv('DJANGO_ENV', 'development') == 'production'
    is_docker = env_detector.is_docker()

    return {
        'USE_HTTPS': is_production,
        'SECURE_COOKIES': is_production,
        'HSTS_ENABLED': is_production,
        'DEBUG': True,  # Принудительно включаем DEBUG для разработки
    }


# Get security configuration
security_config = get_security_config()

# Debug setting
DEBUG = True

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# HTTPS settings
SECURE_SSL_REDIRECT = security_config['USE_HTTPS']
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if security_config['USE_HTTPS'] else None

# HSTS settings
SECURE_HSTS_SECONDS = 31536000 if security_config['HSTS_ENABLED'] else 0  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = security_config['HSTS_ENABLED']
SECURE_HSTS_PRELOAD = security_config['HSTS_ENABLED']

# Cookie security
SECURE_COOKIES = security_config['SECURE_COOKIES']
SESSION_COOKIE_SECURE = SECURE_COOKIES
CSRF_COOKIE_SECURE = SECURE_COOKIES
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# X-Frame-Options - handled by AllowIframeMiddleware
X_FRAME_OPTIONS = None  # Disabled - handled by custom AllowIframeMiddleware

# Content Security Policy (basic)
CSP_DEFAULT_SRC = ["'self'"]
CSP_SCRIPT_SRC = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
CSP_STYLE_SRC = ["'self'", "'unsafe-inline'"]
CSP_IMG_SRC = ["'self'", "data:", "https:"]
CSP_FONT_SRC = ["'self'", "https:"]
CSP_CONNECT_SRC = ["'self'"]

# Allowed hosts
ALLOWED_HOSTS = env_detector.get_allowed_hosts()

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # Increased from 8 to 12
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Rate limiting settings
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'ratelimit'

# Security headers middleware
SECURITY_MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# File upload security
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
FILE_UPLOAD_PERMISSIONS = 0o644

# Admin security
ADMIN_URL = os.getenv('ADMIN_URL', 'admin/')
ADMIN_FORCE_ALLAUTH = False

# API security
API_THROTTLE_RATES = {
    'anon': '100/hour',
    'user': '1000/hour',
    'login': '5/min',
    'register': '3/min',
}

# Export all security settings
__all__ = [
    # 'DEBUG',  # Не экспортируем DEBUG, чтобы не переопределять settings.py
    'SECURE_BROWSER_XSS_FILTER',
    'SECURE_CONTENT_TYPE_NOSNIFF',
    'SECURE_REFERRER_POLICY',
    'SECURE_SSL_REDIRECT',
    'SECURE_PROXY_SSL_HEADER',
    'SECURE_HSTS_SECONDS',
    'SECURE_HSTS_INCLUDE_SUBDOMAINS',
    'SECURE_HSTS_PRELOAD',
    'SESSION_COOKIE_SECURE',
    'CSRF_COOKIE_SECURE',
    'SESSION_COOKIE_HTTPONLY',
    'CSRF_COOKIE_HTTPONLY',
    'SESSION_COOKIE_SAMESITE',
    'CSRF_COOKIE_SAMESITE',
    'X_FRAME_OPTIONS',  # Set to None - handled by AllowIframeMiddleware
    # 'ALLOWED_HOSTS',  # Не экспортируем ALLOWED_HOSTS, чтобы не переопределять settings.py
    'AUTH_PASSWORD_VALIDATORS',
    'RATELIMIT_ENABLE',
    'RATELIMIT_USE_CACHE',
    'SECURITY_MIDDLEWARE',
    'FILE_UPLOAD_MAX_MEMORY_SIZE',
    'DATA_UPLOAD_MAX_MEMORY_SIZE',
    'FILE_UPLOAD_PERMISSIONS',
    'ADMIN_URL',
    'API_THROTTLE_RATES',
]
