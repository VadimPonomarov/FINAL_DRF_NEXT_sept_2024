# Reference models for the ads app

from .car_mark_model import CarMarkModel
from .car_model import CarModel
from .car_generation_model import CarGenerationModel
from .car_modification_model import CarModificationModel
from .car_color_model import CarColorModel
from .vehicle_type_model import VehicleTypeModel
from .vehicle_type_model import VehicleTypeModel
from .region_model import RegionModel
from .city_model import CityModel

__all__ = [
    'CarMarkModel',
    'CarModel',
    'CarGenerationModel',
    'CarModificationModel',
    'CarColorModel',
    'VehicleTypeModel',
    'RegionModel',
    'CityModel',
]
