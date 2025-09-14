from rest_framework import serializers
from apps.ads.models import CarModel
from core.serializers.base import BaseModelSerializer


class CarModelSerializer(BaseModelSerializer):
    """Detailed serializer for car model with additional data"""
    mark_name = serializers.CharField(source='mark.name', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = CarModel
        fields = [
            'mark', 'mark_name', 'name', 'name_ru', 'name_uk'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer


class CarModelListSerializer(BaseModelSerializer):
    """Lightweight serializer for car model lists"""
    class Meta(BaseModelSerializer.Meta):
        model = CarModel
        fields = ['name']
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        read_only_fields = ['name', 'mark']
