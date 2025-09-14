"""
Swagger schemas and documentation for ad images endpoints.
"""
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Images endpoints documentation
images_list_schema = swagger_auto_schema(
    operation_id='ad_images_list',
    operation_summary='List advertisement images',
    operation_description="""
    Retrieve a list of all images for a specific advertisement.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    
    ### Response:
    Returns a list of image objects associated with the advertisement.
    """,
    manual_parameters=[
        openapi.Parameter(
            'ad_pk',
            openapi.IN_PATH,
            description='Unique identifier of the advertisement',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: 'Images retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['📸 Advertisement Images']
)

images_create_schema = swagger_auto_schema(
    operation_id='ad_images_create',
    operation_summary='Upload advertisement image',
    operation_description="""
    Upload a new image for a specific advertisement.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    
    ### Request Body:
    Multipart form data with image file and optional metadata.
    
    ### Response:
    Returns the created image object.
    """,
    manual_parameters=[
        openapi.Parameter(
            'ad_pk',
            openapi.IN_PATH,
            description='Unique identifier of the advertisement',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    consumes=['multipart/form-data'],
    responses={
        201: 'Image uploaded successfully',
        400: 'Invalid image data or file format',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['📸 Advertisement Images']
)

images_retrieve_schema = swagger_auto_schema(
    operation_id='ad_images_retrieve',
    operation_summary='Retrieve advertisement image',
    operation_description="""
    Retrieve detailed information about a specific advertisement image.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    - `pk` (integer): Unique identifier of the image
    
    ### Response:
    Returns detailed image information.
    """,
    manual_parameters=[
        openapi.Parameter(
            'ad_pk',
            openapi.IN_PATH,
            description='Unique identifier of the advertisement',
            type=openapi.TYPE_INTEGER,
            required=True
        ),
        openapi.Parameter(
            'pk',
            openapi.IN_PATH,
            description='Unique identifier of the image',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: 'Image retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Image not found'
    },
    tags=['📸 Advertisement Images']
)

images_delete_schema = swagger_auto_schema(
    operation_id='ad_images_delete',
    operation_summary='Delete advertisement image',
    operation_description="""
    Delete a specific image from an advertisement.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    - `pk` (integer): Unique identifier of the image
    
    ### Response:
    Returns 204 No Content on successful deletion.
    """,
    manual_parameters=[
        openapi.Parameter(
            'ad_pk',
            openapi.IN_PATH,
            description='Unique identifier of the advertisement',
            type=openapi.TYPE_INTEGER,
            required=True
        ),
        openapi.Parameter(
            'pk',
            openapi.IN_PATH,
            description='Unique identifier of the image',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        204: 'Image deleted successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Image not found'
    },
    tags=['📸 Advertisement Images']
)
