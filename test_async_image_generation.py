# -*- coding: utf-8 -*-
"""
Комплексний тест асинхронної генерації зображень

Тестує:
1. Швидкість роботи (async vs sync)
2. Консистентність (один автомобіль на всіх ракурсах)
3. Релевантність (відповідність параметрам: тип, марка, модель, колір, стан)
4. Якість логотипів (правильні brand badges)
"""
import sys
import io
import requests
import json
import time
from datetime import datetime
from typing import Dict, List
from pathlib import Path

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BACKEND_URL = "http://localhost:8000/api/chat/generate-car-images/"
HEALTH_CHECK_URL = "http://localhost:8000/health/"

# Тестові кейси з різними параметрами
TEST_CASES = [
    {
        "name": "Test 1: Renault Clio - Проблемний логотип (часто Toyota)",
        "car_data": {
            "brand": "Renault",
            "model": "Clio",
            "year": 2019,
            "color": "blue",
            "vehicle_type_name": "легкові",
            "body_type": "hatchback",
            "condition": "excellent",
            "description": "Compact French hatchback with diamond logo"
        },
        "angles": ["front", "side", "rear"],
        "expected_logo": "Renault diamond",
        "wrong_logos": ["Toyota oval", "Honda H"]
    },
    {
        "name": "Test 2: Mercedes-Benz E-Class - Популярний бренд",
        "car_data": {
            "brand": "Mercedes-Benz",
            "model": "E-Class",
            "year": 2021,
            "color": "black",
            "vehicle_type_name": "легкові",
            "body_type": "sedan",
            "condition": "excellent",
            "description": "Luxury German sedan with three-pointed star emblem"
        },
        "angles": ["front", "side", "rear"],
        "expected_logo": "Mercedes star",
        "wrong_logos": ["BMW roundel", "Audi rings"]
    },
    {
        "name": "Test 3: Great Wall H6 - Китайський бренд (часто BMW/Toyota)",
        "car_data": {
            "brand": "Great Wall",
            "model": "H6",
            "year": 2020,
            "color": "white",
            "vehicle_type_name": "легкові",
            "body_type": "suv",
            "condition": "good",
            "description": "Chinese SUV with distinctive front grille"
        },
        "angles": ["front", "side"],
        "expected_logo": "Great Wall badge",
        "wrong_logos": ["BMW roundel", "Toyota oval"]
    },
    {
        "name": "Test 4: BMW X5 - Червоний колір (складний для AI)",
        "car_data": {
            "brand": "BMW",
            "model": "X5",
            "year": 2022,
            "color": "red",
            "vehicle_type_name": "легкові",
            "body_type": "suv",
            "condition": "excellent",
            "description": "Luxury German SUV in bright red color"
        },
        "angles": ["front", "side", "rear"],
        "expected_logo": "BMW roundel",
        "wrong_logos": ["Mercedes star", "Audi rings"]
    },
    {
        "name": "Test 5: Peugeot 308 - Французький бренд (часто Honda)",
        "car_data": {
            "brand": "Peugeot",
            "model": "308",
            "year": 2020,
            "color": "silver",
            "vehicle_type_name": "легкові",
            "body_type": "hatchback",
            "condition": "good",
            "description": "French hatchback with lion emblem"
        },
        "angles": ["front", "side"],
        "expected_logo": "Peugeot lion",
        "wrong_logos": ["Honda H", "Hyundai H"]
    },
]


def check_backend_health():
    """Перевіряє доступність backend."""
    try:
        response = requests.get(HEALTH_CHECK_URL, timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def generate_images(test_case: Dict) -> Dict:
    """
    Генерує зображення для тестового кейсу.
    
    Returns:
        dict: {
            'success': bool,
            'duration': float,
            'images': list,
            'error': str (if failed)
        }
    """
    payload = {
        "car_data": test_case["car_data"],
        "angles": test_case["angles"],
        "style": "realistic",
        "use_mock_algorithm": True
    }
    
    start_time = time.time()
    
    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=120)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            return {
                'success': True,
                'duration': duration,
                'response': result,
                'images': result.get('images', []),
                'session_id': result.get('session_id', '')
            }
        else:
            return {
                'success': False,
                'duration': duration,
                'error': f"HTTP {response.status_code}: {response.text[:200]}"
            }
            
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'duration': time.time() - start_time,
            'error': "Request timeout (120s)"
        }
    except Exception as e:
        return {
            'success': False,
            'duration': time.time() - start_time,
            'error': str(e)
        }


