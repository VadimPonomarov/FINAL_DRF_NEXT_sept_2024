"""
URLs for ad status management - accessible only to superusers.
"""
from django.urls import path

from ..views.ad_status_views import (
    AdStatusDetailView,
    AdModerationListView,
    update_ad_status,
    bulk_update_ad_status,
    moderation_dashboard,
    approve_ad,
    reject_ad
)

app_name = 'ad_status'

urlpatterns = [
    # Status management endpoints
    path('<int:ad_id>/status/', AdStatusDetailView.as_view(), name='ad_status_detail'),
    path('<int:ad_id>/status/update/', update_ad_status, name='update_ad_status'),
    
    # Quick actions
    path('<int:ad_id>/approve/', approve_ad, name='approve_ad'),
    path('<int:ad_id>/reject/', reject_ad, name='reject_ad'),
    
    # Bulk operations
    path('bulk/status/update/', bulk_update_ad_status, name='bulk_update_status'),
    
    # Moderation dashboard
    path('moderation/dashboard/', moderation_dashboard, name='moderation_dashboard'),
    path('moderation/list/', AdModerationListView.as_view(), name='moderation_list'),
]
