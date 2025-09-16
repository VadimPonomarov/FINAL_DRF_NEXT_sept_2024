"""
Django Channels configuration for WebSocket support.
"""

import os
from core.utils.environment_detector import env_detector


def get_channels_config():
    """Get Django Channels configuration based on environment."""
    redis_config = env_detector.get_redis_config()
    
    # Redis channel layer configuration
    redis_channel_layer = {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [f"redis://{redis_config['HOST']}:{redis_config['PORT']}/{redis_config['DB']}"],
            'capacity': int(os.getenv('WEBSOCKET_CAPACITY', 1500)),
            'expiry': int(os.getenv('WEBSOCKET_EXPIRY', 60)),
        },
    }
    
    # In-memory channel layer for development/testing
    memory_channel_layer = {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
    
    # Use Redis if available, fallback to in-memory for development
    use_redis = os.getenv('USE_REDIS_CHANNELS', 'true').lower() == 'true'
    
    if use_redis:
        default_layer = redis_channel_layer
    else:
        default_layer = memory_channel_layer
    
    return {
        'default': default_layer,
        'redis': redis_channel_layer,
        'memory': memory_channel_layer,
    }


# Channel layers configuration
CHANNEL_LAYERS = get_channels_config()

# WebSocket configuration
WEBSOCKET_CONFIG = {
    'CAPACITY': int(os.getenv('WEBSOCKET_CAPACITY', 1500)),
    'EXPIRY': int(os.getenv('WEBSOCKET_EXPIRY', 60)),
    'RECONNECT_INTERVAL': int(os.getenv('WEBSOCKET_RECONNECT_INTERVAL', 3)),
    'PING_INTERVAL': int(os.getenv('WEBSOCKET_PING_INTERVAL', 30)),
    'PONG_TIMEOUT': int(os.getenv('WEBSOCKET_PONG_TIMEOUT', 5)),
    'MAX_MESSAGE_SIZE': int(os.getenv('WEBSOCKET_MAX_MESSAGE_SIZE', 1024 * 1024)),  # 1MB
}

# ASGI application configuration is defined in apps_config.py
