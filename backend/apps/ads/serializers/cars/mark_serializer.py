from rest_framework import serializers
from apps.ads.models.reference import CarMarkModel
from core.serializers.base import BaseModelSerializer


class CarMarkSerializer(BaseModelSerializer):
    """Detailed serializer for car mark with additional data"""
    class Meta:
        model = CarMarkModel
        fields = ['name', 'logo', 'is_popular']


class CarMarkListSerializer(BaseModelSerializer):
    """Lightweight serializer for car mark lists"""
    class Meta:
        model = CarMarkModel
        fields = ['id', 'name', 'logo']
