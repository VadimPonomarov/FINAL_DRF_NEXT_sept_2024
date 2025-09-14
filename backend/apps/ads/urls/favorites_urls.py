"""
URL patterns for favorites functionality.
"""

from django.urls import path
from ..views.favorites_toggle_view import toggle_favorite, check_favorite, FavoritesListView

urlpatterns = [
    # Get list of favorite ads
    path('', FavoritesListView.as_view(), name='favorites-list'),

    # Toggle favorite status
    path('toggle/', toggle_favorite, name='favorites-toggle'),

    # Check if ad is in favorites
    path('check/<int:car_ad_id>/', check_favorite, name='favorites-check'),
]
