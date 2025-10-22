"""
Стратегия миграции пагинаторов.
Обеспечивает плавный переход от старых к новым пагинаторам.
"""
from typing import Any, Dict

from django.conf import settings


class PaginationMigrationStrategy:
    """
    Стратегия миграции пагинаторов.
    """
    
    @staticmethod
    def get_pagination_class(view_name: str, app_name: str = None) -> str:
        """
        Возвращает класс пагинации в зависимости от контекста.
        
        Args:
            view_name: Название view
            app_name: Название приложения
            
        Returns:
            Строка с путем к классу пагинации
        """
        # Настройки миграции из settings
        migration_config = getattr(settings, 'PAGINATION_MIGRATION', {})
        
        # Проверяем, включена ли миграция для конкретного view
        if view_name in migration_config.get('migrated_views', []):
            return migration_config.get('new_pagination_class', 
                                      'core.pagination.optimized_pagination.OptimizedPageNumberPagination')
        
        # Проверяем, включена ли миграция для приложения
        if app_name in migration_config.get('migrated_apps', []):
            return migration_config.get('new_pagination_class',
                                      'core.pagination.optimized_pagination.OptimizedPageNumberPagination')
        
        # По умолчанию используем совместимый пагинатор
        return migration_config.get('compatible_pagination_class',
                                  'core.pagination.legacy_compatible_pagination.LegacyCompatiblePagination')
    
    @staticmethod
    def get_pagination_config() -> Dict[str, Any]:
        """
        Возвращает конфигурацию пагинации.
        """
        return {
            'default_page_size': 50,
            'max_page_size': 10000,
            'page_size_query_param': 'page_size',
            'enable_page_info': True,
            'enable_optimization': True,
            'fallback_to_legacy': True
        }


def get_pagination_class_for_view(view_name: str, app_name: str = None):
    """
    Функция-хелпер для получения класса пагинации.
    """
    strategy = PaginationMigrationStrategy()
    return strategy.get_pagination_class(view_name, app_name)


# Настройки для миграции (можно добавить в settings.py)
PAGINATION_MIGRATION_SETTINGS = {
    'PAGINATION_MIGRATION': {
        # Views, которые уже мигрированы на новые пагинаторы
        'migrated_views': [
            'CarAdListView',
            'CarAdCreateView',
            # Добавляем по мере миграции
        ],
        
        # Приложения, которые полностью мигрированы
        'migrated_apps': [
            # 'ads',  # Раскомментировать когда готово
        ],
        
        # Классы пагинации
        'compatible_pagination_class': 'core.pagination.legacy_compatible_pagination.LegacyCompatiblePagination',
        'new_pagination_class': 'core.pagination.optimized_pagination.OptimizedPageNumberPagination',
        'enhanced_pagination_class': 'core.pagination.legacy_compatible_pagination.EnhancedCarAdPagination',
        
        # Настройки производительности
        'performance': {
            'enable_smart_pagination': True,
            'large_queryset_threshold': 10000,
            'enable_caching': True,
            'cache_timeout': 300
        }
    }
}
}
