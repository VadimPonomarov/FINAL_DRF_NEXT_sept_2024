"""
Cache configuration for Django with Redis support.
Centralized cache settings for all caching needs including django-ratelimit.
"""

import os
from core.utils.environment_detector import env_detector


def get_cache_config():
    """Get cache configuration based on environment."""
    redis_config = env_detector.get_redis_config()
    
    # Redis cache configuration
    redis_cache = {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{redis_config['HOST']}:{redis_config['PORT']}/{redis_config['DB']}",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'car_sales_platform',
        'TIMEOUT': 300,  # 5 minutes default
        'VERSION': 1,
    }
    
    # Fallback to local memory cache if Redis is not available
    locmem_cache = {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        }
    }
    
    # Try Redis first, fallback to locmem for development
    use_redis = os.getenv('USE_REDIS_CACHE', 'true').lower() == 'true'
    
    if use_redis:
        default_cache = redis_cache
    else:
        default_cache = locmem_cache
    
    return {
        'default': default_cache,
        'redis': redis_cache,
        'locmem': locmem_cache,
        # Specific cache for sessions
        'sessions': {
            **default_cache,
            'KEY_PREFIX': 'car_sales_sessions',
            'TIMEOUT': 86400,  # 24 hours
        },
        # Specific cache for rate limiting
        'ratelimit': {
            **default_cache,
            'KEY_PREFIX': 'car_sales_ratelimit',
            'TIMEOUT': 3600,  # 1 hour
        },
        # Cache for API responses
        'api': {
            **default_cache,
            'KEY_PREFIX': 'car_sales_api',
            'TIMEOUT': 600,  # 10 minutes
        },
        # Cache for static data (reference data, etc.)
        'static': {
            **default_cache,
            'KEY_PREFIX': 'car_sales_static',
            'TIMEOUT': 3600,  # 1 hour
        },
    }


# Cache configuration
CACHES = get_cache_config()

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Rate limiting configuration
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'ratelimit'

# Cache middleware settings
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 600  # 10 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'car_sales_middleware'

# Cache configuration for specific use cases
CACHE_SETTINGS = {
    'DEFAULT_TIMEOUT': 300,  # 5 minutes
    'LONG_TIMEOUT': 3600,    # 1 hour
    'SHORT_TIMEOUT': 60,     # 1 minute
    'SESSION_TIMEOUT': 86400, # 24 hours
    'STATIC_TIMEOUT': 86400,  # 24 hours for static data
}

# Cache keys patterns
CACHE_KEYS = {
    'USER_PROFILE': 'user_profile_{user_id}',
    'CAR_MARKS': 'car_marks_list',
    'CAR_MODELS': 'car_models_mark_{mark_id}',
    'REFERENCE_DATA': 'reference_{type}',
    'API_RESPONSE': 'api_{endpoint}_{params_hash}',
    'RATE_LIMIT': 'ratelimit_{ip}_{endpoint}',
}

# Export all cache-related settings
__all__ = [
    'CACHES',
    'SESSION_ENGINE',
    'SESSION_CACHE_ALIAS',
    'SESSION_COOKIE_AGE',
    'SESSION_COOKIE_SECURE',
    'SESSION_COOKIE_HTTPONLY',
    'SESSION_COOKIE_SAMESITE',
    'RATELIMIT_ENABLE',
    'RATELIMIT_USE_CACHE',
    'CACHE_MIDDLEWARE_ALIAS',
    'CACHE_MIDDLEWARE_SECONDS',
    'CACHE_MIDDLEWARE_KEY_PREFIX',
    'CACHE_SETTINGS',
    'CACHE_KEYS',
]
