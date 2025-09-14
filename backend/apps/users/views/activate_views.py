from django.contrib.auth import get_user_model
from drf_yasg.utils import swagger_auto_schema
from rest_framework.generics import get_object_or_404, GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.users.serializers import UserActivateSerializer
from core.exceptions.jwt import JwtException
from core.services.jwt import JwtService, ActivateToken

UserModel = get_user_model()


class ActivateUserView(GenericAPIView):
    """
    Activate User using a query parameter token.
    """
    queryset = UserModel.objects.all()
    serializer_class = UserActivateSerializer
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        tags=["🔐 Authentication"],
        operation_summary="Activate a user",
        operation_description="Activate a user by verifying a token passed as a query parameter."
    )
    def get(self, request, *args, **kwargs):
        """
        Handles user activation based on a query parameter token.
        """
        try:
            token = request.GET.get("token")
            if not token:
                return Response(
                    {"error": "Activate token is required"},
                    status=400
                )

            user_data = JwtService.verify_token(token, ActivateToken)
            user = get_object_or_404(UserModel, pk=user_data.id)

            if user.is_active:
                return Response({"message": "User is already active"}, status=200)

            user.is_active = True
            user.save()
            return Response({"message": "User activated successfully"}, status=200)

        except JwtException as e:
            return Response(
                {"error": str(e)},
                status=400
            )
        except Exception as e:
            return Response(
                {"error": f"Activation failed: {str(e)}"},
                status=400
            )

    @swagger_auto_schema(
        tags=["🔐 Authentication"],
        operation_summary="Activate a user (POST)",
        operation_description="Activate a user by user_id in request body (Admin only)."
    )
    def post(self, request, *args, **kwargs):
        """
        Handles user activation by user_id in request body (Admin only).
        """
        from rest_framework.permissions import IsAdminUser

        # Check admin permission
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({"error": "Admin access required"}, status=403)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)

        user = get_object_or_404(UserModel, pk=user_id)

        if user.is_active:
            return Response({"message": "User is already active"}, status=200)

        user.is_active = True
        user.save()
        return Response({"message": "User activated successfully"}, status=200)
