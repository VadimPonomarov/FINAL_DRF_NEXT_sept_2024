"""
OAuth2 URL patterns for django-oauth-toolkit.
Provides OAuth2 endpoints for third-party authentication.
"""

from django.urls import path, include

# Import OAuth2 provider URLs
try:
    from oauth2_provider import urls as oauth2_provider_urls
    
    # OAuth2 URL patterns
    urlpatterns = oauth2_provider_urls.urlpatterns
    
except ImportError:
    # Fallback if oauth2_provider is not installed
    from django.http import HttpResponse
    from django.views.generic import View
    
    class OAuth2NotAvailableView(View):
        """Fallback view when OAuth2 provider is not available."""
        
        def get(self, request, *args, **kwargs):
            return HttpResponse(
                "OAuth2 provider is not available. Please install django-oauth-toolkit.",
                status=503
            )
        
        def post(self, request, *args, **kwargs):
            return self.get(request, *args, **kwargs)
    
    # Fallback URL patterns
    urlpatterns = [
        path('authorize/', OAuth2NotAvailableView.as_view(), name='oauth2_authorize'),
        path('token/', OAuth2NotAvailableView.as_view(), name='oauth2_token'),
        path('revoke_token/', OAuth2NotAvailableView.as_view(), name='oauth2_revoke_token'),
        path('introspect/', OAuth2NotAvailableView.as_view(), name='oauth2_introspect'),
    ]
