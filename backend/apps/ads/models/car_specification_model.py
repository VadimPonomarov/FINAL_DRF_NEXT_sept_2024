from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from core.enums.cars import (
    CarBodyType, FuelType, TransmissionType, 
    DriveType, SteeringWheelSide, ConditionType
)


class CarSpecificationModel(models.Model):
    """
    Model for storing technical specifications of a car.
    All business logic is handled in serializers.
    """
    car_ad = models.OneToOneField('CarAd',
        on_delete=models.CASCADE,
        related_name='specs',
        help_text=_('The car advertisement these specifications belong to')
    )
    
    # Basic specifications
    year = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1900, message=_('Year must be 1900 or later')),
            MaxValueValidator(2100, message=_('Year must be 2100 or earlier'))
        ],
        help_text=_('Manufacturing year of the car')
    )
    
    mileage_km = models.PositiveIntegerField(
        help_text=_('Mileage in kilometers'),
        validators=[MinValueValidator(0)]
    )
    
    # Engine specifications
    fuel_type = models.CharField(
        max_length=20,
        choices=FuelType.choices,
        help_text=_('Type of fuel the car uses')
    )
    
    engine_volume = models.FloatField(
        validators=[MinValueValidator(0.1)],
        help_text=_('Engine volume in liters')
    )
    
    engine_power = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
        help_text=_('Engine power in horsepower (HP)')
    )
    
    # Drivetrain specifications
    transmission_type = models.CharField(
        max_length=20,
        choices=TransmissionType.choices,
        help_text=_('Type of transmission')
    )
    
    drive_type = models.CharField(
        max_length=10,
        choices=DriveType.choices,
        help_text=_('Type of drivetrain')
    )
    
    # Body and chassis
    body_type = models.CharField(
        max_length=20,
        choices=CarBodyType.choices,
        help_text=_('Body type of the car')
    )
    
    color = models.ForeignKey('CarColorModel',
        on_delete=models.PROTECT,
        related_name='car_specs',
        help_text=_('Color of the car')
    )
    
    steering_wheel = models.CharField(
        max_length=10,
        choices=SteeringWheelSide.choices,
        help_text=_('Side of the steering wheel')
    )
    
    # Vehicle identification
    vin_code = models.CharField(
        max_length=17,
        blank=True,
        null=True,
        help_text=_('Vehicle Identification Number (17 characters)')
    )
    
    license_plate = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('License plate number')
    )
    
    # Additional specifications
    condition = models.CharField(
        max_length=20,
        choices=ConditionType.choices,
        default=ConditionType.USED,
        help_text=_('Condition of the car')
    )
    
    number_of_doors = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        choices=[(2, '2'), (3, '3'), (4, '4'), (5, '5')],
        help_text=_('Number of doors')
    )
    
    number_of_seats = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        help_text=_('Number of seats')
    )
    
    class Meta:
        db_table = 'car_specifications'
    
    def __str__(self):
        return f"Specs for {self.car_ad_id}"
