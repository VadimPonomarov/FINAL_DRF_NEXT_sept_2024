"""
Core views package.
Contains base view classes and common view functionality.
"""

from .base_ad_view import (
    BaseAdCreateView,
    BaseAdDetailView,
    BaseAdListCreateView,
    BaseAdListView,
    BaseAdRetrieveUpdateDestroyView,
)
from .base_crud_view import (
    BaseCreateView,
    BaseDestroyView,
    BaseListCreateView,
    BaseListView,
    BaseRetrieveUpdateDestroyView,
    BaseRetrieveView,
    BaseUpdateView,
)
from .base_moderation_view import BaseModerationListView
from .base_reference_view import (
    BaseReferenceListCreateView,
    BaseReferenceRetrieveUpdateDestroyView,
)
from .health_views import google_maps_api_key, health_check

__all__ = [
    # Base CRUD views
    "BaseListView",
    "BaseCreateView",
    "BaseRetrieveView",
    "BaseUpdateView",
    "BaseDestroyView",
    "BaseListCreateView",
    "BaseRetrieveUpdateDestroyView",
    # Reference views
    "BaseReferenceListCreateView",
    "BaseReferenceRetrieveUpdateDestroyView",
    # Ad views
    "BaseAdListView",
    "BaseAdCreateView",
    "BaseAdDetailView",
    "BaseAdListCreateView",
    "BaseAdRetrieveUpdateDestroyView",
    # Moderation views
    "BaseModerationListView",
    # Health and config views
    "health_check",
    "google_maps_api_key",
]
