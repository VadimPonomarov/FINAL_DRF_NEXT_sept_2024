"""
Serializers for car reference data (marks, models, generations, etc.).
"""
from rest_framework import serializers
from apps.ads.models.reference import (
    VehicleTypeModel, CarMarkModel, CarModel, CarGenerationModel, CarModificationModel, CarColorModel
)
from core.serializers.base import BaseModelSerializer


# Vehicle Type Serializers
class VehicleTypeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vehicle types list."""

    marks_count = serializers.SerializerMethodField()

    class Meta:
        model = VehicleTypeModel
        fields = ['id', 'name', 'slug', 'icon', 'is_popular', 'is_active', 'sort_order', 'marks_count']
        read_only_fields = ['id', 'marks_count']

    def get_marks_count(self, obj):
        """Get the number of marks for this vehicle type."""
        return obj.marks.count()


class VehicleTypeDetailSerializer(BaseModelSerializer):
    """Detailed serializer for vehicle types."""

    marks_count = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = VehicleTypeModel
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'is_popular', 'is_active',
            'sort_order', 'marks_count', 'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'marks_count': {'read_only': True},
        }

    def get_marks_count(self, obj):
        """Get the number of marks for this vehicle type."""
        return obj.marks.count()


class VehicleTypeChoiceSerializer(serializers.ModelSerializer):
    """Simple serializer for vehicle type choices in forms."""

    class Meta:
        model = VehicleTypeModel
        fields = ['id', 'name', 'slug', 'icon']
        read_only_fields = ['id', 'name', 'slug']


# Car Mark Serializers
class CarMarkListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for car marks list."""

    vehicle_type_name = serializers.CharField(source='vehicle_type.name', read_only=True)
    vehicle_type_slug = serializers.CharField(source='vehicle_type.slug', read_only=True)

    class Meta:
        model = CarMarkModel
        fields = ['id', 'name', 'logo', 'is_popular', 'vehicle_type', 'vehicle_type_name', 'vehicle_type_slug']
        read_only_fields = ['id', 'vehicle_type_name', 'vehicle_type_slug']


