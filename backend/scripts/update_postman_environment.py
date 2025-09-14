#!/usr/bin/env python3
"""
Скрипт для динамического обновления переменных окружения Postman
с реальными данными из базы данных
"""

import os
import sys
import json
import django
from pathlib import Path

# Добавляем путь к Django проекту
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.ads.models import CarAd, CarModificationModel, CarColorModel, CarMarkModel, CarModel, CarGenerationModel, AdView
from apps.accounts.models import AddsAccount

User = get_user_model()

def get_real_data_from_db():
    """Получает реальные данные из базы данных"""
    print("🔍 Получаем реальные данные из базы данных...")
    
    data = {}
    
    # Получаем ID модификаций
    try:
        modifications = list(CarModificationModel.objects.values_list('id', flat=True)[:50])
        data['modification_ids'] = modifications
        data['modification_id'] = modifications[0] if modifications else 1
        print(f"✅ Модификации: {len(modifications)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения модификаций: {e}")
        data['modification_ids'] = [1]
        data['modification_id'] = 1

    # Получаем ID цветов
    try:
        colors = list(CarColorModel.objects.values_list('id', flat=True)[:50])
        data['color_ids'] = colors
        data['color_id'] = colors[0] if colors else 1
        print(f"✅ Цвета: {len(colors)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения цветов: {e}")
        data['color_ids'] = [1]
        data['color_id'] = 1
    
    # Получаем ID марок
    try:
        marks = list(CarMarkModel.objects.values_list('id', flat=True)[:50])
        data['mark_ids'] = marks
        data['mark_id'] = marks[0] if marks else 1
        print(f"✅ Марки: {len(marks)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения марок: {e}")
        data['mark_ids'] = [1]
        data['mark_id'] = 1
    
    # Получаем ID моделей
    try:
        models = list(CarModel.objects.values_list('id', flat=True)[:50])
        data['model_ids'] = models
        data['model_id'] = models[0] if models else 1
        print(f"✅ Модели: {len(models)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения моделей: {e}")
        data['model_ids'] = [1]
        data['model_id'] = 1
    
    # Получаем ID поколений
    try:
        generations = list(CarGenerationModel.objects.values_list('id', flat=True)[:50])
        data['generation_ids'] = generations
        data['generation_id'] = generations[0] if generations else 1
        print(f"✅ Поколения: {len(generations)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения поколений: {e}")
        data['generation_ids'] = [1]
        data['generation_id'] = 1
    
    # Получаем ID пользователей
    try:
        users = list(User.objects.values_list('id', flat=True)[:50])
        data['user_ids'] = users
        data['user_id'] = users[0] if users else 1
        print(f"✅ Пользователи: {len(users)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения пользователей: {e}")
        data['user_ids'] = [1]
        data['user_id'] = 1
    
    # Получаем ID аккаунтов
    try:
        accounts = list(AddsAccount.objects.values_list('id', flat=True)[:50])
        data['account_ids'] = accounts
        data['account_id'] = accounts[0] if accounts else 1
        print(f"✅ Аккаунты: {len(accounts)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения аккаунтов: {e}")
        data['account_ids'] = [1]
        data['account_id'] = 1
    
    # Получаем ID объявлений
    try:
        ads = list(CarAd.objects.values_list('id', flat=True)[:50])
        data['ad_ids'] = ads
        data['ad_id'] = ads[0] if ads else 1
        print(f"✅ Объявления: {len(ads)} записей")
    except Exception as e:
        print(f"❌ Ошибка получения объявлений: {e}")
        data['ad_ids'] = [1]
        data['ad_id'] = 1
    
    # Получаем статистику
    try:
        data['total_ads'] = CarAd.objects.count()
        data['active_ads'] = CarAd.objects.filter(status='active').count()
        data['total_users'] = User.objects.count()
        data['total_accounts'] = AddsAccount.objects.count()
        print(f"✅ Статистика: {data['total_ads']} объявлений, {data['total_users']} пользователей")
    except Exception as e:
        print(f"❌ Ошибка получения статистики: {e}")
        data['total_ads'] = 0
        data['active_ads'] = 0
        data['total_users'] = 0
        data['total_accounts'] = 0
    
    return data

