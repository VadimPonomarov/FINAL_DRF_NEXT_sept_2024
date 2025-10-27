"""
Асинхронные Celery задачи для генерации изображений
Максимальное сокращение времени через параллельную обработку
"""
from celery import shared_task, group, chord
from django.core.cache import cache
from django.utils import timezone
import logging
import json
import asyncio
import aiohttp
import urllib.parse
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import time

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=2)
def generate_single_car_image_async(self, car_data: Dict, angle: str, style: str = 'realistic'):
    """
    Асинхронная генерация одного изображения автомобиля
    Максимально быстрая обработка одного ракурса
    """
    try:
        task_id = self.request.id
        logger.info(f"[ImageTask-{task_id}] 🎨 Starting image generation: {angle}")
        
        # Импортируем функции из существующего модуля
        from apps.chat.views.image_generation_views import create_car_image_prompt
        from apps.ads.management.commands.generate_car_ads import GenerateCarAdsCommand
        
        # Создаем канонические данные
        canonical_data = {
            'brand': car_data.get('brand', 'Unknown'),
            'model': car_data.get('model', 'Unknown'),
            'year': car_data.get('year', 2020),
            'color': car_data.get('color', 'silver'),
            'body_type': car_data.get('body_type', 'sedan'),
            'vehicle_type': car_data.get('vehicle_type', 'car'),
            'condition': car_data.get('condition', 'used'),
            'session_id': car_data.get('session_id', f"ASYNC-{task_id}")
        }
        
        # Генерируем session_id для консистентности
        session_data = f"{canonical_data['brand']}_{canonical_data['model']}_{canonical_data['year']}_{canonical_data['color']}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]
        
        # Создаем промпт с контролем качества шилдиков
        prompt = create_car_image_prompt(canonical_data, angle, style, car_session_id)
        
        # Переводим на английский
        mock_cmd = GenerateCarAdsCommand()
        english_prompt = mock_cmd._simple_translate_to_english(prompt, canonical_data)
        
        # 🚀 БЫСТРАЯ ГЕНЕРАЦИЯ через pollinations.ai
        # ВАЖНО: seed РАЗНЫЙ для каждого ракурса, чтобы генерировать РАЗНЫЕ изображения одного объекта
        # Используем angle в seed для вариативности + nologo=true для чистых изображений
        angle_seed = abs(hash(f"{car_session_id}_{angle}_{canonical_data['brand']}_{canonical_data['model']}")) % 1000000
        encoded_prompt = urllib.parse.quote(english_prompt)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=600&model=flux&enhance=true&seed={angle_seed}&nologo=true"
        
        # Проверяем доступность изображения (быстрая проверка)
        import requests
        response = requests.head(image_url, timeout=5)
        success = response.status_code == 200
        
        result = {
            'url': image_url,
            'angle': angle,
            'title': f"{canonical_data['brand']} {canonical_data['model']} - {angle}",
            'isMain': angle == 'front',
            'prompt': english_prompt,
            'success': success,
            'generated_at': timezone.now().isoformat(),
            'task_id': task_id,
            'session_id': car_session_id
        }
        
        logger.info(f"[ImageTask-{task_id}] ✅ Image generated: {angle} - Success: {success}")
        return result
        
    except Exception as e:
        logger.error(f"[ImageTask-{task_id}] ❌ Image generation failed: {e}")
        self.retry(countdown=60, exc=e)

@shared_task(bind=True)
def generate_car_images_batch_async(self, car_data: Dict, angles: List[str], style: str = 'realistic'):
    """
    Асинхронная генерация пакета изображений для одного автомобиля
    Использует group для параллельной обработки всех ракурсов
    """
    try:
        batch_id = self.request.id
        logger.info(f"[BatchTask-{batch_id}] 🚀 Starting batch generation: {len(angles)} angles")
        
        # Добавляем batch_id в car_data для трекинга
        car_data['batch_id'] = batch_id
        car_data['session_id'] = f"BATCH-{batch_id}"
        
        # Создаем группу параллельных задач для всех ракурсов
        job = group(
            generate_single_car_image_async.s(car_data, angle, style) 
            for angle in angles
        )
        
        # Запускаем все задачи параллельно
        result = job.apply_async()
        
        # Собираем результаты
        images = []
        for task_result in result.get():
            if task_result:
                images.append(task_result)
        
        # Сортируем по важности (front, side, rear, interior)
        angle_priority = {'front': 0, 'side': 1, 'rear': 2, 'interior': 3}
        images.sort(key=lambda x: angle_priority.get(x['angle'], 999))
        
        # Устанавливаем главное изображение
        if images:
            images[0]['isMain'] = True
        
        batch_result = {
            'success': True,
            'images': images,
            'batch_id': batch_id,
            'car_data': car_data,
            'generated_at': timezone.now().isoformat(),
            'total_images': len(images),
            'successful_images': len([img for img in images if img.get('success', False)])
        }
        
        # Кэшируем результат для быстрого доступа
        cache_key = f"car_images_batch_{batch_id}"
        cache.set(cache_key, batch_result, timeout=3600)  # 1 час
        
        logger.info(f"[BatchTask-{batch_id}] ✅ Batch completed: {len(images)} images")
        return batch_result
        
    except Exception as e:
        logger.error(f"[BatchTask-{batch_id}] ❌ Batch generation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'batch_id': batch_id,
            'car_data': car_data
        }

