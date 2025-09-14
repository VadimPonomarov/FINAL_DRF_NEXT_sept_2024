"""
Swagger schemas and documentation for accounts endpoints.
"""
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Common parameters
account_id_param = openapi.Parameter(
    'pk',
    openapi.IN_PATH,
    description='Unique identifier of the account',
    type=openapi.TYPE_INTEGER,
    required=True
)

# Accounts endpoints documentation
accounts_list_schema = swagger_auto_schema(
    operation_id='accounts_list',
    operation_summary='📋 List My Accounts',
    operation_description="""
    Retrieve a list of all accounts for the authenticated user.
    
    ### Permissions:
    - User must be authenticated
    - User can only see their own accounts
    
    ### Response:
    Returns a list of account objects with related contacts and addresses.
    """,
    responses={
        200: 'Accounts retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action'
    },
    tags=['🏢 Account Management']
)

accounts_create_schema = swagger_auto_schema(
    operation_id='accounts_create',
    operation_summary='➕ Create New Account',
    operation_description="""
    Create a new account for the authenticated user.
    
    ### Permissions:
    - User must be authenticated
    - The authenticated user will be set as the owner of the account
    
    ### Request Body:
    Account data including name, description, and other details.
    
    ### Response:
    Returns the created account object.
    """,
    responses={
        201: 'Account created successfully',
        400: 'Invalid account data',
        401: 'Authentication credentials were not provided'
    },
    tags=['🏢 Account Management']
)

accounts_retrieve_schema = swagger_auto_schema(
    operation_id='accounts_retrieve',
    operation_summary='🔍 Get Account Details',
    operation_description="""
    Retrieve detailed information about a specific account.
    
    ### Permissions:
    - User must be authenticated
    - User must own the account
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the account
    
    ### Response:
    Returns detailed account information.
    """,
    manual_parameters=[account_id_param],
    responses={
        200: 'Account retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Account not found'
    },
    tags=['🏢 Account Management']
)

accounts_update_schema = swagger_auto_schema(
    operation_id='accounts_update',
    operation_summary='Update user account',
    operation_description="""
    Update an existing account with new data.
    
    ### Permissions:
    - User must be authenticated
    - User must own the account
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the account
    
    ### Request Body:
    Updated account data.
    
    ### Response:
    Returns the updated account object.
    """,
    manual_parameters=[account_id_param],
    responses={
        200: 'Account updated successfully',
        400: 'Invalid account data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Account not found'
    },
    tags=['🏢 Account Management']
)

accounts_partial_update_schema = swagger_auto_schema(
    operation_id='accounts_partial_update',
    operation_summary='Partially update user account',
    operation_description="""
    Partially update an existing account with new data.

    ### Permissions:
    - User must be authenticated
    - User must own the account

    ### Path Parameters:
    - `pk` (integer): Unique identifier of the account

    ### Request Body:
    Partial account data to update. Only include the fields you want to change.

    ### Response:
    Returns the updated account object.
    """,
    manual_parameters=[account_id_param],
    responses={
        200: 'Account updated successfully',
        400: 'Invalid account data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Account not found'
    },
    tags=['🏢 Account Management']
)

accounts_delete_schema = swagger_auto_schema(
    operation_id='accounts_delete',
    operation_summary='Delete user account',
    operation_description="""
    Delete an existing account.
    
    ### Permissions:
    - User must be authenticated
    - User must own the account
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the account
    
    ### Response:
    Returns 204 No Content on successful deletion.
    """,
    manual_parameters=[account_id_param],
    responses={
        204: 'Account deleted successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'Account not found'
    },
    tags=['🏢 Account Management']
)
