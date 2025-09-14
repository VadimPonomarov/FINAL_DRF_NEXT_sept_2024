from django.utils.translation import gettext_lazy as _
from enum import Enum, auto


from django.utils.functional import Promise

class TranslatableEnumMixin:
    """Mixin to provide translation support for enum choices"""
    
    @classmethod
    def choices(cls):
        return [(item.value, str(item.label)) for item in cls]
    
    @classmethod
    def get_display_name(cls, value):
        for item in cls:
            if item.value == value:
                return str(item.label)
        return value
        
    def __str__(self):
        return str(self.label)


class CarBodyType(TranslatableEnumMixin, Enum):
    SEDAN = 'sedan', _('Sedan')
    HATCHBACK = 'hatchback', _('Hatchback')
    UNIVERSAL = 'universal', _('Station Wagon')
    LIFTBACK = 'liftback', _('Liftback')
    COUPE = 'coupe', _('Coupe')
    MINIVAN = 'minivan', _('Minivan')
    SUV = 'suv', _('SUV')
    PICKUP = 'pickup', _('Pickup')
    CABRIOLET = 'cabriolet', _('Cabriolet')
    LIMOUSINE = 'limousine', _('Limousine')
    VAN = 'van', _('Van')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class FuelType(TranslatableEnumMixin, Enum):
    PETROL = 'petrol', _('Petrol')
    DIESEL = 'diesel', _('Diesel')
    ELECTRIC = 'electric', _('Electric')
    HYBRID = 'hybrid', _('Hybrid')
    PLUGIN_HYBRID = 'plugin_hybrid', _('Plug-in Hybrid')
    LPG = 'lpg', _('LPG')
    CNG = 'cng', _('CNG')
    HYDROGEN = 'hydrogen', _('Hydrogen')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class TransmissionType(TranslatableEnumMixin, Enum):
    MANUAL = 'manual', _('Manual')
    AUTOMATIC = 'automatic', _('Automatic')
    ROBOTIC = 'robotic', _('Robotic')
    VARIATOR = 'variator', _('CVT')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class DriveType(TranslatableEnumMixin, Enum):
    FWD = 'fwd', _('Front-Wheel Drive (FWD)')
    RWD = 'rwd', _('Rear-Wheel Drive (RWD)')
    AWD = 'awd', _('All-Wheel Drive (AWD)')
    _4WD = '4wd', _('Four-Wheel Drive (4WD)')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class SteeringWheelSide(TranslatableEnumMixin, Enum):
    LEFT = 'left', _('Left-Hand Drive (LHD)')
    RIGHT = 'right', _('Right-Hand Drive (RHD)')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class ConditionType(TranslatableEnumMixin, Enum):
    NEW = 'new', _('New')
    USED = 'used', _('Used')
    EMERGENCY = 'emergency', _('After Accident')
    FOR_PARTS = 'for_parts', _('For Parts')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class SellerType(TranslatableEnumMixin, Enum):
    PRIVATE = 'private', _('Private Seller')
    DEALER = 'dealer', _('Car Dealer')
    SALON = 'salon', _('Car Salon')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class ExchangeStatus(TranslatableEnumMixin, Enum):
    POSSIBLE = 'possible', _('Possible')
    NOT_POSSIBLE = 'not_possible', _('Not Possible')
    CONSIDER = 'consider', _('Will Consider')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class AdStatus(TranslatableEnumMixin, Enum):
    ACTIVE = 'active', _('Active')
    PENDING = 'pending', _('Pending Review')
    REJECTED = 'rejected', _('Rejected')
    SOLD = 'sold', _('Sold')
    ARCHIVED = 'archived', _('Archived')
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label


class Currency(TranslatableEnumMixin, Enum):
    USD = 'usd', 'USD ($)'
    EUR = 'eur', 'EUR (€)'
    UAH = 'uah', 'UAH (₴)'
    
    def __init__(self, value, label):
        self._value_ = value
        self.label = label
