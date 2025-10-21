"""
Core services package.
Contains base service classes and business logic services.
"""

from .base_crud_service import BaseCRUDService
from .base_service import BaseService
from .car_ad_service import CarAdService

__all__ = [
    "BaseService",
    "BaseCRUDService",
    "CarAdService",
]
