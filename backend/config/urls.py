"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
"""

from django.conf import settings
from django.conf.urls.static import static
# from django.contrib import admin  # Disabled for faster startup
from django.urls import include, path
from django.views.generic import RedirectView
from django.contrib.auth import views as auth_views

from apps.accounts.urls import urlpatterns as accounts_urls
from apps.ads.urls import urlpatterns as ads_urls
from apps.auth.urls import urlpatterns as auth_urls
from apps.chat.urls import urlpatterns as chat_urls
from apps.users.urls import urlpatterns as users_urls
from core.views import health_check, google_maps_api_key
from .docs.urls import urlpatterns as docs_urls

# Main URL patterns
urlpatterns = [
    # Admin interface (disabled for faster startup)
    # path('admin/', admin.site.urls),
    
    # Authentication URLs (Django built-in)
    path('accounts/login/', auth_views.LoginView.as_view(template_name='admin/login.html'), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    path('accounts/password_reset/', auth_views.PasswordResetView.as_view(
        template_name='registration/password_reset_form.html',
        email_template_name='registration/password_reset_email.html',
        subject_template_name='registration/password_reset_subject.txt'
    ), name='password_reset'),
    path('accounts/password_reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='registration/password_reset_done.html'
    ), name='password_reset_done'),
    path('accounts/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='registration/password_reset_confirm.html'
    ), name='password_reset_confirm'),
    path('accounts/reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='registration/password_reset_complete.html'
    ), name='password_reset_complete'),
    
    # Health check endpoint
    path("health/", health_check, name="health_check"),

    # Configuration endpoints
    path("api/config/google-maps-key/", google_maps_api_key, name="google_maps_api_key"),

    # API endpoints
    path("api/accounts/", include((accounts_urls, 'accounts'))),
    path("api/users/", include(users_urls)),
    path("api/auth/", include(auth_urls)),
    path("api/ads/", include(ads_urls)),
    path("api/currency/", include('apps.currency.urls')),
    path("api/chat/", include('apps.chat.urls')),
    
    # Public reference endpoints (for frontend)
    path("api/public/reference/", include('apps.ads.urls.reference_urls')),

    # API Documentation
    path('', RedirectView.as_view(url='/api/doc', permanent=False)),
    *docs_urls,
    
    # Chat websocket endpoints
    *chat_urls,
]

# Serve media files in development
# Serve static files (for development and Docker)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    # Debug toolbar
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
