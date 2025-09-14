from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel

class CarGenerationModel(BaseModel):
    """
    Model representing car generations (e.g., 8th generation Toyota Camry).
    """
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the car generation')
    )
    
    model = models.ForeignKey(
        'CarModel',
        on_delete=models.CASCADE,
        related_name='generations',
        help_text=_('The car model this generation belongs to')
    )
    
    year_start = models.PositiveIntegerField(
        help_text=_('Starting year of production')
    )
    
    year_end = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_('Ending year of production (null if still in production)')
    )
    
    class Meta:
        verbose_name = _('Car Generation')
        verbose_name_plural = _('Car Generations')
        ordering = ['model__mark__name', 'model__name', '-year_start']
        unique_together = ['model', 'name']
        db_table = 'ads_cargeneration'  # Use the actual table name from migrations
    
    def __str__(self):
        return f"{self.model} {self.name} ({self.year_start}-{self.year_end or 'present'})"
