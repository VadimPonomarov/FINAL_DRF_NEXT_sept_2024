"""
Base moderation view classes for moderation operations.
Provides standardized patterns for moderation operations.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.ads.permissions import IsStaffOrSuperUser


class BaseModerationListView(generics.ListAPIView):
    """
    Base generic view for moderation operations.
    Provides common functionality for moderation list endpoints.
    """

    permission_classes: list = [IsStaffOrSuperUser]
    filter_backends: list = [DjangoFilterBackend, SearchFilter, OrderingFilter]
