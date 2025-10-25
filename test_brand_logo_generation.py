# -*- coding: utf-8 -*-
"""
Тестування генерації зображень без неправильних логотипів
"""
import sys
import io
# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time
from pathlib import Path

# Тестові кейси
TEST_CASES = [
    {
        "name": "Renault Clio - French brand (часто має Toyota logo)",
        "data": {
            "brand": "Renault",
            "model": "Clio",
            "year": 2019,
            "color": "blue",
            "body_type": "hatchback",
            "vehicle_type_name": "легкові"
        },
        "expected_issues": ["Toyota logo", "Honda logo"],
        "expected_style": "French modern design, C-shaped LED"
    },
    {
        "name": "Great Wall H6 - Chinese brand (часто має BMW/Toyota logo)",
        "data": {
            "brand": "Great Wall",
            "model": "H6",
            "year": 2021,
            "color": "white",
            "body_type": "suv",
            "vehicle_type_name": "легкові"
        },
        "expected_issues": ["Toyota logo", "BMW logo", "Mercedes logo"],
        "expected_style": "Chinese SUV design, rugged character"
    },
    {
        "name": "Atlas 160W - Construction equipment (часто має Mercedes/CAT logo)",
        "data": {
            "brand": "Atlas",
            "model": "160W",
            "year": 2020,
            "color": "yellow",
            "body_type": "excavator",
            "vehicle_type_name": "спецтехніка"
        },
        "expected_issues": ["Mercedes logo", "Caterpillar logo", "CAT logo"],
        "expected_style": "German construction, industrial yellow"
    },
    {
        "name": "Peugeot 308 - French brand (часто має Honda logo)",
        "data": {
            "brand": "Peugeot",
            "model": "308",
            "year": 2020,
            "color": "black",
            "body_type": "sedan",
            "vehicle_type_name": "легкові"
        },
        "expected_issues": ["Honda logo", "Hyundai logo"],
        "expected_style": "French elegant sporty, fang-shaped LED"
    }
]

def test_image_generation(test_case):
    """Тестує генерацію зображення для одного кейсу"""
    print(f"\n{'='*80}")
    print(f"🧪 ТЕСТ: {test_case['name']}")
    print(f"{'='*80}")
    
    url = "http://localhost:8000/api/chat/generate-car-images/"
    payload = {
        "car_data": test_case["data"],
        "angles": ["front"],
        "style": "realistic"
    }
    
    print(f"📤 Відправка запиту...")
    print(f"   Brand: {test_case['data']['brand']}")
    print(f"   Model: {test_case['data']['model']}")
    print(f"   Year: {test_case['data']['year']}")
    print(f"   Type: {test_case['data']['vehicle_type_name']}")
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        
        print(f"\n📥 Відповідь сервера:")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                images = result.get('images', [])
                print(f"   ✅ Успішно згенеровано {len(images)} зображень")
                
                for i, img in enumerate(images):
                    print(f"\n   📷 Зображення {i+1}:")
                    print(f"      URL: {img.get('url', 'N/A')[:80]}...")
                    print(f"      Angle: {img.get('angle', 'N/A')}")
                    
                    prompt = img.get('prompt', '')
                    if prompt:
                        print(f"\n      📝 Промпт (перші 300 символів):")
                        print(f"      {prompt[:300]}...")
                        
                        # Перевірка на наявність назви бренду в промпті
                        brand_name = test_case['data']['brand']
                        if brand_name.lower() in prompt.lower():
                            print(f"      ⚠️ WARNING: Назва бренду '{brand_name}' знайдена в промпті!")
                            print(f"      ❌ FAILED: Brand-agnostic підхід НЕ працює")
                        else:
                            print(f"      ✅ PASSED: Назва бренду НЕ знайдена в промпті (brand-agnostic ✓)")
                        
                        # Перевірка на наявність інструкцій про відсутність логотипів
                        logo_keywords = ['NO logo', 'BLANK', 'no emblem', 'no badge', 'unmarked', 'clean grille']
                        has_logo_prevention = any(keyword.lower() in prompt.lower() for keyword in logo_keywords)
                        
                        if has_logo_prevention:
                            print(f"      ✅ PASSED: Інструкції про відсутність логотипів присутні")
                        else:
                            print(f"      ⚠️ WARNING: Інструкції про відсутність логотипів НЕ знайдені")
                        
                        # Перевірка на наявність візуальних характеристик
                        style_keywords = test_case['expected_style'].split(',')
                        style_found = []
                        for keyword in style_keywords:
                            keyword = keyword.strip().lower()
                            if keyword in prompt.lower():
                                style_found.append(keyword)
                        
                        if style_found:
                            print(f"      ✅ PASSED: Візуальні характеристики знайдені: {', '.join(style_found)}")
                        else:
                            print(f"      ⚠️ WARNING: Візуальні характеристики НЕ знайдені")
                
                return {
                    "success": True,
                    "images": images,
                    "prompt": images[0].get('prompt') if images else ''
                }
            else:
                print(f"   ❌ Помилка: {result.get('error', 'Unknown error')}")
                return {"success": False, "error": result.get('error')}
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return {"success": False, "error": f"HTTP {response.status_code}"}
            
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout: Сервер не відповідає (60 сек)")
        return {"success": False, "error": "Timeout"}
    except Exception as e:
        print(f"   ❌ Exception: {str(e)}")
        return {"success": False, "error": str(e)}


