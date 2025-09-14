"""
OpenAPI schemas for car reference endpoints using drf_yasg.
All schemas follow canonical structure with standardized tags and parameters.
"""
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from core.schemas.common_schemas import (
    CANONICAL_TAGS, COMMON_RESPONSES, NO_AUTH,
    SEARCH_PARAM, ORDERING_PARAM, IS_POPULAR_PARAM, PK_PARAM,
    get_list_responses, get_detail_responses, get_create_responses,
    get_update_responses, get_delete_responses
)

# Specific parameters for car reference endpoints
mark_id_param = openapi.Parameter(
    'mark_id',
    openapi.IN_QUERY,
    description='Filter by mark ID',
    type=openapi.TYPE_INTEGER,
    required=False
)

model_id_param = openapi.Parameter(
    'model_id',
    openapi.IN_QUERY,
    description='Filter by model ID',
    type=openapi.TYPE_INTEGER,
    required=False
)


# Car Marks schemas
car_marks_list_schema = swagger_auto_schema(
    operation_summary="🏷️ Browse Car Brands",
    operation_description="Get a paginated list of all car marks (manufacturers) with optional filtering.",
    manual_parameters=[IS_POPULAR_PARAM, SEARCH_PARAM, ORDERING_PARAM],
    tags=[CANONICAL_TAGS['CAR_MARKS']],
    responses=get_list_responses(),
    security=NO_AUTH
)

car_marks_retrieve_schema = swagger_auto_schema(
    operation_summary="🔍 View Brand Details",
    operation_description="Get detailed information about a specific car mark including models count.",
    tags=['🏷️ Car Marks']
)

car_marks_create_schema = swagger_auto_schema(
    operation_summary="Create car mark",
    operation_description="Create a new car mark.",
    tags=['🏷️ Car Marks']
)

car_marks_update_schema = swagger_auto_schema(
    operation_summary="Update car mark",
    operation_description="Update an existing car mark.",
    tags=['🏷️ Car Marks']
)

car_marks_delete_schema = swagger_auto_schema(
    operation_summary="Delete car mark",
    operation_description="Delete a car mark.",
    tags=['🏷️ Car Marks']
)

car_marks_popular_schema = swagger_auto_schema(
    operation_summary="Get popular car marks",
    operation_description="Get a list of popular car marks only.",
    tags=['🏷️ Car Marks']
)

car_marks_choices_schema = swagger_auto_schema(
    operation_summary="Get car mark choices",
    operation_description="Get simplified car mark data for form dropdowns.",
    tags=['🏷️ Car Marks']
)

car_marks_with_models_schema = swagger_auto_schema(
    operation_summary="Get car mark with models",
    operation_description="Get a car mark with all its associated models.",
    tags=['🏷️ Car Marks']
)


# Car Models schemas
car_models_list_schema = swagger_auto_schema(
    operation_summary="🚙 Browse Car Models",
    operation_description="Get a paginated list of all car models with optional filtering by mark.",
    manual_parameters=[mark_id_param, IS_POPULAR_PARAM, SEARCH_PARAM, ORDERING_PARAM],
    tags=['🚗 Car Models']
)

car_models_retrieve_schema = swagger_auto_schema(
    operation_summary="🔍 View Model Details",
    operation_description="Get detailed information about a specific car model including generations count.",
    tags=['🚗 Car Models']
)

car_models_create_schema = swagger_auto_schema(
    operation_summary="Create car model",
    operation_description="Create a new car model.",
    tags=['🚗 Car Models']
)

car_models_update_schema = swagger_auto_schema(
    operation_summary="Update car model",
    operation_description="Update an existing car model.",
    tags=['🚗 Car Models']
)

car_models_delete_schema = swagger_auto_schema(
    operation_summary="Delete car model",
    operation_description="Delete a car model.",
    tags=['🚗 Car Models']
)

car_models_by_mark_schema = swagger_auto_schema(
    operation_summary="Get models by mark",
    operation_description="Get all models for a specific car mark.",
    manual_parameters=[
        openapi.Parameter(
            'mark_id',
            openapi.IN_QUERY,
            description='Mark ID (required)',
            type=openapi.TYPE_INTEGER,
            required=True
        ),
    ],
    tags=['🚗 Car Models']
)

car_models_popular_schema = swagger_auto_schema(
    operation_summary="Get popular car models",
    operation_description="Get a list of popular car models only.",
    tags=['🚗 Car Models']
)

car_models_choices_schema = swagger_auto_schema(
    operation_summary="Get car model choices",
    operation_description="Get simplified car model data for form dropdowns.",
    manual_parameters=[mark_id_param],
    tags=['🚗 Car Models']
)

car_models_with_generations_schema = swagger_auto_schema(
    operation_summary="Get car model with generations",
    operation_description="Get a car model with all its associated generations.",
    tags=['🚗 Car Models']
)


# Car Colors schemas
car_colors_list_schema = swagger_auto_schema(
    operation_summary="🎨 Browse Available Colors",
    operation_description="Get a paginated list of all car colors with optional filtering.",
    manual_parameters=[
        IS_POPULAR_PARAM,
        SEARCH_PARAM,
        ORDERING_PARAM,
        openapi.Parameter(
            'is_metallic',
            openapi.IN_QUERY,
            description='Filter by metallic colors only',
            type=openapi.TYPE_BOOLEAN
        ),
        openapi.Parameter(
            'is_pearlescent',
            openapi.IN_QUERY,
            description='Filter by pearlescent colors only',
            type=openapi.TYPE_BOOLEAN
        ),
    ],
    tags=['🎨 Colors']
)

