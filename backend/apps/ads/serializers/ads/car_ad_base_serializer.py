from rest_framework import serializers
from core.serializers.base import BaseModelSerializer


class AdBaseSerializer(BaseModelSerializer):
    """
    Base serializer for ad-related serializers.
    Contains common fields and methods used across all ad serializers.
    """
    images = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = None  # To be specified in child classes
        fields = [
            "account", "title", "description", "images", "is_favorite"
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
    
    def get_images(self, obj):
        """Get serialized images for the ad."""
        from .image_serializer import AdImageSerializer

        # Use prefetched images if available
        if hasattr(obj, 'prefetched_images'):
            return AdImageSerializer(obj.prefetched_images, many=True).data

        # Fallback to database query if not prefetched
        return AdImageSerializer(obj.images.all(), many=True).data

    def get_is_favorite(self, obj):
        """Check if the ad is marked as favorite."""
        return getattr(obj, 'is_favorite', False)
