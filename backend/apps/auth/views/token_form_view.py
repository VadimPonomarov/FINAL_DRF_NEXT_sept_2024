"""
Token Form View for authentication testing and development.
Provides a simple HTML form for testing JWT token authentication.
"""

from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class TokenFormView(TemplateView):
    """
    Simple view for testing JWT token authentication.
    Provides an HTML form for developers to test token endpoints.
    """
    template_name = 'auth/token_form.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update({
            'title': 'JWT Token Testing Form',
            'description': 'Test JWT authentication endpoints',
            'login_url': '/api/auth/login',
            'refresh_url': '/api/auth/refresh',
            'logout_url': '/api/auth/logout',
        })
        return context
    
    def get(self, request, *args, **kwargs):
        """Handle GET requests - show the token form."""
        return super().get(request, *args, **kwargs)
    
    def post(self, request, *args, **kwargs):
        """Handle POST requests - process token operations."""
        action = request.POST.get('action')
        
        if action == 'test_token':
            # Simple token validation test
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                return JsonResponse({
                    'status': 'success',
                    'message': 'Token format is valid',
                    'token_present': True
                })
            else:
                return JsonResponse({
                    'status': 'error',
                    'message': 'No valid Bearer token found',
                    'token_present': False
                })
        
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid action'
        })


@method_decorator(csrf_exempt, name='dispatch')
class TokenTestAPIView(APIView):
    """
    API view for testing token authentication.
    Used by frontend applications to test JWT tokens.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Test GET endpoint for token validation."""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            return Response({
                'status': 'success',
                'message': 'Token received successfully',
                'token_length': len(token),
                'has_token': True
            }, status=status.HTTP_200_OK)
        
        return Response({
            'status': 'error',
            'message': 'No Bearer token provided',
            'has_token': False
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    def post(self, request):
        """Test POST endpoint for token operations."""
        data = request.data
        action = data.get('action', 'test')
        
        if action == 'validate':
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                return Response({
                    'status': 'success',
                    'message': 'Token validation successful',
                    'action': action
                }, status=status.HTTP_200_OK)
            
            return Response({
                'status': 'error',
                'message': 'Token validation failed',
                'action': action
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response({
            'status': 'success',
            'message': f'Test action "{action}" completed',
            'data': data
        }, status=status.HTTP_200_OK)
