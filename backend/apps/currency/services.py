"""
Currency service for managing exchange rates
Automatically updates rates when they are not available
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
    Service for working with currency exchange rates
    """
    
    # Cache for 1 hour to avoid frequent API requests
    CACHE_TIMEOUT = 3600
    
    @classmethod
    def get_rate(cls, base_currency='UAH', target_currency='USD', force_update=False):
        """
        Get currency exchange rate with automatic updates
        
        Args:
            base_currency: Base currency code
            target_currency: Target currency code
            force_update: Force rate update from API
            
        Returns:
            Decimal: Exchange rate or None if not available
        """
        cache_key = f"currency_rate_{base_currency}_{target_currency}"
        
        # Check cache first (unless forced update)
        if not force_update:
            cached_rate = cache.get(cache_key)
            if cached_rate is not None:
                logger.debug(f"[CACHE] Using cached rate {target_currency}/{base_currency}: {cached_rate}")
                return Decimal(str(cached_rate))
        
        # Get rate from database with auto-update
        rate_obj = CurrencyRate.get_latest_rate(
            base_currency=base_currency,
            target_currency=target_currency,
            auto_update=True
        )

        if rate_obj:
            # Cache the result
            cache.set(cache_key, str(rate_obj.rate), cls.CACHE_TIMEOUT)
            logger.info(f"[CURRENCY] Rate {target_currency}/{base_currency}: {rate_obj.rate}")
            return rate_obj.rate

        # Try to find reverse rate with correct NBU interpretation
        try:
            # NBU stores rates as: UAH/CURRENCY = amount of UAH per 1 unit of currency
            # UAH/USD = 41.449 means: 1 USD = 41.449 UAH

            if target_currency == 'UAH':
                # Looking for UAH/base_currency rate in database
                reverse_rate_obj = CurrencyRate.get_latest_rate(
                    base_currency='UAH',
                    target_currency=base_currency,
                    auto_update=True
                )

                if reverse_rate_obj:
                    # UAH/USD = 41.449 means 1 USD = 41.449 UAH
                    # For converting USD to UAH, use this rate directly
                    rate = reverse_rate_obj.rate
                    cache.set(cache_key, str(rate), cls.CACHE_TIMEOUT)
                    logger.info(f"[CURRENCY] Found UAH/{base_currency} = {rate}, using for {base_currency} to UAH conversion")
                    return rate

            elif base_currency == 'UAH':
                # Looking for UAH/target_currency rate in database
                reverse_rate_obj = CurrencyRate.get_latest_rate(
                    base_currency='UAH',
                    target_currency=target_currency,
                    auto_update=True
                )

                if reverse_rate_obj:
                    # UAH/USD = 41.449 means 1 USD = 41.449 UAH
                    # For converting UAH to USD: 1 UAH = 1/41.449 USD
                    reverse_rate = Decimal('1') / reverse_rate_obj.rate
                    cache.set(cache_key, str(reverse_rate), cls.CACHE_TIMEOUT)
                    logger.info(f"[CURRENCY] Found UAH/{target_currency} = {reverse_rate_obj.rate}, calculated UAH to {target_currency} = {reverse_rate}")
                    return reverse_rate

        except Exception as e:
            logger.debug(f"[WARN] Could not find reverse rate: {e}")

        logger.warning(f"[ERROR] Rate not found for {base_currency}/{target_currency}")
        return None

    @classmethod
    def convert(cls, amount: Decimal, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """
        Convert amount from one currency to another
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
            
        Returns:
            Decimal: Converted amount or None if rate not available
        """
        if from_currency == to_currency:
            return amount

        rate = cls.get_rate(base_currency=from_currency, target_currency=to_currency)
        if rate is None:
            logger.error(f"[ERROR] Cannot convert {from_currency} to {to_currency}: rate not available")
            return None

        converted = amount * rate
        logger.info(f"[MONEY] Converted {amount} {from_currency} = {converted} {to_currency}")
        return converted

    @classmethod
    def update_rate(cls, base_currency: str, target_currency: str, source: str = 'NBU') -> Optional[CurrencyRate]:
        """
        Update exchange rate from external API
        
        Args:
            base_currency: Base currency code
            target_currency: Target currency code
            source: API source name
            
        Returns:
            CurrencyRate: Updated rate object or None if failed
        """
        logger.info(f"[ALERT] Updating rate {target_currency}/{base_currency} from {source}")

        try:
            if source == 'NBU':
                return cls._update_from_nbu(base_currency, target_currency)
            elif source == 'EXCHANGERATE_API':
                return cls._update_from_exchangerate_api(base_currency, target_currency)
            else:
                logger.error(f"[ERROR] Unknown source: {source}")
                return None
        except Exception as e:
            logger.error(f"[ERROR] Failed to update rate: {e}")
            return None

    @classmethod
    def _update_from_nbu(cls, base_currency: str, target_currency: str) -> Optional[CurrencyRate]:
        """
        Update rate from National Bank of Ukraine API
        
        NBU API returns rates in format: 1 CURRENCY = X UAH
        Example: 1 USD = 41.449 UAH
        
        Args:
            base_currency: Base currency code
            target_currency: Target currency code
            
        Returns:
            CurrencyRate: Updated rate object or None if failed
        """
        # NBU only provides rates against UAH
        if base_currency != 'UAH' and target_currency != 'UAH':
            logger.debug("[WARN] NBU only supports UAH pairs, attempting cross-conversion")
            return cls._update_cross_rate_from_nbu(base_currency, target_currency)

        # Determine which currency to query
        query_currency = target_currency if base_currency == 'UAH' else base_currency

        if query_currency == 'UAH':
            # UAH to UAH is always 1
            rate_obj, created = CurrencyRate.objects.update_or_create(
                base_currency='UAH',
                target_currency='UAH',
                defaults={
                    'rate': Decimal('1.0'),
                    'source': 'NBU',
                    'fetched_at': timezone.now(),
                    'is_active': True,
                }
            )
            return rate_obj

        try:
            # Query NBU API
            # https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json
            url = f"https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode={query_currency}&json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            if not data:
                logger.warning(f"[WARN] No data from NBU for {query_currency}")
                return None

            # NBU returns: 1 USD = X UAH (rate field)
            nbu_rate = Decimal(str(data[0]['rate']))

            # Create or update rate in database
            # Store as UAH/query_currency (how many UAH per 1 unit of currency)
            rate_obj, created = CurrencyRate.objects.update_or_create(
                base_currency='UAH',
                target_currency=query_currency,
                defaults={
                    'rate': nbu_rate,
                    'source': 'NBU',
                    'fetched_at': timezone.now(),
                    'is_active': True,
                    'raw_data': data[0],
                }
            )

            logger.info(f"[OK] Updated UAH/{query_currency} = {nbu_rate} from NBU")
            return rate_obj

        except requests.RequestException as e:
            logger.error(f"[ERROR] NBU API request failed: {e}")
            return None
        except (KeyError, IndexError, ValueError) as e:
            logger.error(f"[ERROR] Failed to parse NBU response: {e}")
            return None

    @classmethod
    def _update_cross_rate_from_nbu(cls, base_currency: str, target_currency: str) -> Optional[CurrencyRate]:
        """
        Calculate cross-rate for non-UAH pairs using NBU rates
        Example: EUR to USD = (UAH/EUR) / (UAH/USD)
        
        Args:
            base_currency: Base currency code
            target_currency: Target currency code
            
        Returns:
            CurrencyRate: Updated rate object or None if failed
        """
        # Get both rates from NBU
        base_rate_obj = cls._update_from_nbu('UAH', base_currency)
        target_rate_obj = cls._update_from_nbu('UAH', target_currency)

        if not base_rate_obj or not target_rate_obj:
            logger.error(f"[ERROR] Cannot calculate cross-rate {base_currency}/{target_currency}")
            return None

        try:
            # Calculate cross-rate
            # If UAH/USD = 41.449 and UAH/EUR = 44.5
            # Then EUR/USD = 44.5 / 41.449 = 1.073
            cross_rate = target_rate_obj.rate / base_rate_obj.rate

            # Create or update cross-rate
            rate_obj, created = CurrencyRate.objects.update_or_create(
                base_currency=base_currency,
                target_currency=target_currency,
                defaults={
                    'rate': cross_rate,
                    'source': 'NBU',
                    'fetched_at': timezone.now(),
                    'is_active': True,
                }
            )

            logger.info(f"[OK] Calculated cross-rate {base_currency}/{target_currency} = {cross_rate}")
            return rate_obj

        except Exception as e:
            logger.error(f"[ERROR] Failed to calculate cross-rate: {e}")
            return None

    @classmethod
    def _update_from_exchangerate_api(cls, base_currency: str, target_currency: str) -> Optional[CurrencyRate]:
        """
        Update rate from ExchangeRate-API.com
        Fallback option when NBU is not available
        
        Args:
            base_currency: Base currency code
            target_currency: Target currency code
            
        Returns:
            CurrencyRate: Updated rate object or None if failed
        """
        try:
            url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            rates = data.get('rates', {})

            if target_currency not in rates:
                logger.warning(f"[WARN] {target_currency} not found in ExchangeRate-API response")
                return None

            rate_value = Decimal(str(rates[target_currency]))

            # Create or update rate
            rate_obj, created = CurrencyRate.objects.update_or_create(
                base_currency=base_currency,
                target_currency=target_currency,
                defaults={
                    'rate': rate_value,
                    'source': 'EXCHANGERATE_API',
                    'fetched_at': timezone.now(),
                    'is_active': True,
                    'raw_data': data,
                }
            )

            logger.info(f"[OK] Updated {base_currency}/{target_currency} = {rate_value} from ExchangeRate-API")
            return rate_obj

        except requests.RequestException as e:
            logger.error(f"[ERROR] ExchangeRate-API request failed: {e}")
            return None
        except (KeyError, ValueError) as e:
            logger.error(f"[ERROR] Failed to parse ExchangeRate-API response: {e}")
            return None

    @classmethod
    def get_all_rates(cls, base_currency: str = 'UAH') -> List[Dict]:
        """
        Get all available exchange rates for a base currency
        
        Args:
            base_currency: Base currency code
            
        Returns:
            List of dictionaries with rate information
        """
        rates = CurrencyRate.objects.filter(
            base_currency=base_currency,
            is_active=True
        ).order_by('-fetched_at')

        result = []
        for rate in rates:
            result.append({
                'base_currency': rate.base_currency,
                'target_currency': rate.target_currency,
                'rate': str(rate.rate),
                'source': rate.source,
                'fetched_at': rate.fetched_at.isoformat(),
                'age_hours': (timezone.now() - rate.fetched_at).total_seconds() / 3600,
            })

        logger.info(f"[SEARCH] Retrieved {len(rates)} rates for {base_currency}")
        return result
