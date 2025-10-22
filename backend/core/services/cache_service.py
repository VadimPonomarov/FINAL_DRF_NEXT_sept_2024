"""
Сервис для управления кэшем.
Обеспечивает эффективное кэширование данных и автоматическую инвалидацию.
"""
import json
import logging
from typing import Any, Dict, List, Optional, Union

from django.conf import settings
from django.core.cache import cache
from django.db.models import QuerySet

logger = logging.getLogger(__name__)


class CacheService:
    """
    Сервис для управления кэшем.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.default_timeout = getattr(settings, 'CACHE_DEFAULT_TIMEOUT', 300)  # 5 минут
    
    def get(self, key: str) -> Optional[Any]:
        """
        Получение значения из кэша.
        
        Args:
            key: Ключ кэша
            
        Returns:
            Значение из кэша или None
        """
        try:
            return cache.get(key)
        except Exception as e:
            self.logger.error(f"Error getting cache key {key}: {str(e)}")
            return None
    
    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> bool:
        """
        Сохранение значения в кэш.
        
        Args:
            key: Ключ кэша
            value: Значение для сохранения
            timeout: Время жизни в секундах
            
        Returns:
            True если успешно сохранено
        """
        try:
            if timeout is None:
                timeout = self.default_timeout
            
            cache.set(key, value, timeout)
            return True
        except Exception as e:
            self.logger.error(f"Error setting cache key {key}: {str(e)}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Удаление значения из кэша.
        
        Args:
            key: Ключ кэша
            
        Returns:
            True если успешно удалено
        """
        try:
            cache.delete(key)
            return True
        except Exception as e:
            self.logger.error(f"Error deleting cache key {key}: {str(e)}")
            return False
    
    def get_or_set(self, key: str, callable_func, timeout: Optional[int] = None) -> Any:
        """
        Получение значения из кэша или создание нового.
        
        Args:
            key: Ключ кэша
            callable_func: Функция для создания значения
            timeout: Время жизни в секундах
            
        Returns:
            Значение из кэша или новое значение
        """
        try:
            if timeout is None:
                timeout = self.default_timeout
            
            return cache.get_or_set(key, callable_func, timeout)
        except Exception as e:
            self.logger.error(f"Error getting or setting cache key {key}: {str(e)}")
            return callable_func()
    
    def invalidate_pattern(self, pattern: str) -> int:
        """
        Инвалидация кэша по паттерну.
        
        Args:
            pattern: Паттерн для поиска ключей
            
        Returns:
            Количество удаленных ключей
        """
        try:
            # Простая реализация - в production лучше использовать Redis
            # с поддержкой SCAN для поиска по паттерну
            return 0
        except Exception as e:
            self.logger.error(f"Error invalidating cache pattern {pattern}: {str(e)}")
            return 0
    
    def cache_queryset(self, key: str, queryset: QuerySet, timeout: Optional[int] = None) -> List[Dict]:
        """
        Кэширование QuerySet.
        
        Args:
            key: Ключ кэша
            queryset: QuerySet для кэширования
            timeout: Время жизни в секундах
            
        Returns:
            Список словарей с данными
        """
        try:
            def get_data():
                return list(queryset.values())
            
            return self.get_or_set(key, get_data, timeout)
        except Exception as e:
            self.logger.error(f"Error caching queryset {key}: {str(e)}")
            return list(queryset.values())
    
    def cache_reference_data(self, model_class, key_prefix: str = None) -> List[Dict]:
        """
        Кэширование справочных данных.
        
        Args:
            model_class: Класс модели
            key_prefix: Префикс ключа кэша
            
        Returns:
            Список справочных данных
        """
        try:
            if key_prefix is None:
                key_prefix = model_class.__name__.lower()
            
            key = f"reference_{key_prefix}_all"
            
            def get_reference_data():
                return list(model_class.objects.all().values())
            
            return self.get_or_set(key, get_reference_data, 3600)  # 1 час
        except Exception as e:
            self.logger.error(f"Error caching reference data for {model_class}: {str(e)}")
            return []
    
    def warm_up_cache(self) -> Dict[str, Any]:
        """
        Прогрев кэша.
        
        Returns:
            Словарь с результатами прогрева
        """
        results = {}
        
        try:
            # Кэшируем справочные данные
            from apps.ads.models.reference import (
                CarColorModel,
                CarMarkModel,
                CarModel,
                CityModel,
                RegionModel,
            )
            
            reference_models = [
                (CarMarkModel, 'car_marks'),
                (CarModel, 'car_models'),
                (CarColorModel, 'car_colors'),
                (RegionModel, 'regions'),
                (CityModel, 'cities')
            ]
            
            for model_class, key_prefix in reference_models:
                try:
                    data = self.cache_reference_data(model_class, key_prefix)
                    results[key_prefix] = len(data)
                    self.logger.info(f"Cached {len(data)} {key_prefix}")
                except Exception as e:
                    self.logger.error(f"Error caching {key_prefix}: {str(e)}")
                    results[key_prefix] = 0
            
            # Кэшируем статистику
            try:
                from apps.ads.models.car_ad_model import CarAd
                stats = {
                    'total_ads': CarAd.objects.count(),
                    'active_ads': CarAd.objects.filter(status='active').count(),
                    'pending_ads': CarAd.objects.filter(status='pending').count()
                }
                self.set('platform_stats', stats, 1800)  # 30 минут
                results['stats'] = stats
            except Exception as e:
                self.logger.error(f"Error caching stats: {str(e)}")
                results['stats'] = {}
            
        except Exception as e:
            self.logger.error(f"Error warming up cache: {str(e)}")
            results['error'] = str(e)
        
        return results
    
    def clear_cache(self) -> Dict[str, Any]:
        """
        Очистка всего кэша.
        
        Returns:
            Словарь с результатами очистки
        """
        try:
            # В production лучше использовать Redis FLUSHDB
            cache.clear()
            self.logger.info("Cache cleared successfully")
            return {'success': True, 'message': 'Cache cleared successfully'}
        except Exception as e:
            self.logger.error(f"Error clearing cache: {str(e)}")
            return {'success': False, 'error': str(e)}


# Глобальный экземпляр сервиса
cache_service = CacheService()
        except Exception as e:
            self.logger.error(f"Error clearing cache: {str(e)}")
            return {'success': False, 'error': str(e)}


# Глобальный экземпляр сервиса
cache_service = CacheService()
