from django.contrib.auth import get_user_model
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.generics import (
    UpdateAPIView, get_object_or_404,
    RetrieveAPIView, GenericAPIView
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.users.permissions import IsMeUser
from apps.users.serializers import (
    UserSerializer, UserPasswordSerializer, RequestPasswordResetSerializer
)
from config.extra_config.logger_config import logger
from core.enums.msg import MessagesEnum
from core.services.jwt import JwtService, ChangePasswordToken
from core.services.send_email import send_email_service

UserModel = get_user_model()


class RequestPasswordResetView(GenericAPIView):
    """
    Request password reset by email (public endpoint).
    """
    serializer_class = RequestPasswordResetSerializer
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        tags=["🔐 Authentication"],
        request_body=RequestPasswordResetSerializer,
        operation_summary="Request password reset",
        operation_description="Send password reset email to user."
    )
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = UserModel.objects.get(email=email)
            token = JwtService.create_token(user, ChangePasswordToken)
            message = MessagesEnum.PASSWORD_RESET.get_message(token=token)

            send_email_service(
                title="Reset password",
                message=message,
                to_email=user.email
            )
            return Response(
                {"message": "Password reset email sent successfully"},
                status=status.HTTP_200_OK
            )
        except UserModel.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response(
                {"message": "If email exists, password reset email has been sent"},
                status=status.HTTP_200_OK
            )


class ResetPasswordTokenView(RetrieveAPIView):
    """
    Generate a token for resetting a user's password.
    """
    queryset = UserModel.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsMeUser,)

    @swagger_auto_schema(
        tags=["🔐 Authentication"],
        operation_summary="Request password reset token",
        operation_description="Generate and send a token to reset a user's password."
    )
    @transaction.atomic
    def get(self, request, *args, **kwargs):
        user = get_object_or_404(UserModel, pk=self.kwargs.get("pk"))
        token = JwtService.create_token(user, ChangePasswordToken)
        message = MessagesEnum.PASSWORD_RESET.get_message(token=token)

        send_email_service(title="Reset password", message=message,
                           to_email=user.email)
        return Response(
            {"message": "Email with password reset token sent successfully"},
            status=status.HTTP_200_OK
        )


class ResetPasswordView(UpdateAPIView):
    """
    Reset a user's password using a token.
    """
    queryset = UserModel.objects.all()
    serializer_class = UserPasswordSerializer
    allowed_methods = ['PATCH']
    permission_classes = (IsMeUser,)

    @swagger_auto_schema(
        tags=["🔐 Authentication"],
        request_body=UserPasswordSerializer,
        operation_summary="Reset password",
        operation_description="Reset the user's password using a token and a new password."
    )
    def patch(self, request, *args, **kwargs):
        token = request.data.get("token")
        new_password = request.data.get("password")

        if not token or not new_password:
            return Response(
                {"error": "Both 'token' and 'password' fields are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = JwtService.verify_token(token, ChangePasswordToken)

        serializer = self.get_serializer(data={"password": new_password})
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data["password"])
        user.save()

        return Response({"message": "Password changed successfully"},
                        status=status.HTTP_200_OK)
