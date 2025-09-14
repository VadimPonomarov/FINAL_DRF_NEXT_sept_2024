#!/usr/bin/env python
"""
Simple script to test login functionality.
"""
import requests
import json

def test_login():
    """Test login with simple credentials."""

    # Test credentials
    test_users = [
        {"email": "admin@autoria.com", "password": "12345678", "role": "Admin"},
        {"email": "test.user@example.com", "password": "12345678", "role": "Regular User"},
        {"email": "seller1@gmail.com", "password": "12345678", "role": "Seller"},
        {"email": "buyer1@gmail.com", "password": "12345678", "role": "Buyer"},
    ]

    base_url = "http://127.0.0.1:8000"
    login_url = f"{base_url}/api/auth/login"

    print("🔐 Testing login functionality with simple credentials...")
    print("=" * 60)

    # First, test if the server is reachable
    try:
        health_response = requests.get(f"{base_url}/health/", timeout=5)
        print(f"🏥 Health check: {health_response.status_code}")
    except Exception as e:
        print(f"❌ Server not reachable: {e}")
        return

    for user in test_users:
        try:
            print(f"\n🧪 Testing {user['role']}: {user['email']}")
            print(f"   📡 Making request to: {login_url}")

            # Make login request with more detailed logging
            payload = {
                "email": user["email"],
                "password": user["password"]
            }
            print(f"   📦 Payload: {json.dumps(payload, indent=2)}")

            response = requests.post(
                login_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            print(f"   📊 Status Code: {response.status_code}")
            print(f"   📋 Response Headers: {dict(response.headers)}")

            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Login successful!")
                print(f"   🔑 Access Token: {data.get('access', 'N/A')[:50]}...")
                print(f"   👤 User ID: {data.get('user', {}).get('id', 'N/A')}")
                print(f"   📧 User Email: {data.get('user', {}).get('email', 'N/A')}")
            else:
                print(f"   ❌ Login failed!")
                try:
                    error_data = response.json()
                    print(f"   📝 Error Response: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   📝 Raw Response: {response.text}")

        except Exception as e:
            print(f"   ❌ Exception: {e}")

    print("\n" + "=" * 60)
    print("🎯 Login test completed!")

if __name__ == '__main__':
    test_login()
