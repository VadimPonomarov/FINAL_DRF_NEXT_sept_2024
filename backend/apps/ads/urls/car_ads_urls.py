"""
URL patterns for car advertisements with comprehensive filtering and LLM moderation.
"""

from django.urls import path
from ..views.car_ad_views import (
    CarAdListView, CarAdCreateView, CarAdDetailView,
    CarAdUpdateView, CarAdDeleteView, MyCarAdsListView,
    TestModerationView,
    validate_car_ad, car_ad_statistics, car_ad_analytics,
    check_ad_creation_limits, cleanup_all_ads
)

from ..views.moderation_queue_views import (
    ModerationQueueView, approve_advertisement, reject_advertisement,
    request_review, moderation_statistics, block_advertisement, activate_advertisement,
    save_moderation_notes
)

urlpatterns = [
    # Special testing endpoints (must be FIRST!)
    path('cleanup-all', cleanup_all_ads, name='cleanup-all-ads'),

    # Public car ads endpoints
    path('', CarAdListView.as_view(), name='car_ads_list'),
    path('create', CarAdCreateView.as_view(), name='car_ads_create'),
    path('<int:pk>', CarAdDetailView.as_view(), name='car_ads_detail'),

    # User's own car ads management
    path('my', MyCarAdsListView.as_view(), name='my_car_ads_list'),
    path('<int:pk>/update', CarAdUpdateView.as_view(), name='car_ads_update'),
    path('<int:pk>/delete', CarAdDeleteView.as_view(), name='car_ads_delete'),

    # Additional functionality
    path('<int:pk>/validate', validate_car_ad, name='car_ads_validate'),
    path('test-moderation/', TestModerationView.as_view(), name='test_moderation'),
    path('<int:ad_id>/analytics', car_ad_analytics, name='car_ads_analytics'),
    path('statistics', car_ad_statistics, name='car_ads_statistics'),
    path('check-limits', check_ad_creation_limits, name='car_ads_check_limits'),

    # Moderation endpoints (staff/superuser only)
    path('moderation/queue', ModerationQueueView.as_view(), name='moderation_queue'),
    path('moderation/<int:ad_id>/approve', approve_advertisement, name='approve_ad'),
    path('moderation/<int:ad_id>/reject', reject_advertisement, name='reject_ad'),
    path('moderation/<int:ad_id>/review', request_review, name='request_review'),
    path('moderation/<int:ad_id>/block', block_advertisement, name='block_ad'),
    path('moderation/<int:ad_id>/activate', activate_advertisement, name='activate_ad'),
    path('moderation/<int:ad_id>/notes', save_moderation_notes, name='save_moderation_notes'),
    path('moderation/statistics', moderation_statistics, name='moderation_stats'),
]
