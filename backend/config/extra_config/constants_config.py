# Constants Configuration
# Centralized constants with environment variable override support

import os

# =============================================================================
# PROTOCOLS (always the same)
# =============================================================================
PROTOCOLS = {
    'HTTP': 'http',
    'HTTPS': 'https',
    'WS': 'ws',
    'WSS': 'wss',
    'POSTGRESQL': 'postgresql',
    'REDIS': 'redis',
    'AMQP': 'amqp',
    'SMTP': 'smtp',
}

# =============================================================================
# STANDARD SERVICE PORTS (with environment override)
# =============================================================================
def get_port(service_name: str, default: int = None) -> int:
    """Get port for service with environment variable override"""
    env_var = f"{service_name.upper()}_PORT"
    if default is None:
        defaults = {
            'BACKEND': 8000,
            'FRONTEND': 3000,
            'POSTGRES': 5432,
            'REDIS': 6379,
            'RABBITMQ': 5672,
            'RABBITMQ_MANAGEMENT': 15672,
            'MAILING_LOCAL': 8001,
            'MAILING_DOCKER': 8000,
            'FLOWER': 5555,
            'REDIS_INSIGHT': 5540,
            'MINIO': 9000,
            'NGINX': 80,
            'NGINX_SSL': 443,
        }
        default = defaults.get(service_name.upper(), 8000)
    
    return int(os.getenv(env_var, default))

# =============================================================================
# EXTERNAL SERVICES (always the same URLs)
# =============================================================================
EXTERNAL_SERVICES = {
    'DUMMY_JSON': os.getenv('NEXT_PUBLIC_DUMMY_URL', 'https://dummyjson.com'),
    'GOOGLE_APIS': 'https://www.googleapis.com',
    'GOOGLE_OAUTH': 'https://accounts.google.com',
    'GITHUB_API': 'https://api.github.com',
}

# =============================================================================
# DATABASE CONFIGURATION (with environment override)
# =============================================================================
DATABASE_CONFIG = {
    'ENGINE': 'django.db.backends.postgresql',
    'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', 60)),
    'CONN_HEALTH_CHECKS': os.getenv('DB_CONN_HEALTH_CHECKS', 'true').lower() == 'true',
    'OPTIONS': {
        'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', 10)),
    },
}

