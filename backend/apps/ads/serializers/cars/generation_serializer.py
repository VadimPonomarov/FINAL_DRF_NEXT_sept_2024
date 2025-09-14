from rest_framework import serializers
from apps.ads.models import CarGenerationModel as CarGeneration
from core.serializers.base import BaseModelSerializer


class CarGenerationSerializer(BaseModelSerializer):
    """Detailed serializer for car generation with additional data"""
    make_name = serializers.CharField(source='model.make.name', read_only=True)
    model_name = serializers.CharField(source='model.name', read_only=True)
    
    class Meta(BaseModelSerializer.Meta):
        model = CarGeneration
        fields = [
            'model', 'make_name', 'model_name', 'name',
            'year_begin', 'year_end'
        ]
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer


class CarGenerationListSerializer(BaseModelSerializer):
    """Lightweight serializer for car generation lists"""
    class Meta(BaseModelSerializer.Meta):
        model = CarGeneration
        fields = ['name', 'year_begin', 'year_end']
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        read_only_fields = ['name', 'year_begin', 'year_end']
