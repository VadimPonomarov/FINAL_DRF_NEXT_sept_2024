from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel

class CarModificationModel(BaseModel):
    """
    Model representing car modifications (e.g., engine type, transmission).
    """
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the car modification')
    )
    
    generation = models.ForeignKey('CarGenerationModel',
        on_delete=models.CASCADE,
        related_name='modifications',
        help_text=_('The car generation this modification belongs to')
    )
    
    engine_type = models.CharField(
        max_length=50,
        help_text=_('Type of engine (e.g., Gasoline, Diesel, Hybrid, Electric)')
    )
    
    engine_volume = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        help_text=_('Engine volume in liters')
    )
    
    power_hp = models.PositiveIntegerField(
        help_text=_('Engine power in horsepower')
    )
    
    transmission = models.CharField(
        max_length=50,
        help_text=_('Type of transmission (e.g., Manual, Automatic, CVT)')
    )
    
    drive_type = models.CharField(
        max_length=20,
        help_text=_('Drive type (e.g., FWD, RWD, AWD, 4WD)')
    )
    
    class Meta:
        verbose_name = _('Car Modification')
        verbose_name_plural = _('Car Modifications')
        ordering = ['generation__model__mark__name', 'generation__model__name', 'generation__name', 'name']
        db_table = 'ads_carmodification'  # Use the actual table name from migrations
        unique_together = ['generation', 'name']
    
    def __str__(self):
        return f"{self.generation} {self.name} ({self.engine_volume}L {self.engine_type}, {self.power_hp}HP)"
