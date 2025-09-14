"""
Celery задачи для автоматического обновления курсов валют
"""
import logging
import requests
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from celery import shared_task
from django.utils import timezone
from django.conf import settings

from .models import CurrencyRate, CurrencyUpdateLog

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def update_currency_rates_daily(self, source='NBU'):
    """
    Ежедневное обновление курсов валют
    
    Args:
        source: Источник курсов ('NBU', 'PRIVATBANK', 'EXCHANGERATE_API')
    """
    logger.info(f"🔄 Starting daily currency rates update from {source}")
    
    # Создаем лог обновления
    update_log = CurrencyUpdateLog.objects.create(
        source=source,
        triggered_by='celery_beat_daily'
    )
    
    try:
        # Выбираем источник и обновляем курсы
        if source == 'NBU':
            result = _update_from_nbu()
        elif source == 'PRIVATBANK':
            result = _update_from_privatbank()
        elif source == 'EXCHANGERATE_API':
            result = _update_from_exchangerate_api()
        else:
            raise ValueError(f"Unknown currency source: {source}")
        
        # Обновляем лог
        update_log.currencies_updated = result['success_count']
        update_log.currencies_failed = result['failed_count']
        update_log.success_details = result['success_details']
        update_log.error_details = result['error_details']
        
        # Определяем статус
        if result['failed_count'] == 0:
            status = 'SUCCESS'
        elif result['success_count'] > 0:
            status = 'PARTIAL'
        else:
            status = 'FAILED'
        
        update_log.mark_completed(status)
        
        logger.info(f"✅ Currency update completed: {result['success_count']} success, {result['failed_count']} failed")
        
        return {
            'status': status,
            'updated': result['success_count'],
            'failed': result['failed_count'],
            'source': source
        }
        
    except Exception as exc:
        logger.error(f"❌ Currency update failed: {str(exc)}")
        update_log.error_details = {'error': str(exc)}
        update_log.mark_completed('FAILED')
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"🔄 Retrying currency update in {self.default_retry_delay} seconds...")
            raise self.retry(exc=exc)
        
        raise exc


@shared_task
def update_currency_rates_manual(source='NBU', currencies=None):
    """
    Ручное обновление курсов валют
    
    Args:
        source: Источник курсов
        currencies: Список валют для обновления (None = все)
    """
    logger.info(f"🔧 Manual currency rates update from {source}")
    
    update_log = CurrencyUpdateLog.objects.create(
        source=source,
        triggered_by='manual_update'
    )
    
    try:
        if source == 'NBU':
            result = _update_from_nbu(currencies)
        elif source == 'PRIVATBANK':
            result = _update_from_privatbank(currencies)
        elif source == 'EXCHANGERATE_API':
            result = _update_from_exchangerate_api(currencies)
        else:
            raise ValueError(f"Unknown currency source: {source}")
        
        update_log.currencies_updated = result['success_count']
        update_log.currencies_failed = result['failed_count']
        update_log.success_details = result['success_details']
        update_log.error_details = result['error_details']
        
        status = 'SUCCESS' if result['failed_count'] == 0 else 'PARTIAL'
        update_log.mark_completed(status)
        
        return result
        
    except Exception as exc:
        logger.error(f"❌ Manual currency update failed: {str(exc)}")
        update_log.error_details = {'error': str(exc)}
        update_log.mark_completed('FAILED')
        raise exc