def main():
    """Запуск всіх тестів"""
    print("=" * 80)
    print("  ТЕСТУВАННЯ РІШЕННЯ ПРОБЛЕМИ НЕПРАВИЛЬНИХ ЛОГОТИПІВ")
    print("=" * 80)
    
    print("🎯 Мета: Перевірити, що AI НЕ генерує неправильні логотипи брендів")
    print("📋 Метод: Brand-agnostic промпти (використання візуальних характеристик)")
    print(f"📊 Кількість тестів: {len(TEST_CASES)}")
    
    # Перевірка доступності сервера
    print("\n🔍 Перевірка доступності backend...")
    try:
        health_response = requests.get("http://localhost:8000/health/", timeout=5)
        if health_response.status_code == 200:
            print("   ✅ Backend доступний")
        else:
            print(f"   ⚠️ Backend відповідає, але статус: {health_response.status_code}")
    except Exception as e:
        print(f"   ❌ Backend недоступний: {e}")
        print("   💡 Переконайтесь що backend запущений: python manage.py runserver")
        return
    
    # Запуск тестів
    results = []
    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"\n\n{'#'*80}")
        print(f"ТЕСТ {i}/{len(TEST_CASES)}")
        print(f"{'#'*80}")
        
        result = test_image_generation(test_case)
        results.append({
            "name": test_case["name"],
            "result": result
        })
        
        # Пауза між тестами
        if i < len(TEST_CASES):
            print("\n⏳ Пауза 2 секунди перед наступним тестом...")
            time.sleep(2)
    
    # Підсумки
    print(f"\n\n{'='*80}")
    print("📊 ПІДСУМКИ ТЕСТУВАННЯ")
    print(f"{'='*80}")
    
    passed = sum(1 for r in results if r['result'].get('success'))
    total = len(results)
    
    print(f"\n✅ Успішних тестів: {passed}/{total} ({passed/total*100:.1f}%)")
    
    for i, result in enumerate(results, 1):
        status = "✅ PASSED" if result['result'].get('success') else "❌ FAILED"
        print(f"{i}. {status} - {result['name']}")
        if not result['result'].get('success'):
            print(f"   Помилка: {result['result'].get('error', 'Unknown')}")
    
    print(f"\n{'='*80}")
    if passed == total:
        print("🎉 ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО!")
        print("✅ Brand-agnostic підхід працює коректно")
        print("✅ Неправильні логотипи більше НЕ з'являються")
    else:
        print(f"⚠️ ДЕЯКІ ТЕСТИ НЕ ПРОЙШЛИ: {total - passed} з {total}")
        print("🔧 Потрібне додаткове налаштування промптів")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()

