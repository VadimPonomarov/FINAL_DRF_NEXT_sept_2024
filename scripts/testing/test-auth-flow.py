#!/usr/bin/env python3
"""
Автоматический тест полного flow аутентификации
Тестирует Level 1 (NextAuth) + Level 2 (Backend tokens)
"""

import requests
import json
import time

# Конфигурация
FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"
TEST_EMAIL = "pvs.versia@gmail.com"
TEST_PASSWORD = "12345678"

def test_backend_auth():
    """Тестирует backend аутентификацию напрямую"""
    print("🔐 Тестируем backend аутентификацию...")
    
    try:
        # Тестируем login endpoint
        login_url = f"{BACKEND_URL}/api/auth/login"
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        print(f"📡 POST {login_url}")
        print(f"📝 Data: {login_data}")
        
        response = requests.post(
            login_url,
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Status: {response.status_code}")
        print(f"📄 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend аутентификация успешна!")
            print(f"🔑 Access token: {data.get('access', 'N/A')[:50]}...")
            print(f"🔄 Refresh token: {data.get('refresh', 'N/A')[:50]}...")
            return True
        else:
            print(f"❌ Backend аутентификация неудачна: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка backend аутентификации: {e}")
        return False

def test_frontend_redis():
    """Тестирует Redis API frontend"""
    print("\n📦 Тестируем Redis API...")
    
    try:
        # Проверяем Redis API
        redis_url = f"{FRONTEND_URL}/api/redis?key=backend_auth"
        
        print(f"📡 GET {redis_url}")
        
        response = requests.get(redis_url, timeout=10)
        
        print(f"📊 Status: {response.status_code}")
        print(f"📄 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('exists'):
                print("✅ Backend токены найдены в Redis!")
                return True
            else:
                print("❌ Backend токены НЕ найдены в Redis")
                return False
        else:
            print(f"❌ Redis API недоступен: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка Redis API: {e}")
        return False

def test_frontend_auth_api():
    """Тестирует frontend auth API"""
    print("\n🌐 Тестируем frontend auth API...")

    try:
        # Тестируем правильный frontend auth endpoint
        auth_url = f"{FRONTEND_URL}/api/auth/login"
        auth_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        print(f"📡 POST {auth_url}")
        print(f"📝 Data: {auth_data}")
        
        response = requests.post(
            auth_url,
            json=auth_data,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"📊 Status: {response.status_code}")
        print(f"📄 Response: {response.text[:300]}...")
        
        if response.status_code == 200:
            print("✅ Frontend аутентификация успешна!")
            return True
        else:
            print(f"❌ Frontend аутентификация неудачна: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка frontend аутентификации: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🚀 АВТОМАТИЧЕСКИЙ ТЕСТ АУТЕНТИФИКАЦИИ")
    print("=" * 50)
    print(f"👤 Email: {TEST_EMAIL}")
    print(f"🔑 Password: {'*' * len(TEST_PASSWORD)}")
    print(f"🌐 Frontend: {FRONTEND_URL}")
    print(f"🔧 Backend: {BACKEND_URL}")
    print("=" * 50)
    
    # Тест 1: Backend API
    backend_ok = test_backend_auth()
    
    # Тест 2: Frontend Auth API
    frontend_ok = test_frontend_auth_api()
    
    # Тест 3: Redis проверка
    redis_ok = test_frontend_redis()
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:")
    print(f"🔧 Backend API: {'✅ OK' if backend_ok else '❌ FAIL'}")
    print(f"🌐 Frontend Auth: {'✅ OK' if frontend_ok else '❌ FAIL'}")
    print(f"📦 Redis Tokens: {'✅ OK' if redis_ok else '❌ FAIL'}")
    
    if all([backend_ok, frontend_ok, redis_ok]):
        print("\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        print("💡 Система аутентификации работает корректно")
    else:
        print("\n⚠️ ЕСТЬ ПРОБЛЕМЫ С АУТЕНТИФИКАЦИЕЙ")
        print("💡 Нужно исправить ошибки перед продолжением")

if __name__ == "__main__":
    main()
