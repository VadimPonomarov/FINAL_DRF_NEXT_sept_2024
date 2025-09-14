from rest_framework import serializers
from apps.ads.models import CarMarkModel as CarMake  # Use CarMarkModel as CarMake
from core.serializers.base import BaseModelSerializer


class CarMakeSerializer(BaseModelSerializer):
    """Detailed serializer for car make with additional data"""
    class Meta(BaseModelSerializer.Meta):
        model = CarMake
        fields = [
            'name', 'name_ru', 'name_uk', 'logo', 'is_popular'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer


class CarMakeListSerializer(BaseModelSerializer):
    """Lightweight serializer for car make lists"""
    class Meta(BaseModelSerializer.Meta):
        model = CarMake
        fields = ['name', 'logo']
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        read_only_fields = ['name', 'logo']
