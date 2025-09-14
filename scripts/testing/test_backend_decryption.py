#!/usr/bin/env python3
"""
Test Backend Decryption System
==============================
Tests Django backend decryption of API keys
"""

import os
import sys
import django

# Add backend to path
sys.path.append('backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.security.key_manager import KeyManager

def test_backend_decryption():
    print('🧪 Testing Backend Decryption System')
    print('====================================')
    
    km = KeyManager()
    
    # Test Tavily API key
    try:
        tavily_key = km.get_api_key('TAVILY_API_KEY')
        print(f'TAVILY_API_KEY: {"[DECRYPTED]" if tavily_key else "[FAILED]"}')
        if tavily_key:
            expected = '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'
            print(f'TAVILY_API_KEY matches: {"✅" if tavily_key == expected else "❌"}')
            if tavily_key != expected:
                print(f'  Expected: {expected}')
                print(f'  Got: {tavily_key}')
    except Exception as e:
        print(f'TAVILY_API_KEY: [ERROR] {e}')
    
    # Test Google Client Secret
    try:
        google_secret = km.get_api_key('GOOGLE_CLIENT_SECRET')
        print(f'GOOGLE_CLIENT_SECRET: {"[DECRYPTED]" if google_secret else "[FAILED]"}')
        if google_secret:
            expected = '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'
            print(f'GOOGLE_CLIENT_SECRET matches: {"✅" if google_secret == expected else "❌"}')
            if google_secret != expected:
                print(f'  Expected: {expected}')
                print(f'  Got: {google_secret}')
    except Exception as e:
        print(f'GOOGLE_CLIENT_SECRET: [ERROR] {e}')
    
    # Test Email Host Password
    try:
        email_password = km.get_api_key('EMAIL_HOST_PASSWORD')
        print(f'EMAIL_HOST_PASSWORD: {"[DECRYPTED]" if email_password else "[FAILED]"}')
        if email_password:
            expected = 'xrfv hsvi jjor ntgz'
            print(f'EMAIL_HOST_PASSWORD matches: {"✅" if email_password == expected else "❌"}')
            if email_password != expected:
                print(f'  Expected: {expected}')
                print(f'  Got: {email_password}')
    except Exception as e:
        print(f'EMAIL_HOST_PASSWORD: [ERROR] {e}')
    
    print('\n🎉 Backend decryption test completed!')

if __name__ == '__main__':
    test_backend_decryption()