# =============================================================================
# REDIS CONFIGURATION (with environment override)
# =============================================================================
REDIS_CONFIG = {
    'DB': int(os.getenv('REDIS_DB', 0)),
    'DECODE_RESPONSES': os.getenv('REDIS_DECODE_RESPONSES', 'true').lower() == 'true',
    'SOCKET_CONNECT_TIMEOUT': int(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', 5)),
    'SOCKET_TIMEOUT': int(os.getenv('REDIS_SOCKET_TIMEOUT', 5)),
    'RETRY_ON_TIMEOUT': os.getenv('REDIS_RETRY_ON_TIMEOUT', 'true').lower() == 'true',
    'HEALTH_CHECK_INTERVAL': int(os.getenv('REDIS_HEALTH_CHECK_INTERVAL', 30)),
}

# =============================================================================
# CELERY CONFIGURATION (with environment override)
# =============================================================================
CELERY_CONFIG = {
    'TASK_SERIALIZER': os.getenv('CELERY_TASK_SERIALIZER', 'json'),
    'ACCEPT_CONTENT': os.getenv('CELERY_ACCEPT_CONTENT', 'json').split(','),
    'RESULT_SERIALIZER': os.getenv('CELERY_RESULT_SERIALIZER', 'json'),
    'TIMEZONE': os.getenv('CELERY_TIMEZONE', 'UTC'),
    'ENABLE_UTC': os.getenv('CELERY_ENABLE_UTC', 'true').lower() == 'true',
    'TASK_TRACK_STARTED': os.getenv('CELERY_TASK_TRACK_STARTED', 'true').lower() == 'true',
    'TASK_TIME_LIMIT': int(os.getenv('CELERY_TASK_TIME_LIMIT', 30 * 60)),  # 30 minutes
    'TASK_SOFT_TIME_LIMIT': int(os.getenv('CELERY_TASK_SOFT_TIME_LIMIT', 60)),  # 1 minute
    'WORKER_PREFETCH_MULTIPLIER': int(os.getenv('CELERY_WORKER_PREFETCH_MULTIPLIER', 1)),
    'TASK_ACKS_LATE': os.getenv('CELERY_TASK_ACKS_LATE', 'true').lower() == 'true',
    'WORKER_DISABLE_RATE_LIMITS': os.getenv('CELERY_WORKER_DISABLE_RATE_LIMITS', 'false').lower() == 'true',
}

# =============================================================================
# CORS CONFIGURATION (with environment override)
# =============================================================================
CORS_CONFIG = {
    'ALLOW_METHODS': os.getenv('CORS_ALLOW_METHODS', 'DELETE,GET,OPTIONS,PATCH,POST,PUT').split(','),
    'ALLOW_HEADERS': os.getenv('CORS_ALLOW_HEADERS', 
        'accept,accept-encoding,authorization,content-type,dnt,origin,user-agent,x-csrftoken,x-requested-with').split(','),
}

# =============================================================================
# API PATHS (always the same)
# =============================================================================
API_PATHS = {
    'AUTH': {
        'LOGIN': '/api/auth/login',
        'REFRESH': '/api/auth/refresh',
        'LOGOUT': '/api/auth/logout',
        'REGISTER': '/api/users/create',
    },
    'USERS': {
        'PROFILE': '/api/users/profile',
        'LIST': '/api/users',
    },
    'CHAT': {
        'WEBSOCKET': '/api/chat',
        'MESSAGES': '/api/chat/messages',
    },
    'SYSTEM': {
        'HEALTH': '/health',
        'ADMIN': '/admin',
        'API_DOC': '/api/doc',
        'STATIC': '/static',
        'MEDIA': '/media',
    },
}

# =============================================================================
# WEBSOCKET CONFIGURATION (with environment override)
# =============================================================================
WEBSOCKET_CONFIG = {
    'CAPACITY': int(os.getenv('WEBSOCKET_CAPACITY', 1500)),
    'EXPIRY': int(os.getenv('WEBSOCKET_EXPIRY', 60)),
    'RECONNECT_INTERVAL': int(os.getenv('WEBSOCKET_RECONNECT_INTERVAL', 3)),
    'PING_INTERVAL': int(os.getenv('WEBSOCKET_PING_INTERVAL', 30)),
    'PONG_TIMEOUT': int(os.getenv('WEBSOCKET_PONG_TIMEOUT', 5)),
    'MAX_MESSAGE_SIZE': int(os.getenv('WEBSOCKET_MAX_MESSAGE_SIZE', 1024 * 1024)),  # 1MB
}

# =============================================================================
# SECURITY CONFIGURATION (with environment override)
# =============================================================================
SECURITY_CONFIG = {
    'SESSION_COOKIE_SECURE': os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true',
    'CSRF_COOKIE_SECURE': os.getenv('CSRF_COOKIE_SECURE', 'false').lower() == 'true',
    'SECURE_BROWSER_XSS_FILTER': os.getenv('SECURE_BROWSER_XSS_FILTER', 'true').lower() == 'true',
    'SECURE_CONTENT_TYPE_NOSNIFF': os.getenv('SECURE_CONTENT_TYPE_NOSNIFF', 'true').lower() == 'true',
    'X_FRAME_OPTIONS': os.getenv('X_FRAME_OPTIONS', 'DENY'),
    'SECURE_HSTS_SECONDS': int(os.getenv('SECURE_HSTS_SECONDS', 31536000)),  # 1 year
    'SECURE_HSTS_INCLUDE_SUBDOMAINS': os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'true').lower() == 'true',
    'SECURE_HSTS_PRELOAD': os.getenv('SECURE_HSTS_PRELOAD', 'true').lower() == 'true',
}

