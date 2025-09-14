from django.urls import path, re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

# Add this decorator to disable X-Frame-Options for Swagger UI views
from django.views.decorators.clickjacking import xframe_options_exempt
from functools import wraps

def xframe_options_exempt_sameorigin(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        resp = view_func(*args, **kwargs)
        resp['X-Frame-Options'] = 'SAMEORIGIN'
        return resp
    return xframe_options_exempt(wrapped_view)

# Create the base schema view
base_schema_view = get_schema_view(
    openapi.Info(
        title="Car Sales Platform API",
        default_version="v1",
        description="""
        # 🚗 Car Sales Platform API Documentation

        Complete API documentation for the car sales platform with comprehensive endpoints for:
        - User authentication and management
        - Car advertisements with advanced filtering
        - Reference data for cars, locations, and more
        - Admin tools for moderation and analytics

        ## 📋 API Organization

        The API is organized into logical groups using standardized tags:

        ### 🔐 Authentication & Users
        - **🔐 Authentication** - Login, registration, logout, token management
        - **👤 Users** - User profiles, settings, and personal data management

        ### 🏢 Account Management
        - **📍 Addresses** - Address CRUD operations with geocoding and validation
        - **📞 Contacts** - Phone numbers, emails, and contact details management

        ### 🚗 Car Advertisements
        - **🚗 Advertisements** - Car advertisements browsing, search, and management
        - **📸 Advertisement Images** - Image upload and management for car advertisements

        ### 🏷️ Car Reference Data
        - **🏷️ Car Marks** - Car manufacturers and brand information
        - **🚗 Car Models** - Car models and their specifications
        - **📅 Car Generations** - Car generations and model years
        - **⚙️ Car Modifications** - Car modifications and technical specifications
        - **🎨 Colors** - Available car colors and color options

        ### 🌍 Geographic Data
        - **🌍 Regions** - Geographic regions and administrative divisions
        - **🏙️ Cities** - Cities and location information

        ### 🚙 Vehicle Information
        - **🚙 Vehicle Types** - Vehicle categories and types

        ### 🔧 System
        - **❤️ Health Check** - System health monitoring and status checks
        - **🔧 API Utilities** - General API utilities and system endpoints
        """,
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="pvs.versia@gmail.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

# Create different views with appropriate UI and cache settings
schema_view = xframe_options_exempt_sameorigin(base_schema_view.with_ui('swagger', cache_timeout=0))
schema_json = xframe_options_exempt_sameorigin(base_schema_view.without_ui(cache_timeout=0))
redoc_view = xframe_options_exempt_sameorigin(base_schema_view.with_ui('redoc', cache_timeout=0))

# Custom view to handle both Swagger UI and OpenAPI schema requests
from django.http import JsonResponse

@csrf_exempt
def swagger_docs_view(request):
    """
    Custom view that handles both Swagger UI display and OpenAPI schema requests.
    This is a regular Django view that bypasses all DRF middleware and permissions.
    """
    format_param = request.GET.get('format')

    if format_param == 'openapi':
        # For OpenAPI schema, we need to temporarily bypass authentication
        # We'll create a mock request that passes authentication checks
        try:
            # Import here to avoid circular imports
            from django.contrib.auth.models import AnonymousUser
            from rest_framework.request import Request
            from rest_framework.test import APIRequestFactory

            # Create a mock authenticated request for schema generation
            factory = APIRequestFactory()
            mock_request = factory.get('/api/doc/?format=openapi')
            mock_request.user = AnonymousUser()  # Set anonymous user

            # Call the original schema_json view with mock request
            response = schema_json(mock_request)

            # Render the response first
            response.render()

            # Return the response content as JSON
            if hasattr(response, 'content'):
                import json
                return JsonResponse(json.loads(response.content.decode('utf-8')), safe=False)
            else:
                return response

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        # Return Swagger UI for regular requests
        return schema_view(request)

# Apply the same decorators
swagger_docs_view = xframe_options_exempt_sameorigin(swagger_docs_view)

urlpatterns = [
    # Swagger UI with OpenAPI schema support - handles both UI and ?format=openapi
    path(
        'api/doc/',
        swagger_docs_view,
        name='schema-swagger-ui',
    ),
    # Direct JSON/YAML schema endpoints
    re_path(
        r'^api/doc(?P<format>\.json|\.yaml)$',
        schema_json,
        name='schema-json',
    ),
    # ReDoc documentation
    path(
        'api/redoc/',
        redoc_view,
        name='schema-redoc',
    ),
]
