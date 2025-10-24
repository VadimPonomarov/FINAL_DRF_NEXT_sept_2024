from rest_framework import serializers

from ..models import AddsAccountContact
from core.serializers.base import BaseModelSerializer
from core.enums.ads import ContactTypeEnum
from core.validators.contact_validators import ContactSerializerMixin


class AddsAccountContactSerializer(ContactSerializerMixin, BaseModelSerializer):
    """
    Serializer for the AddsAccountContact model.
    Handles serialization and deserialization of contact data for accounts.
    Uses ContactSerializerMixin for centralized validation (DRY principle).
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

    def validate_type(self, value):
        """
        Validate contact type against ContactTypeEnum.
        """
        if value not in ContactTypeEnum.values:
            raise serializers.ValidationError(
                f'Invalid contact type. Must be one of: {list(ContactTypeEnum.values)}'
            )
        return value
    
    # validate_value and validate methods are inherited from ContactSerializerMixin
    # Email and phone validation is centralized - no duplication needed
