import os
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_yasg.utils import swagger_auto_schema
from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework.permissions import AllowAny, IsAdminUser
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from core.services.security_logger import log_registration

from apps.users.docs.swagger_params import pagination_parameters, filtering_parameters
from apps.users.filters import UsersFilter
from apps.users.serializers import UserSerializer

UserModel = get_user_model()


class ListUsersView(ListAPIView):
    """
    Retrieve a list of users with pagination and filtering.

    This view uses the IsAdminUser permission so that only admin users
    (i.e. users with is_staff=True) can access the list. When an unauthenticated user
    or a user without proper permissions accesses this endpoint, the global exception
    handler will intercept the NotAuthenticated/PermissionDenied exception and return a 403.

    Swagger documentation is provided via the decorator.
    """
    queryset = UserModel.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)
    filterset_class = UsersFilter
    allowed_methods = ['GET']

    @swagger_auto_schema(
        tags=["👤 Users"],
        manual_parameters=pagination_parameters + filtering_parameters,
        operation_summary="List users",
        operation_description="Retrieve a list of users with pagination and filtering options. Requires admin permissions."
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


# Conditionally apply rate limiting (skip in tests)
def conditional_ratelimit(rate):
    def decorator(cls):
        if not (os.environ.get('TESTING') or 'test' in os.environ.get('DJANGO_SETTINGS_MODULE', '')):
            return method_decorator(ratelimit(key='ip', rate=rate, method='POST'), name='post')(cls)
        return cls
    return decorator

@conditional_ratelimit('3/m')
class CreateUserView(CreateAPIView):
    """
    Create a new user with profile data and support for avatar file uploads.

    Returns:
        - 201: User created successfully
        - 400: Validation error or duplicate email
        - 500: Server error
    """
    queryset = UserModel.objects.all()
    serializer_class = UserSerializer
    permission_classes = (AllowAny,)
    allowed_methods = ['POST']

    @swagger_auto_schema(
        tags=["👤 Users"],
        request_body=UserSerializer,
        operation_summary="Create a user",
        operation_description="Create a new user account with profile data and optional avatar upload. No authentication required for public registration.",
        consumes=["multipart/form-data"],
        security=[],
        responses={
            201: UserSerializer,
            400: "Bad Request - Validation error or duplicate email",
            500: "Internal Server Error"
        }
    )
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 201:
                # Log successful registration
                user_data = response.data
                if 'id' in user_data:
                    try:
                        user = UserModel.objects.get(id=user_data['id'])
                        log_registration(request, user)
                    except UserModel.DoesNotExist:
                        pass
            return response
        except IntegrityError:
            return Response(
                {"email": ["User with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST
            )
