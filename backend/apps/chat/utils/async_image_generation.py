"""
⚡ Асинхронна генерація зображень з збереженням консистентності

Генерує множину ракурсів паралельно, але забезпечує що всі зображення
відображають ОДИН І ТОЙ ЖЕ автомобіль (консистентність).

Використовує Django асинхронні адаптери:
- sync_to_async: перетворює синхронні функції на асинхронні
- async_to_sync: перетворює асинхронні функції на синхронні (для викликів з Django views)
"""
import asyncio
import logging
from typing import List, Dict, Optional, Any
import hashlib
import time
from asgiref.sync import sync_to_async, async_to_sync

logger = logging.getLogger(__name__)


def generate_consistent_session_id(brand: str, model: str, year: int, color: str, 
                                    body_type: str) -> str:
    """
    Генерує стабільний session ID для серії зображень.
    
    Один session_id = одне і те ж авто на всіх ракурсах (консистентність).
    """
    session_data = f"{brand}_{model}_{year}_{color}_{body_type}_{int(time.time())}"
    session_id = hashlib.md5(session_data.encode()).hexdigest()[:12]
    
    logger.info(f"[Consistency] [LINK] Session ID: {session_id} for {brand} {model}")
    
    return session_id


def generate_consistent_seed(session_id: str, angle: str) -> int:
    """
    Генерує seed для конкретного ракурсу на основі session_id.
    
    Різні ракурси = різні seeds, але базується на одному session_id.
    Це дозволяє AI генерувати різні кути, але одного автомобіля.
    """
    seed_data = f"{session_id}_{angle}"
    seed = abs(hash(seed_data)) % 1000000
    
    logger.info(f"[Consistency] [SEED] Seed {seed} for angle {angle} (session: {session_id})")
    
    return seed


async def async_web_search_for_logo(brand: str) -> Optional[str]:
    """
    Асинхронний web search для інформації про логотип.
    
    Використовує sync_to_async для конвертації синхронної функції.
    """
    try:
        from apps.chat.utils.brand_logo_search import search_brand_logo_info
        
        # Перетворюємо синхронну функцію на асинхронну через sync_to_async
        async_search = sync_to_async(search_brand_logo_info, thread_sensitive=False)
        logo_info = await async_search(brand)
        
        logger.info(f"[AsyncSearch] [OK] Logo info found for {brand}")
        return logo_info
        
    except Exception as e:
        logger.error(f"[AsyncSearch] [ERR] Logo search failed for {brand}: {e}")
        return None


async def async_real_photo_search(brand: str, model: str, year: int, 
                                   angle: str) -> Optional[Dict]:
    """
    Асинхронний пошук реального фото для ракурсу.
    
    Використовує sync_to_async для конвертації синхронної функції.
    """
    try:
        from apps.chat.utils.brand_logo_search import get_real_car_reference_images
        
        # Перетворюємо синхронну функцію на асинхронну через sync_to_async
        async_photo_search = sync_to_async(get_real_car_reference_images, thread_sensitive=False)
        reference = await async_photo_search(brand, model, year, angle)
        
        if reference:
            logger.info(f"[AsyncSearch] [OK] Reference photo found for {angle}")
        else:
            logger.info(f"[AsyncSearch] [WARN] No reference photo for {angle}")
        
        return reference
        
    except Exception as e:
        logger.error(f"[AsyncSearch] [ERR] Photo search failed for {angle}: {e}")
        return None


async def async_generate_prompt_for_angle(
    brand: str, model: str, year: int, color: str,
    body_type: str, angle: str, session_id: str,
    logo_info: Optional[str], reference: Optional[Dict]
) -> Dict[str, Any]:
    """
    Асинхронно генерує промпт для одного ракурсу.
    
    Використовує спільний session_id для консистентності + унікальний seed для різноманітності.
    """
    from apps.chat.utils.brand_logo_search import extract_logo_features, analyze_reference_image_description
    
    # Генеруємо консистентний seed для цього ракурсу
    seed = generate_consistent_seed(session_id, angle)
    
    # Витягуємо інформацію про логотип
    if logo_info:
        features = extract_logo_features(logo_info, brand)
        logo_hint = f"{brand} logo"
        if features.get("shape"):
            logo_hint += f" ({features['shape']} shape"
            if features.get("color"):
                logo_hint += f", {features['color']}"
            logo_hint += ")"
    else:
        logo_hint = f"{brand} authentic badge"
    
    # Аналізуємо референс
    ref_details = ""
    if reference:
        ref_details = analyze_reference_image_description(reference)
    
    # Створюємо промпт з CONSISTENCY HINTS
    if reference and ref_details:
        prompt = f"""
        {year} {brand} {model} {body_type}, {color}, {angle} view.
        
        CONSISTENCY: Same vehicle across all angles (Session: {session_id}, Seed: {seed}).
        Style: Similar to real {year} {brand} {model} photos, {ref_details}.
        Show {logo_hint} on front grille, clearly visible and accurate.
        
        Photorealistic automotive photography, authentic {brand} design.
        Same exact vehicle from different angle, identical color and details.
        """.strip()
    else:
        prompt = f"""
        {year} {brand} {model} {body_type}, {color}, {angle} view.
        
        CONSISTENCY: Same vehicle across all angles (Session: {session_id}, Seed: {seed}).
        Show {logo_hint} on front grille, clearly visible.
        
        Photorealistic automotive photography, accurate brand identity.
        Same exact vehicle from different angle, identical color and details.
        """.strip()
    
    final_prompt = " ".join(prompt.split())
    
    logger.info(f"[AsyncPrompt] [OK] Prompt ready for {angle} (seed: {seed})")
    
    return {
        "angle": angle,
        "prompt": final_prompt,
        "seed": seed,
        "session_id": session_id,
        "reference": reference
    }