def _update_from_nbu(currencies=None) -> Dict:
    """
    Обновление курсов от НБУ
    """
    logger.info("📊 Fetching rates from National Bank of Ukraine")
    
    success_details = []
    error_details = []
    
    try:
        # API НБУ
        url = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Обрабатываем каждую валюту
        for item in data:
            currency_code = item.get('cc')
            rate_value = item.get('rate')
            
            # Фильтруем по запрошенным валютам
            if currencies and currency_code not in currencies:
                continue
            
            # Проверяем, что валюта поддерживается
            supported_currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
            if currency_code not in supported_currencies:
                continue
            
            try:
                # Создаем или обновляем курс
                rate, created = CurrencyRate.objects.update_or_create(
                    base_currency='UAH',
                    target_currency=currency_code,
                    fetched_at__date=timezone.now().date(),
                    defaults={
                        'rate': Decimal(str(rate_value)),
                        'source': 'NBU',
                        'fetched_at': timezone.now(),
                        'is_active': True,
                        'raw_data': item
                    }
                )
                
                action = "created" if created else "updated"
                success_details.append({
                    'currency': currency_code,
                    'rate': str(rate_value),
                    'action': action
                })
                
                logger.info(f"✅ {currency_code}: {rate_value} UAH ({action})")
                
            except Exception as e:
                error_msg = f"Failed to save {currency_code}: {str(e)}"
                error_details.append({
                    'currency': currency_code,
                    'error': error_msg
                })
                logger.error(f"❌ {error_msg}")
        
        return {
            'success_count': len(success_details),
            'failed_count': len(error_details),
            'success_details': success_details,
            'error_details': error_details
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch from NBU: {str(e)}")
        return {
            'success_count': 0,
            'failed_count': 1,
            'success_details': [],
            'error_details': [{'error': f"NBU API error: {str(e)}"}]
        }


def _update_from_privatbank(currencies=None) -> Dict:
    """
    Обновление курсов от ПриватБанка
    """
    logger.info("🏦 Fetching rates from PrivatBank")
    
    success_details = []
    error_details = []
    
    try:
        # API ПриватБанка
        url = "https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        for item in data:
            currency_code = item.get('ccy')
            buy_rate = item.get('buy')
            sale_rate = item.get('sale')
            
            # Используем средний курс
            if buy_rate and sale_rate:
                avg_rate = (float(buy_rate) + float(sale_rate)) / 2
            else:
                continue
            
            # Фильтруем по запрошенным валютам
            if currencies and currency_code not in currencies:
                continue
            
            # Проверяем поддержку валюты
            supported_currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
            if currency_code not in supported_currencies:
                continue
            
            try:
                rate, created = CurrencyRate.objects.update_or_create(
                    base_currency='UAH',
                    target_currency=currency_code,
                    fetched_at__date=timezone.now().date(),
                    source='PRIVATBANK',
                    defaults={
                        'rate': Decimal(str(avg_rate)),
                        'fetched_at': timezone.now(),
                        'is_active': True,
                        'raw_data': item
                    }
                )
                
                action = "created" if created else "updated"
                success_details.append({
                    'currency': currency_code,
                    'rate': str(avg_rate),
                    'action': action
                })
                
                logger.info(f"✅ {currency_code}: {avg_rate} UAH ({action})")
                
            except Exception as e:
                error_msg = f"Failed to save {currency_code}: {str(e)}"
                error_details.append({
                    'currency': currency_code,
                    'error': error_msg
                })
                logger.error(f"❌ {error_msg}")
        
        return {
            'success_count': len(success_details),
            'failed_count': len(error_details),
            'success_details': success_details,
            'error_details': error_details
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch from PrivatBank: {str(e)}")
        return {
            'success_count': 0,
            'failed_count': 1,
            'success_details': [],
            'error_details': [{'error': f"PrivatBank API error: {str(e)}"}]
        }


def _update_from_exchangerate_api(currencies=None) -> Dict:
    """
    Обновление курсов от ExchangeRate-API
    """
    logger.info("🌍 Fetching rates from ExchangeRate-API")
    
    success_details = []
    error_details = []
    
    try:
        # API ExchangeRate-API (бесплатный)
        url = "https://api.exchangerate-api.com/v4/latest/UAH"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        rates = data.get('rates', {})
        
        for currency_code, rate_value in rates.items():
            # Фильтруем по запрошенным валютам
            if currencies and currency_code not in currencies:
                continue
            
            # Проверяем поддержку валюты
            supported_currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
            if currency_code not in supported_currencies:
                continue
            
            try:
                # Конвертируем курс (API возвращает обратный курс)
                converted_rate = 1 / float(rate_value) if rate_value != 0 else 0
                
                rate, created = CurrencyRate.objects.update_or_create(
                    base_currency='UAH',
                    target_currency=currency_code,
                    fetched_at__date=timezone.now().date(),
                    source='EXCHANGERATE_API',
                    defaults={
                        'rate': Decimal(str(converted_rate)),
                        'fetched_at': timezone.now(),
                        'is_active': True,
                        'raw_data': {'original_rate': rate_value, 'converted_rate': converted_rate}
                    }
                )
                
                action = "created" if created else "updated"
                success_details.append({
                    'currency': currency_code,
                    'rate': str(converted_rate),
                    'action': action
                })
                
                logger.info(f"✅ {currency_code}: {converted_rate} UAH ({action})")
                
            except Exception as e:
                error_msg = f"Failed to save {currency_code}: {str(e)}"
                error_details.append({
                    'currency': currency_code,
                    'error': error_msg
                })
                logger.error(f"❌ {error_msg}")
        
        return {
            'success_count': len(success_details),
            'failed_count': len(error_details),
            'success_details': success_details,
            'error_details': error_details
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch from ExchangeRate-API: {str(e)}")
        return {
            'success_count': 0,
            'failed_count': 1,
            'success_details': [],
            'error_details': [{'error': f"ExchangeRate-API error: {str(e)}"}]
        }


@shared_task
def cleanup_old_currency_rates(days_to_keep=30):
    """
    Очистка старых курсов валют
    
    Args:
        days_to_keep: Количество дней для хранения курсов
    """
    logger.info(f"🧹 Cleaning up currency rates older than {days_to_keep} days")
    
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    
    # Удаляем старые курсы, оставляя последний курс для каждой пары валют
    deleted_count = 0
    
    for base_currency, _ in CurrencyRate.CURRENCY_CHOICES:
        for target_currency, _ in CurrencyRate.CURRENCY_CHOICES:
            if base_currency == target_currency:
                continue
            
            # Получаем все курсы для пары валют старше cutoff_date
            old_rates = CurrencyRate.objects.filter(
                base_currency=base_currency,
                target_currency=target_currency,
                fetched_at__lt=cutoff_date
            ).order_by('-fetched_at')
            
            # Оставляем последний курс, удаляем остальные
            if old_rates.count() > 1:
                rates_to_delete = old_rates[1:]  # Все кроме последнего
                count = rates_to_delete.count()
                rates_to_delete.delete()
                deleted_count += count
    
    # Очищаем старые логи обновлений
    old_logs = CurrencyUpdateLog.objects.filter(
        started_at__lt=cutoff_date
    )
    logs_deleted = old_logs.count()
    old_logs.delete()
    
    logger.info(f"✅ Cleanup completed: {deleted_count} rates deleted, {logs_deleted} logs deleted")
    
    return {
        'rates_deleted': deleted_count,
        'logs_deleted': logs_deleted,
        'cutoff_date': cutoff_date.isoformat()
    }
