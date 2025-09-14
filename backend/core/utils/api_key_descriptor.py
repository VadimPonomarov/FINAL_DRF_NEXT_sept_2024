"""
Descriptor for handling encrypted API keys with lazy decryption.
"""
from typing import Optional, TypeVar, Type, Any
import os

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .encryption import encryption_service

T = TypeVar('T', bound='EncryptedAPIKey')


class EncryptedAPIKey:
    """
    Descriptor for handling encrypted API keys with lazy decryption.
    
    Usage:
        class MySettings:
            GOOGLE_MAPS_API_KEY = EncryptedAPIKey(env_name='GOOGLE_MAPS_API_KEY')
    """
    
    def __init__(self, env_name: str, key_name: Optional[str] = None):
        """
        Initialize the descriptor.
        
        Args:
            env_name: Name of the environment variable containing the encrypted key
            key_name: Optional name for the key used in error messages (defaults to env_name)
        """
        self.env_name = env_name
        self.key_name = key_name or env_name
        self._value: Optional[str] = None
        self._decrypted_value: Optional[str] = None
    
    def __get__(self, obj: Any, objtype: Type[Any] = None) -> Optional[str]:
        """Get the decrypted API key."""
        if self._decrypted_value is not None:
            return self._decrypted_value
        
        # Try to get the encrypted value from settings first, then from os.environ
        encrypted_key = getattr(settings, self.env_name, None)
        
        if encrypted_key is None:
            # If not in settings, try os.environ directly
            encrypted_key = os.environ.get(self.env_name)
            
        if not encrypted_key:
            print(f"--- Error: No value found for {self.env_name} in settings or os.environ ---")
            return None
            
        # Remove any surrounding quotes from the key
        encrypted_key = str(encrypted_key).strip('"\'')
            
        try:
            # Decrypt the key
            self._decrypted_value = encryption_service.decrypt_api_key(
                encrypted_key, 
                self.key_name
            )
            return self._decrypted_value
        except Exception as e:
            raise ImproperlyConfigured(
                f"Failed to decrypt {self.key_name}: {str(e)}. "
                f"Encrypted key: {encrypted_key[:10]}..."
            )
    
    def __set__(self, obj: Any, value: str) -> None:
        """Set the API key (encrypts it before storing)."""
        if value is None:
            self._value = None
            self._decrypted_value = None
            return
            
        try:
            # Encrypt the key before storing
            self._value = encryption_service.encrypt_api_key(
                value,
                self.key_name
            )
            self._decrypted_value = value
        except Exception as e:
            raise ValueError(f"Failed to encrypt {self.key_name}: {str(e)}")
    
    @classmethod
    def encrypt_key(cls, key: str, key_name: str = "API_KEY") -> str:
        """Helper method to encrypt an API key."""
        return encryption_service.encrypt_api_key(key, key_name)
    
    @classmethod
    def get_encrypted_key(cls, key: str, key_name: str = "API_KEY") -> str:
        """
        Get the encrypted form of an API key.
        
        This is useful for generating the value to put in settings.
        """
        return cls.encrypt_key(key, key_name)
