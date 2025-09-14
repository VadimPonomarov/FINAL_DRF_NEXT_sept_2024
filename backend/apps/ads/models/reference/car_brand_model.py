from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel


class CarBrandModel(BaseModel):
    """
    Model representing car brands (e.g., Toyota, BMW, Ford).
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Name of the car brand')
    )
    
    logo = models.ImageField(
        upload_to='car_brands/logos/',
        null=True,
        blank=True,
        help_text=_('Logo of the car brand')
    )
    
    is_popular = models.BooleanField(
        default=False,
        help_text=_('Whether this is a popular car brand')
    )
    
    class Meta:
        verbose_name = _('Car Brand')
        verbose_name_plural = _('Car Brands')
        ordering = ['name']
        db_table = 'car_make_model'  # Keep the old table name for database compatibility
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                name='unique_car_brand_name'
            )
        ]
    
    def __str__(self):
        return self.name