car_colors_retrieve_schema = swagger_auto_schema(
    operation_summary="Get car color details",
    operation_description="Get detailed information about a specific car color.",
    tags=['🎨 Colors']
)

car_colors_create_schema = swagger_auto_schema(
    operation_summary="Create car color",
    operation_description="Create a new car color.",
    tags=['🎨 Colors']
)

car_colors_update_schema = swagger_auto_schema(
    operation_summary="Update car color",
    operation_description="Update an existing car color.",
    tags=['🎨 Colors']
)

car_colors_delete_schema = swagger_auto_schema(
    operation_summary="Delete car color",
    operation_description="Delete a car color.",
    tags=['🎨 Colors']
)

car_colors_popular_schema = swagger_auto_schema(
    operation_summary="Get popular car colors",
    operation_description="Get a list of popular car colors only.",
    tags=['🎨 Colors']
)

car_colors_choices_schema = swagger_auto_schema(
    operation_summary="Get car color choices",
    operation_description="Get simplified car color data for form dropdowns.",
    tags=['🎨 Colors']
)


# Car Generations schemas
car_generations_list_schema = swagger_auto_schema(
    operation_summary="📅 Browse Car Generations",
    operation_description="Get a paginated list of all car generations with optional filtering by model.",
    manual_parameters=[
        model_id_param,
        SEARCH_PARAM,
        ORDERING_PARAM,
        openapi.Parameter(
            'year_start',
            openapi.IN_QUERY,
            description='Filter by start year',
            type=openapi.TYPE_INTEGER
        ),
        openapi.Parameter(
            'year_end',
            openapi.IN_QUERY,
            description='Filter by end year',
            type=openapi.TYPE_INTEGER
        ),
    ],
    tags=['📅 Car Generations']
)

car_generations_retrieve_schema = swagger_auto_schema(
    operation_summary="📅 Get Car Generation Details",
    operation_description="Get detailed information about a specific car generation including modifications count.",
    tags=['📅 Car Generations']
)

car_generations_create_schema = swagger_auto_schema(
    operation_summary="📅 Create Car Generation",
    operation_description="Create a new car generation.",
    tags=['📅 Car Generations']
)

car_generations_update_schema = swagger_auto_schema(
    operation_summary="📅 Update Car Generation",
    operation_description="Update an existing car generation.",
    tags=['📅 Car Generations']
)

car_generations_delete_schema = swagger_auto_schema(
    operation_summary="📅 Delete Car Generation",
    operation_description="Delete a car generation.",
    tags=['📅 Car Generations']
)

car_generations_by_model_schema = swagger_auto_schema(
    operation_summary="Get generations by model",
    operation_description="Get all generations for a specific car model.",
    manual_parameters=[
        openapi.Parameter(
            'model_id',
            openapi.IN_QUERY,
            description='Model ID (required)',
            type=openapi.TYPE_INTEGER,
            required=True
        ),
    ],
    tags=['📅 Car Generations']
)

car_generations_with_modifications_schema = swagger_auto_schema(
    operation_summary="📅 Get Car Generation with Modifications",
    operation_description="Get a car generation with all its associated modifications.",
    tags=['📅 Car Generations']
)


# Car Modifications schemas
car_modifications_list_schema = swagger_auto_schema(
    operation_summary="⚙️ Browse Car Modifications",
    operation_description="Get a paginated list of all car modifications with optional filtering by generation.",
    manual_parameters=[
        openapi.Parameter(
            'generation_id',
            openapi.IN_QUERY,
            description='Filter by generation ID',
            type=openapi.TYPE_INTEGER
        ),
        openapi.Parameter(
            'engine_type',
            openapi.IN_QUERY,
            description='Filter by engine type',
            type=openapi.TYPE_STRING
        ),
        openapi.Parameter(
            'transmission',
            openapi.IN_QUERY,
            description='Filter by transmission type',
            type=openapi.TYPE_STRING
        ),
        openapi.Parameter(
            'drive_type',
            openapi.IN_QUERY,
            description='Filter by drive type',
            type=openapi.TYPE_STRING
        ),
        SEARCH_PARAM,
        ORDERING_PARAM,
    ],
    tags=['⚙️ Car Modifications']
)

car_modifications_retrieve_schema = swagger_auto_schema(
    operation_summary="⚙️ Get Car Modification Details",
    operation_description="Get detailed information about a specific car modification.",
    tags=['⚙️ Car Modifications']
)

car_modifications_create_schema = swagger_auto_schema(
    operation_summary="⚙️ Create Car Modification",
    operation_description="Create a new car modification.",
    tags=['⚙️ Car Modifications']
)

car_modifications_update_schema = swagger_auto_schema(
    operation_summary="⚙️ Update Car Modification",
    operation_description="Update an existing car modification.",
    tags=['⚙️ Car Modifications']
)

car_modifications_delete_schema = swagger_auto_schema(
    operation_summary="⚙️ Delete Car Modification",
    operation_description="Delete a car modification.",
    tags=['⚙️ Car Modifications']
)

car_modifications_by_generation_schema = swagger_auto_schema(
    operation_summary="⚙️ Get Modifications by Generation",
    operation_description="Get all modifications for a specific car generation.",
    manual_parameters=[
        openapi.Parameter(
            'generation_id',
            openapi.IN_QUERY,
            description='Generation ID (required)',
            type=openapi.TYPE_INTEGER,
            required=True
        ),
    ],
    tags=['⚙️ Car Modifications']
)
