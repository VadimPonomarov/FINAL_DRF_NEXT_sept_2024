"""
Exchange rate model for currency conversion
"""

from django.db import models
from django.utils import timezone
from decimal import Decimal


class ExchangeRate(models.Model):
    """Model to store daily exchange rates"""
    
    usd_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=4,
        help_text="USD to UAH exchange rate"
    )
    
    eur_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=4,
        help_text="EUR to UAH exchange rate"
    )
    
    date = models.DateField(
        unique=True,
        help_text="Date for these exchange rates"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Exchange Rate"
        verbose_name_plural = "Exchange Rates"
        ordering = ['-date']
        db_table = 'exchange_rates'
    
    def __str__(self):
        return f"Exchange rates for {self.date}: USD={self.usd_rate}, EUR={self.eur_rate}"
    
    @classmethod
    def get_latest_rates(cls):
        """Get the most recent exchange rates"""
        return cls.objects.first()
    
    @classmethod
    def get_current_rates(cls):
        """Get current exchange rates as dict"""
        latest = cls.get_latest_rates()
        if latest:
            return {
                'usd_to_uah': latest.usd_rate,
                'eur_to_uah': latest.eur_rate
            }
        else:
            # Fallback rates if no data in DB
            return {
                'usd_to_uah': Decimal('27.50'),
                'eur_to_uah': Decimal('30.20')
            }
