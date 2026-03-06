"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import threading

import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.environ.get("DJANGO_SETTINGS_MODULE", "config.settings"))

# Setup Django before importing any Django-dependent modules
django.setup()

# Initialize Django ASGI application first
django_asgi_app = get_asgi_application()

# Load WebSocket dependencies with timeout to prevent g4f/langchain blocking startup
_ws_application = [None]
_ws_error = [None]


def _load_ws_deps():
    try:
        from core.middlewares.auth_socket import JWTAuthMiddleware
        from .routing import websocket_urlpatterns
        _ws_application[0] = ProtocolTypeRouter({
            "http": django_asgi_app,
            "websocket": JWTAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            )
        })
        print("[ASGI] WebSocket application loaded successfully")
    except Exception as e:
        _ws_error[0] = e
        print(f"[ASGI] WebSocket dependencies failed: {type(e).__name__}: {e}")


_ws_thread = threading.Thread(target=_load_ws_deps, daemon=True)
_ws_thread.start()
_ws_thread.join(timeout=20)

if _ws_application[0] is not None:
    application = _ws_application[0]
elif _ws_thread.is_alive():
    print("[ASGI] WebSocket initialization timed out (g4f/langchain slow) - HTTP-only mode")
    application = django_asgi_app
else:
    print(f"[ASGI] WebSocket init failed: {_ws_error[0]} - HTTP-only mode")
    application = django_asgi_app
