"""
Swagger schemas and documentation for authentication endpoints.
"""

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

# Authentication endpoints documentation
auth_login_schema = swagger_auto_schema(
    operation_id="user_login",
    operation_summary="🔐 User Login",
    operation_description="""
    Authenticate user and obtain JWT access and refresh tokens.

    ### Permissions:
    - No authentication required

    ### Request Body:
    User credentials (email and password).

    ### Response:
    Returns JWT access token, refresh token, and user information.
    """,
    tags=["🔐 Authentication"],
    security=[],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=["email", "password"],
        properties={
            "email": openapi.Schema(
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_EMAIL,
                description="User email address",
            ),
            "password": openapi.Schema(
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_PASSWORD,
                description="User password",
            ),
        },
    ),
    responses={
        200: openapi.Response(
            description="Login successful",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "access": openapi.Schema(
                        type=openapi.TYPE_STRING, description="JWT access token"
                    ),
                    "refresh": openapi.Schema(
                        type=openapi.TYPE_STRING, description="JWT refresh token"
                    ),
                    "user": openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        description="User information",
                        properties={
                            "id": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "email": openapi.Schema(type=openapi.TYPE_STRING),
                            "is_active": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            "is_staff": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            "is_superuser": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                            "profile": openapi.Schema(type=openapi.TYPE_OBJECT),
                            "created_at": openapi.Schema(
                                type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME
                            ),
                            "updated_at": openapi.Schema(
                                type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME
                            ),
                        },
                    ),
                },
            ),
        ),
        400: "Invalid credentials",
        401: "Authentication failed",
    },
)

auth_refresh_schema = swagger_auto_schema(
    operation_id="token_refresh",
    operation_summary="🔄 Refresh JWT Tokens",
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
        required=["refresh"],
        properties={
            "refresh": openapi.Schema(
                type=openapi.TYPE_STRING,
                description="JWT refresh token (will be blacklisted after use)",
                example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            )
        },
    ),
    responses={
        200: openapi.Response(
            description="Tokens refreshed successfully",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                required=["access", "refresh"],
                properties={
                    "access": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="New JWT access token (12 hours lifetime)",
                        example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    ),
                    "refresh": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="New JWT refresh token (30 days lifetime)",
                        example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    ),
                },
            ),
            examples={
                "application/json": {
                    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0ODEwNDIzfQ...",
                    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1NzM1ODQyM30...",
                }
            },
        ),
        400: openapi.Response(
            description="Invalid refresh token format",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Error message"
                    ),
                    "code": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Error code"
                    ),
                },
            ),
            examples={
                "application/json": {
                    "detail": "Token is invalid or expired",
                    "code": "token_not_valid",
                }
            },
        ),
        401: openapi.Response(
            description="Token expired, blacklisted, or invalid",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Error message"
                    ),
                    "code": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Error code"
                    ),
                },
            ),
            examples={
                "application/json": {
                    "detail": "Token is blacklisted",
                    "code": "token_not_valid",
                }
            },
        ),
    },
    tags=["🔐 Authentication"],
)

auth_logout_schema = swagger_auto_schema(
    operation_id="user_logout",
    operation_summary="🚪 User Logout",
    operation_description="""
    Securely logout user by blacklisting their refresh token.
    
    ### Security Features:
    - **Token Blacklisting**: Refresh token is immediately blacklisted
    - **Session Invalidation**: User session is terminated
    - **Token Rotation**: Prevents token reuse attacks
    - **Immediate Effect**: Access token becomes invalid (client should discard)
    
    ### Permissions:
    - User must be authenticated (valid access token required)
    - Refresh token must be provided in request body
    
    ### Security Best Practices:
    - Always call logout when user closes app/browser
    - Store tokens securely and discard after logout
    - Implement proper token cleanup on client side
    - Handle logout errors gracefully
    
    ### Request Body:
    Refresh token to blacklist for security.
    
    ### Response:
    Returns success message confirming logout.
    """,
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=["refresh"],
        properties={
            "refresh": openapi.Schema(
                type=openapi.TYPE_STRING,
                description="JWT refresh token to blacklist (will become invalid immediately)",
                example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            )
        },
    ),
    responses={
        200: openapi.Response(
            description="Logout successful - refresh token blacklisted",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Success message",
                        example="Successfully logged out.",
                    ),
                    "blacklisted_token": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Blacklisted token ID (for debugging)",
                        example="jti:abc123def456",
                    ),
                },
            ),
            examples={
                "application/json": {
                    "detail": "Successfully logged out.",
                    "blacklisted_token": "jti:abc123def456",
                }
            },
        ),
        400: openapi.Response(
            description="Bad request - invalid or missing refresh token",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Error message"
                    ),
                    "error_code": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Error code for client handling",
                    ),
                },
            ),
            examples={
                "application/json": {
                    "detail": "Refresh token is required.",
                    "error_code": "MISSING_REFRESH_TOKEN",
                }
            },
        ),
        401: openapi.Response(
            description="Authentication required - user not authenticated",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Authentication error message",
                    ),
                    "code": openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description="Authentication error code",
                    ),
                },
            ),
            examples={
                "application/json": {
                    "detail": "Authentication credentials were not provided.",
                    "code": "authentication_failed",
                }
            },
        ),
        422: openapi.Response(
            description="Invalid refresh token format or already blacklisted",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Token validation error"
                    ),
                    "code": openapi.Schema(
                        type=openapi.TYPE_STRING, description="Token error code"
                    ),
                },
            ),
            examples={
                "application/json": {
                    "detail": "Invalid refresh token.",
                    "code": "token_not_valid",
                }
            },
        ),
    },
    tags=["🔐 Authentication"],
)
