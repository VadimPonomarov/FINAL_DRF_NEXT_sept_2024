"""
Simple test view to verify deployment
"""
from django.http import JsonResponse

def test_deployment(request):
    """Simple test endpoint"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Deployment test successful',
        'apps': ['chat', 'users', 'ads', 'auth', 'accounts'],
        'timestamp': '2025-03-14'
    })
