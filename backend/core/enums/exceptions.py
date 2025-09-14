from enum import Enum

from rest_framework import status
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError, \
    AuthenticationFailed, NotAuthenticated, NotAcceptable
from rest_framework.response import Response

from core.exceptions.jwt import JwtException


class ErrorType(Enum):
    BAD_REQUEST = {
        "exceptions": [KeyError, ValueError, ValidationError, NotAcceptable],
        "code": "bad_request",
        "message": "Invalid request or parameters.",
        "status": status.HTTP_400_BAD_REQUEST,
    }
    PERMISSION_DENIED = {
        "exceptions": [PermissionDenied],
        "code": "permission_denied",
        "message": "You do not have permission to perform this action.",
        "status": status.HTTP_403_FORBIDDEN,
    }
    JWT_ERROR = {
        "exceptions": [JwtException, AuthenticationFailed, NotAuthenticated],
        "code": "jwt_error",
        "message": "Authentication failed or invalid JWT token.",
        "status": status.HTTP_401_UNAUTHORIZED,
    }
    NOT_FOUND = {
        "exceptions": [NotFound, FileNotFoundError],
        "code": "not_found",
        "message": "The requested resource was not found.",
        "status": status.HTTP_404_NOT_FOUND,
    }
    SERVER_ERROR = {
        "exceptions": None,  # Matches any uncategorized exception.
        "code": "server_error",
        "message": "An unexpected error occurred on the server.",
        "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }

    def __init__(self, data):
        self.exceptions = data["exceptions"]
        self.code = data["code"]
        self.message = data["message"]
        self.http_status = data["status"]
        # Automatically build a handler that uses self.message for the error_message.
        self.handler = self._build_handler()

    def _build_handler(self):
        """Returns a handler function that uses the object's attributes to create the HTTP response."""
        return lambda exc: Response({
            "error_code": self.code,
            "error_message": self.message,
            "details": str(exc)
        }, status=self.http_status)

    @staticmethod
    def get_by_exception(exc):
        """
        Iterates through the ErrorType elements and returns the corresponding element
        if the raised exception is an instance of one of the types specified in "exceptions".
        If the exception does not match any type, returns SERVER_ERROR.
        """
        for error_type in ErrorType:
            if error_type.exceptions and any(
                    isinstance(exc, exc_type) for exc_type in error_type.exceptions):
                return error_type
        return ErrorType.SERVER_ERROR

    def handle_exception(self, exc):
        """Calls the handler to create an HTTP response."""
        return self.handler(exc)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that uses ErrorType for consistent error responses.
    """
    # Check if the exception matches ErrorType categories
    error_type = ErrorType.get_by_exception(exc)
    return error_type.handle_exception(exc)
