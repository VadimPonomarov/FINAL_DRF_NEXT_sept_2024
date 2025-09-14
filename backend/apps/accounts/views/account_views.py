from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework.exceptions import ValidationError
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from core.permissions import IsOwnerOrSuperUserWrite
from ..models import AddsAccount
from ..serializers import AddsAccountSerializer
from ..filters import AddsAccountFilter
from ..docs.swagger_schemas import (
    accounts_list_schema, accounts_create_schema, accounts_retrieve_schema,
    accounts_update_schema, accounts_partial_update_schema, accounts_delete_schema
)


class AccountListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating accounts with filtering and search.

    Supports:
    - Filtering by account type, role, organization name
    - Text search in organization name and user email
    - Ordering by various fields
    """
    serializer_class = AddsAccountSerializer
    permission_classes = [IsAuthenticated]

    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AddsAccountFilter
    search_fields = ['organization_name', 'user__email']
    ordering_fields = ['created_at', 'updated_at', 'organization_name']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return accounts that belong to the current user."""
        # Handle case when user is not authenticated (e.g., during Swagger schema generation)
        if not self.request.user.is_authenticated:
            return AddsAccount.objects.none()
        return AddsAccount.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Set the user to the current user when creating an account."""
        # Check if user already has an account (OneToOneField constraint)
        if hasattr(self.request.user, 'account_adds'):
            # Update existing account instead of creating new one
            existing_account = self.request.user.account_adds
            for key, value in serializer.validated_data.items():
                setattr(existing_account, key, value)
            existing_account.save()
            # Нужно обновить serializer.instance для правильного ответа
            serializer.instance = existing_account
        else:
            serializer.save(user=self.request.user)

    @accounts_list_schema
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    @accounts_create_schema
    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AccountRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating and deleting a specific account.
    """
    serializer_class = AddsAccountSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperUserWrite]

    def get_queryset(self):
        """Return accounts that belong to the current user."""
        # Handle case when user is not authenticated (e.g., during Swagger schema generation)
        if not self.request.user.is_authenticated:
            return AddsAccount.objects.none()
        return AddsAccount.objects.filter(user=self.request.user)

    @accounts_retrieve_schema
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    @accounts_update_schema
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @accounts_partial_update_schema
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @accounts_delete_schema
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)
