from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class CarColorModel(BaseModel):
    """
    Model representing car colors.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Name of the color')
    )
    
    hex_code = models.CharField(
        max_length=7,  # #RRGGBB format
        blank=True,
        null=True,
        help_text=_('Hex color code (e.g., #FF0000 for red)')
    )
    
    is_metallic = models.BooleanField(
        default=False,
        help_text=_('Whether this is a metallic color')
    )
    
    is_pearlescent = models.BooleanField(
        default=False,
        help_text=_('Whether this is a pearlescent color')
    )
    
    is_popular = models.BooleanField(
        default=False,
        help_text=_('Whether this is a commonly used color')
    )
    
    class Meta:
        verbose_name = _('Car Color')
        verbose_name_plural = _('Car Colors')
        ordering = ['name']
        db_table = 'ads_carcolor'  # Use the actual table name from migrations
    
    def __str__(self):
        return self.name
