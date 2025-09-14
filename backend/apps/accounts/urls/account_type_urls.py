"""
URLs for account type management - accessible only to superusers.
"""
from django.urls import path

from ..views.account_type_views import (
    change_account_type,
    bulk_change_account_type,
    account_type_statistics
)

app_name = 'account_type'

urlpatterns = [
    # Account type management endpoints
    path('<int:account_id>/type/', change_account_type, name='change_account_type'),
    path('bulk/type/update/', bulk_change_account_type, name='bulk_change_account_type'),
    path('stats/', account_type_statistics, name='account_type_statistics'),
]
