from django.urls import re_path

from apps.chat.consumer import EnhancedChatConsumer

websocket_urlpatterns = [
    re_path(r'^(?P<room>[a-zA-Z0-9_-]+)/$', EnhancedChatConsumer.as_asgi()),
]