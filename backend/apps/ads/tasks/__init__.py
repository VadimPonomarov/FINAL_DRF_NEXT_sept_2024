"""
Celery задачи для приложения ads
"""
from .analytics_tasks import (
    generate_platform_analytics,
    generate_analytics_for_all_locales,
    generate_quick_stats,
    cleanup_old_analytics_cache,
    generate_daily_report
)

__all__ = [
    'generate_platform_analytics',
    'generate_analytics_for_all_locales', 
    'generate_quick_stats',
    'cleanup_old_analytics_cache',
    'generate_daily_report'
]
