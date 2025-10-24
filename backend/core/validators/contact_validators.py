"""
Centralized contact validators to avoid duplication across serializers.
"""

from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
import re


class ContactValidator:
    """
    Централизований валідатор для контактних даних.
    Використовується в AdContactSerializer та AddsAccountContactSerializer.
    """
    
    EMAIL_TYPE = 'email'
    PHONE_TYPE = 'phone'
    TELEGRAM_TYPE = 'telegram'
    VIBER_TYPE = 'viber'
    WHATSAPP_TYPE = 'whatsapp'
    
    # Phone regex pattern (international format support)
    PHONE_PATTERN = re.compile(r'^\+?[\d\s\-\(\)]{7,20}$')
    
    @classmethod
    def validate_email(cls, value: str) -> str:
        """
        Validate email address using Django's EmailValidator.
        
        Args:
            value: Email address to validate
            
        Returns:
            Cleaned email address
            
        Raises:
            serializers.ValidationError: If email is invalid
        """
        email_validator = EmailValidator()
        try:
            email_validator(value)
            return value.lower().strip()
        except DjangoValidationError:
            raise serializers.ValidationError(_('Enter a valid email address.'))
    
    @classmethod
    def validate_phone(cls, value: str) -> str:
        """
        Validate phone number.
        
        Args:
            value: Phone number to validate
            
        Returns:
            Cleaned phone number
            
        Raises:
            serializers.ValidationError: If phone is invalid
        """
        # Remove whitespace for validation
        cleaned = value.strip()
        
        # Check pattern
        if not cls.PHONE_PATTERN.match(cleaned):
            raise serializers.ValidationError(
                _('Enter a valid phone number. Format: +380XXXXXXXXX or similar.')
            )
        
        # Check if contains at least some digits
        digits_only = re.sub(r'[^\d]', '', cleaned)
        if len(digits_only) < 7 or len(digits_only) > 15:
            raise serializers.ValidationError(
                _('Phone number must contain 7-15 digits.')
            )
        
        return cleaned
    
    @classmethod
    def validate_messenger(cls, value: str, messenger_type: str) -> str:
        """
        Validate messenger contact (Telegram, Viber, WhatsApp).
        
        Args:
            value: Messenger contact to validate
            messenger_type: Type of messenger
            
        Returns:
            Cleaned messenger contact
            
        Raises:
            serializers.ValidationError: If messenger contact is invalid
        """
        cleaned = value.strip()
        
        if not cleaned:
            raise serializers.ValidationError(
                _(f'{messenger_type.capitalize()} contact cannot be empty.')
            )
        
        # Basic validation - at least 3 characters
        if len(cleaned) < 3:
            raise serializers.ValidationError(
                _(f'{messenger_type.capitalize()} contact is too short.')
            )
        
        return cleaned
    
    @classmethod
    def validate_contact_value(cls, contact_type: str, value: str) -> str:
        """
        Validate contact value based on its type.
        
        Args:
            contact_type: Type of contact (email, phone, etc.)
            value: Contact value to validate
            
        Returns:
            Validated and cleaned contact value
            
        Raises:
            serializers.ValidationError: If validation fails
        """
        if not value or not value.strip():
            raise serializers.ValidationError(_('Contact value is required.'))
        
        # Route to appropriate validator
        if contact_type == cls.EMAIL_TYPE:
            return cls.validate_email(value)
        elif contact_type == cls.PHONE_TYPE:
            return cls.validate_phone(value)
        elif contact_type in [cls.TELEGRAM_TYPE, cls.VIBER_TYPE, cls.WHATSAPP_TYPE]:
            return cls.validate_messenger(value, contact_type)
        else:
            # Generic validation for other types
            return value.strip()


class ContactSerializerMixin:
    """
    Mixin для сериалізаторів контактів.
    Забезпечує стандартну валідацію контактних даних.
    """
    
    def validate_type(self, value):
        """
        Validate contact type against allowed choices.
        Override in child classes to provide specific choices.
        """
        # This should be overridden in child classes with specific enum
        return value
    
    def validate_value(self, value):
        """
        Basic validation for contact value.
        Type-specific validation is done in validate() method.
        """
        if not value or not value.strip():
            raise serializers.ValidationError(_('Contact value is required.'))
        return value.strip()
    
    def validate(self, data):
        """
        Cross-field validation for contact data.
        Validates value based on contact type.
        """
        contact_type = data.get('type')
        contact_value = data.get('value', '')
        
        # Use centralized validator
        if contact_type and contact_value:
            try:
                data['value'] = ContactValidator.validate_contact_value(
                    contact_type, 
                    contact_value
                )
            except serializers.ValidationError as e:
                raise serializers.ValidationError({'value': e.detail})
        
        return data

