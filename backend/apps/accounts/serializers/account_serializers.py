import uuid
from typing import Dict, Any, List, Optional

from rest_framework import serializers

from ..models import AddsAccount, RawAccountAddress, AddsAccountContact
from .contact_serializers import AddsAccountContactSerializer
from .addresses.serializers import RawAccountAddressSerializer
from core.serializers.base import BaseModelSerializer


# AccountAddressDetailSerializer removed - formatted data is now included in RawAccountAddressSerializer


class AddsAccountSerializer(BaseModelSerializer):
    """
    Serializer for the AddsAccount model.
    Handles serialization and deserialization of account data.
    Automatically generates a UUID for organization_id when organization_name is provided.
    """
    contacts = AddsAccountContactSerializer(many=True, required=False)
    addresses = RawAccountAddressSerializer(many=True, required=False)
    organization_id = serializers.UUIDField(required=False, read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = AddsAccount
        fields = [
            "id",  # Добавляем поле id
            "user",
            "account_type",
            "moderation_level",
            "role",
            "organization_name",
            "organization_id",
            "stats_enabled",
            "contacts",
            "addresses",
        ]
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "organization_id": {"read_only": True},
            "account_type": {"read_only": True}
        }

    def create(self, validated_data: Dict[str, Any]) -> AddsAccount:
        """
        Create a new account with the provided data.
        
        Args:
            validated_data: The validated data for account creation.
            
        Returns:
            The created AddsAccount instance.
        """
        contacts_data = validated_data.pop('contacts', [])
        addresses_data = validated_data.pop('addresses', [])
        
        # Create the account
        account = AddsAccount.objects.create(**validated_data)
        
        # Create contacts
        for contact_data in contacts_data:
            AddsAccountContact.objects.create(account=account, **contact_data)
        
        # Create addresses
        for address_data in addresses_data:
            RawAccountAddress.objects.create(account=account, **address_data)
        
        return account

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and automatically generate organization_id if organization_name is provided.
        Also set stats_enabled based on account_type.
        
        Args:
            attrs: The attributes to validate.
            
        Returns:
            The validated attributes with organization_id and stats_enabled set if needed.
        """
        # Handle organization_id based on organization_name
        organization_name = attrs.get('organization_name')
        
        # If organization_name is being set and organization_id is not provided
        if organization_name is not None and 'organization_id' not in attrs:
            # Only generate a new UUID if this is a new record or organization_name is being changed
            if self.instance is None or organization_name != getattr(self.instance, 'organization_name', None):
                attrs['organization_id'] = uuid.uuid4()
        # If organization_name is being cleared, also clear organization_id
        elif 'organization_name' in attrs and not organization_name and 'organization_id' not in attrs:
            attrs['organization_id'] = None
        
        # Handle stats_enabled based on account_type
        if 'account_type' in attrs and attrs['account_type'] != AccountTypeEnum.BASIC:
            attrs['stats_enabled'] = True
            
        return attrs
    
    def update(self, instance: AddsAccount, validated_data: Dict[str, Any]) -> AddsAccount:
        """
        Update an existing account with the provided data.
        
        Args:
            instance: The existing account instance.
            validated_data: The validated data for updating the account.
            
        Returns:
            The updated AddsAccount instance.
        """
        # Handle nested updates for contacts and addresses if needed
        if 'contacts' in validated_data:
            contacts_data = validated_data.pop('contacts')
            # Clear existing contacts and create new ones
            instance.contacts.all().delete()
            for contact_data in contacts_data:
                AddsAccountContact.objects.create(account=instance, **contact_data)
        
        if 'addresses' in validated_data:
            addresses_data = validated_data.pop('addresses')
            # Clear existing addresses and create new ones
            instance.addresses.all().delete()
            for address_data in addresses_data:
                RawAccountAddress.objects.create(account=instance, **address_data)
        
        # Check if organization_name is being updated
        if 'organization_name' in validated_data:
            organization_name = validated_data['organization_name']
            # If organization_name is being set and organization_id is not provided
            if organization_name and 'organization_id' not in validated_data and not instance.organization_id:
                validated_data['organization_id'] = uuid.uuid4()
            # If organization_name is being cleared, also clear organization_id
            elif not organization_name and 'organization_id' not in validated_data:
                validated_data['organization_id'] = None
                
        # Update stats_enabled if account_type is being changed to non-BASIC
        if 'account_type' in validated_data and validated_data['account_type'] != AccountTypeEnum.BASIC:
            validated_data['stats_enabled'] = True
        
        # Update the account fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
