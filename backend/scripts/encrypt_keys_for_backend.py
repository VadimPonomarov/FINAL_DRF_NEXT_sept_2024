#!/usr/bin/env python3
"""
Скрипт для шифрования API ключей для backend Django.
Использует ту же систему шифрования, что и backend.
"""

import os
import sys
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Добавляем путь к backend для импорта
sys.path.append('backend')

def get_encryption_key() -> bytes:
    """
    Генерирует ключ шифрования из Django SECRET_KEY.
    Использует ту же логику, что и backend/core/security/encryption_service.py
    """
    # Используем тот же SECRET_KEY, что и в .env.secrets
    secret_key = "django-secure-k8x9m2n4p6q8r1s3t5u7v9w2x4y6z8a1b3c5d7e9f2g4h6i8j1k3l5m7n9o2p4q6r8s1t3u5v7w9x2y4z6"
    
    if not secret_key:
        raise ValueError("Django SECRET_KEY is required for encryption")
        
    # Используем ту же соль, что и в backend
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

def encrypt_api_key(data: str, context: str = "data") -> str:
    """
    Шифрует API ключ.
    Использует ту же логику, что и backend.
    """
    if not data:
        raise ValueError(f"Cannot encrypt empty {context}")
        
    key = get_encryption_key()
    fernet = Fernet(key)
    
    try:
        encrypted_bytes = fernet.encrypt(data.encode('utf-8'))
        encrypted_str = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
        print(f"✅ Successfully encrypted {context}")
        return encrypted_str
    except Exception as e:
        print(f"❌ Failed to encrypt {context}: {e}")
        raise ValueError(f"Encryption failed for {context}: {e}")

def main():
    """Шифрует все необходимые ключи для backend."""
    
    print("🔐 Шифрование API ключей для backend Django")
    print("=" * 50)
    
    # Ключи для шифрования (реальные значения)
    keys_to_encrypt = {
        'GOOGLE_CLIENT_SECRET': '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',
        'TAVILY_API_KEY': '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',
        # Placeholder ключи (нужно заменить на реальные)
        'GOOGLE_API_KEY': 'AIzaSyC_PLACEHOLDER_NEED_REAL_GOOGLE_API_KEY_HERE_39chars',
        'GOOGLE_MAPS_API_KEY': 'AIzaSyC_PLACEHOLDER_NEED_REAL_GOOGLE_MAPS_KEY_HERE_39chars',
    }
    
    encrypted_keys = {}
    
    for key_name, key_value in keys_to_encrypt.items():
        try:
            encrypted_value = encrypt_api_key(key_value, key_name)
            encrypted_key_name = f"ENCRYPTED_{key_name}"
            encrypted_keys[encrypted_key_name] = encrypted_value
            
            print(f"🔑 {key_name}:")
            print(f"   {encrypted_key_name}={encrypted_value}")
            print()
            
        except Exception as e:
            print(f"❌ Error encrypting {key_name}: {e}")
    
    print("\n📋 Результат для добавления в env-config/.env.secrets:")
    print("=" * 60)
    print("# =============================================================================")
    print("# ЗАШИФРОВАННЫЕ КЛЮЧИ ДЛЯ BACKEND (автоматически сгенерированы)")
    print("# =============================================================================")
    
    for encrypted_key_name, encrypted_value in encrypted_keys.items():
        print(f"{encrypted_key_name}={encrypted_value}")
    
    print("\n✅ Готово! Скопируйте зашифрованные ключи в env-config/.env.secrets")
    print("\n📝 Примечания:")
    print("- Backend будет автоматически расшифровывать эти ключи")
    print("- Placeholder ключи нужно заменить на реальные после получения")
    print("- Система fallback: если зашифрованный ключ не найден, используется обычный")

if __name__ == "__main__":
    main()