# =============================================================================
# FILE CONFIGURATION (with environment override)
# =============================================================================
FILE_CONFIG = {
    'MAX_UPLOAD_SIZE': int(os.getenv('FILE_MAX_UPLOAD_SIZE', 10 * 1024 * 1024)),  # 10MB
    'ALLOWED_EXTENSIONS': os.getenv('FILE_ALLOWED_EXTENSIONS', 
        '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx').split(','),
    'STATIC_ROOT': os.getenv('STATIC_ROOT', 'staticfiles'),
    'MEDIA_ROOT': os.getenv('MEDIA_ROOT', 'media'),
    'STATIC_URL': os.getenv('STATIC_URL', '/static/'),
    'MEDIA_URL': os.getenv('MEDIA_URL', '/media/'),
}

# =============================================================================
# TIMEOUTS AND LIMITS (with environment override)
# =============================================================================
TIMEOUTS = {
    'DATABASE_CONNECT': int(os.getenv('TIMEOUT_DATABASE_CONNECT', 30)),
    'REDIS_CONNECT': int(os.getenv('TIMEOUT_REDIS_CONNECT', 5)),
    'API_REQUEST': int(os.getenv('TIMEOUT_API_REQUEST', 15)),
    'WEBSOCKET_CONNECT': int(os.getenv('TIMEOUT_WEBSOCKET_CONNECT', 10)),
    'CELERY_TASK': int(os.getenv('TIMEOUT_CELERY_TASK', 30 * 60)),  # 30 minutes
}

LIMITS = {
    'MAX_RETRY_ATTEMPTS': int(os.getenv('LIMIT_MAX_RETRY_ATTEMPTS', 3)),
    'MAX_CONNECTIONS': int(os.getenv('LIMIT_MAX_CONNECTIONS', 100)),
    'RATE_LIMIT_PER_MINUTE': int(os.getenv('LIMIT_RATE_PER_MINUTE', 60)),
    'RATE_LIMIT_PER_HOUR': int(os.getenv('LIMIT_RATE_PER_HOUR', 1000)),
    'SESSION_TIMEOUT_HOURS': int(os.getenv('LIMIT_SESSION_TIMEOUT_HOURS', 24)),
}

# =============================================================================
# INTERNATIONALIZATION (with environment override)
# =============================================================================
I18N_CONFIG = {
    'LANGUAGE_CODE': os.getenv('LANGUAGE_CODE', 'en-us'),
    'TIME_ZONE': os.getenv('TIME_ZONE', 'UTC'),
    'USE_I18N': os.getenv('USE_I18N', 'true').lower() == 'true',
    'USE_TZ': os.getenv('USE_TZ', 'true').lower() == 'true',
    'LANGUAGES': [
        ('en', 'English'),
        ('ru', 'Russian'),
    ],
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_protocol(service_name: str) -> str:
    """Get protocol for service"""
    return PROTOCOLS.get(service_name.upper(), 'http')

def get_api_path(category: str, endpoint: str) -> str:
    """Get API path"""
    category_paths = API_PATHS.get(category.upper(), {})
    return category_paths.get(endpoint.upper(), '/')

def build_database_url(host: str, port: int, name: str, user: str, password: str) -> str:
    """Build database URL"""
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"

def build_redis_url(host: str, port: int, db: int = 0) -> str:
    """Build Redis URL"""
    return f"redis://{host}:{port}/{db}"

def build_celery_broker_url(host: str, port: int, user: str = 'guest', password: str = 'guest') -> str:
    """Build Celery broker URL"""
    return f"pyamqp://{user}:{password}@{host}:{port}//"

def is_external_service(url: str) -> bool:
    """Check if URL is an external service"""
    return any(url.startswith(service) for service in EXTERNAL_SERVICES.values())
