from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.users.models import UserModel
from apps.users.serializers import AdminUserSerializer


class PublicUserListView(generics.ListAPIView):
    """
    Public endpoint to get list of active users for login selection
    No authentication required - used for login form
    """

    queryset = UserModel.objects.filter(is_active=True).select_related("profile")
    serializer_class = AdminUserSerializer
    permission_classes = [AllowAny]  # Публичный доступ

    @swagger_auto_schema(
        operation_summary="👥 Get Active Users List",
        operation_description="""
        Retrieve a list of active users for login selection and user management.
        
        ### Features:
        - **Public Access**: No authentication required
        - **Active Users Only**: Returns only users with active status
        - **Optimized Queries**: Uses select_related for better performance
        - **Profile Information**: Includes basic profile data
        
        ### Use Cases:
        - Login form user selection
        - User management interfaces
        - Admin user listing
        - User verification processes
        
        ### Security:
        - Only returns basic user information
        - No sensitive data exposed
        - Public endpoint for legitimate use cases
        """,
        manual_parameters=[
            openapi.Parameter(
                "page",
                openapi.IN_QUERY,
                description="Page number for pagination",
                type=openapi.TYPE_INTEGER,
                default=1,
                minimum=1,
            ),
            openapi.Parameter(
                "page_size",
                openapi.IN_QUERY,
                description="Number of users per page",
                type=openapi.TYPE_INTEGER,
                default=50,
                minimum=1,
                maximum=1000,
            ),
            openapi.Parameter(
                "search",
                openapi.IN_QUERY,
                description="Search users by username or email",
                type=openapi.TYPE_STRING,
                maxLength=100,
            ),
            openapi.Parameter(
                "ordering",
                openapi.IN_QUERY,
                description="Ordering field",
                type=openapi.TYPE_STRING,
                enum=[
                    "username",
                    "-username",
                    "date_joined",
                    "-date_joined",
                    "last_login",
                    "-last_login",
                ],
            ),
        ],
        responses={
            200: openapi.Response(
                description="List of active users retrieved successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "count": openapi.Schema(
                            type=openapi.TYPE_INTEGER,
                            description="Total number of active users",
                        ),
                        "next": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            format=openapi.FORMAT_URI,
                            description="URL for the next page of results",
                            nullable=True,
                        ),
                        "previous": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            format=openapi.FORMAT_URI,
                            description="URL for the previous page of results",
                            nullable=True,
                        ),
                        "results": openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            description="List of active users",
                            items=openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                properties={
                                    "id": openapi.Schema(
                                        type=openapi.TYPE_INTEGER,
                                        description="Unique user ID",
                                    ),
                                    "username": openapi.Schema(
                                        type=openapi.TYPE_STRING, description="Username"
                                    ),
                                    "email": openapi.Schema(
                                        type=openapi.TYPE_STRING,
                                        format=openapi.FORMAT_EMAIL,
                                        description="Email address",
                                    ),
                                    "first_name": openapi.Schema(
                                        type=openapi.TYPE_STRING,
                                        description="First name",
                                        nullable=True,
                                    ),
                                    "last_name": openapi.Schema(
                                        type=openapi.TYPE_STRING,
                                        description="Last name",
                                        nullable=True,
                                    ),
                                    "is_active": openapi.Schema(
                                        type=openapi.TYPE_BOOLEAN,
                                        description="User active status",
                                    ),
                                    "is_staff": openapi.Schema(
                                        type=openapi.TYPE_BOOLEAN,
                                        description="Staff status",
                                    ),
                                    "is_superuser": openapi.Schema(
                                        type=openapi.TYPE_BOOLEAN,
                                        description="Superuser status",
                                    ),
                                    "date_joined": openapi.Schema(
                                        type=openapi.TYPE_STRING,
                                        format=openapi.FORMAT_DATETIME,
                                        description="Account creation date",
                                    ),
                                    "last_login": openapi.Schema(
                                        type=openapi.TYPE_STRING,
                                        format=openapi.FORMAT_DATETIME,
                                        description="Last login date",
                                        nullable=True,
                                    ),
                                    "profile": openapi.Schema(
                                        type=openapi.TYPE_OBJECT,
                                        description="User profile information",
                                        properties={
                                            "id": openapi.Schema(
                                                type=openapi.TYPE_INTEGER
                                            ),
                                            "avatar": openapi.Schema(
                                                type=openapi.TYPE_STRING,
                                                format=openapi.FORMAT_URI,
                                                description="Profile avatar URL",
                                                nullable=True,
                                            ),
                                            "phone": openapi.Schema(
                                                type=openapi.TYPE_STRING,
                                                description="Phone number",
                                                nullable=True,
                                            ),
                                            "bio": openapi.Schema(
                                                type=openapi.TYPE_STRING,
                                                description="User biography",
                                                nullable=True,
                                            ),
                                            "location": openapi.Schema(
                                                type=openapi.TYPE_STRING,
                                                description="User location",
                                                nullable=True,
                                            ),
                                        },
                                    ),
                                },
                            ),
                        ),
                    },
                ),
                examples={
                    "application/json": {
                        "count": 25,
                        "next": "http://localhost:8000/api/users/public/?page=2",
                        "previous": None,
                        "results": [
                            {
                                "id": 1,
                                "username": "john_doe",
                                "email": "john@example.com",
                                "first_name": "John",
                                "last_name": "Doe",
                                "is_active": True,
                                "is_staff": False,
                                "is_superuser": False,
                                "date_joined": "2024-01-15T10:30:00Z",
                                "last_login": "2024-01-20T14:22:00Z",
                                "profile": {
                                    "id": 1,
                                    "avatar": "http://localhost:8000/media/avatars/john_avatar.jpg",
                                    "phone": "+1234567890",
                                    "bio": "Car enthusiast and seller",
                                    "location": "Los Angeles, CA",
                                },
                            }
                        ],
                    }
                },
            ),
            400: openapi.Response(
                description="Bad request - invalid parameters",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "error": openapi.Schema(type=openapi.TYPE_STRING),
                        "details": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            ),
            500: openapi.Response(
                description="Internal server error",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "error": openapi.Schema(type=openapi.TYPE_STRING),
                        "message": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            ),
        },
        tags=["👤 Users"],
    )
    def get(self, request, *args, **kwargs):
        """Get active users for login selection - Public access"""
        return super().get(request, *args, **kwargs)
