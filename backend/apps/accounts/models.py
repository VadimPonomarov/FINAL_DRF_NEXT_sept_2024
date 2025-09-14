from django.conf import settings
from django.db import models

from core.enums.ads import AccountTypeEnum, ModerationLevelEnum, RoleEnum, \
    ContactTypeEnum
from core.models.base import BaseModel


class AddsAccount(BaseModel):
    account_type = models.CharField(
        max_length=16,
        choices=AccountTypeEnum.choices,
        default=AccountTypeEnum.BASIC
    )
    moderation_level = models.CharField(
        max_length=64,
        choices=ModerationLevelEnum.choices,
        default=ModerationLevelEnum.AUTO
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="account_adds"
    )

    role = models.CharField(
        max_length=32,
        choices=RoleEnum.choices,
        default=RoleEnum.SELLER
    )

    # Связь с автосалоном (для будущего функционала)
    dealership = models.ForeignKey(
        'DealershipOrganization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accounts",
        help_text="Автосалон, к которому принадлежит аккаунт"
    )

    # Устаревшие поля (оставляем для совместимости)
    organization_name = models.CharField(max_length=255, blank=True)
    organization_id = models.UUIDField(null=True, blank=True)
    stats_enabled = models.BooleanField(default=False)

    def is_premium(self):
        """Check if account is premium type."""
        return self.account_type == AccountTypeEnum.PREMIUM

    def __str__(self):
        return f"{self.user.email}'s Ad Account"

    class Meta:
        db_table = "add_accounts"


class AddsAccountContact(BaseModel):
    type = models.CharField(
        max_length=32,
        choices=ContactTypeEnum.choices
    )
    value = models.CharField(max_length=256)
    is_visible = models.BooleanField(default=True)
    adds_account = models.ForeignKey(
        "AddsAccount",
        on_delete=models.CASCADE,
        related_name="contacts"
    )
    note = models.CharField(max_length=128, blank=True)

    def __str__(self):
        return f"{self.adds_account} [{self.type}]: {self.value}"

    class Meta:
        db_table = "add_account_contacts"
        ordering = ["type"]  # Canonical default ordering


