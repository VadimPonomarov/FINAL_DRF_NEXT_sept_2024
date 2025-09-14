"""
Pydantic adapters for Django models to structure LLM responses.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, validator
from apps.ads.models.reference import (
    CarMarkModel, CarModel, CarGenerationModel, CarModificationModel, CarColorModel
)


class CarModificationPydantic(BaseModel):
    """Pydantic adapter for CarModificationModel."""
    
    name: str = Field(..., description="Modification name")
    engine_type: Literal["petrol", "diesel", "hybrid", "electric"] = Field(
        default="petrol",
        description="Engine type"
    )
    engine_volume: Optional[float] = Field(
        None, 
        ge=0.1, 
        le=10.0,
        description="Engine volume in liters"
    )
    power_hp: Optional[int] = Field(
        None, 
        ge=50, 
        le=2000,
        description="Engine power in horsepower"
    )
    transmission: Literal["manual", "automatic", "cvt", "robot"] = Field(
        default="manual",
        description="Transmission type"
    )
    drive_type: Literal["front", "rear", "all"] = Field(
        default="front",
        description="Drive type"
    )
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Modification name cannot be empty')
        return v.strip()
    
    def to_django_model(self, generation: CarGenerationModel) -> CarModificationModel:
        """Convert to Django model instance."""
        return CarModificationModel(
            generation=generation,
            name=self.name,
            engine_type=self.engine_type,
            engine_volume=self.engine_volume,
            power_hp=self.power_hp,
            transmission=self.transmission,
            drive_type=self.drive_type
        )
    
    @classmethod
    def from_django_model(cls, model: CarModificationModel) -> 'CarModificationPydantic':
        """Create from Django model instance."""
        return cls(
            name=model.name,
            engine_type=model.engine_type or "petrol",
            engine_volume=model.engine_volume,
            power_hp=model.power_hp,
            transmission=model.transmission or "manual",
            drive_type=model.drive_type or "front"
        )


class CarGenerationPydantic(BaseModel):
    """Pydantic adapter for CarGenerationModel."""
    
    name: str = Field(..., description="Generation name")
    year_start: Optional[int] = Field(
        None, 
        ge=1900, 
        le=2030,
        description="Generation start year"
    )
    year_end: Optional[int] = Field(
        None, 
        ge=1900, 
        le=2030,
        description="Generation end year"
    )
    modifications: List[CarModificationPydantic] = Field(
        default_factory=list,
        description="List of modifications for this generation"
    )
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Generation name cannot be empty')
        return v.strip()
    
    @validator('modifications')
    def validate_modifications(cls, v):
        if len(v) == 0:
            raise ValueError('Generation must have at least one modification')
        return v
    
    def to_django_model(self, car_model: CarModel) -> CarGenerationModel:
        """Convert to Django model instance."""
        return CarGenerationModel(
            model=car_model,
            name=self.name,
            year_start=self.year_start,
            year_end=self.year_end
        )
    
    @classmethod
    def from_django_model(cls, model: CarGenerationModel) -> 'CarGenerationPydantic':
        """Create from Django model instance."""
        modifications = [
            CarModificationPydantic.from_django_model(mod) 
            for mod in model.modifications.all()
        ]
        return cls(
            name=model.name,
            year_start=model.year_start,
            year_end=model.year_end,
            modifications=modifications
        )


class CarModelPydantic(BaseModel):
    """Pydantic adapter for CarModel."""
    
    name: str = Field(..., description="Model name")
    is_popular: bool = Field(default=False, description="Is popular model")
    generations: List[CarGenerationPydantic] = Field(
        default_factory=list,
        description="List of generations for this model"
    )
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Model name cannot be empty')
        return v.strip()
    
    def to_django_model(self, mark: CarMarkModel) -> CarModel:
        """Convert to Django model instance."""
        return CarModel(
            mark=mark,
            name=self.name,
            is_popular=self.is_popular
        )
    
    @classmethod
    def from_django_model(cls, model: CarModel) -> 'CarModelPydantic':
        """Create from Django model instance."""
        generations = [
            CarGenerationPydantic.from_django_model(gen) 
            for gen in model.generations.all()
        ]
        return cls(
            name=model.name,
            is_popular=model.is_popular,
            generations=generations
        )


class CarMarkPydantic(BaseModel):
    """Pydantic adapter for CarMarkModel."""
    
    name: str = Field(..., description="Mark name")
    is_popular: bool = Field(default=False, description="Is popular mark")
    models: List[CarModelPydantic] = Field(
        default_factory=list,
        description="List of models for this mark"
    )
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Mark name cannot be empty')
        return v.strip()
    
    def to_django_model(self) -> CarMarkModel:
        """Convert to Django model instance."""
        return CarMarkModel(
            name=self.name,
            is_popular=self.is_popular
        )
    
    @classmethod
    def from_django_model(cls, model: CarMarkModel) -> 'CarMarkPydantic':
        """Create from Django model instance."""
        models = [
            CarModelPydantic.from_django_model(car_model) 
            for car_model in model.models.all()
        ]
        return cls(
            name=model.name,
            is_popular=model.is_popular,
            models=models
        )


class CarColorPydantic(BaseModel):
    """Pydantic adapter for CarColorModel."""
    
    name: str = Field(..., description="Color name in Ukrainian")
    hex_code: str = Field(..., description="Hex color code")
    is_metallic: bool = Field(default=False, description="Is metallic color")
    is_pearlescent: bool = Field(default=False, description="Is pearlescent color")
    is_popular: bool = Field(default=False, description="Is popular color")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Color name cannot be empty')
        return v.strip()
    
    @validator('hex_code')
    def validate_hex_code(cls, v):
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Invalid hex color code format')
        return v.upper()
    
    def to_django_model(self) -> CarColorModel:
        """Convert to Django model instance."""
        return CarColorModel(
            name=self.name,
            hex_code=self.hex_code,
            is_metallic=self.is_metallic,
            is_pearlescent=self.is_pearlescent,
            is_popular=self.is_popular
        )
    
    @classmethod
    def from_django_model(cls, model: CarColorModel) -> 'CarColorPydantic':
        """Create from Django model instance."""
        return cls(
            name=model.name,
            hex_code=model.hex_code,
            is_metallic=model.is_metallic,
            is_pearlescent=model.is_pearlescent,
            is_popular=model.is_popular
        )


# LLM Response containers
class GenerationsLLMResponse(BaseModel):
    """Container for LLM response with generations."""
    
    generations: List[CarGenerationPydantic] = Field(
        ...,
        description="List of car generations"
    )
    
    @validator('generations')
    def validate_generations(cls, v):
        if len(v) == 0:
            raise ValueError('Response must contain at least one generation')
        if len(v) > 10:
            raise ValueError('Response cannot contain more than 10 generations')
        return v


class ColorsLLMResponse(BaseModel):
    """Container for LLM response with colors."""
    
    colors: List[CarColorPydantic] = Field(
        ...,
        description="List of car colors"
    )
    
    @validator('colors')
    def validate_colors(cls, v):
        if len(v) == 0:
            raise ValueError('Response must contain at least one color')
        if len(v) > 50:
            raise ValueError('Response cannot contain more than 50 colors')
        return v


# Utility functions for serialization
def serialize_to_json(pydantic_model: BaseModel) -> str:
    """Serialize Pydantic model to JSON string."""
    return pydantic_model.json(ensure_ascii=False, indent=2)


def serialize_to_dict(pydantic_model: BaseModel) -> dict:
    """Serialize Pydantic model to dictionary."""
    return pydantic_model.dict()


def deserialize_from_json(json_str: str, model_class: type) -> BaseModel:
    """Deserialize JSON string to Pydantic model."""
    return model_class.parse_raw(json_str)


def deserialize_from_dict(data: dict, model_class: type) -> BaseModel:
    """Deserialize dictionary to Pydantic model."""
    return model_class.parse_obj(data)
