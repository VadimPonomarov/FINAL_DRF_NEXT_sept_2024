"""
⚡ ОПТИМІЗАЦІЯ: Декоратори для кешування API відповідей
Використовується Redis для швидкого доступу до reference data
"""
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
import hashlib
import json


def cache_api_response(timeout=3600, key_prefix='api'):
    """
    Декоратор для кешування API відповідей
    
    Args:
        timeout: Час життя кешу в секундах (за замовчуванням 1 година)
        key_prefix: Префікс для ключа кешу
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Генеруємо унікальний ключ на основі URL + query params
            cache_key = _generate_cache_key(request, key_prefix)
            
            # Спробуємо отримати з кешу
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                print(f"[CACHE HIT] {cache_key}")
                return JsonResponse(cached_response, safe=False)
            
            # Виконуємо view якщо немає в кеші
            response = view_func(request, *args, **kwargs)
            
            # Кешуємо тільки успішні відповіді
            if response.status_code == 200 and hasattr(response, 'data'):
                cache.set(cache_key, response.data, timeout)
                print(f"[CACHE SET] {cache_key} (timeout: {timeout}s)")
            
            return response
        return wrapper
    return decorator


def cache_reference_data(timeout=7200):
    """
    Спеціальний декоратор для reference data (brands, models, colors тощо)
    Кешує на 2 години за замовчуванням
    """
    return cache_api_response(timeout=timeout, key_prefix='reference')


def _generate_cache_key(request, prefix):
    """Генерує унікальний ключ кешу на основі запиту"""
    # Беремо path + query params
    path = request.path
    query_string = request.GET.urlencode()
    
    # Створюємо hash для коротшого ключа
    key_data = f"{path}?{query_string}"
    key_hash = hashlib.md5(key_data.encode()).hexdigest()[:12]
    
    return f"{prefix}:{key_hash}"
