import logging

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.security.key_manager import key_manager

logger = logging.getLogger(__name__)


@swagger_auto_schema(
    method="get",
    operation_summary="❤️ Health Check",
    operation_description="Check the health status of the API server.",
    tags=["❤️ Health Check"],
    responses={200: "API is healthy and running"},
)
@api_view(["GET", "OPTIONS"])
@permission_classes([AllowAny])
def health_check(request):
    if request.method == "OPTIONS":
        response = Response()
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    return Response({"status": "healthy"})


@swagger_auto_schema(
    method="get",
    operation_summary="🗺️ Get Google Maps API Key",
    operation_description="Get Google Maps API key for authenticated users to display maps.",
    tags=["🔧 Configuration"],
    responses={
        200: openapi.Response(
            description="Google Maps API key retrieved successfully",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "api_key": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Google Maps API key"
                    ),
                    "available": openapi.Schema(
                        type=openapi.TYPE_BOOLEAN,
                        description="Whether API key is available",
                    ),
                    "message": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Status message"
                    ),
                },
            ),
        ),
        401: "Authentication required",
        500: "Internal server error",
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_maps_api_key(request):
    """
    Get Google Maps API key for authenticated users.

    Returns the Google Maps API key if available and properly configured.
    This endpoint requires authentication to prevent API key exposure.
    """
    try:
        logger.info(
            f"[GoogleMapsAPIKey] User {request.user.id} requesting Google Maps API key"
        )

        # Get Google Maps API key using key manager
        api_key = key_manager.google_maps_api_key

        if api_key and api_key != "YOUR_GOOGLE_MAPS_API_KEY_HERE":
            logger.info("[GoogleMapsAPIKey] ✅ Google Maps API key available")
            return Response(
                {
                    "api_key": api_key,
                    "available": True,
                    "message": "Google Maps API key available",
                }
            )
        else:
            logger.warning("[GoogleMapsAPIKey] ❌ Google Maps API key not configured")
            return Response(
                {
                    "api_key": None,
                    "available": False,
                    "message": "Google Maps API key not configured. Please set ENCRYPTED_GOOGLE_MAPS_API_KEY in environment.",
                }
            )

    except Exception as e:
        logger.error(f"[GoogleMapsAPIKey] ❌ Error retrieving Google Maps API key: {e}")
        return Response(
            {
                "api_key": None,
                "available": False,
                "message": f"Error retrieving Google Maps API key: {str(e)}",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
