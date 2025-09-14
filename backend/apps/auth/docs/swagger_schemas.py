"""
Swagger schemas and documentation for authentication endpoints.
"""
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Authentication endpoints documentation
auth_login_schema = swagger_auto_schema(
    operation_id='user_login',
    operation_summary='🔐 User Login',
    operation_description="""
    Authenticate user and obtain JWT access and refresh tokens.

    ### Permissions:
    - No authentication required

    ### Request Body:
    User credentials (email and password).

    ### Response:
    Returns JWT access token, refresh token, and user information.
    """,
    tags=['🔐 Authentication'],
    security=[],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['email', 'password'],
        properties={
            'email': openapi.Schema(
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_EMAIL,
                description='User email address'
            ),
            'password': openapi.Schema(
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_PASSWORD,
                description='User password'
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Login successful',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'access': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='JWT access token'
                    ),
                    'refresh': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='JWT refresh token'
                    ),
                    'user': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        description='User information',
                        properties={
                            'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'email': openapi.Schema(type=openapi.TYPE_STRING),
                            'is_active': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            'is_staff': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            'is_superuser': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            'profile': openapi.Schema(type=openapi.TYPE_OBJECT),
                            'created_at': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME),
                            'updated_at': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME),
                        }
                    )
                }
            )
        ),
        400: 'Invalid credentials',
        401: 'Authentication failed'
    }
)

auth_refresh_schema = swagger_auto_schema(
    operation_id='token_refresh',
    operation_summary='🔄 Refresh JWT Tokens',
    operation_description="""
    Refresh JWT tokens using a valid refresh token.

    ### Security Model:
    - **One-time refresh tokens**: Each refresh generates new access + refresh tokens
    - **Automatic blacklisting**: Old refresh token is immediately blacklisted
    - **Token rotation**: Prevents refresh token replay attacks

    ### Configuration:
    - `ROTATE_REFRESH_TOKENS = True` - Generate new refresh token
    - `BLACKLIST_AFTER_ROTATION = True` - Blacklist old refresh token

    ### Permissions:
    - Valid refresh token required (no Bearer token needed)

    ### Request Body:
    Refresh token to exchange for new tokens.

    ### Response:
    Returns both new access token and new refresh token.

    ### Important:
    The old refresh token becomes invalid immediately after use.
    Always store both returned tokens for future requests.
    """,
    security=[],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['refresh'],
        properties={
            'refresh': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='JWT refresh token (will be blacklisted after use)',
                example='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Tokens refreshed successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                required=['access', 'refresh'],
                properties={
                    'access': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='New JWT access token (12 hours lifetime)',
                        example='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    ),
                    'refresh': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='New JWT refresh token (30 days lifetime)',
                        example='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    )
                }
            ),
            examples={
                'application/json': {
                    'access': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0ODEwNDIzfQ...',
                    'refresh': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1NzM1ODQyM30...'
                }
            }
        ),
        400: openapi.Response(
            description='Invalid refresh token format',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'detail': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='Error message'
                    ),
                    'code': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='Error code'
                    )
                }
            ),
            examples={
                'application/json': {
                    'detail': 'Token is invalid or expired',
                    'code': 'token_not_valid'
                }
            }
        ),
        401: openapi.Response(
            description='Token expired, blacklisted, or invalid',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'detail': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='Error message'
                    ),
                    'code': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='Error code'
                    )
                }
            ),
            examples={
                'application/json': {
                    'detail': 'Token is blacklisted',
                    'code': 'token_not_valid'
                }
            }
        )
    },
    tags=['🔐 Authentication']
)

auth_logout_schema = swagger_auto_schema(
    operation_id='user_logout',
    operation_summary='🚪 User Logout',
    operation_description="""
    Logout user by blacklisting their refresh token.
    
    ### Permissions:
    - User must be authenticated
    
    ### Request Body:
    Refresh token to blacklist.
    
    ### Response:
    Returns success message on successful logout.
    """,
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['refresh'],
        properties={
            'refresh': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='JWT refresh token to blacklist'
            )
        }
    ),
    responses={
        205: openapi.Response(
            description='Logout successful',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'detail': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='Success message'
                    )
                }
            )
        ),
        400: 'Invalid refresh token',
        401: 'Authentication credentials were not provided'
    },
    tags=['🔐 Authentication']
)
