"""
Swagger schemas and documentation for users endpoints.
"""
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Common parameters
user_id_param = openapi.Parameter(
    'pk',
    openapi.IN_PATH,
    description='Unique identifier of the user',
    type=openapi.TYPE_INTEGER,
    required=True
)

# Query parameters for filtering
email_param = openapi.Parameter(
    'email',
    openapi.IN_QUERY,
    description='Filter users by email address',
    type=openapi.TYPE_STRING,
    required=False
)

is_active_param = openapi.Parameter(
    'is_active',
    openapi.IN_QUERY,
    description='Filter users by active status',
    type=openapi.TYPE_BOOLEAN,
    required=False
)

# Users endpoints documentation
users_list_schema = swagger_auto_schema(
    operation_id='users_list',
    operation_summary='👥 List All Users',
    operation_description="""
    Retrieve a paginated list of users with filtering and pagination.
    
    ### Permissions:
    - User must be authenticated
    - Only admin users can access this endpoint
    
    ### Query Parameters:
    - `email` (string, optional): Filter users by email address
    - `is_active` (boolean, optional): Filter by active status
    
    ### Response:
    Returns a paginated list of user objects.
    """,
    manual_parameters=[email_param, is_active_param],
    responses={
        200: 'Users retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action'
    },
    tags=['👤 Users']
)

users_create_schema = swagger_auto_schema(
    operation_id='users_create',
    operation_summary='➕ Create New User',
    operation_description="""
    Create a new user account with profile data and optional avatar upload.
    
    ### Permissions:
    - No authentication required (public registration)
    
    ### Request Body:
    User data including email, password, and profile information.
    Supports multipart form data for avatar file uploads.
    
    ### Response:
    Returns the created user object.
    """,
    consumes=['multipart/form-data'],
    responses={
        201: 'User created successfully',
        400: 'Invalid user data or duplicate email',
        500: 'Internal server error'
    },
    tags=['👤 Users']
)

users_retrieve_schema = swagger_auto_schema(
    operation_id='users_retrieve',
    operation_summary='Retrieve user details',
    operation_description="""
    Retrieve detailed information about a specific user.
    
    ### Permissions:
    - User must be authenticated
    - User can only access their own details or admin can access any user
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the user
    
    ### Response:
    Returns detailed user information.
    """,
    manual_parameters=[user_id_param],
    responses={
        200: 'User retrieved successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'User not found'
    },
    tags=['👤 Users']
)

users_update_schema = swagger_auto_schema(
    operation_id='users_update',
    operation_summary='✏️ Update User Profile',
    operation_description="""
    Update an existing user with new data (full update).
    
    ### Permissions:
    - User must be authenticated
    - User can only update their own information unless they are superusers
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the user
    
    ### Request Body:
    Complete user data for update.
    
    ### Response:
    Returns the updated user object.
    """,
    manual_parameters=[user_id_param],
    responses={
        200: 'User updated successfully',
        400: 'Invalid user data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'User not found'
    },
    tags=['👤 Users']
)

users_partial_update_schema = swagger_auto_schema(
    operation_id='users_partial_update',
    operation_summary='Partially update user',
    operation_description="""
    Partially update an existing user with new data.
    
    ### Permissions:
    - User must be authenticated
    - User can only update their own information unless they are superusers
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the user
    
    ### Request Body:
    Partial user data to update, including avatar file uploads.
    
    ### Response:
    Returns the updated user object.
    """,
    manual_parameters=[user_id_param],
    consumes=['multipart/form-data'],
    responses={
        200: 'User updated successfully',
        400: 'Invalid user data',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'User not found'
    },
    tags=['👤 Users']
)

users_delete_schema = swagger_auto_schema(
    operation_id='users_delete',
    operation_summary='🗑️ Delete User Account',
    operation_description="""
    Delete an existing user account.
    
    ### Permissions:
    - User must be authenticated
    - User can only delete their own account unless they are superusers
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the user
    
    ### Response:
    Returns 204 No Content on successful deletion.
    """,
    manual_parameters=[user_id_param],
    responses={
        204: 'User deleted successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'User not found'
    },
    tags=['👤 Users']
)

# User activation schema
users_activate_schema = swagger_auto_schema(
    operation_id='users_activate',
    operation_summary='Activate user account',
    operation_description="""
    Activate a user account using an activation token.
    
    ### Permissions:
    - No authentication required
    
    ### Request Body:
    Activation token received via email.
    
    ### Response:
    Returns success message on successful activation.
    """,
    responses={
        200: 'User activated successfully',
        400: 'Invalid or expired activation token',
        404: 'User not found'
    },
    tags=['👤 Users']
)

# Password reset schemas
users_reset_password_schema = swagger_auto_schema(
    operation_id='users_reset_password',
    operation_summary='Reset user password',
    operation_description="""
    Reset user password using a reset token.
    
    ### Permissions:
    - No authentication required
    
    ### Request Body:
    Reset token and new password.
    
    ### Response:
    Returns success message on successful password reset.
    """,
    responses={
        200: 'Password reset successfully',
        400: 'Invalid or expired reset token',
        404: 'User not found'
    },
    tags=['👤 Users']
)

users_reset_password_token_schema = swagger_auto_schema(
    operation_id='users_reset_password_token',
    operation_summary='Generate password reset token',
    operation_description="""
    Generate a password reset token for a specific user.
    
    ### Permissions:
    - User must be authenticated
    - Admin users only
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the user
    
    ### Response:
    Returns the generated reset token.
    """,
    manual_parameters=[user_id_param],
    responses={
        200: 'Reset token generated successfully',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'User not found'
    },
    tags=['👤 Users']
)

# Avatar upload schema
users_avatar_upload_schema = swagger_auto_schema(
    operation_id='users_avatar_upload',
    operation_summary='Upload user avatar',
    operation_description="""
    Upload or update user avatar image.
    
    ### Permissions:
    - User must be authenticated
    - User can only update their own avatar
    
    ### Path Parameters:
    - `pk` (integer): Unique identifier of the user
    
    ### Request Body:
    Multipart form data with avatar image file.
    
    ### Response:
    Returns the updated user profile with new avatar URL.
    """,
    manual_parameters=[user_id_param],
    consumes=['multipart/form-data'],
    responses={
        200: 'Avatar uploaded successfully',
        400: 'Invalid image file or format',
        401: 'Authentication credentials were not provided',
        403: 'You do not have permission to perform this action',
        404: 'User not found'
    },
    tags=['👤 Users']
)
