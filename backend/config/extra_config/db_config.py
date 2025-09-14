"""
Database configuration for Django application.
"""

import os
from core.utils.environment_detector import env_detector


def get_database_config():
    """Get database configuration based on environment."""
    db_config = env_detector.get_database_config()

    # PostgreSQL configuration (ONLY database we use)
    postgresql_config = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_config['NAME'],
            'USER': db_config['USER'],
            'PASSWORD': db_config['PASSWORD'],
            'HOST': db_config['HOST'],
            'PORT': db_config['PORT'],
            'OPTIONS': {
                'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', 10)),
            },
            'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', 60)),
            'CONN_HEALTH_CHECKS': os.getenv('DB_CONN_HEALTH_CHECKS', 'true').lower() == 'true',
        }
    }

    # Always use PostgreSQL - no SQLite fallback
    return postgresql_config


# Database configuration
DATABASES = get_database_config()