def evaluate_consistency(images: List[Dict], session_id: str) -> Dict:
    """
    Оцінює консистентність зображень.
    
    Перевіряє:
    - Всі зображення мають один session_id
    - Кожне зображення має унікальний seed
    """
    session_ids = set()
    seeds = []
    
    for img in images:
        session_ids.add(img.get('session_id', ''))
        seeds.append(img.get('seed'))
    
    # Перевірка session_id
    single_session = len(session_ids) == 1 and session_id in session_ids
    
    # Перевірка унікальності seeds
    unique_seeds = len(seeds) == len(set(seeds))
    
    # Перевірка наявності consistency hints в промптах
    consistency_in_prompts = 0
    for img in images:
        prompt = img.get('prompt', '').lower()
        if 'consistency' in prompt or 'same vehicle' in prompt or session_id.lower() in prompt:
            consistency_in_prompts += 1
    
    score = 0
    if single_session:
        score += 40  # 40% за єдиний session_id
    if unique_seeds:
        score += 30  # 30% за унікальні seeds
    if consistency_in_prompts == len(images):
        score += 30  # 30% за consistency hints
    
    return {
        'score': score,
        'single_session_id': single_session,
        'unique_seeds': unique_seeds,
        'consistency_hints': consistency_in_prompts == len(images),
        'session_ids': list(session_ids),
        'seeds': seeds
    }


def evaluate_relevance(images: List[Dict], car_data: Dict) -> Dict:
    """
    Оцінює релевантність зображень параметрам.
    
    Перевіряє наявність в промптах:
    - brand, model, year
    - color
    - body_type / vehicle_type
    - condition (опціонально)
    """
    brand = car_data.get('brand', '').lower()
    model = car_data.get('model', '').lower()
    year = str(car_data.get('year', ''))
    color = car_data.get('color', '').lower()
    body_type = car_data.get('body_type', '').lower()
    
    relevance_scores = []
    
    for img in images:
        prompt = img.get('prompt', '').lower()
        angle = img.get('angle', '')
        
        score = 0
        details = {
            'angle': angle,
            'brand': brand in prompt,
            'model': model in prompt,
            'year': year in prompt,
            'color': color in prompt,
            'body_type': body_type in prompt or 'suv' in prompt or 'sedan' in prompt or 'hatchback' in prompt
        }
        
        # Підрахунок балів
        if details['brand']:
            score += 30
        if details['model']:
            score += 20
        if details['year']:
            score += 10
        if details['color']:
            score += 25
        if details['body_type']:
            score += 15
        
        relevance_scores.append({
            'angle': angle,
            'score': score,
            'details': details
        })
    
    avg_score = sum(r['score'] for r in relevance_scores) / len(relevance_scores) if relevance_scores else 0
    
    return {
        'average_score': round(avg_score, 1),
        'per_angle': relevance_scores,
        'all_angles_relevant': all(r['score'] >= 70 for r in relevance_scores)
    }


def evaluate_logo_quality(images: List[Dict], expected_logo: str, wrong_logos: List[str]) -> Dict:
    """
    Оцінює якість логотипів в промптах.
    
    Перевіряє:
    - Наявність згадки правильного логотипу
    - Відсутність згадки неправильних логотипів
    - Наявність негативних інструкцій (NOT ...)
    """
    logo_scores = []
    
    for img in images:
        prompt = img.get('prompt', '').lower()
        angle = img.get('angle', '')
        
        score = 0
        details = {
            'angle': angle,
            'has_expected_logo': False,
            'has_wrong_logo': False,
            'has_negative_instructions': False,
            'has_logo_description': False
        }
        
        # Перевірка очікуваного логотипу (ключові слова)
        expected_keywords = expected_logo.lower().split()
        if any(keyword in prompt for keyword in expected_keywords):
            details['has_expected_logo'] = True
            score += 40
        
        # Перевірка неправильних логотипів (НЕ повинні бути)
        has_wrong = False
        for wrong_logo in wrong_logos:
            if wrong_logo.lower() in prompt:
                has_wrong = True
                break
        details['has_wrong_logo'] = has_wrong
        if not has_wrong:
            score += 30
        
        # Перевірка негативних інструкцій (NOT ...)
        if 'not ' in prompt or 'instead of' in prompt:
            details['has_negative_instructions'] = True
            score += 15
        
        # Перевірка наявності візуальних описів (shape, color, emblem, badge, grille)
        visual_keywords = ['shape', 'emblem', 'badge', 'grille', 'logo', 'roundel', 'star', 'oval', 'diamond']
        if any(keyword in prompt for keyword in visual_keywords):
            details['has_logo_description'] = True
            score += 15
        
        logo_scores.append({
            'angle': angle,
            'score': score,
            'details': details
        })
    
    avg_score = sum(l['score'] for l in logo_scores) / len(logo_scores) if logo_scores else 0
    
    return {
        'average_score': round(avg_score, 1),
        'per_angle': logo_scores,
        'all_logos_good': all(l['score'] >= 70 for l in logo_scores)
    }


