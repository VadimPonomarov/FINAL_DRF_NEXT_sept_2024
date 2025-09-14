"""
Vehicle type model for car reference data.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base import BaseModel


class VehicleTypeModel(BaseModel):
    """
    Model for vehicle types (car, truck, boat, motorcycle, etc.).
    """
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_('Name'),
        help_text=_('Vehicle type name (e.g., "Легковий", "Вантажівка", "Мотоцикл")')
    )
    
    slug = models.SlugField(
        max_length=100,
        unique=True,
        verbose_name=_('Slug'),
        help_text=_('URL-friendly version of the name')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('Description'),
        help_text=_('Optional description of the vehicle type')
    )
    
    icon = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_('Icon'),
        help_text=_('Icon class or name for UI display')
    )
    
    is_popular = models.BooleanField(
        default=False,
        verbose_name=_('Is Popular'),
        help_text=_('Mark as popular vehicle type for featured display')
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether this vehicle type is available for selection')
    )
    
    sort_order = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Sort Order'),
        help_text=_('Order for display in lists (lower numbers first)')
    )

    class Meta:
        verbose_name = _('Vehicle Type')
        verbose_name_plural = _('Vehicle Types')
        ordering = ['sort_order', 'name']
        db_table = 'ads_vehicletype'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Auto-generate slug if not provided."""
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
