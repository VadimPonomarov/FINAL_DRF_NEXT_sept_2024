"""
Core schemas package for the Car Sales Platform API.
Contains common schemas, parameters, and utilities used across all applications.
"""

from .common_schemas import (
    # Common responses
    COMMON_RESPONSES,
    AUTH_RESPONSES,
    
    # Common parameters
    SEARCH_PARAM,
    ORDERING_PARAM,
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
    IS_POPULAR_PARAM,
    ID_PARAM,
    PK_PARAM,
    
    # Security
    NO_AUTH,
    
    # Canonical tags
    CANONICAL_TAGS,
    
    # Schema examples
    PAGINATION_EXAMPLE,
    ERROR_EXAMPLE,
    VALIDATION_ERROR_EXAMPLE,
    
    # Response schemas
    PAGINATION_SCHEMA,
    ERROR_SCHEMA,
    VALIDATION_ERROR_SCHEMA,
    
    # Helper functions
    get_list_responses,
    get_detail_responses,
    get_create_responses,
    get_update_responses,
    get_delete_responses,
)

__all__ = [
    # Common responses
    'COMMON_RESPONSES',
    'AUTH_RESPONSES',
    
    # Common parameters
    'SEARCH_PARAM',
    'ORDERING_PARAM',
    'PAGE_PARAM',
    'PAGE_SIZE_PARAM',
    'IS_POPULAR_PARAM',
    'ID_PARAM',
    'PK_PARAM',
    
    # Security
    'NO_AUTH',
    
    # Canonical tags
    'CANONICAL_TAGS',
    
    # Schema examples
    'PAGINATION_EXAMPLE',
    'ERROR_EXAMPLE',
    'VALIDATION_ERROR_EXAMPLE',
    
    # Response schemas
    'PAGINATION_SCHEMA',
    'ERROR_SCHEMA',
    'VALIDATION_ERROR_SCHEMA',
    
    # Helper functions
    'get_list_responses',
    'get_detail_responses',
    'get_create_responses',
    'get_update_responses',
    'get_delete_responses',
]