@shared_task(bind=True)
def generate_ads_series_async(self, ads_data: List[Dict], include_images: bool = True):
    """
    Асинхронная генерация серии объявлений с изображениями
    Максимальная оптимизация времени через chord pattern
    """
    try:
        series_id = self.request.id
        logger.info(f"[SeriesTask-{series_id}] 🚀 Starting series generation: {len(ads_data)} ads")
        
        if not include_images:
            # Быстрый путь без изображений
            return {
                'success': True,
                'series_id': series_id,
                'ads_created': len(ads_data),
                'images_generated': 0,
                'processing_time': 0
            }
        
        start_time = time.time()
        
        # Создаем задачи генерации изображений для всех объявлений
        image_angles = ['front', 'side']  # Минимальный набор для скорости
        
        # Используем chord для координации: header (параллельные задачи) + callback
        header = group(
            generate_car_images_batch_async.s(ad_data, image_angles)
            for ad_data in ads_data
        )
        
        # Callback для финализации серии
        callback = finalize_ads_series.s(series_id, start_time)
        
        # Запускаем chord
        chord_result = chord(header)(callback)
        
        # Возвращаем информацию о запущенной серии
        return {
            'success': True,
            'series_id': series_id,
            'status': 'processing',
            'ads_count': len(ads_data),
            'chord_id': chord_result.id,
            'estimated_time': len(ads_data) * 10,  # 10 секунд на объявление
            'started_at': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"[SeriesTask-{series_id}] ❌ Series generation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'series_id': series_id
        }

@shared_task
def finalize_ads_series(image_results: List[Dict], series_id: str, start_time: float):
    """
    Финализация серии объявлений после генерации всех изображений
    """
    try:
        processing_time = time.time() - start_time
        
        # Подсчитываем статистику
        total_ads = len(image_results)
        successful_batches = len([r for r in image_results if r.get('success', False)])
        total_images = sum(r.get('total_images', 0) for r in image_results)
        successful_images = sum(r.get('successful_images', 0) for r in image_results)
        
        final_result = {
            'success': True,
            'series_id': series_id,
            'completed_at': timezone.now().isoformat(),
            'processing_time': round(processing_time, 2),
            'statistics': {
                'total_ads': total_ads,
                'successful_batches': successful_batches,
                'total_images': total_images,
                'successful_images': successful_images,
                'success_rate': round((successful_images / total_images * 100) if total_images > 0 else 0, 1)
            },
            'image_results': image_results
        }
        
        # Кэшируем финальный результат
        cache_key = f"ads_series_final_{series_id}"
        cache.set(cache_key, final_result, timeout=7200)  # 2 часа
        
        logger.info(f"[SeriesTask-{series_id}] 🎉 Series finalized: {successful_images}/{total_images} images in {processing_time:.1f}s")
        return final_result
        
    except Exception as e:
        logger.error(f"[SeriesTask-{series_id}] ❌ Series finalization failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'series_id': series_id
        }

@shared_task
def get_series_status(series_id: str):
    """
    Получение статуса серии генерации
    """
    try:
        # Проверяем кэш финального результата
        final_cache_key = f"ads_series_final_{series_id}"
        final_result = cache.get(final_cache_key)
        
        if final_result:
            return {
                'status': 'completed',
                'result': final_result
            }
        
        # Проверяем промежуточные результаты
        # (здесь можно добавить логику проверки статуса через Celery result backend)
        
        return {
            'status': 'processing',
            'series_id': series_id,
            'message': 'Generation in progress...'
        }
        
    except Exception as e:
        logger.error(f"Error getting series status: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }
