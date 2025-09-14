"""
Serializer for ad images.
"""
from rest_framework import serializers
from core.serializers.base import BaseModelSerializer
from ...models import AddImageModel


class AdImageSerializer(BaseModelSerializer):
    """
    Serializer for ad images.
    Supports both uploaded files (image field) and generated URLs (image_url field).
    Same approach as ProfileSerializer.
    """
    image_display_url = serializers.SerializerMethodField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AddImageModel
        fields = ["id", "image", "image_url", "image_display_url", "order", "is_primary", "caption", "created_at", "updated_at"]
        read_only_fields = ["id", "image_display_url", "created_at", "updated_at"]

    def get_image_display_url(self, obj):
        """Return image URL - prioritize image_url (generated) over image (uploaded file)"""
        return obj.get_image_url()
    
    def validate(self, data):
        """
        Validate the image data.
        Universal approach: either image file OR image_url must be provided.
        """
        # Ensure either image file or image_url is provided (like avatar logic)
        if not self.instance:  # Creating new image
            if not data.get('image') and not data.get('image_url'):
                raise serializers.ValidationError({
                    "image": "Either image file or image_url must be provided."
                })

        # Ensure only one primary image per ad
        if data.get('is_primary', False):
            ad_id = self.context.get('view').kwargs.get('ad_pk')
            if ad_id and AddImageModel.objects.filter(ad_id=ad_id, is_primary=True).exists():
                if not self.instance or not self.instance.is_primary:
                    raise serializers.ValidationError({
                        "is_primary": "An ad can only have one primary image."
                    })

        return data
    
    def create(self, validated_data):
        """
        Create a new image instance.
        """
        # Set the ad_id from the URL
        validated_data['ad_id'] = self.context['view'].kwargs['ad_pk']
        
        # Set the order to be the next available number if not provided
        if 'order' not in validated_data:
            ad_id = validated_data['ad_id']
            max_order = AddImageModel.objects.filter(ad_id=ad_id).aggregate(
                max_order=serializers.Max('order')
            )['max_order'] or 0
            validated_data['order'] = max_order + 1
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Update an existing image instance.
        """
        # If making this the primary image, ensure no other primary exists
        if validated_data.get('is_primary', False) and not instance.is_primary:
            AddImageModel.objects.filter(ad_id=instance.ad_id, is_primary=True).update(is_primary=False)
        
        return super().update(instance, validated_data)