def print_test_header(test_num: int, total: int, test_name: str):
    """Друкує заголовок тесту."""
    print("\n" + "=" * 100)
    print(f"ТЕСТ {test_num}/{total}: {test_name}")
    print("=" * 100)


def print_test_results(result: Dict, test_case: Dict):
    """Друкує результати тесту."""
    if not result['success']:
        print(f"\n❌ ПОМИЛКА: {result.get('error', 'Unknown error')}")
        print(f"   Час виконання: {result['duration']:.2f}s")
        return
    
    images = result['images']
    session_id = result['session_id']
    duration = result['duration']
    
    print(f"\n✅ Згенеровано {len(images)} зображень за {duration:.2f}s")
    print(f"📋 Session ID: {session_id}")
    
    # Оцінка швидкості
    print("\n" + "-" * 100)
    print("⚡ ШВИДКІСТЬ")
    print("-" * 100)
    avg_time_per_image = duration / len(images) if images else 0
    print(f"   Загальний час: {duration:.2f}s")
    print(f"   Середній час на 1 зображення: {avg_time_per_image:.2f}s")
    
    speed_rating = "🟢 ВІДМІННО" if duration < 15 else "🟡 ДОБРЕ" if duration < 30 else "🔴 ПОВІЛЬНО"
    print(f"   Оцінка: {speed_rating}")
    
    # Оцінка консистентності
    print("\n" + "-" * 100)
    print("🔗 КОНСИСТЕНТНІСТЬ")
    print("-" * 100)
    consistency = evaluate_consistency(images, session_id)
    print(f"   Оцінка: {consistency['score']}/100")
    print(f"   ✓ Єдиний session_id: {'✅' if consistency['single_session_id'] else '❌'}")
    print(f"   ✓ Унікальні seeds: {'✅' if consistency['unique_seeds'] else '❌'}")
    print(f"   ✓ Consistency hints в промптах: {'✅' if consistency['consistency_hints'] else '❌'}")
    print(f"   Seeds: {consistency['seeds']}")
    
    # Оцінка релевантності
    print("\n" + "-" * 100)
    print("🎯 РЕЛЕВАНТНІСТЬ (відповідність параметрам)")
    print("-" * 100)
    relevance = evaluate_relevance(images, test_case['car_data'])
    print(f"   Середня оцінка: {relevance['average_score']}/100")
    
    for angle_data in relevance['per_angle']:
        angle = angle_data['angle']
        score = angle_data['score']
        details = angle_data['details']
        rating = "🟢" if score >= 80 else "🟡" if score >= 60 else "🔴"
        
        print(f"\n   {rating} {angle.upper()}: {score}/100")
        print(f"      Brand: {'✅' if details['brand'] else '❌'}")
        print(f"      Model: {'✅' if details['model'] else '❌'}")
        print(f"      Year: {'✅' if details['year'] else '❌'}")
        print(f"      Color: {'✅' if details['color'] else '❌'}")
        print(f"      Body type: {'✅' if details['body_type'] else '❌'}")
    
    # Оцінка логотипів
    print("\n" + "-" * 100)
    print("🏷️ ЯКІСТЬ ЛОГОТИПІВ")
    print("-" * 100)
    print(f"   Очікується: {test_case['expected_logo']}")
    print(f"   НЕ повинно бути: {', '.join(test_case['wrong_logos'])}")
    
    logo_quality = evaluate_logo_quality(images, test_case['expected_logo'], test_case['wrong_logos'])
    print(f"\n   Середня оцінка: {logo_quality['average_score']}/100")
    
    for angle_data in logo_quality['per_angle']:
        angle = angle_data['angle']
        score = angle_data['score']
        details = angle_data['details']
        rating = "🟢" if score >= 70 else "🟡" if score >= 50 else "🔴"
        
        print(f"\n   {rating} {angle.upper()}: {score}/100")
        print(f"      Правильний логотип: {'✅' if details['has_expected_logo'] else '❌'}")
        print(f"      Немає неправильних: {'✅' if not details['has_wrong_logo'] else '❌'}")
        print(f"      Негативні інструкції: {'✅' if details['has_negative_instructions'] else '⚠️'}")
        print(f"      Візуальний опис: {'✅' if details['has_logo_description'] else '⚠️'}")
    
    # URLs зображень
    print("\n" + "-" * 100)
    print("🖼️ ЗГЕНЕРОВАНІ ЗОБРАЖЕННЯ")
    print("-" * 100)
    for i, img in enumerate(images, 1):
        print(f"\n   {i}. {img['angle'].upper()}")
        print(f"      URL: {img['url'][:80]}...")
        print(f"      Seed: {img.get('seed', 'N/A')}")
        print(f"      Промпт (перші 150 символів):")
        print(f"      {img.get('prompt', '')[:150]}...")
    
    # Загальна оцінка
    print("\n" + "=" * 100)
    print("📊 ЗАГАЛЬНА ОЦІНКА")
    print("=" * 100)
    
    overall_score = (
        (consistency['score'] * 0.3) +
        (relevance['average_score'] * 0.4) +
        (logo_quality['average_score'] * 0.3)
    )
    
    if overall_score >= 80:
        grade = "🟢 ВІДМІННО"
    elif overall_score >= 60:
        grade = "🟡 ДОБРЕ"
    else:
        grade = "🔴 ПОТРЕБУЄ ПОКРАЩЕННЯ"
    
    print(f"   Консистентність: {consistency['score']}/100 (вага 30%)")
    print(f"   Релевантність: {relevance['average_score']}/100 (вага 40%)")
    print(f"   Якість логотипів: {logo_quality['average_score']}/100 (вага 30%)")
    print(f"\n   ПІДСУМОК: {overall_score:.1f}/100 - {grade}")
    
    return {
        'overall_score': overall_score,
        'consistency': consistency['score'],
        'relevance': relevance['average_score'],
        'logo_quality': logo_quality['average_score'],
        'duration': duration
    }


