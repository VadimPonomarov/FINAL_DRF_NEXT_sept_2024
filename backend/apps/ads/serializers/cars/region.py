"""
DRF serializers for Region and City models.
"""
from rest_framework import serializers
from apps.ads.models.reference import RegionModel, CityModel
from core.serializers.base import BaseModelSerializer


class RegionSerializer(BaseModelSerializer):
    """Serializer for RegionModel with DRF validation."""

    class Meta(BaseModelSerializer.Meta):
        model = RegionModel
        fields = ['id', 'name', 'code', 'created_at', 'updated_at']
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at

    def validate_name(self, value):
        """Validate region name."""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('Region name must be at least 2 characters')
        return value.strip()

    def validate_code(self, value):
        """Validate region code."""
        if value and len(value) > 10:
            raise serializers.ValidationError('Region code must be at most 10 characters')
        return value.upper() if value else value


class CitySerializer(BaseModelSerializer):
    """Serializer for CityModel with DRF validation."""
    
    region_name = serializers.CharField(write_only=True, required=False)
    region_display = serializers.CharField(source='region.name', read_only=True)
    
    class Meta(BaseModelSerializer.Meta):
        model = CityModel
        fields = [
            'id', 'name', 'region', 'region_name', 'region_display',
            'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'region_display': {'read_only': True},
        }
        
    def validate_name(self, value):
        """Validate city name."""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError('City name must be at least 2 characters')
        return value.strip()
    

    
    def validate(self, attrs):
        """Validate and resolve region."""
        attrs = super().validate(attrs)
        
        # Handle region_name field
        region_name = attrs.pop('region_name', None)
        if region_name and 'region' not in attrs:
            try:
                region = RegionModel.objects.get(name=region_name)
                attrs['region'] = region
            except RegionModel.DoesNotExist:
                raise serializers.ValidationError({
                    'region_name': f'Region with name "{region_name}" does not exist'
                })
        
        return attrs


class RegionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for region lists."""
    
    class Meta:
        model = RegionModel
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'region_id']


class CityListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for city lists."""
    
    region_name = serializers.CharField(source='region.name', read_only=True)
    
    class Meta:
        model = CityModel
        fields = ['id', 'name', 'region_name', 'is_regional_center']
        read_only_fields = ['id', 'name', 'region_id', 'created_at', 'updated_at']
