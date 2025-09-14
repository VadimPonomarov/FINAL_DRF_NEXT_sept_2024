from rest_framework import serializers

from ..models import AddsAccountContact
from core.serializers.base import BaseModelSerializer
from core.enums.ads import ContactTypeEnum


class AddsAccountContactSerializer(BaseModelSerializer):
    """
    Serializer for the AddsAccountContact model.
    Handles serialization and deserialization of contact data for accounts.
    """
    class Meta(BaseModelSerializer.Meta):
        model = AddsAccountContact
        fields = ["id", "type", "value", "is_visible", "note", "adds_account", "created_at", "updated_at"]
        read_only_fields = ["id", "adds_account", "created_at", "updated_at"]
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "type": {"required": True},
            "value": {"required": True}
        }

    def validate(self, data):
        """
        Validate the contact data.
        
        Args:
            data: The contact data to validate.
            
        Returns:
            The validated data.
            
        Raises:
            serializers.ValidationError: If the data is invalid.
        """
        # Ensure the contact type is valid
        contact_type = data.get('type')
        if contact_type not in ContactTypeEnum.values:
            raise serializers.ValidationError({
                'type': f'Invalid contact type. Must be one of: {list(ContactTypeEnum.values)}'
            })
        
        # Ensure the value is provided
        value = data.get('value')
        if not value:
            raise serializers.ValidationError({
                'value': 'This field is required.'
            })
        
        # Additional validation based on contact type
        if contact_type == 'email':
            if '@' not in value:
                raise serializers.ValidationError({
                    'value': 'Enter a valid email address.'
                })
        elif contact_type == 'phone':
            # Simple phone number validation - can be enhanced
            if not value.replace(' ', '').replace('-', '').replace('+', '').isdigit():
                raise serializers.ValidationError({
                    'value': 'Enter a valid phone number.'
                })
        
        return data
