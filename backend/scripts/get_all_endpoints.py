#!/usr/bin/env python3
"""
Скрипт для получения всех эндпоинтов из Swagger документации
и создания полной Postman коллекции
"""

import requests
import json
from pathlib import Path

def get_all_endpoints():
    """Получить все эндпоинты из Swagger"""
    try:
        print("🔍 Получаем все эндпоинты из Swagger...")
        response = requests.get("http://localhost:8000/api/doc/?format=json", timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Ошибка получения Swagger: {response.status_code}")
            return []
        
        swagger_data = response.json()
        endpoints = []
        
        for path, methods in swagger_data.get('paths', {}).items():
            for method, details in methods.items():
                if isinstance(details, dict):
                    endpoint = {
                        'path': path,
                        'method': method.upper(),
                        'tags': details.get('tags', []),
                        'summary': details.get('summary', ''),
                        'parameters': details.get('parameters', []),
                        'security': details.get('security', []),
                        'operationId': details.get('operationId', ''),
                        'responses': details.get('responses', {})
                    }
                    endpoints.append(endpoint)
        
        print(f"✅ Найдено {len(endpoints)} эндпоинтов")
        return endpoints
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return []

def create_postman_request(endpoint):
    """Создать Postman запрос из эндпоинта"""
    method = endpoint['method']
    path = endpoint['path']
    summary = endpoint.get('summary', '')
    
    # Заголовки
    headers = [
        {
            "key": "Content-Type",
            "value": "application/json"
        }
    ]
    
    # Добавляем авторизацию если нужна
    if endpoint.get('security'):
        headers.append({
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
        })
    
    # Создаем URL с переменными
    url_path = path
    # Заменяем {id} на переменные Postman
    if '{id}' in url_path:
        if 'modification' in url_path:
            url_path = url_path.replace('{id}', '{{modification_id}}')
        elif 'color' in url_path:
            url_path = url_path.replace('{id}', '{{color_id}}')
        elif 'mark' in url_path:
            url_path = url_path.replace('{id}', '{{mark_id}}')
        elif 'model' in url_path:
            url_path = url_path.replace('{id}', '{{model_id}}')
        elif 'generation' in url_path:
            url_path = url_path.replace('{id}', '{{generation_id}}')
        elif 'user' in url_path:
            url_path = url_path.replace('{id}', '{{user_id}}')
        elif 'account' in url_path:
            url_path = url_path.replace('{id}', '{{account_id}}')
        else:
            url_path = url_path.replace('{id}', '{{id}}')
    
    # Создаем тело запроса для POST/PUT/PATCH
    body = None
    if method in ['POST', 'PUT', 'PATCH']:
        if 'modification' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "name": f"Test Modification {{{{$timestamp}}}}",
                    "generation": "{{generation_id}}",
                    "engine_type": "gasoline",
                    "engine_volume": "2.0",
                    "power_hp": 150,
                    "transmission": "manual",
                    "drive_type": "front"
                }, indent=2)
            }
        elif 'color' in path:
            body = {
                "mode": "raw", 
                "raw": json.dumps({
                    "name": f"Test Color {{{{$timestamp}}}}",
                    "hex_code": "#FF0000",
                    "is_metallic": False,
                    "is_pearlescent": False,
                    "is_popular": False
                }, indent=2)
            }
        elif 'mark' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "name": f"Test Mark {{{{$timestamp}}}}",
                    "vehicle_type": 1,
                    "is_popular": False
                }, indent=2)
            }
        elif 'model' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "name": f"Test Model {{{{$timestamp}}}}",
                    "mark": "{{mark_id}}",
                    "is_popular": False
                }, indent=2)
            }
        elif 'generation' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "name": f"Test Generation {{{{$timestamp}}}}",
                    "model": "{{model_id}}",
                    "year_start": 2020,
                    "year_end": 2025
                }, indent=2)
            }
        elif 'user' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "email": f"test{{{{$timestamp}}}}@example.com",
                    "password": "TestPass123!",
                    "first_name": "Test",
                    "last_name": "User"
                }, indent=2)
            }
        elif 'account' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "user": "{{user_id}}",
                    "account_type": "basic",
                    "phone": "+380501234567"
                }, indent=2)
            }
        elif 'auth/login' in path:
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "email": "{{test_email}}",
                    "password": "{{test_password}}"
                }, indent=2)
            }
        else:
            # Общий шаблон для других эндпоинтов
            body = {
                "mode": "raw",
                "raw": json.dumps({
                    "name": f"Test Data {{{{$timestamp}}}}"
                }, indent=2)
            }
    
    # Создаем Postman запрос
    request = {
        "name": f"{method} {path}" + (f" - {summary}" if summary else ""),
        "request": {
            "method": method,
            "header": headers,
            "url": {
                "raw": "{{base_url}}" + url_path,
                "host": ["{{base_url}}"],
                "path": url_path.strip("/").split("/") if url_path.strip("/") else []
            }
        },
        "event": [
            {
                "listen": "test",
                "script": {
                    "exec": [
                        "// Базовые тесты для всех запросов",
                        "pm.test('Response time is acceptable (< 10 seconds)', function () {",
                        "    pm.expect(pm.response.responseTime).to.be.below(10000);",
                        "});",
                        "",
                        "pm.test('No server errors (500)', function () {",
                        "    pm.expect(pm.response.code).to.not.equal(500);",
                        "});",
                        "",
                        "// Сохраняем токен из логина",
                        "if (pm.info.requestName.includes('login') && pm.response.code === 200) {",
                        "    try {",
                        "        const response = pm.response.json();",
                        "        if (response.access) {",
                        "            pm.environment.set('access_token', response.access);",
                        "            console.log('✅ Access token updated');",
                        "        }",
                        "    } catch (e) {",
                        "        // Игнорируем ошибки парсинга",
                        "    }",
                        "}",
                        "",
                        "// Сохраняем ID созданных объектов",
                        "if (pm.response.code === 201) {",
                        "    try {",
                        "        const response = pm.response.json();",
                        "        if (response.id) {",
                        "            const requestName = pm.info.requestName.toLowerCase();",
                        "            if (requestName.includes('modification')) {",
                        "                pm.environment.set('created_modification_id', response.id);",
                        "            } else if (requestName.includes('color')) {",
                        "                pm.environment.set('created_color_id', response.id);",
                        "            } else if (requestName.includes('mark')) {",
                        "                pm.environment.set('created_mark_id', response.id);",
                        "            } else if (requestName.includes('model')) {",
                        "                pm.environment.set('created_model_id', response.id);",
                        "            } else if (requestName.includes('generation')) {",
                        "                pm.environment.set('created_generation_id', response.id);",
                        "            } else if (requestName.includes('user')) {",
                        "                pm.environment.set('created_user_id', response.id);",
                        "            } else if (requestName.includes('account')) {",
                        "                pm.environment.set('created_account_id', response.id);",
                        "            }",
                        "        }",
                        "    } catch (e) {",
                        "        // Игнорируем ошибки парсинга",
                        "    }",
                        "}"
                    ],
                    "type": "text/javascript"
                }
            }
        ]
    }
    
    if body:
        request["request"]["body"] = body
    
    return request

