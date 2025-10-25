"""
🔍 Brand Logo Web Search для отримання актуальної інформації про логотипи

Використовує DuckDuckGo для пошуку описів логотипів брендів перед генерацією зображень.
"""
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

def search_brand_logo_info(brand: str) -> Optional[str]:
    """
    Шукає інформацію про логотип бренду через DuckDuckGo.
    
    Args:
        brand: Назва бренду (напр. "Renault", "Toyota")
    
    Returns:
        str: Короткий опис логотипу з результатів пошуку або None
    """
    try:
        from duckduckgo_search import DDGS
        
        # Пошуковий запит
        query = f"{brand} car logo badge emblem description"
        
        logger.info(f"[BrandSearch] 🔍 Searching for: {query}")
        
        # Виконуємо пошук
        ddgs = DDGS()
        results = ddgs.text(query, max_results=3)
        
        if not results:
            logger.warning(f"[BrandSearch] ⚠️ No results found for {brand}")
            return None
        
        # Збираємо описи з результатів
        descriptions = []
        for result in results:
            title = result.get('title', '')
            body = result.get('body', '')
            
            # Фільтруємо релевантні фрагменти
            text = f"{title}. {body}"
            if any(keyword in text.lower() for keyword in ['logo', 'badge', 'emblem', 'symbol']):
                descriptions.append(text)
        
        if not descriptions:
            logger.warning(f"[BrandSearch] ⚠️ No relevant descriptions for {brand}")
            return None
        
        # Повертаємо перший найрелевантніший опис (обмежено 200 символів)
        best_description = descriptions[0][:200]
        logger.info(f"[BrandSearch] ✅ Found description for {brand}: {best_description[:100]}...")
        
        return best_description
        
    except ImportError:
        logger.error("[BrandSearch] ❌ duckduckgo_search not installed")
        return None
    except Exception as e:
        logger.error(f"[BrandSearch] ❌ Search error for {brand}: {e}")
        return None


def extract_logo_features(search_result: str, brand: str) -> Dict[str, str]:
    """
    Витягує ключові особливості логотипу з результатів пошуку.
    
    Args:
        search_result: Текст з результатів пошуку
        brand: Назва бренду
    
    Returns:
        dict: Ключові особливості логотипу (форма, колір, елементи)
    """
    if not search_result:
        return {}
    
    features = {
        "shape": "",
        "color": "",
        "elements": ""
    }
    
    text_lower = search_result.lower()
    
    # Форма
    shapes = ['circle', 'oval', 'diamond', 'star', 'shield', 'wings', 'roundel', 'hexagon', 'square']
    for shape in shapes:
        if shape in text_lower:
            features["shape"] = shape
            break
    
    # Колір
    colors = ['blue', 'silver', 'chrome', 'gold', 'red', 'black', 'white', 'green', 'yellow']
    for color in colors:
        if color in text_lower:
            features["color"] = color
            break
    
    # Елементи
    elements = ['letter', 'letters', 'text', 'animal', 'lion', 'horse', 'star', 'rings', 'ellipse']
    found_elements = [elem for elem in elements if elem in text_lower]
    if found_elements:
        features["elements"] = ", ".join(found_elements)
    
    logger.info(f"[BrandSearch] 🎨 Extracted features for {brand}: {features}")
    
    return features


def create_smart_logo_prompt(brand: str, model: str, year: int, color: str,
                              body_type: str, angle: str) -> tuple[str, Optional[Dict]]:
    """
    Створює промпт з використанням актуальної інформації з інтернету.
    
    СТРАТЕГІЯ:
    1. Шукає опис логотипу через DuckDuckGo text search
    2. Шукає РЕАЛЬНЕ фото автомобіля через DuckDuckGo images
    3. Аналізує референс та створює покращений промпт
    4. Повертає промпт + URL референсного фото (якщо знайдено)
    
    Returns:
        tuple: (prompt: str, reference_data: dict або None)
    """
    logger.info(f"[SmartPrompt] 🚀 Creating smart prompt for {year} {brand} {model}")
    
    # 1. Пошук інформації про логотип
    logo_description = search_brand_logo_info(brand)
    
    if logo_description:
        features = extract_logo_features(logo_description, brand)
        logo_hint = f"{brand} logo"
        if features.get("shape"):
            logo_hint += f" ({features['shape']} shape"
            if features.get("color"):
                logo_hint += f", {features['color']}"
            logo_hint += ")"
        logger.info(f"[SmartPrompt] ✅ Logo from web: {logo_hint}")
    else:
        logo_hint = f"{brand} authentic badge"
        logger.info(f"[SmartPrompt] ⚠️ Logo fallback")
    
    # 2. Пошук реального фото автомобіля
    reference = get_real_car_reference_images(brand, model, year, angle)
    
    if reference:
        # Аналізуємо референс для покращення промпту
        ref_details = analyze_reference_image_description(reference)
        logger.info(f"[SmartPrompt] ✅ Reference found: {reference['url'][:80]}...")
        logger.info(f"[SmartPrompt] 📝 Reference details: {ref_details}")
        
        # Промпт з урахуванням референсу
        prompt = f"""
        {year} {brand} {model} {body_type}, {color}, {angle} view.
        
        Style: Similar to real {year} {brand} {model} photos, {ref_details}.
        Show {logo_hint} on front grille, clearly visible and accurate.
        Photorealistic automotive photography, authentic {brand} design and branding.
        """.strip()
    else:
        # Промпт без референсу
        logger.info(f"[SmartPrompt] ⚠️ No reference photo found")
        prompt = f"""
        {year} {brand} {model} {body_type}, {color}, {angle} view.
        
        Show {logo_hint} on front grille, clearly visible.
        Photorealistic automotive photography, accurate brand identity.
        """.strip()
    
    final_prompt = " ".join(prompt.split())
    logger.info(f"[SmartPrompt] 📝 Final prompt length: {len(final_prompt)} chars")
    
    return final_prompt, reference


