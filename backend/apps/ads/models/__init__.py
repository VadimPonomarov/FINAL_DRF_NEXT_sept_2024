# Import all models to make them available when importing from ads.models
from .car_ad_model import CarAd as CarAd
from .price_history_model import CarPriceHistoryModel as CarPricing
from .car_specification_model import CarSpecificationModel as CarSpecification
from .car_metadata_model import CarMetadataModel as CarMetadata
from .image_model import AddImageModel
from .saved_search_model import SavedSearchModel as SavedSearch
from .ad_promotion_model import AdPromotionModel as AdPromotion
from .ad_view_model import AdViewModel as AdView
from .ad_view_model import AdViewModel
from .exchange_rates import ExchangeRate
from .ad_contact_model import AdContact
from .favorite_ad_model import FavoriteAd


# Import reference models
from .reference import (
    CarColorModel,
    RegionModel,
    CityModel,
    CarMarkModel,
    CarModel,
    CarGenerationModel,
    CarModificationModel,
    VehicleTypeModel,
)

# Add aliases for compatibility
CarMake = CarMarkModel  # Alias for CarMarkModel
CarModelModel = CarModel  # Alias for CarModel

# Make models available at the package level
__all__ = [
    'CarAd',
    'CarPricing',
    'CarSpecification',
    'CarMetadata',
    'AddImageModel',
    'SavedSearch',
    'AdPromotion',
    'AdView',
    'AdViewModel',  # Add AdViewModel to exports
    'ExchangeRate',
    'AdContact',
    'FavoriteAd',

    # Reference models
    'CarColorModel',
    'RegionModel',
    'CityModel',
    'CarMarkModel',
    'CarModel',
    'CarGenerationModel',
    'CarModificationModel',
    'VehicleTypeModel',
    # Aliases for compatibility
    'CarMake',
    'CarModelModel',
]
