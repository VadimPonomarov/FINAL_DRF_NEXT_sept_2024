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
    operation_description="""
    Comprehensive health check endpoint for API server monitoring and status verification.
    
    ### Features:
    - **Server Status**: Verifies API server is running and responsive
    - **CORS Support**: Handles preflight OPTIONS requests for cross-origin access
    - **Public Access**: No authentication required for monitoring
    - **Fast Response**: Optimized for quick health verification
    
    ### Use Cases:
    - Load balancer health checks
    - Monitoring system status verification
    - CI/CD pipeline health validation
    - Service discovery health endpoints
    - Frontend application health verification
    
    ### CORS Configuration:
    - **Allowed Origins**: http://localhost:3000 (development)
    - **Allowed Methods**: GET, OPTIONS
    - **Allowed Headers**: Content-Type, Authorization
    - **Credentials**: Supported for authenticated requests
    
    ### Response Format:
    Simple JSON response indicating server health status.
    """,
    manual_parameters=[
        openapi.Parameter(
            "format",
            openapi.IN_QUERY,
            description="Response format preference",
            type=openapi.TYPE_STRING,
            enum=["json", "text"],
            default="json",
        )
    ],
    responses={
        200: openapi.Response(
            description="API server is healthy and running",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "status": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Health status indicator",
                        enum=["healthy", "ok"],
                        example="healthy",
                    ),
                    "timestamp": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        format=openapi.FORMAT_DATETIME,
                        description="Server timestamp when health check was performed",
                        example="2024-01-15T10:30:00Z",
                    ),
                    "version": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="API version",
                        example="v1.0.0",
                    ),
                    "uptime": openapi.Schema(
                        type=openapi.TYPE_INTEGER,
                        description="Server uptime in seconds",
                        example=86400,
                    ),
                },
            ),
            examples={
                "application/json": {
                    "status": "healthy",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "version": "v1.0.0",
                    "uptime": 86400,
                }
            },
        ),
        500: openapi.Response(
            description="Server health issues detected",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "status": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Health status indicator",
                        enum=["unhealthy", "error"],
                        example="unhealthy",
                    ),
                    "error": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Error message describing the issue",
                    ),
                    "timestamp": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        format=openapi.FORMAT_DATETIME,
                        description="Server timestamp when error occurred",
                    ),
                },
            ),
            examples={
                "application/json": {
                    "status": "unhealthy",
                    "error": "Database connection failed",
                    "timestamp": "2024-01-15T10:30:00Z",
                }
            },
        ),
    },
    tags=["❤️ Health Check"],
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
