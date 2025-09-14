from rest_framework import generics
from rest_framework.permissions import AllowAny
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.users.models import UserModel
from apps.users.serializers import AdminUserSerializer


class PublicUserListView(generics.ListAPIView):
    """
    Public endpoint to get list of active users for login selection
    No authentication required - used for login form
    """
    queryset = UserModel.objects.filter(is_active=True).select_related('profile')
    serializer_class = AdminUserSerializer
    permission_classes = [AllowAny]  # Публичный доступ
    
    @swagger_auto_schema(
        operation_description="Get list of active users for login selection (Public access)",
        tags=['👤 Users'],
        responses={
            200: openapi.Response(
                description="List of active users",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'count': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'results': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(type=openapi.TYPE_OBJECT)
                        )
                    }
                )
            )
        }
    )
    def get(self, request, *args, **kwargs):
        """Get active users for login selection - Public access"""
        return super().get(request, *args, **kwargs)
