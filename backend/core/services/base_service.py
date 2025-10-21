"""
Base service class for business logic separation.
Follows DRY principles and provides common functionality.
"""

import logging
from typing import Any, Dict, List, Optional

from django.core.exceptions import ValidationError
from django.db import models
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class BaseService:
    """
    Base service class that provides common business logic methods.
    All service classes should inherit from this base class.
    """

    def __init__(self, model: models.Model = None):
        """
        Initialize the service with an optional model.

        Args:
            model: Django model class to work with
        """
        self.model = model
        self.logger = logger

    def validate_data(
        self, data: Dict[str, Any], required_fields: List[str] = None
    ) -> Dict[str, Any]:
        """
        Validate input data against required fields.

        Args:
            data: Data dictionary to validate
            required_fields: List of required field names

        Returns:
            Validated data dictionary

        Raises:
            ValidationError: If validation fails
        """
        if not isinstance(data, dict):
            raise ValidationError("Data must be a dictionary")

        if required_fields:
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                raise ValidationError(
                    f"Missing required fields: {', '.join(missing_fields)}"
                )

        return data

    def handle_errors(self, operation: str, error: Exception) -> Response:
        """
        Standardized error handling for all services.

        Args:
            operation: Description of the operation that failed
            error: The exception that occurred

        Returns:
            Standardized error response
        """
        self.logger.error(f"Error in {operation}: {str(error)}")

        if isinstance(error, ValidationError):
            return Response(
                {
                    "error": "validation_error",
                    "message": str(error),
                    "details": error.message if hasattr(error, "message") else None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "error": "server_error",
                "message": f"An error occurred during {operation}",
                "details": str(error) if hasattr(error, "__str__") else "Unknown error",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    def create_response(
        self,
        data: Any = None,
        message: str = None,
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        """
        Create standardized success response.

        Args:
            data: Response data
            message: Success message
            status_code: HTTP status code

        Returns:
            Standardized success response
        """
        response_data = {"success": True}

        if data is not None:
            response_data["data"] = data

        if message:
            response_data["message"] = message

        return Response(response_data, status=status_code)

    def log_operation(
        self, operation: str, user_id: int = None, details: Dict[str, Any] = None
    ):
        """
        Log business operations for audit trail.

        Args:
            operation: Description of the operation
            user_id: ID of the user performing the operation
            details: Additional details to log
        """
        log_data = {
            "operation": operation,
            "user_id": user_id,
            "details": details or {},
        }

        self.logger.info(f"Business operation: {log_data}")

    def get_model_fields(self) -> List[str]:
        """
        Get list of model field names.

        Returns:
            List of field names
        """
        if not self.model:
            return []

        return [field.name for field in self.model._meta.fields]

    def get_model_meta(self) -> Dict[str, Any]:
        """
        Get model metadata.

        Returns:
            Dictionary with model metadata
        """
        if not self.model:
            return {}

        return {
            "model_name": self.model.__name__,
            "app_label": self.model._meta.app_label,
            "fields": self.get_model_fields(),
            "verbose_name": self.model._meta.verbose_name,
            "verbose_name_plural": self.model._meta.verbose_name_plural,
        }
