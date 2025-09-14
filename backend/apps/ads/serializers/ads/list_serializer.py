from rest_framework import serializers
from .car_ad_base_serializer import AdBaseSerializer
from ...models import CarAd


class AdListSerializer(AdBaseSerializer):
    """
    Lightweight serializer for listing ads with minimal data.
    Optimized for performance in list views.
    """
    primary_image = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    
    class Meta(AdBaseSerializer.Meta):
        model = CarAd
        fields = AdBaseSerializer.Meta.fields + [
            "primary_image", "price_display"
        ]
    
    def get_primary_image(self, obj):
        """Get the primary image URL or the first available image."""
        # Use prefetched images if available
        if hasattr(obj, 'prefetched_images'):
            images = obj.prefetched_images
            # Find primary image first
            for image in images:
                if image.is_primary and image.image:
                    return image.image.url
            # If no primary, return first available
            for image in images:
                if image.image:
                    return image.image.url
            return None

        # Fallback to database queries if not prefetched
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image and primary_image.image:
            return primary_image.image.url

        first_image = obj.images.filter(image__isnull=False).first()
        return first_image.image.url if first_image else None
    
    def get_price_display(self, obj):
        """Format price with currency."""
        if hasattr(obj, 'price') and obj.price is not None:
            return f"{obj.price} UAH"
        return "Price not set"
