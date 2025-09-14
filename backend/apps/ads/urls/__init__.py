# URLs package for ads app
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views.ads.ad_views import AdListCreateView, AdRetrieveUpdateDestroyView, AdPublishView
from ..views.image_views import AddImageListCreateView, AddImageRetrieveDestroyView
from ..views.contact_views import (
    ad_contact_create, ad_contact_partial_update, ad_contact_delete,
    ad_contact_list, ad_contact_detail
)

# API URL patterns
urlpatterns = [
    # Statistics and Analytics endpoints
    path('statistics/', include('apps.ads.urls.statistics_urls')),

    # Analytics tracking endpoints
    path('analytics/', include('apps.ads.urls.analytics_urls')),

    # Reference data endpoints
    path('reference/', include('apps.ads.urls.reference_urls')),

    # Car advertisements with filtering and LLM moderation
    path('cars/', include('apps.ads.urls.car_ads_urls')),

    # Favorites functionality
    path('favorites/', include('apps.ads.urls.favorites_urls')),

    # Counters admin
    path('counters/', include('apps.ads.urls.counters_admin_urls')),

    # Ad status management (superuser only)
    path('admin/', include('apps.ads.urls.ad_status_urls')),

    # Legacy ad endpoints (keep for backward compatibility)
    path('legacy/', AdListCreateView.as_view(), name='api_ads_list'),
    path('legacy/<int:pk>', AdRetrieveUpdateDestroyView.as_view(), name='api_ads_read'),
    path('legacy/<int:ad_id>/publish', AdPublishView.as_view(), name='api_ads_publish'),

    # Ad images endpoints
    path('<int:ad_pk>/images', AddImageListCreateView.as_view(), name='api_ads_images_list'),
    path('<int:ad_pk>/images/<int:pk>', AddImageRetrieveDestroyView.as_view(), name='api_ads_images_detail'),

    # Contact management for ads
    path('<int:ad_pk>/contacts', ad_contact_list, name='api_ads_contacts_list'),
    path('<int:ad_pk>/contacts', ad_contact_create, name='api_ads_contacts_create'),
    path('<int:ad_pk>/contacts/<int:id>', ad_contact_detail, name='api_ads_contacts_detail'),
    path('<int:ad_pk>/contacts/<int:id>', ad_contact_partial_update, name='api_ads_contacts_partial_update'),
    path('<int:ad_pk>/contacts/<int:id>', ad_contact_delete, name='api_ads_contacts_delete'),
]

app_name = 'ads'
