import logging
from rest_framework import serializers
from apps.ads.models import CarAd, AddImageModel
from core.serializers.base import BaseModelSerializer
from core.enums.cars import (
    CarBodyType, FuelType, TransmissionType, DriveType,
    SteeringWheelSide, ConditionType, SellerType, ExchangeStatus
)

logger = logging.getLogger(__name__)


class CarAdImageSerializer(serializers.ModelSerializer):
    """Serializer for car ad images"""
    class Meta:
        model = AddImageModel
        fields = ['id', 'image', 'order', 'is_primary']
        read_only_fields = ['id']


class CarAdListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for car ad lists"""
    mark_name = serializers.CharField(source='mark.name')
    primary_image = serializers.SerializerMethodField()

    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = CarAd
        fields = [
            'id', 'title', 'price', 'currency',
            'mark_name', 'model', 'generation', 'modification',
            'region', 'city', 'seller_type', 'created_at',
            'primary_image', 'is_favorite'
        ]
        read_only_fields = [
            'id', 'mark', 'model', 'generation', 'modification', 'year', 'price',
            'currency', 'mileage', 'color', 'description', 'created_at', 'updated_at',
            'primary_image'
        ]

    def get_primary_image(self, obj):
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image:
            return self.context['request'].build_absolute_uri(primary_image.image.url)
        return None

    def get_is_favorite(self, obj):
        """Return whether current authenticated user has this ad in favorites."""
        try:
            request = self.context.get('request') if hasattr(self, 'context') else None
            user = getattr(request, 'user', None) if request else None
            if not user or not user.is_authenticated:
                return False
            from ...models.favorite_ad_model import FavoriteAd
            return FavoriteAd.objects.filter(user=user, car_ad=obj).exists()
        except Exception:
            return False


class CarAdCreateSerializer(BaseModelSerializer):
    """
    Serializer for creating car ads with business logic for:
    - Price conversion between currencies
    - Moderation status handling
    - Related model creation (CarPricing, CarModeration, CarMetadata, CarSpecification)
    """
    # Images field - use JSONField for Swagger compatibility
    images = serializers.JSONField(required=False, help_text="List of image objects with url, caption, order fields")

    # Price fields - user should only provide one of these
    price_usd = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    price_eur = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    price_uah = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True
    )

    class Meta(BaseModelSerializer.Meta):
        model = CarAd
        fields = [
            'title', 'description', 'price', 'currency',
            'mark', 'model', 'generation', 'modification', 'region', 'city',
            'seller_type', 'exchange_status', 'dynamic_fields', 'images',
            'price_usd', 'price_eur', 'price_uah'
        ]
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'is_active': {'read_only': True},
            'status': {'read_only': True},
        }

    def validate(self, data):
        """
        Validate that exactly one price is provided and convert between currencies.
        Also validate that required fields are present.
        """
        # Check that exactly one price is provided
        price_fields = ['price_usd', 'price_eur', 'price_uah']
        provided_prices = [field for field in price_fields if field in data and data[field] is not None]

        if len(provided_prices) == 0:
            raise serializers.ValidationError({
                'price': 'At least one price in USD, EUR, or UAH must be provided.'
            })
        elif len(provided_prices) > 1:
            raise serializers.ValidationError({
                'price': 'Only one price (USD, EUR, or UAH) should be provided.'
            })

        # Get the latest exchange rates
        from ..models import ExchangeRate
        exchange_rate = ExchangeRate.objects.order_by('-date').first()

        if not exchange_rate:
            raise serializers.ValidationError({
                'price': 'Exchange rates are not available. Please try again later.'
            })

        # Convert the provided price to all currencies
        price_field = provided_prices[0]
        price_value = data[price_field]

        if price_field == 'price_usd':
            data['price_usd'] = price_value
            data['price_eur'] = price_value * (exchange_rate.usd_rate / exchange_rate.eur_rate)
            data['price_uah'] = price_value * exchange_rate.usd_rate
            data['original_price'] = price_value
            data['original_currency'] = 'USD'
        elif price_field == 'price_eur':
            data['price_usd'] = price_value * (exchange_rate.eur_rate / exchange_rate.usd_rate)
            data['price_eur'] = price_value
            data['price_uah'] = price_value * exchange_rate.eur_rate
            data['original_price'] = price_value
            data['original_currency'] = 'EUR'
        else:  # price_uah
            data['price_usd'] = price_value / exchange_rate.usd_rate
            data['price_eur'] = price_value / exchange_rate.eur_rate
            data['price_uah'] = price_value
            data['original_price'] = price_value
            data['original_currency'] = 'UAH'

        # Store the exchange rate used
        data['exchange_rate'] = exchange_rate

        return data

    def create(self, validated_data):
        """
        Create a new car ad with all related models and handle business logic.
        STRICT VALIDATION: Only perfect records are saved to DB, no fallback values.
        """
        # 🚨 STRICT VALIDATION: Check data quality before saving to DB
        validation_errors = self._validate_perfect_record(validated_data)
        if validation_errors:
            raise serializers.ValidationError({
                'validation_errors': validation_errors,
                'message': 'Only perfect records are allowed in DB. Fix errors or regenerate data.'
            })

        from ..models import (
            CarPricing, CarModeration, CarMetadata, CarSpecification,
            CarPriceHistory, AdModerationLog
        )

        # Extract related data
        images_data = validated_data.pop('images', [])
        price_data = {
            'price_usd': validated_data.pop('price_usd', None),
            'price_eur': validated_data.pop('price_eur', None),
            'price_uah': validated_data.pop('price_uah', None),
            'original_price': validated_data.pop('original_price'),
            'original_currency': validated_data.pop('original_currency'),
            'exchange_rate': validated_data.pop('exchange_rate'),
            'is_negotiable': False,  # Default values
            'is_trade_possible': False,
        }

        # Create the main car ad
        ad = CarAd.objects.create(**validated_data)

        # Create related models
        CarPricing.objects.create(car_ad=ad, **price_data)

        # Create initial price history
        CarPriceHistory.objects.create(
            car_ad=ad,
            **price_data
        )

        # Create moderation record
        moderation = CarModeration.objects.create(
            car_ad=ad,
            status='pending',  # Initial moderation status
            moderation_attempts=0,
            last_moderated_at=None,
            moderated_by=None
        )

        # Create metadata
        CarMetadata.objects.create(
            car_ad=ad,
            is_active=True,
            is_verified=False,
            is_vip=False,
            is_premium=ad.account.is_premium(),
            is_highlighted=False,
            is_urgent=False,
            views_count=0,
            phone_views_count=0,
            refreshed_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(days=30)  # Default 30 days
        )

        # Create specification
        CarSpecification.objects.create(
            car_ad=ad,
            year=validated_data.get('year'),
            mileage_km=validated_data.get('mileage_km', 0),
            fuel_type=validated_data.get('fuel_type'),
            engine_volume=validated_data.get('engine_volume'),
            engine_power=validated_data.get('engine_power'),
            transmission_type=validated_data.get('transmission_type'),
            drive_type=validated_data.get('drive_type'),
            body_type=validated_data.get('body_type'),
            color=validated_data.get('color'),
            steering_wheel=validated_data.get('steering_wheel'),
            vin_code=validated_data.get('vin_code'),
            license_plate=validated_data.get('license_plate'),
            condition=validated_data.get('condition', 'used'),
            number_of_doors=validated_data.get('number_of_doors'),
            number_of_seats=validated_data.get('number_of_seats')
        )

        # Log the creation
        AdModerationLog.objects.create(
            ad=ad,
            action='created',
            status='pending',
            moderated_by=self.context.get('request').user if self.context.get('request').user.is_authenticated else None,
            details={'message': 'New ad created'}
        )

        # Create images
        for image_data in images_data:
            AddImageModel.objects.create(ad=ad, **image_data)

        # Trigger moderation check - sync for fast approval, async for complex cases
        self._trigger_moderation(ad)

        return ad

    def _trigger_moderation(self, ad):
        """
        Trigger moderation check - sync for immediate approval, async for complex cases.

        If ad passes LLM moderation immediately -> set ACTIVE status right away.
        If ad needs review or fails -> handle via async Celery task.
        """
        from ..services.moderation import AdModerationService
        from ..tasks import moderate_ad_async
        from core.permissions.user_permissions import can_bypass_moderation

        try:
            # Quick check for bypass users (managers/admins)
            if can_bypass_moderation(ad.account.user):
                ad.status = ad.AdStatus.ACTIVE
                ad.save(update_fields=['status'])

                # Log and notify
                from ..services.moderation_tracker import ModerationTracker
                from ..models import AdModerationLog
                ModerationTracker.log_moderation_attempt(
                    ad=ad,
                    action=AdModerationLog.ModerationAction.MANUALLY_APPROVED,
                    details={'message': 'Auto-approved for manager/admin user'}
                )

                from ..tasks import notify_ad_approved
                notify_ad_approved.delay(ad.id, ad.account.user.id, "manually_approved")
                return

            # Try sync moderation for fast approval
            success, message, details = AdModerationService.moderate_ad(ad)

            # If approved -> already set to ACTIVE in moderate_ad, nothing more to do
            if success:
                # Ad is already ACTIVE and user notified, no further processing needed
                return

            # If not approved -> check if we should return censored content to user
            if hasattr(self, '_should_return_censored_content') and self._should_return_censored_content:
                # Store moderation details for response
                self._moderation_details = details
                return

            # Otherwise continue with async processing for complex cases
            # This handles NEEDS_REVIEW, max attempts, etc.
            moderate_ad_async.delay(ad.id)

        except Exception as e:
            # If sync moderation fails -> fallback to async
            logger.error(f"Sync moderation failed for ad {ad.id}: {e}")
            moderate_ad_async.delay(ad.id)


    def _validate_perfect_record(self, validated_data):
        """
        Validates that the record is perfect and contains no fallback values.
        Returns list of validation errors, empty list if perfect.
        """
        errors = []

        # 1. Check for required fields
        required_fields = ['title', 'description', 'mark', 'model', 'year', 'price']
        for field in required_fields:
            if not validated_data.get(field):
                errors.append(f"Missing required field: {field}")

        # 2. Check for fallback indicators in text fields
        fallback_indicators = ['unknown', 'default', 'fallback', 'placeholder', 'test', 'mock']
        text_fields = ['title', 'description', 'model']

        for field in text_fields:
            value = str(validated_data.get(field, '')).lower()
            for indicator in fallback_indicators:
                if indicator in value:
                    errors.append(f"Fallback value detected in {field}: contains '{indicator}'")

        # 3. Check for realistic data ranges
        year = validated_data.get('year')
        if year and (year < 1900 or year > 2025):
            errors.append(f"Unrealistic year: {year}")

        price = validated_data.get('price')
        if price and (price <= 0 or price > 10000000):
            errors.append(f"Unrealistic price: {price}")

        # 4. Check for proper brand-type consistency (if we have access to mark data)
        mark = validated_data.get('mark')
        if mark and hasattr(mark, 'vehicle_type'):
            vehicle_type_name = getattr(mark.vehicle_type, 'name', '').lower()
            mark_name = getattr(mark, 'name', '').lower()

            # Known inconsistencies that should be rejected
            car_brands = ['bmw', 'mercedes-benz', 'audi', 'toyota', 'honda', 'hyundai', 'ford']
            motorcycle_brands = ['yamaha', 'kawasaki', 'suzuki', 'ducati', 'brp']

            if 'легков' in vehicle_type_name and any(mb in mark_name for mb in motorcycle_brands):
                errors.append(f"Brand-type mismatch: {mark_name} cannot be 'Легкові'")

            if 'мото' in vehicle_type_name and any(cb in mark_name for cb in car_brands):
                errors.append(f"Brand-type mismatch: {mark_name} cannot be 'Мото'")

        return errors


class CarAdUpdateSerializer(BaseModelSerializer):
    """
    Serializer for updating car ads with business logic for:
    - Price updates and currency conversion
    - Moderation status changes
    - Related model updates (CarPricing, CarSpecification, etc.)
    - Image management
    """
    # Images field - use JSONField for Swagger compatibility
    images = serializers.JSONField(required=False, help_text="List of image objects with url, caption, order fields")

    # Price fields - user can update any of these
    price_usd = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    price_eur = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    price_uah = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True
    )

    class Meta(BaseModelSerializer.Meta):
        model = CarAd
        fields = [
            'title', 'description', 'price_usd', 'price_eur', 'price_uah',
            'make', 'model', 'generation', 'modification', 'region', 'city',
            'year', 'mileage_km', 'color', 'body_type', 'fuel_type',
            'engine_volume', 'engine_power', 'transmission_type', 'drive_type',
            'steering_wheel', 'vin_code', 'license_plate', 'condition',
            'number_of_doors', 'number_of_seats', 'seller_type',
            'exchange_status', 'images', 'is_active'
        ]
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'account': {'read_only': True},  # Account cannot be changed during update
            'make': {'required': False},
            'model': {'required': False},
            'generation': {'required': False},
            'modification': {'required': False},
            'is_active': {'read_only': True},  # Should be managed through moderation
        }

    def validate(self, data):
        """
        Validate price updates and convert between currencies if needed.
        Also handle moderation state changes.
        """
        # Check if any price field is being updated
        price_fields = ['price_usd', 'price_eur', 'price_uah']
        price_updates = {k: v for k, v in data.items() if k in price_fields and v is not None}

        if price_updates:
            if len(price_updates) > 1:
                raise serializers.ValidationError({
                    'price': 'Only one price (USD, EUR, or UAH) should be provided.'
                })

            # Get the latest exchange rates
            from ..models import ExchangeRate
            exchange_rate = ExchangeRate.objects.order_by('-date').first()

            if not exchange_rate:
                raise serializers.ValidationError({
                    'price': 'Exchange rates are not available. Please try again later.'
                })

            # Convert the provided price to all currencies
            price_field, price_value = next(iter(price_updates.items()))

            if price_field == 'price_usd':
                data['price_usd'] = price_value
                data['price_eur'] = price_value * (exchange_rate.usd_rate / exchange_rate.eur_rate)
                data['price_uah'] = price_value * exchange_rate.usd_rate
                data['original_price'] = price_value
                data['original_currency'] = 'USD'
            elif price_field == 'price_eur':
                data['price_usd'] = price_value * (exchange_rate.eur_rate / exchange_rate.usd_rate)
                data['price_eur'] = price_value
                data['price_uah'] = price_value * exchange_rate.eur_rate
                data['original_price'] = price_value
                data['original_currency'] = 'EUR'
            else:  # price_uah
                data['price_usd'] = price_value / exchange_rate.usd_rate
                data['price_eur'] = price_value / exchange_rate.eur_rate
                data['price_uah'] = price_value
                data['original_price'] = price_value
                data['original_currency'] = 'UAH'

            # Store the exchange rate used
            data['exchange_rate'] = exchange_rate

        # Handle moderation state changes
        if 'is_active' in data and data['is_active'] != self.instance.is_active:
            if not self.context.get('request').user.is_staff:
                raise serializers.ValidationError({
                    'is_active': 'Only administrators can change the active status directly.'
                })

        return data

    def update(self, instance, validated_data):
        """
        Update an existing car ad with all related models and handle business logic.
        """
        from ..models import (
            CarPricing, CarModeration, CarMetadata, CarSpecification,
            CarPriceHistory, AdModerationLog
        )

        # Extract related data
        images_data = validated_data.pop('images', None)
        price_data = {
            'price_usd': validated_data.pop('price_usd', None),
            'price_eur': validated_data.pop('price_eur', None),
            'price_uah': validated_data.pop('price_uah', None),
            'original_price': validated_data.pop('original_price', None),
            'original_currency': validated_data.pop('original_currency', None),
            'exchange_rate': validated_data.pop('exchange_rate', None),
            'is_negotiable': validated_data.pop('is_negotiable', None),
            'is_trade_possible': validated_data.pop('is_trade_possible', None),
        }

        # Check if content fields were changed (title, description)
        content_changed = any(field in validated_data for field in ['title', 'description'])

        # Update the main car ad
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Save the instance first to ensure we have an ID for related models
        instance.save()

        # If content changed, trigger moderation
        if content_changed:
            self._handle_content_update_moderation(instance)

        # Update or create related models if their data was provided
        if any(price_data.values()):
            pricing, _ = CarPricing.objects.update_or_create(
                car_ad=instance,
                defaults={k: v for k, v in price_data.items() if v is not None}
            )

            # Create price history entry if price changed
            if any(price_data.get(f) is not None for f in ['price_usd', 'price_eur', 'price_uah']):
                CarPriceHistory.objects.create(
                    car_ad=instance,
                    price_usd=pricing.price_usd,
                    price_eur=pricing.price_eur,
                    price_uah=pricing.price_uah,
                    exchange_rate=pricing.exchange_rate,
                    changed_by=self.context.get('request').user if self.context.get('request').user.is_authenticated else None
                )

        # Update specification if any spec fields were provided
        spec_fields = [
            'year', 'mileage_km', 'fuel_type', 'engine_volume', 'engine_power',
            'transmission_type', 'drive_type', 'body_type', 'color',
            'steering_wheel', 'vin_code', 'license_plate', 'condition',
            'number_of_doors', 'number_of_seats'
        ]
        spec_data = {k: validated_data[k] for k in spec_fields if k in validated_data}

        if spec_data:
            CarSpecification.objects.update_or_create(
                car_ad=instance,
                defaults=spec_data
            )

        # Handle moderation if status is being updated
        if 'is_active' in validated_data:
            moderation = CarModeration.objects.get_or_create(car_ad=instance)[0]
            new_status = 'active' if validated_data['is_active'] else 'rejected'

            # Log the status change
            AdModerationLog.objects.create(
                ad=instance,
                action=f'status_changed_to_{new_status}',
                status=new_status,
                moderated_by=self.context.get('request').user,
                details={
                    'message': f'Status changed to {new_status} by admin',
                    'old_status': 'active' if instance.is_active else 'inactive'
                }
            )

            # Update moderation record
            moderation.status = new_status
            moderation.moderated_by = self.context.get('request').user
            moderation.last_moderated_at = timezone.now()
            moderation.save()

        # Update images if provided
        if images_data is not None:
            # Delete existing images
            instance.images.all().delete()
            # Create new images
            for image_data in images_data:
                AddImageModel.objects.create(ad=instance, **image_data)

        # If this is a moderation update, check if we need to notify the user
        if 'is_active' in validated_data:
            self._handle_moderation_notification(instance, validated_data['is_active'])

        return instance

    def _handle_content_update_moderation(self, ad):
        """
        Handle moderation when content (title/description) is updated.

        Same logic as create: sync moderation for fast approval,
        async for complex cases.
        """
        # Reset status to pending for re-moderation
        ad.status = ad.AdStatus.PENDING
        ad.save(update_fields=['status'])

        # Log the content update
        from ..models import AdModerationLog
        AdModerationLog.objects.create(
            ad=ad,
            action='edited',
            status='pending',
            moderated_by=self.context.get('request').user if self.context.get('request').user.is_authenticated else None,
            details={'message': 'Ad content updated, re-moderation required'}
        )

        # Trigger moderation (same as create)
        self._trigger_moderation(ad)

    def _handle_moderation_notification(self, ad, is_approved):
        """
        Handle notifications for moderation status changes.
        This could be extended to send emails, push notifications, etc.
        """
        from ..models import AdModerationLog
        from core.services.notification import send_notification

        status = 'approved' if is_approved else 'rejected'
        message = f'Your ad "{ad.title}" has been {status}.'

        # Log the notification
        AdModerationLog.objects.create(
            ad=ad,
            action=f'notification_sent_{status}',
            status='active' if is_approved else 'rejected',
            moderated_by=self.context.get('request').user,
            details={'message': message}
        )

        # Send notification (could be email, push, etc.)
        send_notification(
            user=ad.account.owner,
            title=f'Ad {status.capitalize()}',
            message=message,
            notification_type=f'ad_{status}',
            data={'ad_id': str(ad.id)}
        )


class CarAdDetailSerializer(CarAdListSerializer):
    """Detailed serializer for a single car ad"""
    color_name = serializers.CharField(source='color.name')
    body_type_display = serializers.ChoiceField(
        source='get_body_type_display',
        choices=CarBodyType.choices(),
        read_only=True
    )
    fuel_type_display = serializers.ChoiceField(
        source='get_fuel_type_display',
        choices=FuelType.choices(),
        read_only=True
    )
    transmission_type_display = serializers.ChoiceField(
        source='get_transmission_type_display',
        choices=TransmissionType.choices(),
        read_only=True
    )
    drive_type_display = serializers.ChoiceField(
        source='get_drive_type_display',
        choices=DriveType.choices(),
        read_only=True
    )
    steering_wheel_display = serializers.ChoiceField(
        source='get_steering_wheel_display',
        choices=SteeringWheelSide.choices(),
        read_only=True
    )
    condition_display = serializers.ChoiceField(
        source='get_condition_display',
        choices=ConditionType.choices(),
        read_only=True
    )
    seller_type_display = serializers.ChoiceField(
        source='get_seller_type_display',
        choices=SellerType.choices(),
        read_only=True
    )
    exchange_status_display = serializers.ChoiceField(
        source='get_exchange_status_display',
        choices=ExchangeStatus.choices(),
        allow_null=True,
        read_only=True
    )
    images = CarAdImageSerializer(many=True, read_only=True)

    class Meta(CarAdListSerializer.Meta):
        fields = CarAdListSerializer.Meta.fields + [
            'description', 'color', 'color_name', 'body_type', 'body_type_display',
            'fuel_type_display', 'transmission_type_display', 'drive_type_display',
            'steering_wheel', 'steering_wheel_display', 'vin_code', 'license_plate',
            'condition', 'condition_display', 'seller_type', 'seller_type_display',
            'exchange_status', 'exchange_status_display', 'is_active', 'is_verified',
            'is_vip', 'is_premium', 'views_count', 'refreshed_at', 'images'
        ]
        # created_at, updated_at уже включены в CarAdListSerializer.Meta.fields через BaseModelSerializer
        read_only_fields = [
            'id', 'mark', 'model', 'generation', 'modification', 'year', 'price',
            'currency', 'mileage', 'color', 'description', 'created_at', 'updated_at',
            'refreshed_at', 'images'
        ]
