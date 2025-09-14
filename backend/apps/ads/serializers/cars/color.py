from rest_framework import serializers
from apps.ads.models import CarColorModel
from core.serializers.base import BaseModelSerializer


class CarColorSerializer(BaseModelSerializer):
    """Serializer for car colors"""
    
    class Meta(BaseModelSerializer.Meta):
        model = CarColorModel
        fields = ['name', 'name_ru', 'name_uk', 'hex_code']
        # id, created_at, updated_at are inherited from BaseModelSerializer
