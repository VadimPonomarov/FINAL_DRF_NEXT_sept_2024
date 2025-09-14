from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_summary="Update user",
        operation_description="Update user information.",
        operation_id="api_users_update",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'email': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_EMAIL),
                # UserModel doesn't have first_name/last_name fields
            }
        ),
        responses={
            200: "User updated successfully",
            400: "Invalid input",
            401: "Authentication credentials were not provided.",
            403: "You do not have permission to perform this action.",
            404: "User not found."
        }
    )
    def put(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        
        # Update user fields if they are provided in the request
        # UserModel doesn't have first_name/last_name fields
        if 'email' in data:
            user.email = data['email']
            
        user.save()
        return Response("User updated successfully", status=status.HTTP_200_OK)
