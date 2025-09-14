"""
Common Swagger schemas and parameters used across all applications.
This file contains reusable components to avoid duplication.
"""
from drf_yasg import openapi

# Common HTTP responses
COMMON_RESPONSES = {
    200: "Success",
    201: "Created successfully",
    204: "No content",
    400: "Bad request - Invalid input data",
    401: "Authentication credentials were not provided",
    403: "You do not have permission to perform this action",
    404: "Not found",
    500: "Internal server error"
}

# Authentication responses
AUTH_RESPONSES = {
    **COMMON_RESPONSES,
    401: "Invalid credentials or token expired",
    403: "Account is inactive or insufficient permissions"
}

# Common query parameters
SEARCH_PARAM = openapi.Parameter(
    'search',
    openapi.IN_QUERY,
    description='Search by name or other text fields',
    type=openapi.TYPE_STRING,
    required=False
)

ORDERING_PARAM = openapi.Parameter(
    'ordering',
    openapi.IN_QUERY,
    description='Order results by field. Use "-" prefix for descending order',
    type=openapi.TYPE_STRING,
    required=False
)

PAGE_PARAM = openapi.Parameter(
    'page',
    openapi.IN_QUERY,
    description='Page number for pagination',
    type=openapi.TYPE_INTEGER,
    required=False
)

PAGE_SIZE_PARAM = openapi.Parameter(
    'page_size',
    openapi.IN_QUERY,
    description='Number of results per page (max 100)',
    type=openapi.TYPE_INTEGER,
    required=False
)

IS_POPULAR_PARAM = openapi.Parameter(
    'is_popular',
    openapi.IN_QUERY,
    description='Filter by popular items only',
    type=openapi.TYPE_BOOLEAN,
    required=False
)

# Common path parameters
ID_PARAM = openapi.Parameter(
    'id',
    openapi.IN_PATH,
    description='Unique identifier',
    type=openapi.TYPE_INTEGER,
    required=True
)

PK_PARAM = openapi.Parameter(
    'pk',
    openapi.IN_PATH,
    description='Primary key identifier',
    type=openapi.TYPE_INTEGER,
    required=True
)

# Security definitions
NO_AUTH = []  # For public endpoints

# Common tags with emojis (canonical list)
CANONICAL_TAGS = {
    'AUTHENTICATION': '🔐 Authentication',
    'USERS': '👤 Users',
    'ADDRESSES': '📍 Addresses',
    'CONTACTS': '📞 Contacts',
    'ADVERTISEMENTS': '🚗 Advertisements',
    'ADVERTISEMENT_IMAGES': '📸 Advertisement Images',
    'CAR_MARKS': '🏷️ Car Marks',
    'CAR_MODELS': '🚗 Car Models',
    'CAR_GENERATIONS': '📅 Car Generations',
    'CAR_MODIFICATIONS': '⚙️ Car Modifications',
    'COLORS': '🎨 Colors',
    'REGIONS': '🌍 Regions',
    'CITIES': '🏙️ Cities',
    'VEHICLE_TYPES': '🚙 Vehicle Types',
    'CURRENCY': '💱 Currency',
    'HEALTH_CHECK': '❤️ Health Check',
    'API_UTILITIES': '🔧 API Utilities'
}

# Common schema examples
PAGINATION_EXAMPLE = {
    "count": 150,
    "next": "http://localhost:8000/api/endpoint/?page=2",
    "previous": None,
    "results": []
}

ERROR_EXAMPLE = {
    "detail": "Error message description",
    "code": "error_code"
}

VALIDATION_ERROR_EXAMPLE = {
    "field_name": ["This field is required."],
    "another_field": ["Invalid value provided."]
}

# Common request/response schemas
PAGINATION_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'count': openapi.Schema(type=openapi.TYPE_INTEGER, description='Total number of items'),
        'next': openapi.Schema(type=openapi.TYPE_STRING, description='URL to next page'),
        'previous': openapi.Schema(type=openapi.TYPE_STRING, description='URL to previous page'),
        'results': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
    }
)

ERROR_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'detail': openapi.Schema(type=openapi.TYPE_STRING, description='Error message'),
        'code': openapi.Schema(type=openapi.TYPE_STRING, description='Error code')
    }
)

VALIDATION_ERROR_SCHEMA = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    additional_properties=openapi.Schema(
        type=openapi.TYPE_ARRAY,
        items=openapi.Schema(type=openapi.TYPE_STRING)
    )
)

# Helper functions
def get_list_responses(item_schema=None):
    """Get standard responses for list endpoints."""
    responses = {
        200: PAGINATION_SCHEMA if item_schema else "Success",
        400: VALIDATION_ERROR_SCHEMA,
        401: ERROR_SCHEMA,
        403: ERROR_SCHEMA,
    }
    return responses

def get_detail_responses(item_schema=None):
    """Get standard responses for detail endpoints."""
    responses = {
        200: item_schema if item_schema else "Success",
        400: VALIDATION_ERROR_SCHEMA,
        401: ERROR_SCHEMA,
        403: ERROR_SCHEMA,
        404: ERROR_SCHEMA,
    }
    return responses

def get_create_responses(item_schema=None):
    """Get standard responses for create endpoints."""
    responses = {
        201: item_schema if item_schema else "Created successfully",
        400: VALIDATION_ERROR_SCHEMA,
        401: ERROR_SCHEMA,
        403: ERROR_SCHEMA,
    }
    return responses

def get_update_responses(item_schema=None):
    """Get standard responses for update endpoints."""
    responses = {
        200: item_schema if item_schema else "Updated successfully",
        400: VALIDATION_ERROR_SCHEMA,
        401: ERROR_SCHEMA,
        403: ERROR_SCHEMA,
        404: ERROR_SCHEMA,
    }
    return responses

def get_delete_responses():
    """Get standard responses for delete endpoints."""
    responses = {
        204: "Deleted successfully",
        401: ERROR_SCHEMA,
        403: ERROR_SCHEMA,
        404: ERROR_SCHEMA,
    }
    return responses
