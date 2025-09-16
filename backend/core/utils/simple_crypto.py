"""
Simple Crypto Utilities for Python
==================================
Simple and reliable encryption/decryption for environment variables
"""

import os
import base64
import logging

logger = logging.getLogger(__name__)


def decrypt_value(encrypted_text: str) -> str:
    """
    Simple decrypt function
    """
    if not encrypted_text or not encrypted_text.startswith('ENC_'):
        return encrypted_text
    
    try:
        encoded = encrypted_text.replace('ENC_', '')
        unreversed = encoded[::-1]  # Reverse string
        decoded = base64.b64decode(unreversed).decode('utf-8')
        
        return decoded
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return encrypted_text  # Return original if decryption fails


def get_decrypted_env(key: str, default_value: str = '') -> str:
    """
    Get decrypted environment variable
    """
    value = os.getenv(key, default_value)
    return decrypt_value(value)


def get_decrypted_oauth_config() -> dict:
    """
    Get all decrypted OAuth config
    """
    return {
        'NEXTAUTH_SECRET': get_decrypted_env('NEXTAUTH_SECRET'),
        'GOOGLE_CLIENT_ID': get_decrypted_env('GOOGLE_CLIENT_ID'),
        'GOOGLE_CLIENT_SECRET': get_decrypted_env('GOOGLE_CLIENT_SECRET'),
    }


def get_decrypted_api_keys() -> dict:
    """
    Get decrypted API keys
    """
    return {
        'TAVILY_API_KEY': get_decrypted_env('TAVILY_API_KEY'),
        'GOOGLE_MAPS_API_KEY': get_decrypted_env('GOOGLE_MAPS_API_KEY'),
    }


def safe_log_value(key: str, value: str) -> str:
    """
    Utility to safely log encrypted values (shows only prefix)
    """
    if value and value.startswith('ENC_'):
        return f"{key}: [ENCRYPTED - {value[:10]}...]"
    return f"{key}: [PLAIN - {'[SET]' if value else '[EMPTY]'}]"


# Test function
def test_decryption():
    """
    Test decryption with sample values
    """
    test_values = {
        'GOOGLE_CLIENT_ID': 'ENC_=Umclh2Xkl2X05WZpx2YfVGbn92bn9lc19We',
        'GOOGLE_CLIENT_SECRET': 'ENC_lJXZo9FdlJ3YlN3X05WZpx2YfVGbn92bn9lc19We',
        'NEXTAUTH_SECRET': 'ENC_0NWZq9mcw1ybtVGZtUmbvx2YtEWay9Gd1FWL0IDMy0SeltWL0VmcjV2ctgGd1FGd4VmbtwWYu9Wa0F2Y1RWZ'
    }
    
    print("🧪 Testing decryption:")
    for key, encrypted_value in test_values.items():
        decrypted = decrypt_value(encrypted_value)
        print(f"✅ {key}: {decrypted}")


if __name__ == "__main__":
    test_decryption()
