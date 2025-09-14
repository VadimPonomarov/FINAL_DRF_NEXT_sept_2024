"""
Swagger schemas and documentation for ad contacts endpoints.
"""
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Contacts endpoints documentation
contacts_list_schema = swagger_auto_schema(
    operation_id='ad_contacts_list',
    operation_summary='List advertisement contacts',
    operation_description="""
    Retrieve a list of all contacts for a specific advertisement's account.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    
    ### Response:
    Returns a list of contact objects associated with the advertisement's account.
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
        200: 'Contacts retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['📞 Contacts']
)

contacts_create_schema = swagger_auto_schema(
    operation_id='ad_contacts_create',
    operation_summary='Create advertisement contact',
    operation_description="""
    Create a new contact for a specific advertisement's account.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    
    ### Request Body:
    Contact data including name, phone, email, and other details.
    
    ### Response:
    Returns the created contact object.
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
        201: 'Contact created successfully',
        400: 'Invalid contact data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Advertisement not found'
    },
    tags=['📞 Contacts']
)

contacts_retrieve_schema = swagger_auto_schema(
    operation_id='ad_contacts_retrieve',
    operation_summary='Retrieve advertisement contact',
    operation_description="""
    Retrieve detailed information about a specific contact.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    - `id` (integer): Unique identifier of the contact
    
    ### Response:
    Returns detailed contact information.
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
            'id',
            openapi.IN_PATH,
            description='Unique identifier of the contact',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: 'Contact retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Contact not found'
    },
    tags=['📞 Contacts']
)

contacts_update_schema = swagger_auto_schema(
    operation_id='ad_contacts_update',
    operation_summary='Update advertisement contact',
    operation_description="""
    Partially update an existing contact with new data.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    - `id` (integer): Unique identifier of the contact
    
    ### Request Body:
    Partial contact data to update.
    
    ### Response:
    Returns the updated contact object.
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
            'id',
            openapi.IN_PATH,
            description='Unique identifier of the contact',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: 'Contact updated successfully',
        400: 'Invalid contact data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Contact not found'
    },
    tags=['📞 Contacts']
)

contacts_delete_schema = swagger_auto_schema(
    operation_id='ad_contacts_delete',
    operation_summary='Delete advertisement contact',
    operation_description="""
    Delete a specific contact from an advertisement's account.
    
    ### Permissions:
    - User must be authenticated
    - User must own the advertisement
    
    ### Path Parameters:
    - `ad_pk` (integer): Unique identifier of the advertisement
    - `id` (integer): Unique identifier of the contact
    
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
            'id',
            openapi.IN_PATH,
            description='Unique identifier of the contact',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        204: 'Contact deleted successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Contact not found'
    },
    tags=['📞 Contacts']
)
