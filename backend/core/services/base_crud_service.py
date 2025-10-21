"""
Base CRUD service class for common CRUD operations.
Extends BaseService with CRUD functionality.
"""

from typing import Any, Dict, List, Optional

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import models
from rest_framework import status
from rest_framework.response import Response

from .base_service import BaseService


class BaseCRUDService(BaseService):
    """
    Base CRUD service class that provides common CRUD operations.
    All CRUD service classes should inherit from this base class.
    """

    def create(self, data: Dict[str, Any], user_id: int = None) -> Response:
        """
        Create a new object.

        Args:
            data: Data dictionary for object creation
            user_id: ID of the user creating the object

        Returns:
            Response with created object or error
        """
        try:
            self.log_operation("create", user_id, {"data": data})

            # Validate data
            validated_data = self.validate_data(data)

            # Create object
            if self.model:
                instance = self.model.objects.create(**validated_data)
                return self.create_response(
                    data={"id": instance.id, "object": str(instance)},
                    message="Object created successfully",
                    status_code=status.HTTP_201_CREATED,
                )
            else:
                return self.create_response(
                    message="Model not specified",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return self.handle_errors("create", e)

    def retrieve(self, object_id: int, user_id: int = None) -> Response:
        """
        Retrieve a single object by ID.

        Args:
            object_id: ID of the object to retrieve
            user_id: ID of the user requesting the object

        Returns:
            Response with object data or error
        """
        try:
            self.log_operation("retrieve", user_id, {"object_id": object_id})

            if not self.model:
                return self.create_response(
                    message="Model not specified",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            instance = self.model.objects.get(id=object_id)

            # Convert to dict for response
            data = {"id": instance.id, "object": str(instance)}

            return self.create_response(
                data=data, message="Object retrieved successfully"
            )

        except ObjectDoesNotExist:
            return self.create_response(
                message="Object not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("retrieve", e)

    def update(
        self, object_id: int, data: Dict[str, Any], user_id: int = None
    ) -> Response:
        """
        Update an existing object.

        Args:
            object_id: ID of the object to update
            data: Data dictionary for object update
            user_id: ID of the user updating the object

        Returns:
            Response with updated object or error
        """
        try:
            self.log_operation(
                "update", user_id, {"object_id": object_id, "data": data}
            )

            if not self.model:
                return self.create_response(
                    message="Model not specified",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            # Validate data
            validated_data = self.validate_data(data)

            # Get and update object
            instance = self.model.objects.get(id=object_id)

            for field, value in validated_data.items():
                setattr(instance, field, value)

            instance.save()

            return self.create_response(
                data={"id": instance.id, "object": str(instance)},
                message="Object updated successfully",
            )

        except ObjectDoesNotExist:
            return self.create_response(
                message="Object not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("update", e)

    def delete(self, object_id: int, user_id: int = None) -> Response:
        """
        Delete an object.

        Args:
            object_id: ID of the object to delete
            user_id: ID of the user deleting the object

        Returns:
            Response with deletion confirmation or error
        """
        try:
            self.log_operation("delete", user_id, {"object_id": object_id})

            if not self.model:
                return self.create_response(
                    message="Model not specified",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            instance = self.model.objects.get(id=object_id)
            instance.delete()

            return self.create_response(
                message="Object deleted successfully",
                status_code=status.HTTP_204_NO_CONTENT,
            )

        except ObjectDoesNotExist:
            return self.create_response(
                message="Object not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("delete", e)

    def list_objects(
        self, filters: Dict[str, Any] = None, user_id: int = None
    ) -> Response:
        """
        List objects with optional filtering.

        Args:
            filters: Optional filters to apply
            user_id: ID of the user requesting the list

        Returns:
            Response with list of objects or error
        """
        try:
            self.log_operation("list", user_id, {"filters": filters})

            if not self.model:
                return self.create_response(
                    message="Model not specified",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            queryset = self.model.objects.all()

            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field):
                        queryset = queryset.filter(**{field: value})

            # Convert to list of dicts
            objects = []
            for instance in queryset:
                objects.append({"id": instance.id, "object": str(instance)})

            return self.create_response(
                data={"objects": objects, "count": len(objects)},
                message="Objects retrieved successfully",
            )

        except Exception as e:
            return self.handle_errors("list", e)