def main():
    """Запуск всіх тестів."""
    print("=" * 100)
    print(" " * 30 + "КОМПЛЕКСНИЙ ТЕСТ ГЕНЕРАЦІЇ ЗОБРАЖЕНЬ")
    print("=" * 100)
    print()
    print("🎯 Тестуємо:")
    print("   1. ⚡ Швидкість (асинхронна генерація)")
    print("   2. 🔗 Консистентність (один автомобіль на всіх ракурсах)")
    print("   3. 🎯 Релевантність (відповідність параметрам)")
    print("   4. 🏷️ Якість логотипів (правильні brand badges)")
    print()
    print(f"📊 Кількість тестів: {len(TEST_CASES)}")
    print()
    
    # Перевірка backend
    print("🔍 Перевірка доступності backend...")
    if not check_backend_health():
        print("❌ Backend недоступний!")
        print("   Переконайтесь що backend запущений на http://localhost:8000")
        return
    print("✅ Backend доступний")
    
    # Запуск тестів
    results = []
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print_test_header(i, len(TEST_CASES), test_case['name'])
        
        # Параметри автомобіля
        car_data = test_case['car_data']
        print(f"\n📋 Параметри автомобіля:")
        print(f"   Тип: {car_data['vehicle_type_name']}")
        print(f"   Марка: {car_data['brand']}")
        print(f"   Модель: {car_data['model']}")
        print(f"   Рік: {car_data['year']}")
        print(f"   Колір: {car_data['color']}")
        print(f"   Кузов: {car_data['body_type']}")
        print(f"   Стан: {car_data['condition']}")
        print(f"   Опис: {car_data['description']}")
        print(f"\n📸 Ракурси: {', '.join(test_case['angles'])}")
        
        # Генерація
        print(f"\n🚀 Генерація зображень...")
        result = generate_images(test_case)
        
        # Оцінка результатів
        if result['success']:
            test_result = print_test_results(result, test_case)
            test_result['test_name'] = test_case['name']
            results.append(test_result)
        else:
            print(f"\n❌ Тест ПРОВАЛЕНИЙ")
            print(f"   Помилка: {result.get('error', 'Unknown')}")
            results.append({
                'test_name': test_case['name'],
                'overall_score': 0,
                'duration': result.get('duration', 0),
                'failed': True
            })
        
        # Пауза між тестами
        if i < len(TEST_CASES):
            print(f"\n⏸️ Пауза 3 секунди перед наступним тестом...")
            time.sleep(3)
    
    # Підсумок всіх тестів
    print("\n\n" + "=" * 100)
    print(" " * 40 + "ПІДСУМОК ТЕСТУВАННЯ")
    print("=" * 100)
    
    passed = sum(1 for r in results if not r.get('failed', False) and r['overall_score'] >= 60)
    failed = len(results) - passed
    
    print(f"\n📊 Результати:")
    print(f"   Всього тестів: {len(results)}")
    print(f"   ✅ Пройдено: {passed}")
    print(f"   ❌ Провалено: {failed}")
    print(f"   📈 Успішність: {passed / len(results) * 100:.1f}%")
    
    # Середні показники
    successful_results = [r for r in results if not r.get('failed', False)]
    
    if successful_results:
        avg_overall = sum(r['overall_score'] for r in successful_results) / len(successful_results)
        avg_consistency = sum(r['consistency'] for r in successful_results) / len(successful_results)
        avg_relevance = sum(r['relevance'] for r in successful_results) / len(successful_results)
        avg_logo = sum(r['logo_quality'] for r in successful_results) / len(successful_results)
        avg_duration = sum(r['duration'] for r in successful_results) / len(successful_results)
        
        print(f"\n📈 Середні показники:")
        print(f"   Загальна оцінка: {avg_overall:.1f}/100")
        print(f"   Консистентність: {avg_consistency:.1f}/100")
        print(f"   Релевантність: {avg_relevance:.1f}/100")
        print(f"   Якість логотипів: {avg_logo:.1f}/100")
        print(f"   Швидкість: {avg_duration:.1f}s на тест")
    
    # Детальна таблиця
    print("\n" + "-" * 100)
    print("📋 ДЕТАЛЬНІ РЕЗУЛЬТАТИ")
    print("-" * 100)
    print(f"{'№':<3} {'Тест':<50} {'Оцінка':<10} {'Час':<10} {'Статус':<15}")
    print("-" * 100)
    
    for i, result in enumerate(results, 1):
        test_name = result['test_name'][:47] + "..." if len(result['test_name']) > 50 else result['test_name']
        score = f"{result['overall_score']:.1f}/100" if not result.get('failed') else "FAILED"
        duration = f"{result['duration']:.1f}s"
        
        if result.get('failed'):
            status = "❌ ПРОВАЛЕНО"
        elif result['overall_score'] >= 80:
            status = "🟢 ВІДМІННО"
        elif result['overall_score'] >= 60:
            status = "🟡 ДОБРЕ"
        else:
            status = "🔴 ПОГАНО"
        
        print(f"{i:<3} {test_name:<50} {score:<10} {duration:<10} {status:<15}")
    
    print("=" * 100)
    
    # Рекомендації
    print("\n💡 РЕКОМЕНДАЦІЇ:")
    
    if successful_results:
        avg_overall = sum(r['overall_score'] for r in successful_results) / len(successful_results)
        
        if avg_overall >= 80:
            print("   ✅ Система працює відмінно!")
            print("   ✅ Асинхронна генерація забезпечує високу швидкість")
            print("   ✅ Консистентність зображень на високому рівні")
        elif avg_overall >= 60:
            print("   🟡 Система працює добре, але є простір для покращень:")
            if avg_consistency < 70:
                print("      - Покращити консистентність (session_id + seeds)")
            if avg_relevance < 70:
                print("      - Покращити релевантність промптів")
            if avg_logo < 70:
                print("      - Покращити якість логотипів (web search + descriptions)")
        else:
            print("   🔴 Система потребує покращення:")
            print("      - Перевірити web search для логотипів")
            print("      - Покращити consistency hints в промптах")
            print("      - Оптимізувати параметри генерації")
    
    print("\n" + "=" * 100)
    print(f"Завершено: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)


if __name__ == "__main__":
    main()

