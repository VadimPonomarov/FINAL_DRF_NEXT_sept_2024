from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from ..models import AdContact
from core.serializers.base import BaseModelSerializer
from core.enums.ads import ContactTypeEnum
from core.validators.contact_validators import ContactSerializerMixin


class AdContactSerializer(ContactSerializerMixin, BaseModelSerializer):
    """
    Serializer for AdContact model.
    Handles serialization and deserialization of contact data for advertisements.
    Uses ContactSerializerMixin for centralized validation (DRY principle).
    """
    
    class Meta(BaseModelSerializer.Meta):
        model = AdContact
        fields = [
            'id',
            'type',
            'value',
            'is_visible',
            'is_primary',
            'note',
            'created_at',
            'updated_at'
        ]
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'type': {'required': True},
            'value': {'required': True},
            'is_visible': {'default': True},
            'is_primary': {'default': False},
            'note': {'required': False, 'allow_blank': True}
        }

    def validate_type(self, value):
        """
        Validate contact type against ContactTypeEnum.
        """
        if value not in dict(ContactTypeEnum.choices):
            raise serializers.ValidationError(
                _('Invalid contact type. Must be one of: {}').format(
                    ', '.join([choice[0] for choice in ContactTypeEnum.choices])
                )
            )
        return value
    
    # validate_value and validate methods are inherited from ContactSerializerMixin
    # No need to duplicate email/phone validation logic here

    def create(self, validated_data):
        """
        Create a new contact.
        """
        # Если создаем первый контакт для объявления, делаем его основным
        car_ad = validated_data.get('car_ad')
        if car_ad and not AdContact.objects.filter(car_ad=car_ad).exists():
            validated_data['is_primary'] = True
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Update an existing contact.
        """
        # Если устанавливаем как основной, убираем primary у других контактов
        if validated_data.get('is_primary', False) and not instance.is_primary:
            AdContact.objects.filter(
                car_ad=instance.car_ad,
                is_primary=True
            ).exclude(pk=instance.pk).update(is_primary=False)
        
        return super().update(instance, validated_data)


class AdContactCreateSerializer(AdContactSerializer):
    """
    Serializer for creating contacts with car_ad field.
    """
    car_ad = serializers.PrimaryKeyRelatedField(
        queryset=None,  # Will be set in the view
        write_only=True
    )
    
    class Meta(AdContactSerializer.Meta):
        fields = AdContactSerializer.Meta.fields + ['car_ad']
        extra_kwargs = {
            **AdContactSerializer.Meta.extra_kwargs,
            'car_ad': {'write_only': True}
        }


class AdContactListSerializer(AdContactSerializer):
    """
    Serializer for listing contacts with additional display information.
    """
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta(AdContactSerializer.Meta):
        fields = AdContactSerializer.Meta.fields + ['type_display']
