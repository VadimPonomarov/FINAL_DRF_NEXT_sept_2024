"""
Celery задачи для генерации аналитики и статистики
"""
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging
import json

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def generate_platform_analytics(self, locale='uk'):
    """
    Генерирует полную аналитику платформы и сохраняет в кеш
    """
    try:
        logger.info(f"[Analytics Task] Starting platform analytics generation for locale: {locale}")

        # Пока что генерируем упрощенную статистику
        from apps.ads.models import CarAd, AdView
        from apps.accounts.models import AddsAccount
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Avg, Min, Max

        User = get_user_model()

        # Базовая статистика
        total_ads = CarAd.objects.count()
        active_ads = CarAd.objects.filter(status='active').count()
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_views = AdView.objects.count()
        premium_accounts = AddsAccount.objects.filter(account_type='premium').count()

        # ТОП марки
        top_makes = list(CarAd.objects.values('mark__name').annotate(
            count=Count('id')
        ).order_by('-count')[:10])

        # Статистика по регионам
        regional_stats = list(CarAd.objects.values('region').annotate(
            ads_count=Count('id')
        ).order_by('-ads_count')[:10])

        dashboard_data = {
            'success': True,
            'data': {
                'platform_overview': {
                    'total_ads': total_ads,
                    'active_ads': active_ads,
                    'total_users': total_users,
                    'active_users': active_users,
                    'total_views': total_views,
                    'premium_accounts': premium_accounts,
                },
                'top_makes': top_makes,
                'regional_stats': regional_stats,
                'generated_at': timezone.now().isoformat(),
                'locale': locale
            }
        }

        # Сохраняем в кеш на 1 час
        cache_key = f'platform_analytics_{locale}'
        cache.set(cache_key, dashboard_data, timeout=3600)

        logger.info(f"[Analytics Task] ✅ Platform analytics generated and cached for locale: {locale}")

        return {
            'success': True,
            'message': f'Analytics generated for {locale}',
            'cache_key': cache_key,
            'data': dashboard_data['data']
        }

    except Exception as exc:
        logger.error(f"[Analytics Task] ❌ Error generating analytics: {str(exc)}")

        return {
            'success': False,
            'error': str(exc),
            'retries': getattr(self.request, 'retries', 0)
        }

@shared_task
def generate_analytics_for_all_locales():
    """
    Генерирует аналитику для всех поддерживаемых локалей
    """
    locales = ['uk', 'en', 'ru']
    results = {}
    
    logger.info("[Analytics Task] 🌍 Starting analytics generation for all locales")
    
    for locale in locales:
        try:
            result = generate_platform_analytics.delay(locale)
            results[locale] = {
                'task_id': result.id,
                'status': 'started'
            }
            logger.info(f"[Analytics Task] 🚀 Started analytics generation for {locale}")
        except Exception as e:
            results[locale] = {
                'status': 'failed',
                'error': str(e)
            }
            logger.error(f"[Analytics Task] ❌ Failed to start analytics for {locale}: {str(e)}")
    
    return results

@shared_task
def generate_quick_stats():
    """
    Генерирует быструю статистику (только числовые показатели)
    """
    try:
        logger.info("[Analytics Task] 📊 Generating quick stats")
        
        from apps.ads.models import CarAd, AdView
        from apps.accounts.models import AddsAccount
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Быстрые счетчики
        quick_stats = {
            'total_ads': CarAd.objects.count(),
            'active_ads': CarAd.objects.filter(status='active').count(),
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'total_views': AdView.objects.count(),
            'premium_accounts': AddsAccount.objects.filter(account_type='premium').count(),
            'today_ads': CarAd.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'today_views': AdView.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'generated_at': timezone.now().isoformat()
        }
        
        # Сохраняем в кеш на 15 минут
        cache.set('quick_stats', quick_stats, timeout=900)
        
        logger.info("[Analytics Task] ✅ Quick stats generated and cached")
        
        return {
            'success': True,
            'data': quick_stats
        }
        
    except Exception as e:
        logger.error(f"[Analytics Task] ❌ Error generating quick stats: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@shared_task
def cleanup_old_analytics_cache():
    """
    Очищает старые данные аналитики из кеша
    """
    try:
        logger.info("[Analytics Task] 🧹 Cleaning up old analytics cache")
        
        # Список ключей для очистки
        cache_patterns = [
            'platform_analytics_*',
            'platform_summary_*',
            'quick_stats'
        ]
        
        # В Django cache нет прямого способа удалить по паттерну,
        # поэтому удаляем известные ключи
        locales = ['uk', 'en', 'ru']
        keys_to_delete = []
        
        for locale in locales:
            keys_to_delete.extend([
                f'platform_analytics_{locale}',
                f'platform_summary_{locale}'
            ])
        
        keys_to_delete.append('quick_stats')
        
        # Удаляем ключи
        cache.delete_many(keys_to_delete)
        
        logger.info(f"[Analytics Task] ✅ Cleaned up {len(keys_to_delete)} cache keys")
        
        return {
            'success': True,
            'cleaned_keys': len(keys_to_delete)
        }
        
    except Exception as e:
        logger.error(f"[Analytics Task] ❌ Error cleaning cache: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@shared_task
def generate_daily_report():
    """
    Генерирует ежедневный отчет с ключевыми метриками
    """
    try:
        logger.info("[Analytics Task] 📈 Generating daily report")
        
        from apps.ads.models import CarAd, AdView
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Данные за сегодня
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        
        today_stats = {
            'date': today.isoformat(),
            'new_ads': CarAd.objects.filter(created_at__date=today).count(),
            'new_users': User.objects.filter(date_joined__date=today).count(),
            'total_views': AdView.objects.filter(created_at__date=today).count(),
        }
        
        yesterday_stats = {
            'new_ads': CarAd.objects.filter(created_at__date=yesterday).count(),
            'new_users': User.objects.filter(date_joined__date=yesterday).count(),
            'total_views': AdView.objects.filter(created_at__date=yesterday).count(),
        }
        
        # Вычисляем изменения
        changes = {}
        for key in ['new_ads', 'new_users', 'total_views']:
            today_val = today_stats[key]
            yesterday_val = yesterday_stats[key]
            
            if yesterday_val > 0:
                change_percent = ((today_val - yesterday_val) / yesterday_val) * 100
            else:
                change_percent = 100 if today_val > 0 else 0
            
            changes[key] = {
                'today': today_val,
                'yesterday': yesterday_val,
                'change': today_val - yesterday_val,
                'change_percent': round(change_percent, 1)
            }
        
        daily_report = {
            'date': today.isoformat(),
            'metrics': changes,
            'generated_at': timezone.now().isoformat()
        }
        
        # Сохраняем отчет в кеш на 24 часа
        cache.set(f'daily_report_{today.isoformat()}', daily_report, timeout=86400)
        cache.set('latest_daily_report', daily_report, timeout=86400)
        
        logger.info("[Analytics Task] ✅ Daily report generated")
        
        return {
            'success': True,
            'data': daily_report
        }
        
    except Exception as e:
        logger.error(f"[Analytics Task] ❌ Error generating daily report: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
