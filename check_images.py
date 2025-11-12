#!/usr/bin/env python3
"""
Проверка наличия фотографий в сидинге через API и MCP
"""

import json
import urllib.request
import urllib.error
import sys

def check_images_in_ads():
    """Проверяет наличие изображений в объявлениях через API"""
    try:
        url = "http://localhost:8000/api/autoria/cars/?limit=10"
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.getcode() != 200:
                print(f"❌ Backend вернул код {response.getcode()}")
                return False
            
            data = json.loads(response.read().decode('utf-8'))
            
            # Извлекаем объявления
            ads = data.get('results', []) if isinstance(data, dict) else data if isinstance(data, list) else []
            
            if not ads:
                print("❌ Нет объявлений в ответе")
                return False
            
            print(f"✅ Найдено {len(ads)} объявлений")
            
            # Проверяем каждое объявление на наличие изображений
            ads_with_images = 0
            ads_without_images = 0
            total_images = 0
            
            for ad in ads:
                ad_id = ad.get('id', 'unknown')
                images = ad.get('images', [])
                
                if images and len(images) > 0:
                    ads_with_images += 1
                    image_count = len(images)
                    total_images += image_count
                    
                    # Проверяем URL изображений
                    valid_urls = []
                    for img in images:
                        img_url = img.get('image_url') or img.get('image_display_url') or img.get('url')
                        if img_url and img_url != 'null' and img_url.strip():
                            valid_urls.append(img_url)
                    
                    if valid_urls:
                        print(f"  ✅ Ad {ad_id}: {len(valid_urls)} изображений")
                        for i, url in enumerate(valid_urls[:2], 1):
                            print(f"     Image {i}: {url[:80]}...")
                    else:
                        print(f"  ⚠️  Ad {ad_id}: изображения есть, но URL пустые")
                        ads_without_images += 1
                else:
                    ads_without_images += 1
                    print(f"  ❌ Ad {ad_id}: нет изображений")
            
            print(f"\n📊 Статистика:")
            print(f"  Объявлений с изображениями: {ads_with_images}")
            print(f"  Объявлений без изображений: {ads_without_images}")
            print(f"  Всего изображений: {total_images}")
            
            if ads_with_images > 0:
                print(f"\n✅ Успех: найдено {ads_with_images} объявлений с изображениями")
                return True
            else:
                print(f"\n❌ Проблема: ни одно объявление не содержит изображений")
                return False
                
    except urllib.error.URLError as e:
        print(f"❌ Не удалось подключиться к backend: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Проверка наличия фотографий в сидинге...")
    print("=" * 60)
    
    success = check_images_in_ads()
    
    print("=" * 60)
    if success:
        print("✅ Проверка завершена успешно")
        sys.exit(0)
    else:
        print("❌ Проверка выявила проблемы")
        sys.exit(1)

