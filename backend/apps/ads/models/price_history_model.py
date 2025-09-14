from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class CarPriceHistoryModel(models.Model):
    """
    Historical price data for car ads with exchange rate information.
    All business logic is handled in serializers and services.
    """
    ad = models.ForeignKey('CarAd', 
        on_delete=models.CASCADE, 
        related_name='price_history',
        help_text=_('The car advertisement this price history belongs to')
    )
    
    # Price in different currencies
    price_usd = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text=_('Price in USD at the time of recording')
    )
    
    price_eur = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text=_('Price in EUR at the time of recording')
    )
    
    price_uah = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text=_('Price in UAH at the time of recording')
    )
    
    # Original price information
    original_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        help_text=_('The original price in the original currency')
    )
    
    original_currency = models.CharField(
        max_length=3,
        help_text=_('The original currency of the price')
    )
    
    # Exchange rate information
    exchange_rate_value = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_('Cached exchange rate value at the time of recording')
    )
    
    # Timestamp
    recorded_at = models.DateTimeField(
        default=timezone.now,
        help_text=_('When this price was recorded')
    )
    
    # Metadata
    date = models.DateField(
        default=timezone.now,
        help_text=_('Date when this price was recorded')
    )
    
    class Meta:
        db_table = "car_price_history"
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['ad', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.ad_id} - {self.date}: {self.original_price} {self.original_currency}"
