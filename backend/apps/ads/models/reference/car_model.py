from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel

class CarModel(BaseModel):
    """
    Model representing car models (e.g., Camry, 3 Series, F-150).
    """
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the car model')
    )
    
    mark = models.ForeignKey('CarMarkModel',
        on_delete=models.CASCADE,
        related_name='models',
        help_text=_('The mark of this car model'),
        db_column='make_id'  # Keep the old column name for database compatibility
    )
    
    is_popular = models.BooleanField(
        default=False,
        help_text=_('Whether this is a popular car model')
    )
    
    class Meta:
        verbose_name = _('Car Model')
        verbose_name_plural = _('Car Models')
        ordering = ['mark__name', 'name']
        unique_together = ['mark', 'name']
        db_table = 'ads_carmodel'  # Use the actual table name from migrations
    
    def __str__(self):
        return f"{self.mark.name} {self.name}"
