#!/usr/bin/env python3
"""
Скрипт для создания Postman коллекции с динамическими ID
Этот скрипт исправляет проблему с несуществующими ID в тестах
"""

import json
import re
from pathlib import Path

def create_dynamic_collection():
    """Создает коллекцию с динамическими ID"""
    
    # Читаем оригинальную коллекцию
    original_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_AUTH_FIXED.postman_collection.json"
    
    if not original_file.exists():
        print(f"Файл {original_file} не найден!")
        return
    
    with open(original_file, 'r', encoding='utf-8') as f:
        collection = json.load(f)
    
    # Изменяем название и описание
    collection["info"]["name"] = "AutoRia API - Complete 184 Endpoints (Dynamic IDs Fixed)"
    collection["info"]["description"] = "Коллекция с динамическими ID для 100% успешности тестов"
    
    # Добавляем глобальные скрипты
    collection["event"] = [
        {
            "listen": "prerequest",
            "script": {
                "exec": [
                    "// Функция для получения случайного ID из сохраненного списка",
                    "function getRandomId(variableName, fallback = '1') {",
                    "    try {",
                    "        const ids = JSON.parse(pm.environment.get(variableName) || '[]');",
                    "        if (ids.length > 0) {",
                    "            return ids[Math.floor(Math.random() * ids.length)];",
                    "        }",
                    "    } catch (e) {",
                    "        console.log('Error getting random ID for', variableName, ':', e);",
                    "    }",
                    "    return fallback;",
                    "}",
                    "",
                    "// Устанавливаем динамические ID перед каждым запросом",
                    "pm.environment.set('dynamic_modification_id', getRandomId('modification_ids'));",
                    "pm.environment.set('dynamic_color_id', getRandomId('color_ids'));",
                    "pm.environment.set('dynamic_mark_id', getRandomId('mark_ids'));",
                    "pm.environment.set('dynamic_model_id', getRandomId('model_ids'));",
                    "pm.environment.set('dynamic_generation_id', getRandomId('generation_ids'));",
                    "pm.environment.set('dynamic_user_id', getRandomId('user_ids'));",
                    "pm.environment.set('dynamic_account_id', getRandomId('account_ids'));"
                ],
                "type": "text/javascript"
            }
        }
    ]
    
    # Создаем секцию Setup в начале коллекции
    setup_section = {
        "name": "🔧 Setup - Get All IDs (Run First!)",
        "item": []
    }
    
    # Список эндпоинтов для получения ID
    setup_endpoints = [
        {
            "name": "Setup - Get Modifications IDs",
            "url": "/api/ads/reference/modifications/",
            "variable": "modification_ids"
        },
        {
            "name": "Setup - Get Colors IDs", 
            "url": "/api/ads/reference/colors/",
            "variable": "color_ids"
        },
        {
            "name": "Setup - Get Marks IDs",
            "url": "/api/ads/reference/marks/",
            "variable": "mark_ids"
        },
        {
            "name": "Setup - Get Models IDs",
            "url": "/api/ads/reference/models/",
            "variable": "model_ids"
        },
        {
            "name": "Setup - Get Generations IDs",
            "url": "/api/ads/reference/generations/",
            "variable": "generation_ids"
        },
        {
            "name": "Setup - Get Users IDs",
            "url": "/api/users/",
            "variable": "user_ids"
        },
        {
            "name": "Setup - Get Accounts IDs",
            "url": "/api/accounts/",
            "variable": "account_ids"
        }
    ]
    
    # Создаем setup запросы
    for endpoint in setup_endpoints:
        setup_request = {
            "name": endpoint["name"],
            "request": {
                "method": "GET",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json"
                    },
                    {
                        "key": "Authorization", 
                        "value": "Bearer {{access_token}}"
                    }
                ],
                "url": {
                    "raw": "{{base_url}}" + endpoint["url"],
                    "host": ["{{base_url}}"],
                    "path": endpoint["url"].strip("/").split("/")
                }
            },
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "exec": [
                            "pm.test('Status code is not 500 (no server errors)', function () {",
                            "    pm.expect(pm.response.code).to.not.equal(500);",
                            "});",
                            "",
                            "if (pm.response.code === 200) {",
                            "    try {",
                            "        const response = pm.response.json();",
                            "        let ids = [];",
                            "        ",
                            "        if (response.results && Array.isArray(response.results)) {",
                            "            ids = response.results.map(item => item.id).filter(id => id);",
                            "        } else if (Array.isArray(response)) {",
                            "            ids = response.map(item => item.id).filter(id => id);",
                            "        }",
                            "        ",
                            "        if (ids.length > 0) {",
                            f"            pm.environment.set('{endpoint['variable']}', JSON.stringify(ids));",
                            f"            console.log('Saved {endpoint['variable']}:', ids.length, 'items');",
                            "        } else {",
                            f"            console.log('No IDs found for {endpoint['variable']}');",
                            "        }",
                            "    } catch (e) {",
                            f"        console.log('Error processing {endpoint['variable']}:', e);",
                            "    }",
                            "}"
                        ]
                    }
                }
            ]
        }
        setup_section["item"].append(setup_request)
    
    # Вставляем setup секцию в начало
    collection["item"].insert(0, setup_section)
    
    # Функция для замены {id} на динамические переменные
    def replace_ids_in_url(url_obj):
        """Заменяет {id} в URL на соответствующие динамические переменные"""
        if "path" in url_obj:
            new_path = []
            for segment in url_obj["path"]:
                if segment == "{id}":
                    # Определяем тип ID по пути
                    path_str = "/".join(url_obj["path"])
                    if "modifications" in path_str:
                        new_path.append("{{dynamic_modification_id}}")
                    elif "colors" in path_str:
                        new_path.append("{{dynamic_color_id}}")
                    elif "marks" in path_str:
                        new_path.append("{{dynamic_mark_id}}")
                    elif "models" in path_str:
                        new_path.append("{{dynamic_model_id}}")
                    elif "generations" in path_str:
                        new_path.append("{{dynamic_generation_id}}")
                    elif "users" in path_str:
                        new_path.append("{{dynamic_user_id}}")
                    elif "accounts" in path_str:
                        new_path.append("{{dynamic_account_id}}")
                    else:
                        new_path.append("{{dynamic_id}}")
                else:
                    new_path.append(segment)
            url_obj["path"] = new_path
        
        if "raw" in url_obj:
            # Заменяем в raw URL тоже
            raw_url = url_obj["raw"]
            if "modifications/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_modification_id}}")
            elif "colors/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_color_id}}")
            elif "marks/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_mark_id}}")
            elif "models/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_model_id}}")
            elif "generations/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_generation_id}}")
            elif "users/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_user_id}}")
            elif "accounts/{id}" in raw_url:
                raw_url = raw_url.replace("{id}", "{{dynamic_account_id}}")
            else:
                raw_url = raw_url.replace("{id}", "{{dynamic_id}}")
            url_obj["raw"] = raw_url
    
    # Рекурсивно обходим все элементы коллекции
    def process_items(items):
        for item in items:
            if "item" in item:  # Это папка
                process_items(item["item"])
            elif "request" in item:  # Это запрос
                if "url" in item["request"]:
                    replace_ids_in_url(item["request"]["url"])
    
    process_items(collection["item"])
    
    # Сохраняем новую коллекцию
    output_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS_FIXED.postman_collection.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Создана коллекция с динамическими ID: {output_file}")
    print("📋 Инструкции:")
    print("1. Импортируйте новую коллекцию в Postman")
    print("2. Сначала запустите папку '🔧 Setup - Get All IDs (Run First!)'")
    print("3. Затем запускайте остальные тесты")
    print("4. Все ID будут автоматически подставляться из реальных данных")

if __name__ == "__main__":
    create_dynamic_collection()
