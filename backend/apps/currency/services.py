"""
Сервис для работы с курсами валют
Автоматически обновляет курсы при их отсутствии
"""
import logging
import requests
from decimal import Decimal
from typing import Optional, Dict, List
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

from .models import CurrencyRate

logger = logging.getLogger(__name__)


class CurrencyService:
    """
    Сервис для работы с курсами валют
    """
    
    # Кэш на 1 час для избежания частых запросов
    CACHE_TIMEOUT = 3600
    
    @classmethod
    def get_rate(cls, base_currency='UAH', target_currency='USD', force_update=False):
        """
        Получить курс валюты с автоматическим обновлением
        
        Args:
            base_currency: Базовая валюта
            target_currency: Целевая валюта
            force_update: Принудительно обновить курс
            
        Returns:
            Decimal: Курс валюты или None
        """
        cache_key = f"currency_rate_{base_currency}_{target_currency}"
        
        # Проверяем кэш (если не принудительное обновление)
        if not force_update:
            cached_rate = cache.get(cache_key)
            if cached_rate is not None:
                logger.debug(f"💾 Using cached rate {target_currency}/{base_currency}: {cached_rate}")
                return Decimal(str(cached_rate))
        
        # Получаем курс из базы данных с автообновлением
        rate_obj = CurrencyRate.get_latest_rate(
            base_currency=base_currency,
            target_currency=target_currency,
            auto_update=True
        )

        if rate_obj:
            # Кэшируем результат
            cache.set(cache_key, str(rate_obj.rate), cls.CACHE_TIMEOUT)
            logger.info(f"💱 Rate {target_currency}/{base_currency}: {rate_obj.rate}")
            return rate_obj.rate

        # Пробуем найти обратный курс с ПРАВИЛЬНОЙ интерпретацией NBU
        try:
            # В базе курсы хранятся в формате NBU: UAH/CURRENCY = количество UAH за 1 единицу валюты
            # UAH/USD = 41.449 означает: 1 USD = 41.449 UAH

            if target_currency == 'UAH':
                # Ищем курс из базы в формате UAH/base_currency
                reverse_rate_obj = CurrencyRate.get_latest_rate(
                    base_currency='UAH',
                    target_currency=base_currency,
                    auto_update=True
                )

                if reverse_rate_obj:
                    # UAH/USD = 41.449 означает 1 USD = 41.449 UAH
                    # Для конвертации USD в UAH используем этот курс напрямую
                    rate = reverse_rate_obj.rate
                    cache.set(cache_key, str(rate), cls.CACHE_TIMEOUT)
                    logger.info(f"💱 Found UAH/{base_currency} = {rate}, using for {base_currency} to UAH conversion")
                    return rate

            elif base_currency == 'UAH':
                # Ищем курс из базы в формате UAH/target_currency
                reverse_rate_obj = CurrencyRate.get_latest_rate(
                    base_currency='UAH',
                    target_currency=target_currency,
                    auto_update=True
                )

                if reverse_rate_obj:
                    # UAH/USD = 41.449 означает 1 USD = 41.449 UAH
                    # Для конвертации UAH в USD: 1 UAH = 1/41.449 USD
                    reverse_rate = Decimal('1') / reverse_rate_obj.rate
                    cache.set(cache_key, str(reverse_rate), cls.CACHE_TIMEOUT)
                    logger.info(f"💱 Found UAH/{target_currency} = {reverse_rate_obj.rate}, calculated UAH to {target_currency} = {reverse_rate}")
                    return reverse_rate

        except Exception as e:
            logger.debug(f"🔍 Could not find reverse rate: {e}")

        logger.warning(f"⚠️ No rate found for {target_currency}/{base_currency}")
        return None
    
    @classmethod
    def convert_amount(cls, amount, from_currency='UAH', to_currency='USD'):
        """
        Конвертировать сумму между валютами
        
        Args:
            amount: Сумма для конвертации
            from_currency: Исходная валюта
            to_currency: Целевая валюта
            
        Returns:
            Decimal: Конвертированная сумма или None
        """
        if from_currency == to_currency:
            return Decimal(str(amount))
        
        # Получаем курс
        rate = cls.get_rate(from_currency, to_currency)
        
        if rate:
            converted = Decimal(str(amount)) * rate
            logger.info(f"💰 Converted {amount} {from_currency} = {converted} {to_currency}")
            return converted
        
        logger.error(f"❌ Cannot convert {amount} {from_currency} to {to_currency}: no rate")
        return None
    
    @classmethod
    def update_single_rate(cls, base_currency='UAH', target_currency='USD', source='NBU'):
        """
        Обновить курс для одной пары валют
        
        Args:
            base_currency: Базовая валюта
            target_currency: Целевая валюта
            source: Источник курса
        """
        logger.info(f"🔄 Updating rate {target_currency}/{base_currency} from {source}")
        
        try:
            if source == 'NBU':
                success = cls._fetch_from_nbu(target_currency)
            elif source == 'PRIVATBANK':
                success = cls._fetch_from_privatbank(target_currency)
            elif source == 'EXCHANGERATE_API':
                success = cls._fetch_from_exchangerate_api(target_currency)
            else:
                logger.error(f"❌ Unknown source: {source}")
                return False
            
            if success:
                # Очищаем кэш для этой пары валют
                cache_key = f"currency_rate_{base_currency}_{target_currency}"
                cache.delete(cache_key)
                logger.info(f"✅ Rate {target_currency}/{base_currency} updated successfully")
                return True
            else:
                logger.error(f"❌ Failed to update rate {target_currency}/{base_currency}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error updating rate {target_currency}/{base_currency}: {str(e)}")
            return False
    
    @classmethod
    def _fetch_from_nbu(cls, target_currency):
        """
        Получить курс от НБУ для конкретной валюты
        """
        try:
            url = f"https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode={target_currency}&json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if not data:
                logger.warning(f"⚠️ No data from NBU for {target_currency}")
                return False
            
            item = data[0]
            rate_value = item.get('rate')
            
            if rate_value:
                # Создаем или обновляем курс
                rate, created = CurrencyRate.objects.update_or_create(
                    base_currency='UAH',
                    target_currency=target_currency,
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
                logger.info(f"✅ NBU: {target_currency} = {rate_value} UAH ({action})")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ NBU fetch error for {target_currency}: {str(e)}")
            return False
    
    @classmethod
    def _fetch_from_privatbank(cls, target_currency):
        """
        Получить курс от ПриватБанка для конкретной валюты
        """
        try:
            url = "https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Ищем нужную валюту
            for item in data:
                if item.get('ccy') == target_currency:
                    buy_rate = item.get('buy')
                    sale_rate = item.get('sale')
                    
                    if buy_rate and sale_rate:
                        # Используем средний курс
                        avg_rate = (float(buy_rate) + float(sale_rate)) / 2
                        
                        rate, created = CurrencyRate.objects.update_or_create(
                            base_currency='UAH',
                            target_currency=target_currency,
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
                        logger.info(f"✅ PrivatBank: {target_currency} = {avg_rate} UAH ({action})")
                        return True
            
            logger.warning(f"⚠️ Currency {target_currency} not found in PrivatBank data")
            return False
            
        except Exception as e:
            logger.error(f"❌ PrivatBank fetch error for {target_currency}: {str(e)}")
            return False
    
    @classmethod
    def _fetch_from_exchangerate_api(cls, target_currency):
        """
        Получить курс от ExchangeRate-API для конкретной валюты
        """
        try:
            url = f"https://api.exchangerate-api.com/v4/latest/{target_currency}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            rates = data.get('rates', {})
            uah_rate = rates.get('UAH')
            
            if uah_rate:
                # Конвертируем курс (сколько UAH за 1 единицу target_currency)
                rate_value = float(uah_rate)
                
                rate, created = CurrencyRate.objects.update_or_create(
                    base_currency='UAH',
                    target_currency=target_currency,
                    fetched_at__date=timezone.now().date(),
                    source='EXCHANGERATE_API',
                    defaults={
                        'rate': Decimal(str(rate_value)),
                        'fetched_at': timezone.now(),
                        'is_active': True,
                        'raw_data': {'uah_rate': uah_rate}
                    }
                )
                
                action = "created" if created else "updated"
                logger.info(f"✅ ExchangeRate-API: {target_currency} = {rate_value} UAH ({action})")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ ExchangeRate-API fetch error for {target_currency}: {str(e)}")
            return False
    
    @classmethod
    def get_all_rates(cls, base_currency='UAH'):
        """
        Получить все актуальные курсы для базовой валюты
        
        Args:
            base_currency: Базовая валюта
            
        Returns:
            Dict: Словарь курсов {currency: rate}
        """
        rates = {}
        
        # Список поддерживаемых валют
        currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
        
        for currency in currencies:
            if currency != base_currency:
                rate = cls.get_rate(base_currency, currency)
                if rate:
                    rates[currency] = rate
        
        logger.info(f"📊 Retrieved {len(rates)} rates for {base_currency}")
        return rates
    
    @classmethod
    def is_rate_fresh(cls, base_currency='UAH', target_currency='USD', max_age_hours=24):
        """
        Проверить, свежий ли курс
        
        Args:
            base_currency: Базовая валюта
            target_currency: Целевая валюта
            max_age_hours: Максимальный возраст в часах
            
        Returns:
            bool: True если курс свежий
        """
        try:
            rate = CurrencyRate.objects.filter(
                base_currency=base_currency,
                target_currency=target_currency,
                is_active=True
            ).latest('fetched_at')
            
            return rate.is_fresh(max_age_hours)
            
        except CurrencyRate.DoesNotExist:
            return False
