import requests
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from django.conf import settings
from apps.ads.models.exchange_rates import ExchangeRate


class ExchangeRateService:
    """Service for handling exchange rate operations with PrivatBank API"""
    
    PRIVATBANK_API_URL = 'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5'
    
    @classmethod
    def get_rates_from_privatbank(cls):
        """Fetch current exchange rates from PrivatBank API"""
        try:
            response = requests.get(cls.PRIVATBANK_API_URL, timeout=10)
            response.raise_for_status()
            rates_data = response.json()
            
            # Extract USD and EUR rates (they are in relation to UAH)
            rates = {}
            for rate in rates_data:
                if rate['ccy'] == 'USD':
                    rates['usd'] = Decimal(rate['sale'])
                elif rate['ccy'] == 'EUR':
                    rates['eur'] = Decimal(rate['sale'])
            
            if 'usd' not in rates or 'eur' not in rates:
                raise ValueError("Could not fetch all required exchange rates")
                
            return rates
            
        except (requests.RequestException, ValueError, KeyError) as e:
            # Log error and return None
            if hasattr(settings, 'LOGGER'):
                settings.LOGGER.error(f"Failed to fetch exchange rates: {str(e)}")
            return None
    
    @classmethod
    def update_exchange_rates(cls):
        """Update exchange rates in the database"""
        today = timezone.now().date()
        
        # Check if we already have rates for today
        if ExchangeRate.objects.filter(date=today).exists():
            return ExchangeRate.objects.get(date=today)
        
        rates = cls.get_rates_from_privatbank()
        if not rates:
            # If we can't get new rates, use the most recent ones
            return ExchangeRate.get_latest_rates()
        
        # Create new exchange rate record
        exchange_rate = ExchangeRate.objects.create(
            usd_rate=rates['usd'],
            eur_rate=rates['eur'],
            date=today
        )
        
        return exchange_rate
    
    @classmethod
    def convert_currency(cls, amount, from_currency, to_currency):
        """
        Convert amount from one currency to another using the latest rates
        
        Args:
            amount: Decimal - amount to convert
            from_currency: str - source currency (USD, EUR, UAH)
            to_currency: str - target currency (USD, EUR, UAH)
            
        Returns:
            Decimal: converted amount
        """
        if from_currency == to_currency:
            return amount
            
        rates = cls.update_exchange_rates()
        if not rates:
            raise ValueError("Could not get exchange rates")
        
        # Convert to UAH first (base currency)
        if from_currency == 'USD':
            uah_amount = amount * rates.usd_rate
        elif from_currency == 'EUR':
            uah_amount = amount * rates.eur_rate
        else:  # UAH
            uah_amount = amount
        
        # Convert from UAH to target currency
        if to_currency == 'USD':
            result = uah_amount / rates.usd_rate
        elif to_currency == 'EUR':
            result = uah_amount / rates.eur_rate
        else:  # UAH
            result = uah_amount
        
        # Round to 2 decimal places for currency
        return result.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
