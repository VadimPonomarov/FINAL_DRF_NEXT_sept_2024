"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.environ.get("DJANGO_SETTINGS_MODULE", "config.settings"))

# Setup Django before importing any Django-dependent modules
django.setup()

# Initialize Django ASGI application first
django_asgi_app = get_asgi_application()

# Try to import WebSocket dependencies, fallback to HTTP-only if they fail
try:
    from core.middlewares.auth_socket import JWTAuthMiddleware
    from .routing import websocket_urlpatterns
    
    application = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(
            URLRouter(
                websocket_urlpatterns
            )
        )
    })
except ImportError as e:
    print(f"WebSocket dependencies not available: {e}")
    print("Running in HTTP-only mode")
    # Fallback to HTTP-only ASGI application
    application = django_asgi_app
