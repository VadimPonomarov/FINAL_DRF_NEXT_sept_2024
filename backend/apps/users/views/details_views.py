from django.contrib.auth import get_user_model
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.generics import RetrieveUpdateDestroyAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_yasg import openapi

from apps.users.permissions import IsSuperUserOrMe
from apps.users.serializers import UserEditSerializer

UserModel = get_user_model()


class UserDetailView(RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific user.
    """
    queryset = UserModel.objects.all()
    serializer_class = UserEditSerializer
    permission_classes = (IsSuperUserOrMe,)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_summary="Retrieve user details",
        operation_description="Retrieve detailed information about a specific user. Requires authentication."
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=["👤 Users"],
        request_body=UserEditSerializer,
        operation_summary="Update user details (partial)",
        operation_description="Partially update details of a specific user, including uploading a new avatar. Users can only update their own information.",
        consumes=["multipart/form-data"]
    )
    def patch(self, request, *args, **kwargs):
        # Get the object and pass partial=True to allow partial updates
        serializer = self.get_serializer(instance=self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)  # Validate data
        self.perform_update(serializer)  # Perform the update
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        tags=["👤 Users"],
        request_body=UserEditSerializer,
        operation_summary="Update user (full)",
        operation_description="Full update of user information. Users can only update their own information unless they are superusers.",
        operation_id="api_users_update",
        responses={
            200: UserEditSerializer,
            400: "Bad Request - Invalid input data",
            401: "Authentication credentials were not provided",
            403: "You do not have permission to perform this action",
            404: "User not found"
        }
    )
    def put(self, request, *args, **kwargs):
        # Check if the requested user is the same as the authenticated user
        user = self.get_object()
        
        # Check permissions
        if user != request.user and not request.user.is_superuser:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Use the serializer for full update
        serializer = self.get_serializer(user, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_summary="Delete user",
        operation_description="Delete a specific user. Users can only delete their own account unless they are superusers."
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


class UserProfileView(RetrieveUpdateAPIView):
    """
    Retrieve or update the profile of the currently authenticated user.
    """
    serializer_class = UserEditSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        """
        Return the current user.
        """
        return self.request.user

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_summary="Get current user profile",
        operation_description="Retrieve profile information for the currently authenticated user."
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=["👤 Users"],
        request_body=UserEditSerializer,
        operation_summary="Update current user profile (partial)",
        operation_description="Partially update profile information for the currently authenticated user."
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=["👤 Users"],
        request_body=UserEditSerializer,
        operation_summary="Update current user profile (full)",
        operation_description="Fully update profile information for the currently authenticated user."
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
