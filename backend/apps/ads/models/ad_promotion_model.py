from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel


class AdPromotionModel(BaseModel):
    """
    Model for ad promotions and boosts that enhance ad visibility.
    """
    PROMOTION_TYPES = [
        ('vip', _('VIP')),
        ('premium', _('Premium')),
        ('top', _('Top')),
        ('highlight', _('Highlight')),
        ('urgent', _('Urgent')),
    ]
    
    ad = models.ForeignKey(
        'ads.CarAd',
        on_delete=models.CASCADE,
        related_name='promotions',
        help_text=_('Ad that this promotion applies to')
    )
    
    promotion_type = models.CharField(
        max_length=20,
        choices=PROMOTION_TYPES,
        help_text=_('Type of promotion')
    )
    
    starts_at = models.DateTimeField(
        help_text=_('When the promotion starts')
    )
    
    ends_at = models.DateTimeField(
        help_text=_('When the promotion ends')
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this promotion is currently active')
    )
    
    class Meta:
        db_table = "ad_promotions"
        ordering = ['-created_at']
        verbose_name = _('Ad Promotion')
        verbose_name_plural = _('Ad Promotions')
    
    def __str__(self):
        return f"{self.get_promotion_type_display()} for {self.ad}"
