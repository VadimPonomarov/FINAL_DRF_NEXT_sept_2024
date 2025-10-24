"""
Centralized password validation mixin to avoid duplication.
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class PasswordValidationMixin:
    """
    Mixin для серіалізаторів з валідацією паролів.
    Забезпечує централізовану валідацію та перевірку відповідності паролів.
    """
    
    def validate_password(self, value):
        """
        Validate password using Django's built-in password validators.
        
        Args:
            value: Password to validate
            
        Returns:
            Validated password
            
        Raises:
            serializers.ValidationError: If password doesn't meet requirements
        """
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate_password_match(self, password: str, password_confirm: str) -> None:
        """
        Validate that password and password_confirm match.
        
        Args:
            password: Original password
            password_confirm: Confirmation password
            
        Raises:
            serializers.ValidationError: If passwords don't match
        """
        if password and password_confirm and password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
    
    def validate(self, data):
        """
        Cross-field validation for password fields.
        Checks if password and password_confirm match.
        """
        # Only validate if both password fields are present
        if 'password' in data and 'password_confirm' in data:
            self.validate_password_match(
                data.get('password'),
                data.get('password_confirm')
            )
        
        # Call parent validate if it exists
        if hasattr(super(), 'validate'):
            data = super().validate(data)
        
        return data