async def async_generate_all_prompts(
    brand: str, model: str, year: int, color: str,
    body_type: str, angles: List[str]
) -> List[Dict]:
    """
    Асинхронно генерує промпти для ВСІХ ракурсів паралельно.
    
    ВАЖЛИВО: Зберігає консистентність через спільний session_id.
    
    Args:
        brand, model, year, color, body_type: параметри авто
        angles: ['front', 'side', 'rear']
    
    Returns:
        List[Dict]: Список промптів з seeds для кожного ракурсу
    """
    logger.info(f"[AsyncGen] [START] Starting async generation for {len(angles)} angles")
    
    # Генеруємо спільний session_id для консистентності
    session_id = generate_consistent_session_id(brand, model, year, color, body_type)
    
    # 1. Паралельний web search для логотипу (один раз для всіх ракурсів)
    logo_info_task = async_web_search_for_logo(brand)
    
    # 2. Паралельний пошук референсних фото для кожного ракурсу
    photo_tasks = [
        async_real_photo_search(brand, model, year, angle)
        for angle in angles
    ]
    
    # Виконуємо всі пошуки паралельно
    logger.info(f"[AsyncGen] [SEARCH] Running {len(photo_tasks) + 1} searches in parallel...")
    
    results = await asyncio.gather(logo_info_task, *photo_tasks, return_exceptions=True)
    
    logo_info = results[0] if not isinstance(results[0], Exception) else None
    photo_references = [r if not isinstance(r, Exception) else None for r in results[1:]]
    
    logger.info(f"[AsyncGen] [OK] Web searches completed")
    logger.info(f"[AsyncGen]   - Logo info: {'Found' if logo_info else 'Not found'}")
    logger.info(f"[AsyncGen]   - Photo refs: {sum(1 for r in photo_references if r)}/{len(angles)} found")
    
    # 3. Паралельна генерація промптів для кожного ракурсу
    prompt_tasks = [
        async_generate_prompt_for_angle(
            brand, model, year, color, body_type,
            angle, session_id, logo_info, reference
        )
        for angle, reference in zip(angles, photo_references)
    ]
    
    logger.info(f"[AsyncGen] [GEN] Generating {len(prompt_tasks)} prompts in parallel...")
    
    prompts = await asyncio.gather(*prompt_tasks, return_exceptions=True)
    
    # Фільтруємо помилки
    valid_prompts: List[Dict[str, Any]] = []
    for result in prompts:
        if isinstance(result, Exception):
            logger.error(f"[AsyncGen] [ERR] Prompt generation failed: {result}")
        elif isinstance(result, dict):
            valid_prompts.append(result)
    
    logger.info(f"[AsyncGen] [OK] Generated {len(valid_prompts)}/{len(angles)} prompts")
    logger.info(f"[AsyncGen] [LINK] All prompts use same session_id: {session_id}")
    
    return valid_prompts


