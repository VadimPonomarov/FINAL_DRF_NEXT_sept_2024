"""
Key manager for handling encrypted API keys from environment variables.
"""
import os
import logging
from typing import Optional, Dict, Any
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from .encryption_service import encryption_service

logger = logging.getLogger(__name__)


class KeyManager:
    """
    Manager for handling encrypted API keys from environment variables.
    Provides centralized access to all API keys with automatic decryption.
    """
    
    def __init__(self):
        self._cache: Dict[str, Optional[str]] = {}
        self._encrypted_keys = {
            # Google Services - только зашифрованные ключи
            'GOOGLE_MAPS_API_KEY': 'ENCRYPTED_GOOGLE_MAPS_API_KEY',
            'GOOGLE_API_KEY': 'ENCRYPTED_GOOGLE_API_KEY',
            'GOOGLE_CLIENT_SECRET': 'ENCRYPTED_GOOGLE_CLIENT_SECRET',
            'TAVILY_API_KEY': 'ENCRYPTED_TAVILY_API_KEY',
            
            # Microsoft Services - direct variable names
            'BING_API_KEY': 'BING_API_KEY',

            # Other APIs - direct variable names (не зашифрованы)
            'RIZA_API_KEY': 'RIZA_API_KEY',
            'OPENAI_API_KEY': 'OPENAI_API_KEY',

            # Email Services - зашифрованные для backend
            'EMAIL_HOST_PASSWORD': 'ENCRYPTED_EMAIL_HOST_PASSWORD',
            'SENDGRID_API_KEY': 'SENDGRID_API_KEY',

            # Auth Services - direct variable names
            'NEXTAUTH_SECRET': 'NEXTAUTH_SECRET',
            'FACEBOOK_APP_SECRET': 'FACEBOOK_APP_SECRET',
            'TWITTER_API_SECRET': 'TWITTER_API_SECRET',
            'GITHUB_CLIENT_SECRET': 'GITHUB_CLIENT_SECRET',
        }
    
    def get_key(self, key_name: str, fallback_to_plain: bool = True) -> Optional[str]:
        """
        Get an API key, trying encrypted version first, then plain version.
        
        Args:
            key_name: Name of the API key (e.g., 'GOOGLE_MAPS_API_KEY')
            fallback_to_plain: Whether to fallback to plain text version
            
        Returns:
            str: Decrypted API key or None if not found
        """
        # Check cache first
        if key_name in self._cache:
            return self._cache[key_name]
        
        # Try to get encrypted version
        encrypted_key_name = self._encrypted_keys.get(key_name)
        if encrypted_key_name:
            encrypted_value = self._get_env_value(encrypted_key_name)
            if encrypted_value:
                try:
                    decrypted_key = encryption_service.decrypt_api_key(encrypted_value, key_name)
                    self._cache[key_name] = decrypted_key
                    logger.debug(f"Successfully decrypted {key_name}")
                    return decrypted_key
                except Exception as e:
                    logger.warning(f"Failed to decrypt {key_name}: {e}")
        
        # Fallback to plain text version if enabled (only in development)
        if fallback_to_plain and settings.DEBUG:
            plain_value = self._get_env_value(key_name)
            if plain_value:
                logger.warning(f"Using plain text {key_name} - consider encrypting it")
                self._cache[key_name] = plain_value
                return plain_value
        elif fallback_to_plain and not settings.DEBUG:
            logger.error(f"Plain text fallback disabled in production for {key_name}")
            # No fallback in production for security
        
        # Key not found
        logger.debug(f"API key {key_name} not found")
        self._cache[key_name] = None
        return None
    
    def _get_env_value(self, key_name: str) -> Optional[str]:
        """
        Get value from environment variables or Django settings.
        
        Args:
            key_name: Environment variable name
            
        Returns:
            str: Environment variable value or None
        """
        # Try Django settings first
        value = getattr(settings, key_name, None)
        if value:
            return str(value).strip('"\'')
        
        # Try os.environ
        value = os.environ.get(key_name)
        if value:
            return str(value).strip('"\'')
        
        return None
    
    def encrypt_and_store_key(self, key_name: str, api_key: str) -> str:
        """
        Encrypt an API key and return the encrypted version.
        
        Args:
            key_name: Name of the API key
            api_key: Plain text API key
            
        Returns:
            str: Encrypted API key
        """
        if not api_key or not api_key.strip():
            raise ValueError(f"API key {key_name} cannot be empty")
        
        encrypted_key = encryption_service.encrypt_api_key(api_key, key_name)
        
        # Clear cache for this key
        if key_name in self._cache:
            del self._cache[key_name]
        
        logger.info(f"Successfully encrypted {key_name}")
        return encrypted_key
    
    def validate_key(self, key_name: str) -> bool:
        """
        Validate that an API key is available and can be decrypted.
        
        Args:
            key_name: Name of the API key to validate
            
        Returns:
            bool: True if key is valid and accessible
        """
        try:
            key = self.get_key(key_name, fallback_to_plain=False)
            return key is not None and len(key.strip()) > 0
        except Exception as e:
            logger.error(f"Validation failed for {key_name}: {e}")
            return False
    
    def list_available_keys(self) -> Dict[str, bool]:
        """
        List all configured API keys and their availability status.
        
        Returns:
            dict: Mapping of key names to availability status
        """
        status = {}
        for key_name in self._encrypted_keys.keys():
            status[key_name] = self.validate_key(key_name)
        return status
    
    def clear_cache(self):
        """Clear the decrypted keys cache."""
        self._cache.clear()
        logger.debug("Key cache cleared")
    
    # Convenience methods for commonly used keys
    @property
    def google_maps_api_key(self) -> Optional[str]:
        """Get Google Maps API key."""
        return self.get_key('GOOGLE_MAPS_API_KEY')
    
    @property
    def google_api_key(self) -> Optional[str]:
        """Get Google API key."""
        return self.get_key('GOOGLE_API_KEY')
    
    @property
    def google_search_engine_id(self) -> Optional[str]:
        """Get Google Search Engine ID."""
        return self.get_key('GOOGLE_SEARCH_ENGINE_ID')
    
    @property
    def bing_api_key(self) -> Optional[str]:
        """Get Bing API key."""
        return self.get_key('BING_API_KEY')
    
    @property
    def riza_api_key(self) -> Optional[str]:
        """Get Riza API key."""
        return self.get_key('RIZA_API_KEY')
    
    @property
    def openai_api_key(self) -> Optional[str]:
        """Get OpenAI API key."""
        return self.get_key('OPENAI_API_KEY')


# Global key manager instance
key_manager = KeyManager()
