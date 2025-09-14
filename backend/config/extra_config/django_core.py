"""
Core Django settings.
Basic Django configuration that was previously in settings.py.
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Points to backend/ directory

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-fallback-key-for-development")

# SECURITY WARNING: don't run with debug turned on in production!
# DEBUG is set in settings.py based on environment variables

# Environment detection
IS_DOCKER = os.environ.get("IS_DOCKER", "false").lower() == "true"
IS_PRODUCTION = os.environ.get("DJANGO_ENV", "development") == "production"

# Root directories
ROOT_DIR = BASE_DIR.parent  # project root directory

# Export core settings
__all__ = [
    'BASE_DIR',
    'SECRET_KEY',
    'IS_DOCKER',
    'IS_PRODUCTION',
    'ROOT_DIR',
]
