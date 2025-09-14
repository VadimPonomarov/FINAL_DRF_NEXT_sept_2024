from rest_framework import serializers
from apps.ads.models import CarModificationModel as CarModification
from core.serializers.base import BaseModelSerializer
from core.enums.cars import FuelType, TransmissionType, DriveType


class CarModificationSerializer(BaseModelSerializer):
    """Detailed serializer for car modification with additional data"""
    make_name = serializers.CharField(source='generation.model.make.name', read_only=True)
    model_name = serializers.CharField(source='generation.model.name', read_only=True)
    generation_name = serializers.CharField(source='generation.name', read_only=True)
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
    
    class Meta(BaseModelSerializer.Meta):
        model = CarModification
        fields = [
            'generation', 'make_name', 'model_name', 'generation_name',
            'name', 'engine_volume', 'engine_power', 'fuel_type', 'fuel_type_display',
            'transmission_type', 'transmission_type_display', 'drive_type', 'drive_type_display'
        ]
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer


class CarModificationListSerializer(BaseModelSerializer):
    """Lightweight serializer for car modification lists"""
    class Meta(BaseModelSerializer.Meta):
        model = CarModification
        fields = [
            'name', 'engine_volume', 'engine_power',
            'fuel_type', 'transmission_type', 'drive_type'
        ]
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        read_only_fields = ['name', 'generation']
