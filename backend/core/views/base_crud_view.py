"""
Base CRUD view classes for common functionality.
Provides standardized patterns for CRUD operations using DRF generic views.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from core.pagination import StandardResultsSetPagination


class BaseListView(generics.ListAPIView):
    """
    Base generic view for listing objects.
    Provides common functionality for ListAPIView.
    """

    permission_classes: list = [IsAuthenticated]
    filter_backends: list = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    pagination_class = StandardResultsSetPagination


class BaseCreateView(generics.CreateAPIView):
    """
    Base generic view for creating objects.
    Provides common functionality for CreateAPIView.
    """

    permission_classes: list = [IsAuthenticated]


class BaseRetrieveView(generics.RetrieveAPIView):
    """
    Base generic view for retrieving single objects.
    Provides common functionality for RetrieveAPIView.
    """

    permission_classes: list = [IsAuthenticated]


class BaseUpdateView(generics.UpdateAPIView):
    """
    Base generic view for updating objects.
    Provides common functionality for UpdateAPIView.
    """

    permission_classes: list = [IsAuthenticated]


class BaseDestroyView(generics.DestroyAPIView):
    """
    Base generic view for deleting objects.
    Provides common functionality for DestroyAPIView.
    """

    permission_classes: list = [IsAuthenticated]


class BaseListCreateView(generics.ListCreateAPIView):
    """
    Base generic view for listing and creating objects.
    Provides common functionality for ListCreateAPIView.
    """

    permission_classes: list = [IsAuthenticated]
    filter_backends: list = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    pagination_class = StandardResultsSetPagination


class BaseRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Base generic view for retrieving, updating and deleting objects.
    Provides common functionality for RetrieveUpdateDestroyAPIView.
    """

    permission_classes: list = [IsAuthenticated]
