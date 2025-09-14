"""
Authentication views for logout functionality.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from ..docs.swagger_schemas import auth_logout_schema


class LogoutView(APIView):
    """
    View for logging out users by blacklisting their refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    @auth_logout_schema
    def post(self, request):
        """
        Blacklist the provided refresh token to logout the user.
        """
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {"detail": "Refresh token is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": "Invalid refresh token."},
                status=status.HTTP_400_BAD_REQUEST
            )
