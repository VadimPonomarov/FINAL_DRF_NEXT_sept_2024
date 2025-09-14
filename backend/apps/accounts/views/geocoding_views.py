"""
Views for geocoding and formatted address display.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.accounts.models import RawAccountAddress
from apps.accounts.utils.geocoding import get_detailed_geocode

logger = logging.getLogger(__name__)


@swagger_auto_schema(
    method='post',
    operation_summary="Get detailed geocoded address",
    operation_description="Get detailed geocoded address information with Latin transliteration and structured data",
    tags=['📍 Geocoding'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['region', 'locality'],
        properties={
            'region': openapi.Schema(type=openapi.TYPE_STRING, description='Region name'),
            'locality': openapi.Schema(type=openapi.TYPE_STRING, description='City/locality name'),
        }
    ),
    responses={
        200: openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'raw_input': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'region': openapi.Schema(type=openapi.TYPE_STRING),
                        'locality': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                ),
                'geocoded_data': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'place_id': openapi.Schema(type=openapi.TYPE_STRING),
                        'formatted_address': openapi.Schema(type=openapi.TYPE_STRING),
                        'coordinates': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'latitude': openapi.Schema(type=openapi.TYPE_NUMBER),
                                'longitude': openapi.Schema(type=openapi.TYPE_NUMBER),
                            }
                        ),
                        'components_latin': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'country': openapi.Schema(type=openapi.TYPE_STRING),
                                'region': openapi.Schema(type=openapi.TYPE_STRING),
                                'locality': openapi.Schema(type=openapi.TYPE_STRING),
                                'street': openapi.Schema(type=openapi.TYPE_STRING),
                                'building': openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        ),
                        'components_ukrainian': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'country': openapi.Schema(type=openapi.TYPE_STRING),
                                'region': openapi.Schema(type=openapi.TYPE_STRING),
                                'locality': openapi.Schema(type=openapi.TYPE_STRING),
                                'street': openapi.Schema(type=openapi.TYPE_STRING),
                                'building': openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        ),
                        'address_hash': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                ),
                'maps_data': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'embed_url': openapi.Schema(type=openapi.TYPE_STRING),
                        'direct_url': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            }
        ),
        400: "Bad request - missing required fields",
        401: "Authentication required"
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_detailed_geocode_info(request):
    """
    Get detailed geocoded address information with Latin transliteration.
    
    This endpoint takes region and locality, performs geocoding, and returns:
    - Original input data
    - Detailed geocoded information with place_id
    - Structured address components in both Latin and Ukrainian
    - Google Maps URLs for embedding and direct access
    """
    try:
        # Validate input
        region = request.data.get('region', '').strip()
        locality = request.data.get('locality', '').strip()
        
        if not region or not locality:
            return Response({
                'success': False,
                'error': 'Both region and locality are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Geocoding request for: {locality}, {region}")
        
        # Perform detailed geocoding
        geocode_result = get_detailed_geocode(
            region=region,
            locality=locality
        )
        
        if not geocode_result:
            return Response({
                'success': False,
                'error': 'Geocoding failed - no results found',
                'raw_input': {
                    'region': region,
                    'locality': locality
                }
            }, status=status.HTTP_200_OK)
        
        # Prepare response data
        response_data = {
            'success': True,
            'raw_input': {
                'region': region,
                'locality': locality
            },
            'geocoded_data': {
                'place_id': geocode_result.get('place_id'),
                'formatted_address': geocode_result.get('formatted_address'),
                'coordinates': {
                    'latitude': geocode_result.get('latitude'),
                    'longitude': geocode_result.get('longitude')
                },
                'components_latin': {
                    'country': geocode_result.get('country'),
                    'region': geocode_result.get('region'),
                    'locality': geocode_result.get('locality'),
                    'street': geocode_result.get('street'),
                    'building': geocode_result.get('building')
                },
                'components_ukrainian': {
                    'country': geocode_result.get('country_uk'),
                    'region': geocode_result.get('region_uk'),
                    'locality': geocode_result.get('locality_uk'),
                    'street': geocode_result.get('street_uk'),
                    'building': geocode_result.get('building_uk')
                },
                'address_hash': geocode_result.get('address_hash')
            }
        }
        
        # Add Google Maps URLs if coordinates are available
        if geocode_result.get('latitude') and geocode_result.get('longitude'):
            lat = geocode_result['latitude']
            lng = geocode_result['longitude']
            place_id = geocode_result.get('place_id')
            
            # Try to get Google Maps API key for embed URL
            try:
                from core.utils.key_manager import key_manager
                api_key = key_manager.google_maps_api_key
                
                if api_key and api_key != 'YOUR_GOOGLE_MAPS_API_KEY_HERE':
                    if place_id and place_id.startswith('ChIJ'):
                        embed_url = f"https://www.google.com/maps/embed/v1/place?key={api_key}&q=place_id:{place_id}&zoom=15"
                    else:
                        embed_url = f"https://www.google.com/maps/embed/v1/view?key={api_key}&center={lat},{lng}&zoom=15"
                else:
                    embed_url = None
                    
            except Exception as e:
                logger.warning(f"Could not get Google Maps API key: {e}")
                embed_url = None
            
            # Direct Google Maps URL (doesn't require API key)
            if place_id and place_id.startswith('ChIJ'):
                direct_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
            else:
                direct_url = f"https://www.google.com/maps/@{lat},{lng},15z"
            
            response_data['maps_data'] = {
                'embed_url': embed_url,
                'direct_url': direct_url
            }
        
        logger.info(f"Successfully geocoded: {locality}, {region} -> {geocode_result.get('place_id')}")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in detailed geocoding: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='get',
    operation_summary="Get formatted address by ID",
    operation_description="Get detailed formatted address information for an existing address",
    tags=['📍 Geocoding'],
    manual_parameters=[
        openapi.Parameter(
            'address_id',
            openapi.IN_PATH,
            description="Address ID",
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: "Detailed address information",
        404: "Address not found",
        401: "Authentication required"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_formatted_address_by_id(request, address_id):
    """
    Get detailed formatted address information for an existing address.
    """
    try:
        # Get the address, ensuring it belongs to the current user
        address = RawAccountAddress.objects.get(
            id=address_id,
            account__user=request.user
        )
        
        # Prepare response data
        response_data = {
            'success': True,
            'address_id': address.id,
            'raw_input': {
                'region': address.input_region,
                'locality': address.input_locality
            },
            'is_geocoded': address.is_geocoded,
            'geocoding_error': address.geocoding_error
        }
        
        if address.is_geocoded:
            response_data['geocoded_data'] = {
                'place_id': address.geo_code,
                'coordinates': {
                    'latitude': address.latitude,
                    'longitude': address.longitude
                },
                'standardized': {
                    'region': address.region,
                    'locality': address.locality
                }
            }
            
            # Add Google Maps URLs
            if address.latitude and address.longitude:
                try:
                    from core.utils.key_manager import key_manager
                    api_key = key_manager.google_maps_api_key
                    
                    if api_key and api_key != 'YOUR_GOOGLE_MAPS_API_KEY_HERE':
                        if address.geo_code and address.geo_code.startswith('ChIJ'):
                            embed_url = f"https://www.google.com/maps/embed/v1/place?key={api_key}&q=place_id:{address.geo_code}&zoom=15"
                        else:
                            embed_url = f"https://www.google.com/maps/embed/v1/view?key={api_key}&center={address.latitude},{address.longitude}&zoom=15"
                    else:
                        embed_url = None
                        
                except Exception:
                    embed_url = None
                
                # Direct URL
                if address.geo_code and address.geo_code.startswith('ChIJ'):
                    direct_url = f"https://www.google.com/maps/place/?q=place_id:{address.geo_code}"
                else:
                    direct_url = f"https://www.google.com/maps/@{address.latitude},{address.longitude},15z"
                
                response_data['maps_data'] = {
                    'embed_url': embed_url,
                    'direct_url': direct_url
                }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except RawAccountAddress.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Address not found or access denied'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"Error getting formatted address: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
