from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel


class AdViewModel(BaseModel):
    """
    Model for tracking ad views for analytics purposes.
    """
    ad = models.ForeignKey(
        'ads.CarAd',
        on_delete=models.CASCADE,
        related_name='ad_views',
        help_text=_('Ad that was viewed')
    )
    
    ip_address = models.GenericIPAddressField(
        help_text=_('IP address of the viewer')
    )
    
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text=_('User agent string of the viewer')
    )
    
    referrer = models.URLField(
        blank=True,
        null=True,
        help_text=_('Referrer URL')
    )
    
    session_key = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        help_text=_('Session key of the viewer')
    )
    
    class Meta:
        db_table = "ad_views"
        ordering = ['-created_at']
        verbose_name = _('Ad View')
        verbose_name_plural = _('Ad Views')
    
    def __str__(self):
        return f"View of {self.ad} from {self.ip_address}"