class RawAccountAddress(BaseModel):
    """
    Single address model for each account (OneToOne relationship).
    Contains essential fields for location-based analytics and geocoding.
    Each account can have only ONE address.
    """
    account = models.OneToOneField(
        AddsAccount,
        on_delete=models.CASCADE,
        related_name="address",
        help_text="One address per account - unique constraint"
    )

    # User input (minimal required for geocoding)
    input_region = models.CharField(
        max_length=255,
        default='',
        help_text="Region as entered by user (required for geocoding)"
    )
    input_locality = models.CharField(
        max_length=255,
        default='',
        help_text="City/locality as entered by user (required for geocoding)"
    )

    # Standardized geographical data for grouping (auto-filled by Google Maps)
    region = models.CharField(
        max_length=255,
        blank=True,
        help_text="Standardized region name (Google Maps, locale: uk)",
        db_index=True
    )
    locality = models.CharField(
        max_length=255,
        blank=True,
        help_text="Standardized locality name (Google Maps, locale: uk)",
        db_index=True
    )

    # Google Maps place_id for geographical grouping (REQUIRED)
    geo_code = models.CharField(
        max_length=128,
        default='unknown',
        help_text="Google Maps place_id for unique geographical identification and grouping",
        db_index=True
    )

    # Coordinates for map display
    latitude = models.FloatField(null=True, blank=True, help_text="Latitude for map display")
    longitude = models.FloatField(null=True, blank=True, help_text="Longitude for map display")

    # Processing status
    is_geocoded = models.BooleanField(default=False, help_text="Whether geocoding was successful")
    geocoding_error = models.TextField(blank=True, help_text="Error message if geocoding failed")

    class Meta:
        db_table = "raw_account_addresses"
        verbose_name = "Account Address"
        verbose_name_plural = "Account Addresses"
        indexes = [
            models.Index(fields=['geo_code'], name='raw_addr_geo_code_idx'),
            models.Index(fields=['region', 'locality'], name='raw_addr_location_idx'),
            models.Index(fields=['is_geocoded'], name='raw_addr_geocoded_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(geo_code__isnull=False) & ~models.Q(geo_code=''),
                name='geo_code_required'
            )
        ]

    def __str__(self):
        if self.is_geocoded:
            return f"{self.locality}, {self.region}"
        else:
            return f"{self.input_locality}, {self.input_region}"

    def clean(self):
        """
        Validate that essential geographical components are provided.
        """
        from django.core.exceptions import ValidationError

        errors = {}

        # Check required fields for geographical grouping
        if not self.input_region.strip():
            errors['input_region'] = "Region is required for geographical grouping."

        if not self.input_locality.strip():
            errors['input_locality'] = "City/locality is required for geographical grouping."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """
        Override save to automatically geocode and get place_id from Google Maps.
        Geocoding happens on create and when input_region or input_locality change.
        """
        # Check if this is an update and if location fields changed
        location_changed = False
        if self.pk:  # This is an update
            try:
                old_instance = RawAccountAddress.objects.get(pk=self.pk)
                location_changed = (
                    old_instance.input_region != self.input_region or
                    old_instance.input_locality != self.input_locality
                )
            except RawAccountAddress.DoesNotExist:
                location_changed = True
        else:
            location_changed = True  # This is a new instance

        # Validate the address before saving
        self.full_clean()

        # Perform geocoding if needed
        needs_geocoding = (
            location_changed or
            not self.is_geocoded or
            self.geo_code == 'unknown' or
            not self.geo_code.startswith('ChIJ')
        )

        if needs_geocoding:
            self._perform_geocoding()

        super().save(*args, **kwargs)

    def _perform_geocoding(self):
        """
        Perform geocoding using Google Maps API to get standardized region and locality.
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            from apps.accounts.utils.geocoding import get_minimal_geocode

            # Use input fields for geocoding, fallback to existing data
            region_for_geocoding = self.input_region or self.region
            locality_for_geocoding = self.input_locality or self.locality

            # Use input fields for geocoding
            geocode_result = get_minimal_geocode(
                region=region_for_geocoding,
                locality=locality_for_geocoding,
                locale='uk'  # Ukrainian locale for consistent structure
            )

            if geocode_result and geocode_result.get('place_id'):
                # Update standardized fields from Google Maps
                self.region = geocode_result.get('region', '') or region_for_geocoding
                self.locality = geocode_result.get('locality', '') or locality_for_geocoding
                self.latitude = geocode_result.get('latitude')
                self.longitude = geocode_result.get('longitude')

                # Set geo_code to Google Maps place_id (REQUIRED)
                self.geo_code = geocode_result['place_id']

                self.is_geocoded = True
                self.geocoding_error = ''

                logger.info(f"Successfully geocoded address: {self.locality}, {self.region} -> place_id: {self.geo_code}")
            else:
                # Geocoding failed - keep original data but mark as failed
                self.region = region_for_geocoding
                self.locality = locality_for_geocoding
                self.geo_code = 'unknown'
                self.is_geocoded = False
                self.geocoding_error = 'Geocoding failed: No place_id received from Google Maps'

                logger.warning(f"Geocoding failed for: {region_for_geocoding}, {locality_for_geocoding}")

        except Exception as e:
            self.is_geocoded = False
            self.geocoding_error = f'Geocoding error: {str(e)}'

    def _generate_geo_code(self):
        """
        Generate geo_code from Google Maps place_id.
        This method should not be called directly - place_id comes from geocoding.
        """
        # geo_code should be set from Google Maps place_id during geocoding
        # This is a fallback only
        return 'unknown'

    @classmethod
    def find_by_geo_code(cls, place_id):
        """Find all addresses with the same Google Maps place_id."""
        return cls.objects.filter(geo_code=place_id)

    def get_similar_locations(self):
        """Get all addresses in the same geographical location (same place_id)."""
        return self.find_by_geo_code(self.geo_code)

    @classmethod
    def get_location_statistics(cls):
        """Get statistics of ads grouped by Google Maps place_id."""
        from django.db.models import Count
        return cls.objects.exclude(geo_code='unknown').values('geo_code', 'region', 'locality').annotate(
            address_count=Count('id')
        ).order_by('-address_count')

    @classmethod
    def get_place_info_by_place_id(cls, place_id):
        """Get location information by Google Maps place_id (reverse lookup)."""
        try:
            from core.utils.encryption import encryption_service
            import os
            import requests

            encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
            if not encrypted_key:
                return None

            api_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
            if not api_key:
                return None

            # Use Google Places API to get place details by place_id
            endpoint = "https://maps.googleapis.com/maps/api/place/details/json"
            params = {
                "place_id": place_id,
                "key": api_key,
                "language": "uk",
                "fields": "name,formatted_address,geometry,address_components"
            }

            response = requests.get(endpoint, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "OK" and data.get("result"):
                result = data["result"]
                return {
                    'name': result.get('name', ''),
                    'formatted_address': result.get('formatted_address', ''),
                    'geometry': result.get('geometry', {}),
                    'address_components': result.get('address_components', [])
                }

        except Exception:
            pass

        return None


class DealershipOrganization(BaseModel):
    """
    Модель для автосалонов и дилерских центров.
    Подготовка архитектуры для будущего функционала автосалонов.
    """
    name = models.CharField(
        max_length=255,
        help_text="Название автосалона/дилерского центра"
    )

    # Юридическая информация
    legal_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Полное юридическое название"
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Налоговый номер (ЕГРПОУ)"
    )

    # Контактная информация
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Адрес
    address = models.TextField(blank=True, help_text="Физический адрес автосалона")
    region = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)

    # Статус и верификация
    is_verified = models.BooleanField(
        default=False,
        help_text="Прошел ли автосалон верификацию"
    )
    verification_date = models.DateTimeField(null=True, blank=True)

    # Настройки
    max_ads = models.PositiveIntegerField(
        default=100,
        help_text="Максимальное количество активных объявлений"
    )

    # Владелец организации (главный администратор)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_dealerships",
        help_text="Владелец автосалона"
    )

    class Meta:
        db_table = "dealership_organizations"
        verbose_name = "Автосалон"
        verbose_name_plural = "Автосалоны"

    def __str__(self):
        return self.name


class DealershipEmployee(BaseModel):
    """
    Сотрудники автосалонов с различными ролями.
    """
    ROLE_CHOICES = [
        ('admin', 'Администратор автосалона'),
        ('manager', 'Менеджер по продажам'),
        ('mechanic', 'Механик'),
        ('sales', 'Продавец'),
    ]

    dealership = models.ForeignKey(
        DealershipOrganization,
        on_delete=models.CASCADE,
        related_name="employees"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dealership_roles"
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text="Роль сотрудника в автосалоне"
    )

    # Права доступа
    can_create_ads = models.BooleanField(default=True)
    can_edit_ads = models.BooleanField(default=True)
    can_delete_ads = models.BooleanField(default=False)
    can_manage_employees = models.BooleanField(default=False)

    # Статус
    is_active = models.BooleanField(default=True)
    hired_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "dealership_employees"
        unique_together = ['dealership', 'user']
        verbose_name = "Сотрудник автосалона"
        verbose_name_plural = "Сотрудники автосалонов"

    def __str__(self):
        return f"{self.user.email} - {self.dealership.name} ({self.get_role_display()})"

