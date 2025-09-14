"""
Pydantic schemas for seed data generation.
"""
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, validator


class RegionSeedSchema(BaseModel):
    """Schema for generating region seed data."""
    
    name: str = Field(..., description="Region name in Ukrainian (e.g., 'Київська область')")
    code: str = Field(..., description="Two-letter region code (e.g., 'KY')")
    country: str = Field(default="Україна", description="Country name")
    is_active: bool = Field(default=True, description="Whether region is active")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Region name must be at least 2 characters')
        return v.strip()
    
    @validator('code')
    def validate_code(cls, v):
        if not v or len(v) != 2:
            raise ValueError('Region code must be exactly 2 characters')
        return v.upper()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Київська область",
                "code": "KY",
                "country": "Україна",
                "is_active": True
            }
        }


class CitySeedSchema(BaseModel):
    """Schema for generating city seed data."""
    
    name: str = Field(..., description="City name in Ukrainian")
    region_name: str = Field(..., description="Region name this city belongs to")
    population: Optional[int] = Field(None, ge=1000, description="City population")
    is_regional_center: bool = Field(default=False, description="Whether city is regional center")
    is_active: bool = Field(default=True, description="Whether city is active")
    latitude: Optional[Decimal] = Field(None, description="Geographical latitude")
    longitude: Optional[Decimal] = Field(None, description="Geographical longitude")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('City name must be at least 2 characters')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Київ",
                "region_name": "м. Київ",
                "population": 2884000,
                "is_regional_center": True,
                "is_active": True,
                "latitude": "50.4501",
                "longitude": "30.5234"
            }
        }


class CarMarkSeedSchema(BaseModel):
    """Schema for generating car mark seed data."""
    
    name: str = Field(..., description="Car mark name")
    is_popular: bool = Field(default=False, description="Whether mark is popular")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Mark name cannot be empty')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "BMW",
                "is_popular": True
            }
        }


class CarModelSeedSchema(BaseModel):
    """Schema for generating car model seed data."""
    
    name: str = Field(..., description="Car model name")
    mark_name: str = Field(..., description="Car mark name this model belongs to")
    is_popular: bool = Field(default=False, description="Whether model is popular")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Model name cannot be empty')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "X5",
                "mark_name": "BMW",
                "is_popular": True
            }
        }


class CarColorSeedSchema(BaseModel):
    """Schema for generating car color seed data."""
    
    name: str = Field(..., description="Color name in Ukrainian")
    hex_code: Optional[str] = Field(None, description="Hex color code")
    is_popular: bool = Field(default=False, description="Whether color is popular")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Color name must be at least 2 characters')
        return v.strip()
    
    @validator('hex_code')
    def validate_hex_code(cls, v):
        if v and not v.startswith('#'):
            v = f'#{v}'
        if v and len(v) != 7:
            raise ValueError('Hex code must be 7 characters including #')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Чорний",
                "hex_code": "#000000",
                "is_popular": True
            }
        }


class VehicleTypeSeedSchema(BaseModel):
    """Schema for generating vehicle type seed data."""
    
    name: str = Field(..., description="Vehicle type name in Ukrainian")
    is_active: bool = Field(default=True, description="Whether type is active")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Vehicle type name must be at least 2 characters')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Легкові",
                "is_active": True
            }
        }


class CarGenerationSeedSchema(BaseModel):
    """Schema for generating car generation seed data."""
    
    name: str = Field(..., description="Generation name")
    model_name: str = Field(..., description="Car model name this generation belongs to")
    mark_name: str = Field(..., description="Car mark name")
    year_start: Optional[int] = Field(None, ge=1900, le=2030, description="Generation start year")
    year_end: Optional[int] = Field(None, ge=1900, le=2030, description="Generation end year")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Generation name cannot be empty')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "name": "E90/E91/E92/E93",
                "model_name": "3 Series",
                "mark_name": "BMW",
                "year_start": 2005,
                "year_end": 2013
            }
        }


class CarModificationSeedSchema(BaseModel):
    """Schema for generating car modification seed data."""
    
    name: str = Field(..., description="Modification name")
    generation_name: str = Field(..., description="Generation name this modification belongs to")
    engine_type: str = Field(..., description="Engine type (petrol, diesel, electric, hybrid)")
    engine_volume: Optional[float] = Field(None, ge=0.1, le=10.0, description="Engine volume in liters")
    power_hp: Optional[int] = Field(None, ge=50, le=2000, description="Power in horsepower")
    transmission: str = Field(..., description="Transmission type (manual, automatic, variator, robotic)")
    drive_type: str = Field(..., description="Drive type (fwd, rwd, awd)")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Modification name cannot be empty')
        return v.strip()
    
    @validator('engine_type')
    def validate_engine_type(cls, v):
        allowed = ['petrol', 'diesel', 'electric', 'hybrid', 'plugin_hybrid']
        if v not in allowed:
            raise ValueError(f'Engine type must be one of: {allowed}')
        return v
    
    @validator('transmission')
    def validate_transmission(cls, v):
        allowed = ['manual', 'automatic', 'variator', 'robotic']
        if v not in allowed:
            raise ValueError(f'Transmission must be one of: {allowed}')
        return v
    
    @validator('drive_type')
    def validate_drive_type(cls, v):
        allowed = ['fwd', 'rwd', 'awd']
        if v not in allowed:
            raise ValueError(f'Drive type must be one of: {allowed}')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "320i",
                "generation_name": "E90/E91/E92/E93",
                "engine_type": "petrol",
                "engine_volume": 2.0,
                "power_hp": 150,
                "transmission": "manual",
                "drive_type": "rwd"
            }
        }


# Batch schemas for multiple items
class RegionsBatchSchema(BaseModel):
    """Schema for batch region generation."""
    regions: List[RegionSeedSchema] = Field(..., description="List of regions")


class CitiesBatchSchema(BaseModel):
    """Schema for batch city generation."""
    cities: List[CitySeedSchema] = Field(..., description="List of cities")


class CarMarksBatchSchema(BaseModel):
    """Schema for batch car marks generation."""
    marks: List[CarMarkSeedSchema] = Field(..., description="List of car marks")


class CarModelsBatchSchema(BaseModel):
    """Schema for batch car models generation."""
    models: List[CarModelSeedSchema] = Field(..., description="List of car models")


class CarColorsBatchSchema(BaseModel):
    """Schema for batch car colors generation."""
    colors: List[CarColorSeedSchema] = Field(..., description="List of car colors")


class VehicleTypesBatchSchema(BaseModel):
    """Schema for batch vehicle types generation."""
    types: List[VehicleTypeSeedSchema] = Field(..., description="List of vehicle types")


class CarGenerationsBatchSchema(BaseModel):
    """Schema for batch car generations generation."""
    generations: List[CarGenerationSeedSchema] = Field(..., description="List of car generations")


class CarModificationsBatchSchema(BaseModel):
    """Schema for batch car modifications generation."""
    modifications: List[CarModificationSeedSchema] = Field(..., description="List of car modifications")