def group_endpoints_by_tags(endpoints):
    """Группировать эндпоинты по тегам"""
    groups = {}
    
    for endpoint in endpoints:
        tags = endpoint.get('tags', ['Other'])
        tag = tags[0] if tags else 'Other'
        
        if tag not in groups:
            groups[tag] = []
        groups[tag].append(endpoint)
    
    return groups

def create_full_postman_collection(endpoints):
    """Создать полную Postman коллекцию"""
    print("📝 Создаем полную Postman коллекцию...")
    
    # Группируем эндпоинты
    groups = group_endpoints_by_tags(endpoints)
    
    collection = {
        "info": {
            "name": f"AutoRia API - Complete {len(endpoints)} Endpoints (Full Swagger)",
            "description": f"Полная коллекция всех {len(endpoints)} эндпоинтов из Swagger документации",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "event": [
            {
                "listen": "prerequest",
                "script": {
                    "exec": [
                        "// Глобальные переменные для всех запросов",
                        "console.log('🔄 Pre-request script executed for:', pm.info.requestName);"
                    ],
                    "type": "text/javascript"
                }
            }
        ],
        "item": []
    }
    
    # Создаем группы
    for tag, tag_endpoints in groups.items():
        group_item = {
            "name": f"📁 {tag} ({len(tag_endpoints)} endpoints)",
            "item": []
        }
        
        for endpoint in tag_endpoints:
            request = create_postman_request(endpoint)
            group_item["item"].append(request)
        
        collection["item"].append(group_item)
    
    return collection

def main():
    """Основная функция"""
    print("🚀 Создание полной Postman коллекции из Swagger")
    print("=" * 60)
    
    # Получаем все эндпоинты
    endpoints = get_all_endpoints()
    if not endpoints:
        print("❌ Не удалось получить эндпоинты")
        return False
    
    # Создаем коллекцию
    collection = create_full_postman_collection(endpoints)
    
    # Сохраняем коллекцию
    output_file = Path(__file__).parent.parent / f"AutoRia_Complete_{len(endpoints)}_Endpoints_FULL_SWAGGER.postman_collection.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Создана полная коллекция: {output_file}")
    print(f"📊 Всего эндпоинтов: {len(endpoints)}")
    print(f"📊 Всего групп: {len(collection['item'])}")
    
    # Показываем статистику по группам
    print("\n📋 Статистика по группам:")
    for item in collection['item']:
        print(f"  - {item['name']}")
    
    return True

if __name__ == "__main__":
    main()
