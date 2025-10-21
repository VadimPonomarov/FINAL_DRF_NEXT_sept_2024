"""
Base reference view classes for reference data.
Provides standardized patterns for reference data CRUD operations.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.filters import OrderingFilter, SearchFilter

from core.pagination import StandardResultsSetPagination
from core.permissions import ReadOnlyOrStaffWrite


class BaseReferenceListCreateView(generics.ListCreateAPIView):
    """
    Base generic view for reference data (List + Create).
    Provides common functionality for reference data endpoints.
    """

    permission_classes: list = [ReadOnlyOrStaffWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends: list = [DjangoFilterBackend, SearchFilter, OrderingFilter]


class BaseReferenceRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Base generic view for reference data (Retrieve + Update + Destroy).
    Provides common functionality for reference data detail endpoints.
    """

    permission_classes: list = [ReadOnlyOrStaffWrite]
