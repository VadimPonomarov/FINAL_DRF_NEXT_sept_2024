#!/usr/bin/env python3
"""
Backend Encryption Key Generator
===============================
Generates encryption key for backend service only.
"""

import os
from pathlib import Path
from cryptography.fernet import Fernet

def generate_backend_key():
    """Generate encryption key for backend service."""
    
    # Key file path
    key_file = Path(__file__).parent / "backend_encryption.key"
    
    if key_file.exists():
        print(f"🔑 Backend encryption key already exists: {key_file}")
        with open(key_file, 'rb') as f:
            key = f.read()
        print(f"✅ Key loaded successfully")
        return key
    
    # Generate new key
    key = Fernet.generate_key()
    
    # Save key
    with open(key_file, 'wb') as f:
        f.write(key)
    
    # Set restrictive permissions
    try:
        os.chmod(key_file, 0o600)
    except (OSError, AttributeError):
        pass  # Windows or permission error
    
    print(f"🔑 Generated new backend encryption key: {key_file}")
    print("⚠️  IMPORTANT: Backup this key file for backend service!")
    
    return key

if __name__ == "__main__":
    generate_backend_key()
