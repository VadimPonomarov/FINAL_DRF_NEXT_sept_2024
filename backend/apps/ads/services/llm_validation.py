"""
LLM-based validation and moderation service for dynamic form data.
"""
import json
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum

from core.services.llm import LLMService

class ValidationResult:
    """Container for validation results."""
    def __init__(self, is_valid: bool, errors: Dict[str, List[str]] = None, 
                 corrected_values: Dict[str, Any] = None):
        self.is_valid = is_valid
        self.errors = errors or {}
        self.corrected_values = corrected_values or {}

class FieldType(Enum):
    """Field types for validation."""
    TEXT = "text"
    NUMBER = "number"
    CURRENCY = "currency"
    YEAR = "year"
    DATE = "date"
    BOOLEAN = "boolean"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"

class LLMValidator:
    """LLM-based form data validator and moderator."""
    
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
    
    async def validate_form_data(
        self,
        form_data: Dict[str, Any],
        field_definitions: Dict[str, dict],
        language: str = 'uk'
    ) -> ValidationResult:
        """
        Validate form data using LLM.
        
        Args:
            form_data: Dictionary of form field names to values
            field_definitions: Dictionary of field definitions with validation rules
            language: Language for validation messages
            
        Returns:
            ValidationResult object with validation results
        """
        # Prepare the prompt for LLM
        prompt = self._build_validation_prompt(form_data, field_definitions, language)
        
        try:
            # Get validation response from LLM
            response = await self.llm.get_completion(prompt)
            
            # Parse the response
            return self._parse_validation_response(response, field_definitions)
            
        except Exception as e:
            # In case of LLM service failure, return a generic error
            return ValidationResult(
                is_valid=False,
                errors={"__all__": [f"Validation service is currently unavailable: {str(e)}"]}
            )
    
    def _build_validation_prompt(
        self, 
        form_data: Dict[str, Any], 
        field_definitions: Dict[str, dict],
        language: str
    ) -> str:
        """Build the prompt for LLM validation."""
        prompt_parts = [
            "You are a form validation assistant. Your task is to validate the provided form data.",
            "For each field, check if it meets the specified validation rules.",
            "For required fields, ensure they are not empty and are in the correct format.",
            "For optional fields, if provided, validate their format and content.",
            "For any issues, provide clear error messages and suggest corrections when possible.\n",
            f"Language for validation messages: {language}\n",
            "Field Definitions (name: {validation_rules}):"
        ]
        
        # Add field definitions
        for field_name, rules in field_definitions.items():
            prompt_parts.append(f"- {field_name}: {rules}")
        
        prompt_parts.append("\nForm Data (field: value):")
        
        # Add form data
        for field, value in form_data.items():
            if value is not None and value != '':
                prompt_parts.append(f"- {field}: {value}")
            else:
                prompt_parts.append(f"- {field}: [EMPTY]")
        
        prompt_parts.extend([
            "\nPlease validate this data and return a JSON response with the following structure:",
            '{"is_valid": boolean,',
            ' "errors": {"field_name": ["error1", "error2", ...]},',
            ' "corrections": {"field_name": "suggested_value", ...}}',
            '\nReturn ONLY the JSON response, no other text.'
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_validation_response(
        self, 
        response: str, 
        field_definitions: Dict[str, dict]
    ) -> ValidationResult:
        """Parse the LLM response into a ValidationResult."""
        try:
            # Extract JSON from the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start == -1 or json_end == 0:
                raise ValueError("Invalid response format")
                
            result = json.loads(response[json_start:json_end])
            
            return ValidationResult(
                is_valid=result.get('is_valid', False),
                errors=result.get('errors', {}),
                corrected_values=result.get('corrections', {})
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            return ValidationResult(
                is_valid=False,
                errors={"__all__": [f"Failed to parse validation response: {str(e)}"]}
            )

# Example usage:
# validator = LLMValidator(llm_service)
# result = await validator.validate_form_data(form_data, field_definitions)
