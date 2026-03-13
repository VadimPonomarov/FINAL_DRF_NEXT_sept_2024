#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test g4f implementation for avatar generation
"""
import requests
import json
import sys

# Fix Unicode output for Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

BACKEND_URL = "https://autoria-web-production.up.railway.app"

def test_g4f_avatar():
    """Test g4f avatar generation"""
    print("🔍 Testing g4f avatar generation...")
    
    try:
        payload = {
            "first_name": "Test",
            "last_name": "User", 
            "age": 30,
            "gender": "neutral",
            "style": "realistic",
            "custom_requirements": "Professional portrait"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/users/profile/generate-avatar/",
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: {data.get('success', False)}")
            print(f"   Avatar URL: {data.get('avatar_url', 'None')}")
            
            # Check if using g4f or direct Pollinations
            avatar_url = data.get('avatar_url', '')
            if 'image.pollinations.ai' in avatar_url:
                print("   Method: Direct Pollinations.ai URL")
            elif 'picsum.photos' in avatar_url:
                print("   Method: Picsum fallback")
            else:
                print("   Method: Unknown/Other")
            
            return True
        else:
            print(f"❌ ERROR: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def test_g4f_car_images():
    """Test g4f car image generation"""
    print("\n🔍 Testing g4f car image generation...")
    
    try:
        payload = {
            "car_data": {
                "brand": "BMW",
                "model": "X5", 
                "year": 2020,
                "color": "black",
                "vehicle_type_name": "SUV"
            },
            "angles": ["front"],
            "style": "realistic"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/chat/generate-car-images/",
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: {data.get('success', False)}")
            
            images = data.get('images', [])
            if images:
                img = images[0]
                print(f"   Image URL: {img.get('url', 'None')}")
                print(f"   Method: {img.get('method', 'unknown')}")
                
                # Check URL type
                url = img.get('url', '')
                if 'image.pollinations.ai' in url:
                    print("   Provider: Pollinations.ai")
                elif 'picsum.photos' in url:
                    print("   Provider: Picsum fallback")
                else:
                    print("   Provider: g4f (possibly)")
            
            return True
        else:
            print(f"❌ ERROR: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

def main():
    print("🚀 G4F Implementation Test")
    print("=" * 50)
    
    test_g4f_avatar()
    test_g4f_car_images()

if __name__ == "__main__":
    main()
