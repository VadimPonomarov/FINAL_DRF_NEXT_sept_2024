"""
Base ad view classes for advertisement operations.
Provides standardized patterns for advertisement CRUD operations.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOwnerOrReadOnly


class BaseAdListView(generics.ListAPIView):
    """
    Base generic view for listing advertisements.
    Provides common functionality for advertisement list endpoints.
    """

    permission_classes: list = [IsAuthenticated]
    filter_backends: list = [DjangoFilterBackend, SearchFilter, OrderingFilter]


class BaseAdCreateView(generics.CreateAPIView):
    """
    Base generic view for creating advertisements.
    Provides common functionality for advertisement creation endpoints.
    """

    permission_classes: list = [IsAuthenticated]


class BaseAdDetailView(generics.RetrieveAPIView):
    """
    Base generic view for retrieving advertisement details.
    Provides common functionality for advertisement detail endpoints.
    """

    permission_classes: list = []  # Public access for viewing ads


class BaseAdListCreateView(generics.ListCreateAPIView):
    """
    Base generic view for listing and creating advertisements.
    Provides common functionality for advertisement list and create endpoints.
    """

    permission_classes: list = [IsAuthenticated]
    filter_backends: list = [DjangoFilterBackend, SearchFilter, OrderingFilter]


class BaseAdRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Base generic view for retrieving, updating and deleting advertisements.
    Provides common functionality for advertisement detail, update and delete endpoints.
    """

    permission_classes: list = [IsAuthenticated]
