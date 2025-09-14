from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel

class CityModel(BaseModel):
    """
    Model representing cities within regions.
    """
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the city')
    )
    
    region = models.ForeignKey('RegionModel',
        on_delete=models.CASCADE,
        related_name='cities',
        help_text=_('The region this city belongs to')
    )

    is_regional_center = models.BooleanField(
        default=False,
        help_text=_('Whether this city is a regional center')
    )

    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this city is active for selection')
    )
    
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_('Geographical latitude')
    )
    
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_('Geographical longitude')
    )
    
    class Meta:
        db_table = 'ads_city'
        verbose_name = _('City')
        verbose_name_plural = _('Cities')
        ordering = ['region__country', 'region__name', 'name']
        unique_together = ['name', 'region']
    
    def __str__(self):
        return f"{self.name}, {self.region.name}"
