from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel

class CarMarkModel(BaseModel):
    """
    Model representing car manufacturers (e.g., Toyota, BMW, Ford).
    Uses 'mark' terminology instead of 'make' or 'brand'.
    Linked to vehicle types (cars, trucks, motorcycles, etc.).
    """
    vehicle_type = models.ForeignKey(
        'VehicleTypeModel',
        on_delete=models.CASCADE,
        related_name='marks',
        verbose_name=_('Vehicle Type'),
        help_text=_('Type of vehicle this mark belongs to')
    )

    name = models.CharField(
        max_length=100,
        verbose_name=_('Name'),
        help_text=_('Name of the car manufacturer')
    )
    
    logo = models.ImageField(
        upload_to='car_marks/logos/',
        null=True,
        blank=True,
        help_text=_('Logo of the car manufacturer')
    )
    
    is_popular = models.BooleanField(
        default=False,
        help_text=_('Whether this is a popular car mark')
    )
    
    class Meta:
        verbose_name = _('Car Mark')
        verbose_name_plural = _('Car Marks')
        ordering = ['vehicle_type__sort_order', 'name']
        db_table = 'ads_carmake'  # Use the actual table name from migrations
        unique_together = [['vehicle_type', 'name']]  # Unique within vehicle type
    
    def __str__(self):
        return self.name
