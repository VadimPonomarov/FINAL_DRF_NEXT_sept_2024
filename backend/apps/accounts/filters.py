"""
Django filters for AutoRia accounts application.
Provides filtering capabilities for accounts and addresses.
"""

import django_filters
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.accounts.models import AddsAccount, RawAccountAddress
from core.enums.ads import AccountTypeEnum


class AddsAccountFilter(django_filters.FilterSet):
    """
    Filter for AddsAccount model.

    Supports filtering by:
    - Account type (BASIC, PREMIUM)
    - Organization name
    - Status fields
    - Date ranges
    """

    # Account type filter
    account_type = django_filters.ChoiceFilter(
        choices=AccountTypeEnum.choices,
        help_text=_('Account type')
    )
    
    # Organization filters
    organization_name = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Organization name (partial match)')
    )
    
    # Status filters
    stats_enabled = django_filters.BooleanFilter(
        help_text=_('Statistics enabled')
    )
    
    # Date filters
    created_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        help_text=_('Created after date')
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        help_text=_('Created before date')
    )
    
    # Search filter
    search = django_filters.CharFilter(
        method='filter_search',
        help_text=_('Search in organization name and user email')
    )
    
    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('created_at', 'created_at'),
            ('updated_at', 'updated_at'),
            ('organization_name', 'organization_name'),
            ('user__email', 'user_email'),
        ),
        field_labels={
            'created_at': _('Creation date'),
            'updated_at': _('Update date'),
            'organization_name': _('Organization name'),
            'user_email': _('User email'),
        },
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = AddsAccount
        fields = {
            'id': ['exact', 'in'],
            'account_type': ['exact'],
            'organization_name': ['exact', 'icontains'],
            'stats_enabled': ['exact'],
            'created_at': ['exact', 'gte', 'lte', 'date'],
            'updated_at': ['exact', 'gte', 'lte', 'date'],
        }
    
    def filter_search(self, queryset, name, value):
        """Search in organization name and user email."""
        return queryset.filter(
            models.Q(organization_name__icontains=value) |
            models.Q(user__email__icontains=value)
        )


class RawAccountAddressFilter(django_filters.FilterSet):
    """
    Filter for RawAccountAddress model.
    
    Supports filtering by:
    - Location (region, locality)
    - Geocoding status
    - Place ID
    - Date ranges
    """
    
    # Location filters
    region = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Region (partial match)')
    )
    locality = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Locality (partial match)')
    )
    input_region = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Input region (partial match)')
    )
    input_locality = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Input locality (partial match)')
    )
    
    # Geocoding filters
    is_geocoded = django_filters.BooleanFilter(
        help_text=_('Geocoding status')
    )
    has_coordinates = django_filters.BooleanFilter(
        method='filter_has_coordinates',
        help_text=_('Has latitude and longitude')
    )
    geo_code = django_filters.CharFilter(
        lookup_expr='exact',
        help_text=_('Google Maps place ID')
    )
    
    # Geographic area filters
    latitude_min = django_filters.NumberFilter(
        field_name='latitude',
        lookup_expr='gte',
        help_text=_('Minimum latitude')
    )
    latitude_max = django_filters.NumberFilter(
        field_name='latitude',
        lookup_expr='lte',
        help_text=_('Maximum latitude')
    )
    longitude_min = django_filters.NumberFilter(
        field_name='longitude',
        lookup_expr='gte',
        help_text=_('Minimum longitude')
    )
    longitude_max = django_filters.NumberFilter(
        field_name='longitude',
        lookup_expr='lte',
        help_text=_('Maximum longitude')
    )
    
    # Account filters
    account = django_filters.ModelChoiceFilter(
        queryset=AddsAccount.objects.all(),
        help_text=_('Account')
    )
    
    # Date filters
    created_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        help_text=_('Created after date')
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        help_text=_('Created before date')
    )
    
    # Search filter
    search = django_filters.CharFilter(
        method='filter_search',
        help_text=_('Search in region and locality')
    )
    
    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('created_at', 'created_at'),
            ('updated_at', 'updated_at'),
            ('region', 'region'),
            ('locality', 'locality'),
            ('latitude', 'latitude'),
            ('longitude', 'longitude'),
        ),
        field_labels={
            'created_at': _('Creation date'),
            'updated_at': _('Update date'),
            'region': _('Region'),
            'locality': _('Locality'),
            'latitude': _('Latitude'),
            'longitude': _('Longitude'),
        },
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = RawAccountAddress
        fields = {
            'id': ['exact', 'in'],
            'region': ['exact', 'icontains'],
            'locality': ['exact', 'icontains'],
            'input_region': ['exact', 'icontains'],
            'input_locality': ['exact', 'icontains'],
            'is_geocoded': ['exact'],
            'geo_code': ['exact'],
            'latitude': ['exact', 'gte', 'lte', 'range'],
            'longitude': ['exact', 'gte', 'lte', 'range'],
            'created_at': ['exact', 'gte', 'lte', 'date'],
            'updated_at': ['exact', 'gte', 'lte', 'date'],
        }
    
    def filter_has_coordinates(self, queryset, name, value):
        """Filter addresses that have coordinates."""
        if value:
            return queryset.filter(
                latitude__isnull=False,
                longitude__isnull=False
            ).exclude(latitude=0, longitude=0)
        else:
            return queryset.filter(
                models.Q(latitude__isnull=True) |
                models.Q(longitude__isnull=True) |
                models.Q(latitude=0, longitude=0)
            )
    
    def filter_search(self, queryset, name, value):
        """Search in region and locality fields."""
        return queryset.filter(
            models.Q(region__icontains=value) |
            models.Q(locality__icontains=value) |
            models.Q(input_region__icontains=value) |
            models.Q(input_locality__icontains=value)
        )
