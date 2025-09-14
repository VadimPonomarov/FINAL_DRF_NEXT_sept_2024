import logging
from rest_framework import serializers
from apps.accounts.models import RawAccountAddress
from core.serializers.base import BaseModelSerializer

logger = logging.getLogger(__name__)


class RawAccountAddressSerializer(BaseModelSerializer):
    """
    Serializer for RawAccountAddress model.
    Automatically geocodes and standardizes address data on save using Google Maps API.
    Ensures data structure and validity with Ukrainian locale ('uk').
    """

    class Meta:
        model = RawAccountAddress
        fields = [
            'id', 'account', 
            # Original user input fields
            'original_country', 'original_region', 'original_district', 
            'original_locality', 'original_street', 'original_building', 
            'original_apartment', 'original_postal_code',
            # Standardized fields (read-only)
            'country', 'country_code', 'region', 'district', 'locality', 
            'street', 'building', 'apartment', 'postal_code', 
            'latitude', 'longitude', 'address_hash', 
            'is_geocoded', 'geocoding_error',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            # Standardized fields are auto-filled by geocoding
            'country', 'country_code', 'region', 'district', 'locality', 
            'street', 'building', 'postal_code', 'latitude', 'longitude', 
            'address_hash', 'is_geocoded', 'geocoding_error'
        ]

    def validate_account(self, value):
        """Ensure the account belongs to the requesting user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and value.user != request.user:
            raise serializers.ValidationError("You can only add addresses to your own account.")
        return value

    def create(self, validated_data):
        """
        Create a new RawAccountAddress with automatic geocoding.
        The address will be validated and standardized through Google Maps API.
        """
        try:
            # Create the address - geocoding happens automatically in model.save()
            instance = super().create(validated_data)
            
            # Check if geocoding was successful
            if not instance.is_geocoded:
                raise serializers.ValidationError({
                    'address': f'Unable to geocode the provided address: {instance.geocoding_error}'
                })
            
            logger.info(
                f"Successfully created and geocoded address for account {instance.account.id}: "
                f"{instance.locality}, {instance.street} {instance.building}"
            )
            
            return instance
                
        except Exception as e:
            logger.error(f"Failed to create address: {e}")
            raise
        
    def update(self, instance, validated_data):
        """
        Update RawAccountAddress with automatic re-geocoding if address fields changed.
        """
        # Check if any original address fields are being updated
        address_fields = [
            'original_country', 'original_region', 'original_district', 
            'original_locality', 'original_street', 'original_building', 
            'original_apartment', 'original_postal_code'
        ]
        needs_geocoding = any(field in validated_data for field in address_fields)
        
        try:
            # If address fields changed, mark for re-geocoding
            if needs_geocoding:
                validated_data['is_geocoded'] = False
                validated_data['geocoding_error'] = ''
            
            # Update the instance - geocoding happens automatically in model.save()
            instance = super().update(instance, validated_data)
            
            # Check if geocoding was successful (if it was needed)
            if needs_geocoding and not instance.is_geocoded:
                raise serializers.ValidationError({
                    'address': f'Unable to geocode the updated address: {instance.geocoding_error}'
                })
            
            if needs_geocoding:
                logger.info(
                    f"Successfully updated and geocoded address for account {instance.account.id}: "
                    f"{instance.locality}, {instance.street} {instance.building}"
                )
            
            return instance
                
        except Exception as e:
            logger.error(f"Failed to update address: {e}")
            raise

    def to_representation(self, instance):
        """
        Customize the output representation to show both original and standardized data.
        """
        data = super().to_representation(instance)
        
        # Add a summary of the geocoding process
        if instance.is_geocoded:
            data['geocoding_status'] = 'success'
            data['standardized_address'] = {
                'country': instance.country,
                'region': instance.region,
                'locality': instance.locality,
                'street': instance.street,
                'building': instance.building,
                'coordinates': {
                    'latitude': instance.latitude,
                    'longitude': instance.longitude
                } if instance.latitude and instance.longitude else None
            }
        else:
            data['geocoding_status'] = 'failed'
            data['geocoding_error'] = instance.geocoding_error
        
        return data
