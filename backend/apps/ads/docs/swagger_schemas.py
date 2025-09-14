"""
Swagger schemas and documentation for ads endpoints.
"""
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Common parameters
ad_id_param = openapi.Parameter(
    'pk',
    openapi.IN_PATH,
    description='Unique identifier of the advertisement',
    type=openapi.TYPE_INTEGER,
    required=True
)

ad_pk_param = openapi.Parameter(
    'ad_pk',
    openapi.IN_PATH,
    description='Unique identifier of the advertisement',
    type=openapi.TYPE_INTEGER,
    required=True
)

image_id_param = openapi.Parameter(
    'pk',
    openapi.IN_PATH,
    description='Unique identifier of the image',
    type=openapi.TYPE_INTEGER,
    required=True
)

contact_id_param = openapi.Parameter(
    'id',
    openapi.IN_PATH,
    description='Unique identifier of the contact',
    type=openapi.TYPE_INTEGER,
    required=True
)

# Query parameters for filtering
account_id_param = openapi.Parameter(
    'account_id',
    openapi.IN_QUERY,
    description='Filter ads by account ID',
    type=openapi.TYPE_INTEGER,
    required=False
)

is_active_param = openapi.Parameter(
    'is_active',
    openapi.IN_QUERY,
    description='Filter ads by active status',
    type=openapi.TYPE_BOOLEAN,
    required=False
)

# Ads endpoints documentation
ads_list_schema = swagger_auto_schema(
    operation_id='ads_list',
    operation_summary='List advertisements',
    operation_description="""
    Retrieve a paginated list of advertisements for the authenticated user.
    
    ### Permissions:
    - User must be authenticated
    - User can only see their own ads
    
    ### Query Parameters:
    - `account_id` (integer, optional): Filter ads by specific account
    - `is_active` (boolean, optional): Filter by active status
    
    ### Response:
    Returns a paginated list of advertisement objects.
    """,
    manual_parameters=[account_id_param, is_active_param],
    responses={
        200: 'List of advertisements retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action'
    },
    tags=['🚗 Advertisements']
)

ads_create_schema = swagger_auto_schema(
    operation_id='ads_create',
    operation_summary='Create advertisement',
    operation_description="""
    Create a new advertisement for the authenticated user.
    
    ### Permissions:
    - User must be authenticated
    - User must own the specified account
    
    ### Request Body:
    Advertisement data including title, description, price, and other details.
    
    ### Response:
    Returns the created advertisement object.
    """,
    responses={
        201: 'Advertisement created successfully',
        400: 'Invalid input data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action'
    },
    tags=['🚗 Advertisements']
)

ads_retrieve_schema = swagger_auto_schema(
    operation_id='ads_retrieve',
    operation_summary='Retrieve advertisement',
    operation_description="""
    Retrieve detailed information about a specific advertisement.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the advertisement
    
    ### Response:
    Returns detailed advertisement information.
    """,
    manual_parameters=[ad_id_param],
    responses={
        200: 'Advertisement retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['🚗 Advertisements']
)

ads_update_schema = swagger_auto_schema(
    operation_id='ads_update',
    operation_summary='Update advertisement',
    operation_description="""
    Update an existing advertisement with new data.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the advertisement
    
    ### Request Body:
    Updated advertisement data.
    
    ### Response:
    Returns the updated advertisement object.
    """,
    manual_parameters=[ad_id_param],
    responses={
        200: 'Advertisement updated successfully',
        400: 'Invalid input data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['🚗 Advertisements']
)

ads_partial_update_schema = swagger_auto_schema(
    operation_id='ads_partial_update',
    operation_summary='Partially update advertisement',
    operation_description="""
    Partially update an existing advertisement with new data.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the advertisement
    
    ### Request Body:
    Partial advertisement data to update.
    
    ### Response:
    Returns the updated advertisement object.
    """,
    manual_parameters=[ad_id_param],
    responses={
        200: 'Advertisement updated successfully',
        400: 'Invalid input data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['🚗 Advertisements']
)

ads_delete_schema = swagger_auto_schema(
    operation_id='ads_delete',
    operation_summary='Delete advertisement',
    operation_description="""
    Delete an existing advertisement.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the advertisement
    
    ### Response:
    Returns 204 No Content on successful deletion.
    """,
    manual_parameters=[ad_id_param],
    responses={
        204: 'Advertisement deleted successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['🚗 Advertisements']
)

ads_publish_schema = swagger_auto_schema(
    operation_id='ads_publish',
    operation_summary='Toggle advertisement publication status',
    operation_description="""
    Publish or unpublish an advertisement by toggling its active status.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_id` (integer): Unique identifier of the advertisement
    
    ### Response:
    Returns success message with new publication status.
    """,
    manual_parameters=[
        openapi.Parameter(
            'ad_id',
            openapi.IN_PATH,
            description='Unique identifier of the advertisement',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: 'Advertisement publication status updated successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['🚗 Advertisements']
)
