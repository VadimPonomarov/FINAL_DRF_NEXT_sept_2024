# -*- coding: utf-8 -*-
"""Швидкий тест асинхронної генерації"""
import sys
import io
import requests
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BACKEND_URL = "http://localhost:8000/api/chat/generate-car-images/"

# Один швидкий тест
test_data = {
    "car_data": {
        "brand": "Renault",
        "model": "Clio",
        "year": 2019,
        "color": "blue",
        "vehicle_type_name": "легкові",
        "body_type": "hatchback"
    },
    "angles": ["front", "side"],
    "style": "realistic",
    "use_mock_algorithm": True
}

print("🚀 Тест асинхронної генерації...")
print(f"📋 Марка: {test_data['car_data']['brand']} {test_data['car_data']['model']}")
print(f"📸 Ракурси: {len(test_data['angles'])}")

start = time.time()
try:
    response = requests.post(BACKEND_URL, json=test_data, timeout=60)
    duration = time.time() - start
    
    if response.status_code == 200:
        result = response.json()
        images = result.get('images', [])
        session_id = result.get('session_id', '')
        
        print(f"\n✅ Успіх! Час: {duration:.1f}s")
        print(f"📊 Згенеровано: {len(images)} зображень")
        print(f"🔗 Session ID: {session_id}")
        
        # Перевірка seeds
        seeds = [img.get('seed') for img in images]
        print(f"🎲 Seeds: {seeds}")
        print(f"✓ Унікальні: {'✅' if len(seeds) == len(set(seeds)) else '❌'}")
        
        # Перевірка consistency
        has_consistency = sum(1 for img in images if 'consistency' in img.get('prompt', '').lower())
        print(f"✓ Consistency hints: {has_consistency}/{len(images)}")
        
        # URLs
        print(f"\n🖼️ Зображення:")
        for img in images:
            print(f"   {img['angle']}: {img['url'][:60]}...")
            
    else:
        print(f"❌ Помилка: HTTP {response.status_code}")
        print(response.text[:200])
        
except Exception as e:
    print(f"❌ Помилка: {e}")