async def async_generate_image_from_prompt(angle_data: Dict, canonical_data: Dict,
                                            mock_cmd, get_angle_title, index: int) -> Optional[Dict]:
    """
    Асинхронно генерує одне зображення з промпту.
    
    Args:
        angle_data: {'angle', 'prompt', 'seed', 'session_id', 'reference'}
        canonical_data: дані про авто
        mock_cmd: об'єкт для перекладу
        get_angle_title: функція для отримання заголовку
        index: індекс зображення (для визначення isMain)
    
    Returns:
        Dict з даними про згенероване зображення
    """
    angle = angle_data['angle']
    prompt = angle_data['prompt']
    seed = angle_data['seed']
    session_id = angle_data['session_id']
    
    try:
        logger.info(f"[AsyncImage] [PROC] Generating image for angle: {angle}")
        logger.info(f"[AsyncImage] [SEED] Using seed: {seed} for consistency")
        
        # Перекладаємо промпт (синхронна операція)
        translate_func = sync_to_async(mock_cmd._simple_translate_to_english, thread_sensitive=False)
        english_prompt = await translate_func(prompt, canonical_data)
        
        import os
        import urllib.parse
        
        # Спробуємо DALL-E або fallback на Pollinations
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            logger.info(f"[AsyncImage] [WARN] No DALL-E key, using Pollinations for {angle}")
            # Pollinations fallback
            enhanced_prompt = f"{english_prompt}. CONSISTENCY: Same vehicle, session {session_id}, seed {seed}. NEGATIVE: cartoon, anime, drawing, sketch, low quality, blurry, distorted, multiple vehicles, people, text, watermarks"
            encoded_prompt = urllib.parse.quote(enhanced_prompt)
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}&nologo=true"
            
        else:
            # DALL-E generation (синхронна операція - виконуємо в executor)
            try:
                from openai import OpenAI
                
                def generate_dalle_image(api_key, english_prompt):
                    """Синхронна функція для генерації через DALL-E"""
                    client = OpenAI(api_key=api_key)
                    dalle_prompt = english_prompt[:4000] if len(english_prompt) > 4000 else english_prompt
                    
                    response = client.images.generate(
                        model="dall-e-3",
                        prompt=dalle_prompt,
                        size="1024x1024",
                        quality="standard",
                        n=1,
                    )
                    
                    return response.data[0].url
                
                # Виконуємо DALL-E в executor
                dalle_async = sync_to_async(generate_dalle_image, thread_sensitive=False)
                image_url = await dalle_async(api_key, english_prompt)
                
                logger.info(f"[AsyncImage] [OK] DALL-E success for {angle}")
                
            except Exception as dalle_error:
                logger.error(f"[AsyncImage] [ERR] DALL-E failed for {angle}: {dalle_error}")
                # Fallback на Pollinations
                enhanced_prompt = f"{english_prompt}. CONSISTENCY: Same vehicle, session {session_id}, seed {seed}. NEGATIVE: cartoon, anime, drawing, sketch, low quality, blurry, distorted, multiple vehicles, people, text, watermarks"
                encoded_prompt = urllib.parse.quote(enhanced_prompt)
                image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}&nologo=true"
                logger.info(f"[AsyncImage] [PROC] Pollinations fallback for {angle}")
        
        # Створюємо об'єкт зображення
        image_obj = {
            'url': image_url,
            'angle': angle,
            'title': get_angle_title(angle, canonical_data),
            'isMain': index == 0,
            'prompt': english_prompt,
            'seed': seed,
            'session_id': session_id
        }
        
        logger.info(f"[AsyncImage] [OK] Generated {angle} with seed {seed}")
        
        return image_obj
        
    except Exception as e:
        logger.error(f"[AsyncImage] [ERR] Failed to generate {angle}: {e}")
        import traceback
        logger.error(f"[AsyncImage] Traceback: {traceback.format_exc()}")
        return None


async def async_generate_all_images(angle_prompts: List[Dict], canonical_data: Dict,
                                     mock_cmd, get_angle_title) -> List[Dict]:
    """
    Асинхронно генерує ВСІ зображення паралельно.
    
    Args:
        angle_prompts: список промптів з async_generate_all_prompts
        canonical_data: дані про авто
        mock_cmd: об'єкт для перекладу
        get_angle_title: функція для заголовків
    
    Returns:
        List[Dict]: список згенерованих зображень
    """
    logger.info(f"[AsyncImages] [START] Starting parallel image generation for {len(angle_prompts)} angles")
    
    # Створюємо задачі для паралельної генерації
    tasks = [
        async_generate_image_from_prompt(angle_data, canonical_data, mock_cmd, get_angle_title, index)
        for index, angle_data in enumerate(angle_prompts)
    ]
    
    # Виконуємо всі генерації паралельно
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Фільтруємо помилки
    valid_images: List[Dict[str, Any]] = []
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"[AsyncImages] [ERR] Image generation failed: {result}")
        elif isinstance(result, dict):
            valid_images.append(result)
    
    logger.info(f"[AsyncImages] [OK] Generated {len(valid_images)}/{len(angle_prompts)} images in parallel")
    
    return valid_images


def sync_generate_all_images(angle_prompts: List[Dict], canonical_data: Dict,
                             mock_cmd, get_angle_title) -> List[Dict]:
    """
    Синхронна обгортка для async_generate_all_images.
    
    Використовується з синхронного Django view.
    """
    sync_wrapper = async_to_sync(async_generate_all_images)
    return sync_wrapper(angle_prompts, canonical_data, mock_cmd, get_angle_title)


def sync_generate_all_prompts(brand: str, model: str, year: int, color: str,
                               body_type: str, angles: List[str]) -> List[Dict]:
    """
    Синхронна обгортка для async_generate_all_prompts.
    
    Використовується з синхронного Django view.
    Використовує async_to_sync для конвертації асинхронної функції.
    """
    # Перетворюємо асинхронну функцію на синхронну через async_to_sync
    sync_wrapper = async_to_sync(async_generate_all_prompts)
    
    return sync_wrapper(brand, model, year, color, body_type, angles)

