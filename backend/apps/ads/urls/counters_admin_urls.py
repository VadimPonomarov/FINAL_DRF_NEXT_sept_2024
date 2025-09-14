from django.urls import path
from ..views.counters_admin_views import reset_ad_counters

urlpatterns = [
    path('ad/<int:ad_id>/reset/', reset_ad_counters, name='reset_ad_counters'),
]

