"""
CORS (Cross-Origin Resource Sharing) configuration.
Centralized CORS settings for secure cross-origin requests.
"""

import os
from core.utils.environment_detector import env_detector


def get_cors_config():
    """Get CORS configuration based on environment."""
    is_docker = env_detector.is_docker()
    
    # Base allowed origins
    base_origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]
    
    # Docker-specific origins
    if is_docker:
        docker_origins = [
            'http://frontend:3000',
            'http://backend:8000',
            'http://nginx:80',
        ]
        base_origins.extend(docker_origins)
    
    # Production origins from environment
    production_origins = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    production_origins = [origin.strip() for origin in production_origins if origin.strip()]
    
    if production_origins:
        base_origins.extend(production_origins)
    
    return {
        'ALLOWED_ORIGINS': base_origins,
        'ALLOW_CREDENTIALS': False,  # Отключаем credentials при ALLOW_ALL_ORIGINS = True
        'ALLOW_ALL_ORIGINS': True,  # Временно разрешаем все источники для тестирования
    }


# Get CORS configuration
cors_config = get_cors_config()

# CORS settings
CORS_ALLOWED_ORIGINS = cors_config['ALLOWED_ORIGINS']
CORS_ALLOW_CREDENTIALS = cors_config['ALLOW_CREDENTIALS']
CORS_ALLOW_ALL_ORIGINS = cors_config['ALLOW_ALL_ORIGINS']

# CORS headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-api-key',
    'cache-control',
    'x-frame-options',  # Allow iframe-related headers
]

# CORS methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Export all CORS settings
__all__ = [
    'CORS_ALLOWED_ORIGINS',
    'CORS_ALLOW_CREDENTIALS',
    'CORS_ALLOW_ALL_ORIGINS',
    'CORS_ALLOW_HEADERS',
    'CORS_ALLOW_METHODS',
]
