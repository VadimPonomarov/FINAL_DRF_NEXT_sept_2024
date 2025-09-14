from rest_framework import serializers
from ..models import AddImageModel
from core.serializers.base import BaseModelSerializer


class AdImageSerializer(BaseModelSerializer):
    """
    Serializer for ad images with universal approach (file + URL support).
    """
    image_display_url = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = AddImageModel
        fields = ["id", "image", "image_url", "image_display_url", "caption", "order", "is_primary", "created_at", "updated_at"]
        extra_kwargs = {
            'image': {'required': False},  # Не обязательно, если есть image_url
            'image_url': {'required': False},  # Не обязательно, если есть image
        }

    def get_image_display_url(self, obj):
        """
        Возвращает URL для отображения изображения.
        Приоритет: image_url > image.url
        """
        return obj.image_display_url
    
    def validate(self, data):
        """
        Validate the image data.
        """
        # Ensure either image or image_url is provided
        if not self.instance and 'image' not in data and 'image_url' not in data:
            raise serializers.ValidationError({
                "image": "Either 'image' file or 'image_url' must be provided."
            })
        
        # Ensure only one primary image per ad
        if data.get('is_primary', False):
            ad = self.context.get('request').parser_context['kwargs'].get('ad_id')
            if ad and AddImageModel.objects.filter(add_id=ad, is_primary=True).exists():
                if not self.instance or not self.instance.is_primary:
                    raise serializers.ValidationError({
                        "is_primary": "An ad can only have one primary image."
                    })
        
        return data
    
    def create(self, validated_data):
        """
        Create a new image instance.
        Note: ad and order are set by the view's perform_create method.
        """
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Update an existing image instance.
        """
        # If this is being set as primary, unset any existing primary
        if validated_data.get('is_primary', False):
            AddImageModel.objects.filter(
                ad=instance.ad,
                is_primary=True
            ).exclude(pk=instance.pk).update(is_primary=False)
        
        return super().update(instance, validated_data)
