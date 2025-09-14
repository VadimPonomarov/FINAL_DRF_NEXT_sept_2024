from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from apps.users.serializers import AdminUserSerializer, UserPermissionsSerializer

UserModel = get_user_model()


class GrantStaffRightsView(APIView):
    """
    Grant or revoke staff rights to/from a user (Admin only)
    """
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_summary="Update staff rights",
        operation_description="Grant or revoke staff rights to/from a user. Requires admin permissions.",
        tags=['👤 Users'],
        request_body=UserPermissionsSerializer,
        responses={
            200: openapi.Response(
                description="Staff rights updated successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'user': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Updated user data"
                        )
                    }
                )
            ),
            400: "Bad Request - Invalid data",
            403: "Forbidden - Admin access required",
            404: "User not found"
        }
    )
    def patch(self, request, pk):
        """Grant or revoke staff rights"""
        return self._update_permissions(request, pk)

    @swagger_auto_schema(
        operation_summary="Grant staff rights",
        operation_description="Grant staff rights to a user. Requires admin permissions.",
        tags=['👤 Users'],
        request_body=UserPermissionsSerializer,
        responses={
            200: openapi.Response(
                description="Staff rights granted successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'user': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Updated user data"
                        )
                    }
                )
            ),
            400: "Bad Request - Invalid data",
            403: "Forbidden - Admin access required",
            404: "User not found"
        }
    )
    def post(self, request, pk):
        """Grant or revoke staff rights (POST method)"""
        return self._update_permissions(request, pk)

    def _update_permissions(self, request, pk):
        """Internal method to update user permissions"""
        user = get_object_or_404(UserModel, pk=pk)
        
        # Prevent modifying superuser status
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {"error": "Cannot modify superuser permissions"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserPermissionsSerializer(data=request.data)
        if serializer.is_valid():
            # Update permissions
            if 'is_staff' in serializer.validated_data:
                user.is_staff = serializer.validated_data['is_staff']
            if 'is_active' in serializer.validated_data:
                user.is_active = serializer.validated_data['is_active']
            user.save()
            
            return Response({
                "message": f"Permissions updated for user {user.email}",
                "user": AdminUserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminUserListView(generics.ListAPIView):
    """
    List all users with admin details (Admin only)
    """
    queryset = UserModel.objects.all().select_related('profile')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_description="List all users with admin details (Admin only)",
        tags=['👤 Users'],
        responses={
            200: openapi.Response(
                description="List of users with admin details",
                schema=openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_OBJECT)
                )
            ),
            403: "Forbidden - Admin access required"
        }
    )
    def get(self, request, *args, **kwargs):
        """List all users - Admin only"""
        return super().get(request, *args, **kwargs)


class AdminUserDetailView(generics.RetrieveAPIView):
    """
    Get user details with admin information (Admin only)
    """
    queryset = UserModel.objects.all().select_related('profile')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_description="Get user details with admin information (Admin only)",
        tags=['👤 Users'],
        responses={
            200: openapi.Response(
                description="User details with admin information",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT)
            ),
            403: "Forbidden - Admin access required",
            404: "User not found"
        }
    )
    def get(self, request, *args, **kwargs):
        """Get user details - Admin only"""
        return super().get(request, *args, **kwargs)
