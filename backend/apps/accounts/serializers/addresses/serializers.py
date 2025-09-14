import logging
from rest_framework import serializers
from apps.accounts.models import RawAccountAddress
from core.serializers.base import BaseModelSerializer

logger = logging.getLogger(__name__)


class RawAccountAddressSerializer(BaseModelSerializer):
    """
    Serializer for RawAccountAddress model with OneToOne relationship.
    Each account can have only ONE address.
    Automatically geocodes region + locality and generates geo_code for geographical grouping.
    """

    class Meta(BaseModelSerializer.Meta):
        model = RawAccountAddress
        fields = [
            'account',
            # User input fields (required)
            'input_region', 'input_locality',
            # Standardized geographical fields (read-only)
            'region', 'locality', 'geo_code',
            # Coordinates for map display (read-only)
            'latitude', 'longitude',
            # Processing status (read-only)
            'is_geocoded', 'geocoding_error'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            # Account is set automatically in view
            'account': {'read_only': True},
            # Auto-filled by geocoding
            'region': {'read_only': True},
            'locality': {'read_only': True},
            'geo_code': {'read_only': True},
            'latitude': {'read_only': True},
            'longitude': {'read_only': True},
            'is_geocoded': {'read_only': True},
            'geocoding_error': {'read_only': True},
        }

    # Account validation removed since account is now read-only and set in view

    def create(self, validated_data):
        """
        Create a new RawAccountAddress with automatic Google Maps place_id geocoding.
        """
        try:
            # Create the address - geocoding happens automatically in model.save()
            instance = super().create(validated_data)

            # Check if geocoding was successful and place_id was obtained
            if not instance.is_geocoded or not instance.geo_code.startswith('ChIJ'):
                raise serializers.ValidationError({
                    'location': f'Unable to get Google Maps place_id for location: {instance.geocoding_error}'
                })

            logger.info(
                f"Successfully created address with Google place_id for account {instance.account.id}: "
                f"{instance.locality}, {instance.region} (place_id: {instance.geo_code})"
            )

            return instance

        except Exception as e:
            logger.error(f"Failed to create address with place_id: {e}")
            raise
        
    def update(self, instance, validated_data):
        """
        Update RawAccountAddress with automatic re-geocoding if location fields changed.
        """
        # Check if geographical fields are being updated
        location_fields = ['input_region', 'input_locality']
        location_changed = any(field in validated_data for field in location_fields)

        try:
            # Update the instance - geocoding happens automatically in model.save() if needed
            instance = super().update(instance, validated_data)

            # Check if geocoding was successful (if location changed)
            if location_changed and (not instance.is_geocoded or not instance.geo_code.startswith('ChIJ')):
                raise serializers.ValidationError({
                    'location': f'Unable to get Google Maps place_id for updated location: {instance.geocoding_error}'
                })

            if location_changed:
                logger.info(
                    f"Successfully updated address with Google place_id for account {instance.account.id}: "
                    f"{instance.locality}, {instance.region} (place_id: {instance.geo_code})"
                )

            return instance

        except Exception as e:
            logger.error(f"Failed to update address with place_id: {e}")
            raise

    def to_representation(self, instance):
        """
        Customize the output representation with Google Maps place_id information.
        """
        data = super().to_representation(instance)

        # Add Google Maps place_id information
        if instance.is_geocoded and instance.geo_code.startswith('ChIJ'):
            data['geocoding_status'] = 'success'
            data['google_maps_info'] = {
                'place_id': instance.geo_code,
                'standardized_region': instance.region,
                'standardized_locality': instance.locality,
                'coordinates': {
                    'latitude': instance.latitude,
                    'longitude': instance.longitude
                } if instance.latitude and instance.longitude else None
            }

            # Add statistics about similar locations (same place_id)
            similar_count = instance.get_similar_locations().count() - 1  # Exclude self
            if similar_count > 0:
                data['google_maps_info']['similar_locations_count'] = similar_count
                data['google_maps_info']['grouping_note'] = f'This location groups {similar_count + 1} addresses together'

            # Add reverse lookup capability note
            data['google_maps_info']['reverse_lookup_available'] = True

        else:
            data['geocoding_status'] = 'failed'
            data['geocoding_error'] = instance.geocoding_error
            data['google_maps_info'] = {
                'place_id': None,
                'note': 'Google Maps place_id not available - geocoding failed'
            }

        return data
