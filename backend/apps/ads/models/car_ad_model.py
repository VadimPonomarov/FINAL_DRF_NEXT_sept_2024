import hashlib
import json
from typing import Dict, Any, Optional
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel
from core.enums.cars import SellerType, ExchangeStatus, Currency
from core.enums.ads import AdStatusEnum
from django.conf import settings
# GoogleMapsGeocoder removed - geocoding is now handled in RawAccountAddress model

class DynamicFieldsMixin:
    """Mixin to handle dynamic fields for models."""
    
    def get_dynamic_fields(self) -> Dict[str, Dict[str, Any]]:
        """Get the dynamic fields configuration."""
        return {
            'mark': {'type': 'text', 'required': True, 'label': _('Mark')},
            'model': {'type': 'text', 'required': True, 'label': _('Model')},
            'year': {'type': 'year', 'required': True, 'label': _('Year')},
            'mileage': {'type': 'number', 'required': True, 'label': _('Mileage (km)')},
            'engine_volume': {'type': 'number', 'required': False, 'label': _('Engine Volume (L)')},
            'fuel_type': {'type': 'text', 'required': False, 'label': _('Fuel Type')},
            'transmission': {'type': 'text', 'required': False, 'label': _('Transmission')},
            'body_type': {'type': 'text', 'required': False, 'label': _('Body Type')},
            'color': {'type': 'text', 'required': False, 'label': _('Color')},
            'condition': {'type': 'text', 'required': True, 'label': _('Condition')},
            'vin': {'type': 'text', 'required': False, 'label': _('VIN')},
            'license_plate': {'type': 'text', 'required': False, 'label': _('License Plate')},
            'owners_count': {'type': 'number', 'required': False, 'label': _('Number of Owners')},
        }
    
    def get_required_fields(self) -> list:
        """Get list of required field names."""
        return [name for name, config in self.get_dynamic_fields().items() if config.get('required', False)]


class CarAd(BaseModel, DynamicFieldsMixin):
    """
    Main model for car advertisements.
    
    This model serves as a data container for car advertisements.
    All business logic is handled in serializers.
    """
    # Basic info
    title = models.CharField(
        max_length=255,
        help_text=_('Title of the advertisement')
    )
    
    description = models.TextField(
        help_text=_('Detailed description of the car')
    )
    
    # Pricing information
    price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('The price of the car')
    )
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.UAH,
        help_text=_('The currency of the price')
    )
    
    # Dynamic fields stored as JSON
    dynamic_fields = models.JSONField(
        default=dict,
        help_text=_('Dynamic fields for car specifications')
    )
    
    # Validation and moderation status
    is_validated = models.BooleanField(
        default=False,
        help_text=_('Whether the ad has been validated by the LLM')
    )

    validation_errors = models.JSONField(
        default=dict,
        help_text=_('Validation errors from the LLM')
    )

    # Ad status for moderation workflow
    status = models.CharField(
        max_length=20,
        choices=AdStatusEnum.choices,
        default=AdStatusEnum.ACTIVE,
        help_text=_('Current status of the advertisement')
    )

    # Moderation tracking
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_ads',
        help_text=_('User who moderated this ad (null for auto-moderation)')
    )

    moderated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('When the ad was last moderated')
    )

    moderation_reason = models.TextField(
        blank=True,
        help_text=_('Reason for moderation decision')
    )

    # Auto-moderation tracking
    auto_moderation_attempts = models.PositiveIntegerField(
        default=0,
        help_text=_('Number of auto-moderation attempts (max 3)')
    )

    needs_manual_review = models.BooleanField(
        default=False,
        help_text=_('Whether ad needs manual review after failed auto-moderation')
    )

    manual_review_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('When manual review was requested')
    )
    
    # Core relationships
    account = models.ForeignKey(
        'accounts.AddsAccount',
        on_delete=models.CASCADE,
        related_name='car_ads',
        help_text=_('The account that owns this ad')
    )
    
    mark = models.ForeignKey('CarMarkModel',
        on_delete=models.PROTECT,
        related_name='car_ads',
        help_text=_('Mark of the car'),
        db_column='mark_id'  # Changed from make_id to mark_id
    )
    
    model = models.CharField(
        max_length=100,
        help_text=_('Model of the car')
    )
    
    generation = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_('Generation of the car model')
    )
    
    modification = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_('Specific modification/variant of the car')
    )
    
    region = models.ForeignKey(
        'RegionModel',
        on_delete=models.PROTECT,
        related_name='car_ads',
        help_text=_('Region where the car is located'),
        db_column='region_id'  # Указываем правильное имя колонки в БД
    )

    city = models.ForeignKey(
        'CityModel',
        on_delete=models.PROTECT,
        related_name='car_ads',
        help_text=_('City where the car is located'),
        db_column='city_id'  # Указываем правильное имя колонки в БД
    )
    
    # Seller information
    seller_type = models.CharField(
        max_length=20,
        choices=SellerType.choices,
        default=SellerType.PRIVATE,
        help_text=_('Type of seller (private, dealer, etc.)')
    )
    
    exchange_status = models.CharField(
        max_length=20,
        choices=ExchangeStatus.choices,
        blank=True,
        null=True,
        help_text=_('Whether the seller is open to exchanges')
    )
    
    # Location hash from Google Maps API
    geocode = models.CharField(
        max_length=128,
        blank=True,
        help_text=_('Geocode hash from Google Maps API')
    )

    # Favorite status
    is_favorite = models.BooleanField(
        default=False,
        help_text=_('Whether this ad is marked as favorite')
    )

    # Contact information strategy
    use_profile_contacts = models.BooleanField(
        default=False,
        help_text=_('Use contacts from user profile instead of ad-specific contacts')
    )

    contact_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Contact person name for this ad')
    )

    additional_info = models.TextField(
        blank=True,
        null=True,
        help_text=_('Additional contact information for this ad')
    )

    class Meta:
        verbose_name = _('Car Advertisement')
        verbose_name_plural = _('Car Advertisements')
        ordering = ['-created_at']
        db_table = 'car_ads'
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['seller_type']),
            models.Index(fields=['is_favorite']),
            # Дополнительные индексы для оптимизации
            models.Index(fields=['status', 'created_at']),  # Для фильтрации активных объявлений
            models.Index(fields=['account', 'status']),     # Для объявлений пользователя
            models.Index(fields=['mark', 'status']),        # Для поиска по марке
            models.Index(fields=['price', 'currency']),     # Для сортировки по цене
            models.Index(fields=['region', 'city']),        # Для поиска по локации
        ]
        
    def get_full_address(self) -> str:
        """
        Returns a formatted address string for geocoding.
        """
        address_parts = []
        if self.city:
            address_parts.append(self.city.name)  # city is ForeignKey
        if self.region:
            address_parts.append(self.region.name)  # region is ForeignKey
        address_parts.append('Україна')
        return ', '.join(address_parts)
    
    def update_geocode(self, commit: bool = True) -> bool:
        """
        Update the geocode hash for this ad based on its city and region.
        Returns True if geocoding was successful, False otherwise.
        """
        try:
            # Simplified geocoding - just create a hash from address
            address = self.get_full_address()

            # Generate a simple hash from the address
            geocode_str = json.dumps({'address': address}, sort_keys=True)
            self.geocode = hashlib.md5(geocode_str.encode('utf-8')).hexdigest()

            if commit:
                self.save(update_fields=['geocode', 'updated_at'])

            return True

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error geocoding address for ad {self.id}: {str(e)}")
            return False
    
    def __str__(self):
        return f"{self.mark} {self.model} ({self.id})"