def update_postman_environment(real_data):
    """Обновляет файл окружения Postman с реальными данными"""
    env_file = Path(__file__).parent.parent / "AutoRia_Complete_184_Endpoints_DYNAMIC_IDS.postman_environment.json"
    
    if not env_file.exists():
        print(f"❌ Файл окружения не найден: {env_file}")
        return False
    
    try:
        # Читаем существующее окружение
        with open(env_file, 'r', encoding='utf-8') as f:
            environment = json.load(f)
        
        print("🔄 Обновляем переменные окружения...")
        
        # Обновляем переменные с реальными данными
        for value in environment['values']:
            key = value['key']
            
            if key in real_data:
                if isinstance(real_data[key], list):
                    value['value'] = json.dumps(real_data[key])
                else:
                    value['value'] = str(real_data[key])
                print(f"  ✅ {key}: {value['value'][:50]}...")
        
        # Добавляем метаданные
        metadata_found = False
        for value in environment['values']:
            if value['key'] == 'last_updated':
                value['value'] = str(int(time.time()))
                metadata_found = True
                break
        
        if not metadata_found:
            environment['values'].append({
                "key": "last_updated",
                "value": str(int(time.time())),
                "enabled": True
            })
        
        # Сохраняем обновленное окружение
        with open(env_file, 'w', encoding='utf-8') as f:
            json.dump(environment, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Окружение обновлено: {env_file}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка обновления окружения: {e}")
        return False

def create_dynamic_environment_script():
    """Создает JavaScript скрипт для динамического обновления переменных в Postman"""
    script_content = f"""
// Динамическое обновление переменных окружения из реальных данных БД
// Этот скрипт выполняется перед каждым запросом

// Функция для получения случайного ID из массива
function getRandomId(arrayVar, fallback = '1') {{
    try {{
        const ids = JSON.parse(pm.environment.get(arrayVar) || '[]');
        if (ids.length > 0) {{
            return ids[Math.floor(Math.random() * ids.length)];
        }}
    }} catch (e) {{
        console.log('Error getting random ID for', arrayVar, ':', e);
    }}
    return fallback;
}}

// Обновляем динамические переменные перед каждым запросом
pm.environment.set('dynamic_modification_id', getRandomId('modification_ids'));
pm.environment.set('dynamic_color_id', getRandomId('color_ids'));
pm.environment.set('dynamic_mark_id', getRandomId('mark_ids'));
pm.environment.set('dynamic_model_id', getRandomId('model_ids'));
pm.environment.set('dynamic_generation_id', getRandomId('generation_ids'));
pm.environment.set('dynamic_user_id', getRandomId('user_ids'));
pm.environment.set('dynamic_account_id', getRandomId('account_ids'));
pm.environment.set('dynamic_ad_id', getRandomId('ad_ids'));

// Логируем для отладки
console.log('🔄 Dynamic IDs updated:', {{
    modification: pm.environment.get('dynamic_modification_id'),
    color: pm.environment.get('dynamic_color_id'),
    mark: pm.environment.get('dynamic_mark_id'),
    model: pm.environment.get('dynamic_model_id'),
    generation: pm.environment.get('dynamic_generation_id'),
    user: pm.environment.get('dynamic_user_id'),
    account: pm.environment.get('dynamic_account_id'),
    ad: pm.environment.get('dynamic_ad_id')
}});
"""
    
    script_file = Path(__file__).parent.parent / "postman_dynamic_script.js"
    with open(script_file, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print(f"✅ Создан скрипт для Postman: {script_file}")

def main():
    """Основная функция"""
    print("🚀 Обновление переменных окружения Postman с реальными данными из БД")
    print("=" * 70)
    
    # Получаем реальные данные из БД
    real_data = get_real_data_from_db()
    
    # Обновляем окружение Postman
    if update_postman_environment(real_data):
        print("\n✅ Переменные окружения успешно обновлены!")
    else:
        print("\n❌ Ошибка обновления переменных окружения")
        return False
    
    # Создаем динамический скрипт
    create_dynamic_environment_script()
    
    print("\n📋 Инструкции:")
    print("1. Переменные окружения обновлены реальными данными из БД")
    print("2. Импортируйте обновленное окружение в Postman")
    print("3. Запускайте тесты - они будут использовать реальные ID")
    print("4. Для автоматического обновления запускайте этот скрипт периодически")
    
    return True

if __name__ == "__main__":
    import time
    main()
