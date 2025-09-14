#!/usr/bin/env python3
"""
Простой тест backend аутентификации
"""
import requests
import json

def test_backend_auth():
    print("🔧 Тестируем backend аутентификацию...")
    
    url = "http://localhost:8000/api/auth/login"
    data = {
        "email": "pvs.versia@gmail.com",
        "password": "12345678"
    }
    
    try:
        print(f"📡 POST {url}")
        print(f"📝 Data: {data}")
        
        response = requests.post(
            url,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status: {response.status_code}")
        print(f"📄 Response: {response.text}")

        if response.status_code == 200:
            result = response.json()
            print(f"🔍 Полный ответ: {json.dumps(result, indent=2)}")

            # Проверяем разные варианты токенов
            if "access_token" in result:
                print("✅ Backend аутентификация УСПЕШНА!")
                print(f"🔑 Access Token: {result['access_token'][:50]}...")
                return True
            elif "access" in result:
                print("✅ Backend аутентификация УСПЕШНА!")
                print(f"🔑 Access Token: {result['access'][:50]}...")
                return True
            elif "refresh" in result:
                print("✅ Backend аутентификация УСПЕШНА (только refresh токен)!")
                print(f"🔄 Refresh Token: {result['refresh'][:50]}...")
                return True
            else:
                print("❌ Нет токенов в ответе")
                return False
        else:
            print(f"❌ Backend аутентификация неудачна: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка backend аутентификации: {e}")
        return False

if __name__ == "__main__":
    print("🚀 ТЕСТ BACKEND АУТЕНТИФИКАЦИИ")
    print("=" * 50)
    
    success = test_backend_auth()
    
    print("=" * 50)
    if success:
        print("🎉 BACKEND РАБОТАЕТ!")
    else:
        print("❌ BACKEND НЕ РАБОТАЕТ!")
