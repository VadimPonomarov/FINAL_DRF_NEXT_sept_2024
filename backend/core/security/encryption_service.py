"""
Secure encryption service for API keys and sensitive data.
"""
import os
import base64
import logging
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Service for encrypting and decrypting API keys and sensitive data.
    Uses Fernet symmetric encryption with PBKDF2 key derivation.
    """
    
    def __init__(self):
        self._fernet: Optional[Fernet] = None
        self._initialized = False
        
    def _get_encryption_key(self) -> bytes:
        """
        Generate encryption key from Django SECRET_KEY.
        
        Returns:
            bytes: Encryption key for Fernet
            
        Raises:
            ImproperlyConfigured: If SECRET_KEY is not available
        """
        secret_key = getattr(settings, "SECRET_KEY", None)
        
        if not secret_key:
            raise ImproperlyConfigured("Django SECRET_KEY is required for encryption")
            
        # Use a stable salt for consistent key generation
        salt = b"api_key_encryption_salt_v1"
        
        # Derive key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        return key
        
    def _initialize(self):
        """Initialize the encryption service."""
        if self._initialized:
            return
            
        try:
            key = self._get_encryption_key()
            self._fernet = Fernet(key)
            self._initialized = True
            logger.info("Encryption service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize encryption service: {e}")
            raise ImproperlyConfigured(f"Encryption initialization failed: {e}")
    
    def encrypt(self, data: str, context: str = "data") -> str:
        """
        Encrypt a string value.
        
        Args:
            data: String to encrypt
            context: Context for logging/debugging
            
        Returns:
            str: Base64 encoded encrypted data
            
        Raises:
            ValueError: If encryption fails
        """
        if not data:
            raise ValueError(f"Cannot encrypt empty {context}")
            
        self._initialize()
        
        try:
            encrypted_bytes = self._fernet.encrypt(data.encode('utf-8'))
            encrypted_str = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
            logger.debug(f"Successfully encrypted {context}")
            return encrypted_str
        except Exception as e:
            logger.error(f"Failed to encrypt {context}: {e}")
            raise ValueError(f"Encryption failed for {context}: {e}")
    
    def decrypt(self, encrypted_data: str, context: str = "data") -> str:
        """
        Decrypt a string value.
        
        Args:
            encrypted_data: Base64 encoded encrypted data
            context: Context for logging/debugging
            
        Returns:
            str: Decrypted string
            
        Raises:
            ValueError: If decryption fails
        """
        if not encrypted_data:
            raise ValueError(f"Cannot decrypt empty {context}")
            
        self._initialize()
        
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
            
            # Decrypt
            decrypted_bytes = self._fernet.decrypt(encrypted_bytes)
            decrypted_str = decrypted_bytes.decode('utf-8')
            
            logger.debug(f"Successfully decrypted {context}")
            return decrypted_str
        except Exception as e:
            logger.error(f"Failed to decrypt {context}: {e}")
            raise ValueError(f"Decryption failed for {context}: {e}")
    
    def encrypt_api_key(self, api_key: str, key_name: str) -> str:
        """
        Encrypt an API key.
        
        Args:
            api_key: The API key to encrypt
            key_name: Name of the API key for logging
            
        Returns:
            str: Encrypted API key
        """
        return self.encrypt(api_key, f"API key '{key_name}'")
    
    def decrypt_api_key(self, encrypted_key: str, key_name: str) -> str:
        """
        Decrypt an API key.
        
        Args:
            encrypted_key: The encrypted API key
            key_name: Name of the API key for logging
            
        Returns:
            str: Decrypted API key
        """
        return self.decrypt(encrypted_key, f"API key '{key_name}'")
    
    def is_encrypted(self, data: str) -> bool:
        """
        Check if data appears to be encrypted (Fernet format).

        Args:
            data: Data to check

        Returns:
            bool: True if data appears encrypted
        """
        if not data or not isinstance(data, str):
            return False

        # Fernet tokens start with gAAAAAB and are base64-like
        return (
            data.startswith('gAAAAAB') and
            len(data) > 50 and
            all(c in 'ABCDEFGHIJ KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=-_' for c in data)
        )

    def get_env_var(self, key: str, default: str = "", auto_decrypt: bool = True) -> str:
        """
        Get environment variable with automatic decryption if needed.

        Args:
            key: Environment variable name
            default: Default value if not found
            auto_decrypt: Whether to automatically decrypt if encrypted

        Returns:
            str: Decrypted value or original value
        """
        import os
        value = os.environ.get(key, default)

        if auto_decrypt and self.is_encrypted(value):
            try:
                return self.decrypt(value)
            except Exception as e:
                logger.warning(f"Failed to decrypt {key}: {e}")
                return value

        return value


# Global encryption service instance
encryption_service = EncryptionService()
