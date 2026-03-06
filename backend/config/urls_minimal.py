"""
Minimal URL configuration for testing Render deployment.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Simple health check view
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "healthy", "message": "Backend is running"})

# Simple API root view
@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        "message": "AutoRia API is running",
        "endpoints": {
            "health": "/health/",
            "admin": "/admin/",
            "docs": "/api/doc/",
        }
    })

# Swagger schema
schema_view = get_schema_view(
    openapi.Info(
        title="AutoRia API",
        default_version='v1',
        description="AutoRia Backend API",
    ),
    public=True,
    permission_classes=[AllowAny],
)

urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # Health check endpoint
    path('health/', health_check, name='health_check'),
    
    # API root
    path('api/', api_root, name='api_root'),
    
    # API Documentation
    path('api/doc/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # Root redirect to docs
    path('', lambda request: JsonResponse({"message": "AutoRia Backend", "docs": "/api/doc/"})),
]
