"""
Configuration API views for system settings and API keys.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from core.security.key_manager import key_manager

logger = logging.getLogger(__name__)


@swagger_auto_schema(
    method='get',
    operation_summary="🗺️ Get Google Maps API Key",
    operation_description="Get Google Maps API key for authenticated users to display maps.",
    tags=['🔧 Configuration'],
    responses={
        200: openapi.Response(
            description="Google Maps API key retrieved successfully",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'api_key': openapi.Schema(type=openapi.TYPE_STRING, description='Google Maps API key'),
                    'available': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Whether API key is available'),
                    'message': openapi.Schema(type=openapi.TYPE_STRING, description='Status message'),
                }
            )
        ),
        401: "Authentication required",
        500: "Internal server error"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_maps_api_key(request):
    """
    Get Google Maps API key for authenticated users.
    
    Returns the Google Maps API key if available and properly configured.
    This endpoint requires authentication to prevent API key exposure.
    """
    try:
        logger.info(f"[GoogleMapsAPIKey] User {request.user.id} requesting Google Maps API key")
        
        # Get Google Maps API key using key manager
        api_key = key_manager.google_maps_api_key
        
        if api_key and api_key != 'YOUR_GOOGLE_MAPS_API_KEY_HERE':
            logger.info("[GoogleMapsAPIKey] ✅ Google Maps API key available")
            return Response({
                'api_key': api_key,
                'available': True,
                'message': 'Google Maps API key available'
            })
        else:
            logger.warning("[GoogleMapsAPIKey] ❌ Google Maps API key not configured")
            return Response({
                'api_key': None,
                'available': False,
                'message': 'Google Maps API key not configured. Please set ENCRYPTED_GOOGLE_MAPS_API_KEY in environment.'
            })
            
    except Exception as e:
        logger.error(f"[GoogleMapsAPIKey] ❌ Error retrieving Google Maps API key: {e}")
        return Response({
            'api_key': None,
            'available': False,
            'message': f'Error retrieving Google Maps API key: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='get',
    operation_summary="🔧 Get System Configuration",
    operation_description="Get system configuration and feature availability.",
    tags=['🔧 Configuration'],
    responses={
        200: openapi.Response(
            description="System configuration retrieved successfully",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'google_maps': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'available': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            'message': openapi.Schema(type=openapi.TYPE_STRING),
                        }
                    ),
                    'features': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'geocoding': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            'maps': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        }
                    ),
                }
            )
        ),
        401: "Authentication required"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_config(request):
    """
    Get system configuration and feature availability.
    
    Returns information about available features and their configuration status.
    """
    try:
        logger.info(f"[SystemConfig] User {request.user.id} requesting system configuration")
        
        # Check Google Maps API key availability
        google_maps_key = key_manager.google_maps_api_key
        google_maps_available = bool(google_maps_key and google_maps_key != 'YOUR_GOOGLE_MAPS_API_KEY_HERE')
        
        config = {
            'google_maps': {
                'available': google_maps_available,
                'message': 'Google Maps API configured' if google_maps_available else 'Google Maps API not configured'
            },
            'features': {
                'geocoding': google_maps_available,
                'maps': google_maps_available,
            }
        }
        
        logger.info(f"[SystemConfig] ✅ System configuration retrieved: {config}")
        return Response(config)
        
    except Exception as e:
        logger.error(f"[SystemConfig] ❌ Error retrieving system configuration: {e}")
        return Response({
            'error': f'Error retrieving system configuration: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
