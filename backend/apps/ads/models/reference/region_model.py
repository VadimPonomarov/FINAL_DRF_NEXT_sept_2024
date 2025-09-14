from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel

class RegionModel(BaseModel):
    """
    Model representing geographical regions (e.g., states, provinces).
    All names should be in Ukrainian language.
    """
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the region in Ukrainian')
    )

    code = models.CharField(
        max_length=10,
        blank=True,
        help_text=_('Region code (e.g., KV for Kyiv Oblast)')
    )

    country = models.CharField(
        max_length=100,
        default='Ukraine',
        help_text=_('Country this region belongs to')
    )

    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this region is active for selection')
    )
    
    class Meta:
        db_table = 'ads_region'
        verbose_name = _('Region')
        verbose_name_plural = _('Regions')
        ordering = ['country', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                name='unique_region_name'
            )
        ]

    def __str__(self):
        return f"{self.name}, {self.country}"