class CarMarkDetailSerializer(BaseModelSerializer):
    """Detailed serializer for car marks with models count."""

    models_count = serializers.SerializerMethodField()
    vehicle_type_name = serializers.CharField(source='vehicle_type.name', read_only=True)
    vehicle_type_slug = serializers.CharField(source='vehicle_type.slug', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = CarMarkModel
        fields = [
            'id', 'name', 'logo', 'is_popular', 'models_count',
            'vehicle_type', 'vehicle_type_name', 'vehicle_type_slug',
            'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'models_count': {'read_only': True},
            'vehicle_type_name': {'read_only': True},
            'vehicle_type_slug': {'read_only': True},
        }
    
    def get_models_count(self, obj):
        """Get the number of models for this mark."""
        return obj.models.count()


class CarModelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for car models list."""
    
    mark_name = serializers.CharField(source='mark.name', read_only=True)
    
    class Meta:
        model = CarModel
        fields = ['id', 'name', 'mark', 'mark_name', 'is_popular']
        read_only_fields = ['id', 'mark_name']


class CarModelDetailSerializer(BaseModelSerializer):
    """Detailed serializer for car models with generations count."""
    
    mark_name = serializers.CharField(source='mark.name', read_only=True)
    generations_count = serializers.SerializerMethodField()
    
    class Meta(BaseModelSerializer.Meta):
        model = CarModel
        fields = [
            'id', 'name', 'mark', 'mark_name', 'is_popular', 'generations_count',
            'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'mark_name': {'read_only': True},
            'generations_count': {'read_only': True},
        }
    
    def get_generations_count(self, obj):
        """Get the number of generations for this model."""
        # Use annotated field if available, otherwise fallback to count()
        if hasattr(obj, 'generations_count'):
            return obj.generations_count
        return obj.generations.count()


class CarGenerationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for car generations list."""
    
    model_name = serializers.CharField(source='model.name', read_only=True)
    mark_name = serializers.CharField(source='model.mark.name', read_only=True)
    
    class Meta:
        model = CarGenerationModel
        fields = ['id', 'name', 'model', 'model_name', 'mark_name', 'year_start', 'year_end']
        read_only_fields = ['id', 'model_name', 'mark_name']


class CarGenerationDetailSerializer(BaseModelSerializer):
    """Detailed serializer for car generations with modifications count."""
    
    model_name = serializers.CharField(source='model.name', read_only=True)
    mark_name = serializers.CharField(source='model.mark.name', read_only=True)
    modifications_count = serializers.SerializerMethodField()
    
    class Meta(BaseModelSerializer.Meta):
        model = CarGenerationModel
        fields = [
            'id', 'name', 'model', 'model_name', 'mark_name',
            'year_start', 'year_end', 'modifications_count',
            'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'model_name': {'read_only': True},
            'mark_name': {'read_only': True},
            'modifications_count': {'read_only': True},
        }
    
    def get_modifications_count(self, obj):
        """Get the number of modifications for this generation."""
        return obj.modifications.count()


class CarModificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for car modifications list."""
    
    generation_name = serializers.CharField(source='generation.name', read_only=True)
    model_name = serializers.CharField(source='generation.model.name', read_only=True)
    mark_name = serializers.CharField(source='generation.model.mark.name', read_only=True)
    
    class Meta:
        model = CarModificationModel
        fields = [
            'id', 'name', 'generation', 'generation_name', 'model_name', 'mark_name',
            'engine_type', 'engine_volume', 'power_hp'
        ]
        read_only_fields = ['id', 'generation_name', 'model_name', 'mark_name']


class CarModificationDetailSerializer(BaseModelSerializer):
    """Detailed serializer for car modifications."""
    
    generation_name = serializers.CharField(source='generation.name', read_only=True)
    model_name = serializers.CharField(source='generation.model.name', read_only=True)
    mark_name = serializers.CharField(source='generation.model.mark.name', read_only=True)
    
    class Meta(BaseModelSerializer.Meta):
        model = CarModificationModel
        fields = [
            'id', 'name', 'generation', 'generation_name', 'model_name', 'mark_name',
            'engine_type', 'engine_volume', 'power_hp', 'transmission', 'drive_type',
            'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'generation_name': {'read_only': True},
            'model_name': {'read_only': True},
            'mark_name': {'read_only': True},
        }


class CarColorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for car colors list."""
    
    class Meta:
        model = CarColorModel
        fields = ['id', 'name', 'hex_code', 'is_metallic', 'is_pearlescent', 'is_popular']
        read_only_fields = ['id', 'name', 'created_at', 'updated_at']


class CarColorDetailSerializer(BaseModelSerializer):
    """Detailed serializer for car colors."""
    
    class Meta(BaseModelSerializer.Meta):
        model = CarColorModel
        fields = [
            'id', 'name', 'hex_code', 'is_metallic', 'is_pearlescent', 'is_popular',
            'created_at', 'updated_at'
        ]
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at


# Nested serializers for hierarchical data
class CarModelNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for models within marks."""
    
    class Meta:
        model = CarModel
        fields = ['id', 'name', 'is_popular']


class CarMarkWithModelsSerializer(CarMarkDetailSerializer):
    """Mark serializer with nested models."""
    
    models = CarModelNestedSerializer(many=True, read_only=True)
    
    class Meta(CarMarkDetailSerializer.Meta):
        fields = CarMarkDetailSerializer.Meta.fields + ['models']


class CarGenerationNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for generations within models."""
    
    class Meta:
        model = CarGenerationModel
        fields = ['id', 'name', 'year_start', 'year_end']


class CarModelWithGenerationsSerializer(CarModelDetailSerializer):
    """Model serializer with nested generations."""
    
    generations = CarGenerationNestedSerializer(many=True, read_only=True)
    
    class Meta(CarModelDetailSerializer.Meta):
        fields = CarModelDetailSerializer.Meta.fields + ['generations']


class CarModificationNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for modifications within generations."""
    
    class Meta:
        model = CarModificationModel
        fields = ['id', 'name', 'engine_type', 'engine_volume', 'power_hp']


class CarGenerationWithModificationsSerializer(CarGenerationDetailSerializer):
    """Generation serializer with nested modifications."""
    
    modifications = CarModificationNestedSerializer(many=True, read_only=True)
    
    class Meta(CarGenerationDetailSerializer.Meta):
        fields = CarGenerationDetailSerializer.Meta.fields + ['modifications']


# Utility serializers for dropdowns and autocomplete
class CarMarkChoiceSerializer(serializers.ModelSerializer):
    """Simple serializer for mark choices in forms."""

    class Meta:
        model = CarMarkModel
        fields = ['id', 'name', 'vehicle_type']  # Добавлено vehicle_type для каскадной фильтрации


class CarModelChoiceSerializer(serializers.ModelSerializer):
    """Simple serializer for model choices in forms."""
    
    class Meta:
        model = CarModel
        fields = ['id', 'name', 'mark']


class CarColorChoiceSerializer(serializers.ModelSerializer):
    """Simple serializer for color choices in forms."""

    class Meta:
        model = CarColorModel
        fields = ['id', 'name', 'hex_code']


# Aliases for backward compatibility
VehicleTypeSerializer = VehicleTypeListSerializer
