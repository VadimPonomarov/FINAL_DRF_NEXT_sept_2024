"""
Descriptor for handling encrypted API keys with lazy decryption.
"""
import logging
from typing import Optional, Any, Type
from django.core.exceptions import ImproperlyConfigured
from .key_manager import key_manager

logger = logging.getLogger(__name__)


class EncryptedAPIKey:
    """
    Descriptor for handling encrypted API keys with lazy decryption.
    
    Usage:
        class MySettings:
            GOOGLE_MAPS_API_KEY = EncryptedAPIKey('GOOGLE_MAPS_API_KEY')
            
        # Access the key
        settings = MySettings()
        api_key = settings.GOOGLE_MAPS_API_KEY  # Automatically decrypted
    """
    
    def __init__(self, key_name: str, required: bool = False, fallback_to_plain: bool = True):
        """
        Initialize the descriptor.
        
        Args:
            key_name: Name of the API key environment variable
            required: Whether this key is required (raises error if missing)
            fallback_to_plain: Whether to fallback to plain text version
        """
        self.key_name = key_name
        self.required = required
        self.fallback_to_plain = fallback_to_plain
        self._cached_value: Optional[str] = None
        self._accessed = False
    
    def __get__(self, obj: Any, objtype: Type[Any] = None) -> Optional[str]:
        """Get the decrypted API key."""
        # Return cached value if already accessed
        if self._accessed:
            return self._cached_value
        
        try:
            # Get the key using key manager
            self._cached_value = key_manager.get_key(
                self.key_name, 
                fallback_to_plain=self.fallback_to_plain
            )
            self._accessed = True
            
            # Check if required key is missing
            if self.required and not self._cached_value:
                raise ImproperlyConfigured(
                    f"Required API key '{self.key_name}' is not configured. "
                    f"Please set ENCRYPTED_{self.key_name} in your environment variables."
                )
            
            return self._cached_value
            
        except Exception as e:
            if self.required:
                raise ImproperlyConfigured(
                    f"Failed to get required API key '{self.key_name}': {e}"
                )
            else:
                logger.warning(f"Failed to get optional API key '{self.key_name}': {e}")
                return None
    
    def __set__(self, obj: Any, value: str) -> None:
        """Set the API key (for testing purposes)."""
        self._cached_value = value
        self._accessed = True
    
    def __delete__(self, obj: Any) -> None:
        """Clear the cached value."""
        self._cached_value = None
        self._accessed = False
    
    def refresh(self) -> None:
        """Force refresh of the cached value."""
        self._cached_value = None
        self._accessed = False
        # Clear key manager cache for this key
        if self.key_name in key_manager._cache:
            del key_manager._cache[self.key_name]
    
    def is_available(self) -> bool:
        """Check if the API key is available without caching the result."""
        return key_manager.validate_key(self.key_name)
    
    @classmethod
    def encrypt_key(cls, api_key: str, key_name: str) -> str:
        """
        Helper method to encrypt an API key.
        
        Args:
            api_key: Plain text API key
            key_name: Name of the API key
            
        Returns:
            str: Encrypted API key
        """
        return key_manager.encrypt_and_store_key(key_name, api_key)
