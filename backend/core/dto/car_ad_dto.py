"""
DTO для объявлений автомобилей.
Обеспечивает типизированную передачу данных между слоями.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional


class AdStatusDTO(Enum):
    """Статусы объявлений."""

    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    DRAFT = "draft"
    SOLD = "sold"


class CurrencyDTO(Enum):
    """Валюты."""

    USD = "USD"
    EUR = "EUR"
    UAH = "UAH"


class FuelTypeDTO(Enum):
    """Типы топлива."""

    GASOLINE = "gasoline"
    DIESEL = "diesel"
    HYBRID = "hybrid"
    ELECTRIC = "electric"
    LPG = "lpg"
    CNG = "cng"


class TransmissionDTO(Enum):
    """Типы трансмиссии."""

    MANUAL = "manual"
    AUTOMATIC = "automatic"
    CVT = "cvt"
    SEMI_AUTOMATIC = "semi-automatic"


class BodyTypeDTO(Enum):
    """Типы кузова."""

    SEDAN = "sedan"
    SUV = "suv"
    HATCHBACK = "hatchback"
    COUPE = "coupe"
    CONVERTIBLE = "convertible"
    WAGON = "wagon"
    TRUCK = "truck"
    VAN = "van"


class ConditionDTO(Enum):
    """Состояние автомобиля."""

    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


@dataclass
class CarAdCreateDTO:
    """DTO для создания объявления автомобиля."""

    title: str
    description: str
    price: Decimal
    currency: CurrencyDTO
    year: int
    mileage: int
    brand: str
    model: str
    generation: Optional[str] = None
    modification: Optional[str] = None
    color: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    images: Optional[List[str]] = None
    features: Optional[List[str]] = None
    condition: Optional[ConditionDTO] = None
    fuel_type: Optional[FuelTypeDTO] = None
    transmission: Optional[TransmissionDTO] = None
    body_type: Optional[BodyTypeDTO] = None
    engine_size: Optional[float] = None
    horsepower: Optional[int] = None
    doors: Optional[int] = None
    seats: Optional[int] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    owners_count: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Преобразует DTO в словарь."""
        result = {}
        for field_name, field_value in self.__dict__.items():
            if field_value is not None:
                if isinstance(field_value, Enum):
                    result[field_name] = field_value.value
                else:
                    result[field_name] = field_value
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CarAdCreateDTO":
        """Создает DTO из словаря."""
        # Преобразуем enum значения
        if "currency" in data and isinstance(data["currency"], str):
            data["currency"] = CurrencyDTO(data["currency"])
        if "condition" in data and isinstance(data["condition"], str):
            data["condition"] = ConditionDTO(data["condition"])
        if "fuel_type" in data and isinstance(data["fuel_type"], str):
            data["fuel_type"] = FuelTypeDTO(data["fuel_type"])
        if "transmission" in data and isinstance(data["transmission"], str):
            data["transmission"] = TransmissionDTO(data["transmission"])
        if "body_type" in data and isinstance(data["body_type"], str):
            data["body_type"] = BodyTypeDTO(data["body_type"])

        return cls(**data)


@dataclass
class CarAdUpdateDTO:
    """DTO для обновления объявления автомобиля."""

    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[CurrencyDTO] = None
    year: Optional[int] = None
    mileage: Optional[int] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    generation: Optional[str] = None
    modification: Optional[str] = None
    color: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    images: Optional[List[str]] = None
    features: Optional[List[str]] = None
    condition: Optional[ConditionDTO] = None
    fuel_type: Optional[FuelTypeDTO] = None
    transmission: Optional[TransmissionDTO] = None
    body_type: Optional[BodyTypeDTO] = None
    engine_size: Optional[float] = None
    horsepower: Optional[int] = None
    doors: Optional[int] = None
    seats: Optional[int] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    owners_count: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Преобразует DTO в словарь, исключая None значения."""
        result = {}
        for field_name, field_value in self.__dict__.items():
            if field_value is not None:
                if isinstance(field_value, Enum):
                    result[field_name] = field_value.value
                else:
                    result[field_name] = field_value
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CarAdUpdateDTO":
        """Создает DTO из словаря."""
        # Преобразуем enum значения
        if "currency" in data and isinstance(data["currency"], str):
            data["currency"] = CurrencyDTO(data["currency"])
        if "condition" in data and isinstance(data["condition"], str):
            data["condition"] = ConditionDTO(data["condition"])
        if "fuel_type" in data and isinstance(data["fuel_type"], str):
            data["fuel_type"] = FuelTypeDTO(data["fuel_type"])
        if "transmission" in data and isinstance(data["transmission"], str):
            data["transmission"] = TransmissionDTO(data["transmission"])
        if "body_type" in data and isinstance(data["body_type"], str):
            data["body_type"] = BodyTypeDTO(data["body_type"])

        return cls(**data)


@dataclass
class CarAdResponseDTO:
    """DTO для ответа с данными объявления."""

    id: int
    title: str
    description: str
    price: Decimal
    currency: str
    year: int
    mileage: int
    brand: str
    model: str
    generation: Optional[str] = None
    modification: Optional[str] = None
    color: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    images: Optional[List[str]] = None
    features: Optional[List[str]] = None
    condition: Optional[str] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    body_type: Optional[str] = None
    engine_size: Optional[float] = None
    horsepower: Optional[int] = None
    doors: Optional[int] = None
    seats: Optional[int] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    owners_count: Optional[int] = None
    status: str = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    view_count: int = 0
    seller: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Преобразует DTO в словарь."""
        result = {}
        for field_name, field_value in self.__dict__.items():
            if field_value is not None:
                if isinstance(field_value, datetime):
                    result[field_name] = field_value.isoformat()
                else:
                    result[field_name] = field_value
        return result


@dataclass
class CarAdListDTO:
    """DTO для списка объявлений."""

    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: Optional[List[CarAdResponseDTO]] = None

    def __post_init__(self):
        if self.results is None:
            self.results = []

    def to_dict(self) -> Dict[str, Any]:
        """Преобразует DTO в словарь."""
        return {
            "count": self.count,
            "next": self.next,
            "previous": self.previous,
            "results": [result.to_dict() for result in self.results],
        }
