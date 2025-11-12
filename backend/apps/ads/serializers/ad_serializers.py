import logging
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from ..models import CarAd, AddImageModel
from apps.accounts.models import AddsAccount
from .image_serializers import AdImageSerializer
from core.serializers.base import BaseModelSerializer

logger = logging.getLogger(__name__)


class AddSerializer(BaseModelSerializer):
    """
    Serializer for creating and updating ads.
    """
    # Images field - use JSONField for Swagger compatibility (write operations)
    images = serializers.JSONField(required=False, help_text="List of image objects with url, caption, order fields")
    account = serializers.PrimaryKeyRelatedField(
        queryset=AddsAccount.objects.all(),
        write_only=True
    )
    
    class Meta(BaseModelSerializer.Meta):
        model = CarAd
        fields = [
            "account", "title", "description", "is_active", "images"
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer



    def validate(self, attrs):
        """
        Validate and add geocoding data based on region and city.
        """
        attrs = super().validate(attrs)
        
        # Only perform geocoding if both region and city are provided
        if 'region' in attrs and 'city' in attrs:
            try:
                # Create a temporary ad instance for geocoding
                temp_ad = CarAd(
                    region=attrs['region'],
                    city=attrs['city']
                )
                
                # Update geocode
                if not temp_ad.update_geocode(commit=False):
                    logger.warning(f"Failed to geocode address for region: {attrs['region']}, city: {attrs['city']}")
                    raise ValidationError({
                        'non_field_errors': ['Could not determine location coordinates. Please check the address and try again.']
                    })
                
                # Add geocode hash to validated data
                attrs['geocode'] = temp_ad.geocode
                
            except Exception as e:
                logger.error(f"Error during geocoding: {str(e)}")
                raise ValidationError({
                    'non_field_errors': ['Error processing location data. Please try again later.']
                })
        
        return attrs
    
    def create(self, validated_data):
        """
        Create a new ad with the provided data.
        """
        images_data = validated_data.pop('images', [])

        # Set initial status as active (moderation will be reimplemented later)
        validated_data['is_active'] = True

        # Create the ad
        ad = CarAd.objects.create(**validated_data)

        # Create associated images
        for image_data in images_data:
            AddImageModel.objects.create(add=ad, **image_data)

        return ad

    def update(self, instance, validated_data):
        """
        Update an existing ad with the provided data.
        """
        images_data = validated_data.pop('images', None)

        # Check if location was modified and needs re-geocoding
        location_modified = 'region' in validated_data or 'city' in validated_data
        if location_modified:
            # Create a temporary instance with updated location data
            temp_instance = CarAd(
                region=validated_data.get('region', instance.region),
                city=validated_data.get('city', instance.city)
            )

            # Update geocode
            if temp_instance.update_geocode(commit=False):
                validated_data['geocode'] = temp_instance.geocode
            else:
                logger.warning(f"Failed to update geocode for ad {instance.id} during update")

        # Update ad fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Save the instance
        instance.save()

        # Update images if provided
        if images_data is not None:
            # Clear existing images
            instance.images.all().delete()

            # Add new images
            for image_data in images_data:
                AddImageModel.objects.create(add=instance, **image_data)

        return instance


class AdDetailSerializer(AddSerializer):
    """
    Serializer for retrieving ad details with related data.
    """
    account = serializers.SerializerMethodField()
    images = AdImageSerializer(many=True, read_only=True)
    
    class Meta(AddSerializer.Meta):
        # No additional fields beyond what's defined in AddSerializer.Meta
        pass
    
    def get_account(self, obj):
        """
        Get the account details for the ad.
        """
        from apps.accounts.serializers.account_serializers import AddsAccountSerializer
        return AddsAccountSerializer(obj.account).data


class AdListSerializer(BaseModelSerializer):
    """
    Lightweight serializer for listing ads.
    """
    primary_image = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    
    class Meta(BaseModelSerializer.Meta):
        model = CarAd
        fields = [
            "title", "price_display", "primary_image", "is_active"
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
    
    def get_primary_image(self, obj):
        """
        Get the primary image or the first available image.
        """
        # Use prefetched images if available
        if hasattr(obj, 'prefetched_images'):
            images = obj.prefetched_images
            # Find primary image first
            for image in images:
                if image.is_primary:
                    url = image.get_image_url()
                    if url:
                        return url
            # If no primary, return first available
            for image in images:
                url = image.get_image_url()
                if url:
                    return url
            return None

        # Fallback to database queries if not prefetched
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image:
            url = primary_image.get_image_url()
            if url:
                return url

        first_image = obj.images.filter(image__isnull=False).first()
        return first_image.get_image_url() if first_image else None
    
    def get_price_display(self, obj):
        """
        Format price with currency.
        """
        if hasattr(obj, 'price') and obj.price is not None:
            return f"{obj.price} UAH"
        return "Price not set"
