"""
Minimal URL configuration for Railway deployment test.
"""
from django.contrib import admin
from django.urls import path
from django.http import JsonResponse

def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Railway minimal Django test is working!',
        'version': '1.0.0'
    })

def home(request):
    """Simple home endpoint"""
    return JsonResponse({
        'message': 'Welcome to Railway Django Test',
        'endpoints': ['/health/', '/admin/']
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health'),
    path('', home, name='home'),
]