def get_brand_logo_reference_image(brand: str) -> Optional[str]:
    """
    Шукає URL референсного зображення логотипу через DuckDuckGo Images.
    
    Args:
        brand: Назва бренду
    
    Returns:
        str: URL першого знайденого зображення логотипу або None
    """
    try:
        from duckduckgo_search import DDGS
        
        query = f"{brand} car logo official"
        
        logger.info(f"[BrandSearch] 🖼️ Searching images for: {query}")
        
        ddgs = DDGS()
        results = ddgs.images(query, max_results=1)
        
        if results and len(results) > 0:
            image_url = results[0].get('image')
            logger.info(f"[BrandSearch] ✅ Found reference image: {image_url[:100]}...")
            return image_url
        
        logger.warning(f"[BrandSearch] ⚠️ No reference images found for {brand}")
        return None
        
    except Exception as e:
        logger.error(f"[BrandSearch] ❌ Image search error: {e}")
        return None


def get_real_car_reference_images(brand: str, model: str, year: int, 
                                    angle: str = "front") -> Optional[Dict[str, str]]:
    """
    Шукає РЕАЛЬНІ фото конкретного автомобіля через DuckDuckGo Images.
    
    Використовується як візуальний референс для AI генерації.
    
    Args:
        brand: Бренд (напр. "Renault")
        model: Модель (напр. "Clio")
        year: Рік випуску
        angle: Ракурс (front, side, rear)
    
    Returns:
        dict: {'url': str, 'title': str, 'description': str} або None
    """
    try:
        from duckduckgo_search import DDGS
        
        # Формуємо пошуковий запит для реальних фото
        angle_keywords = {
            "front": "front view",
            "side": "side profile",
            "rear": "rear view back",
            "interior": "interior dashboard"
        }
        
        angle_keyword = angle_keywords.get(angle, "front view")
        query = f"{year} {brand} {model} {angle_keyword} photo"
        
        logger.info(f"[CarReference] 🚗 Searching real photos: {query}")
        
        ddgs = DDGS()
        results = ddgs.images(query, max_results=5)
        
        if not results:
            logger.warning(f"[CarReference] ⚠️ No photos found for {brand} {model}")
            return None
        
        # Беремо перше найкраще фото
        best_result = results[0]
        
        reference = {
            "url": best_result.get('image', ''),
            "title": best_result.get('title', ''),
            "thumbnail": best_result.get('thumbnail', ''),
            "source": best_result.get('source', '')
        }
        
        logger.info(f"[CarReference] ✅ Found reference photo: {reference['url'][:100]}...")
        logger.info(f"[CarReference] 📝 Title: {reference['title']}")
        
        return reference
        
    except Exception as e:
        logger.error(f"[CarReference] ❌ Photo search error: {e}")
        return None


def analyze_reference_image_description(reference: Dict[str, str]) -> str:
    """
    Аналізує опис референсного зображення для покращення промпту.
    
    Args:
        reference: Словник з даними про референсне фото
    
    Returns:
        str: Короткий опис особливостей з референсу
    """
    if not reference:
        return ""
    
    title = reference.get('title', '').lower()
    
    # Витягуємо корисні деталі з заголовку
    details = []
    
    # Колір якщо згадується
    colors = ['red', 'blue', 'black', 'white', 'silver', 'grey', 'gray', 'green', 'yellow']
    for color in colors:
        if color in title:
            details.append(f"{color} color")
            break
    
    # Умови/стан
    if 'new' in title:
        details.append("brand new condition")
    elif 'used' in title:
        details.append("well-maintained")
    
    # Оточення
    if 'studio' in title or 'showroom' in title:
        details.append("studio lighting")
    elif 'outdoor' in title or 'street' in title:
        details.append("natural outdoor setting")
    
    description = ", ".join(details) if details else "professional photography"
    
    logger.info(f"[CarReference] 🎨 Extracted details: {description}")
    
    return description

