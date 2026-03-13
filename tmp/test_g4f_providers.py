#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test different g4f providers and configurations
"""
import sys

# Fix Unicode output for Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

def test_g4f_providers():
    """Test different g4f providers"""
    print("🔍 Testing g4f providers...")
    
    try:
        from g4f.client import Client
        from g4f.Provider import Pollinations
        
        # Test 1: Default client
        print("\n1. Testing default client...")
        try:
            client = Client()
            print("✅ Default client created successfully")
        except Exception as e:
            print(f"❌ Default client failed: {e}")
        
        # Test 2: Client with Pollinations provider
        print("\n2. Testing client with Pollinations provider...")
        try:
            client = Client(image_provider=Pollinations)
            print("✅ Pollinations client created successfully")
        except Exception as e:
            print(f"❌ Pollinations client failed: {e}")
        
        # Test 3: Try actual image generation
        print("\n3. Testing actual image generation...")
        try:
            client = Client(image_provider=Pollinations)
            response = client.images.generate(
                model="flux",
                prompt="a simple portrait",
                response_format="url",
                width=512,
                height=512,
                n=1
            )
            
            if response and hasattr(response, 'data') and response.data:
                image_url = response.data[0].url
                print(f"✅ Image generated: {image_url[:100]}...")
            else:
                print("❌ No image data returned")
                
        except Exception as e:
            print(f"❌ Image generation failed: {e}")
            
        # Test 4: Check available providers
        print("\n4. Checking available providers...")
        try:
            import g4f.Provider
            providers = [attr for attr in dir(g4f.Provider) if not attr.startswith('_')]
            print(f"Available providers: {providers}")
        except Exception as e:
            print(f"❌ Could not list providers: {e}")
            
    except ImportError as e:
        print(f"❌ g4f not available: {e}")
    except Exception as e:
        print(f"❌ General error: {e}")

def test_environment():
    """Test environment variables and settings"""
    print("\n🔍 Testing environment...")
    
    import os
    env_vars = [
        'G4F_PROVIDER',
        'G4F_MODEL', 
        'G4F_API_KEY',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY'
    ]
    
    for var in env_vars:
        value = os.environ.get(var, 'Not set')
        print(f"{var}: {value}")

def main():
    print("🚀 G4F Provider Test")
    print("=" * 50)
    
    test_environment()
    test_g4f_providers()

if __name__ == "__main__":
    main()
