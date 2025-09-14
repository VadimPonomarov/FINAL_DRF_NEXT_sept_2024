"""
Pydantic schemas for car reference models with LLM integration and localization support.
"""
from typing import List, Optional, Literal, Dict
from pydantic import BaseModel, Field, validator


# Supported locales
SUPPORTED_LOCALES = Literal["uk", "en", "ru"]


class LocalizedText(BaseModel):
    """Schema for localized text fields."""

    uk: str = Field(..., description="Ukrainian text")
    en: Optional[str] = Field(None, description="English text")
    ru: Optional[str] = Field(None, description="Russian text")

    @validator('uk')
    def validate_ukrainian(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Ukrainian text is required')
        return v.strip()

    def get_text(self, locale: str = "uk") -> str:
        """Get text for specific locale with fallback to Ukrainian."""
        if locale == "en" and self.en:
            return self.en
        elif locale == "ru" and self.ru:
            return self.ru
        return self.uk


class CarModificationSchema(BaseModel):
    """Schema for CarModificationModel with localization support."""

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


class CarGenerationSchema(BaseModel):
    """Ninja schema for CarGenerationModel with LLM compatibility."""
    
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
    modifications: List[CarModificationSchema] = Field(
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


class CarModelSchema(BaseModel):
    """Ninja schema for CarModel with LLM compatibility."""
    
    name: str = Field(..., description="Model name")
    is_popular: bool = Field(default=False, description="Is popular model")
    generations: List[CarGenerationSchema] = Field(
        default_factory=list,
        description="List of generations for this model"
    )
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Model name cannot be empty')
        return v.strip()


class CarMarkSchema(BaseModel):
    """Ninja schema for CarMarkModel with LLM compatibility."""
    
    name: str = Field(..., description="Mark name")
    is_popular: bool = Field(default=False, description="Is popular mark")
    models: List[CarModelSchema] = Field(
        default_factory=list,
        description="List of models for this mark"
    )
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Mark name cannot be empty')
        return v.strip()


class CarColorSchema(BaseModel):
    """Ninja schema for CarColorModel with LLM compatibility."""
    
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


# LLM Response containers
class GenerationsLLMResponse(BaseModel):
    """Container for LLM response with generations."""
    
    generations: List[CarGenerationSchema] = Field(
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

    colors: List[CarColorSchema] = Field(
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


class MarksLLMResponse(BaseModel):
    """Container for LLM response with marks."""

    marks: List[CarMarkSchema] = Field(
        ...,
        description="List of car marks"
    )

    @validator('marks')
    def validate_marks(cls, v):
        if len(v) == 0:
            raise ValueError('Response must contain at least one mark')
        if len(v) > 100:
            raise ValueError('Response cannot contain more than 100 marks')
        return v


class ModelsLLMResponse(BaseModel):
    """Container for LLM response with models."""

    models: List[CarModelSchema] = Field(
        ...,
        description="List of car models"
    )

    @validator('models')
    def validate_models(cls, v):
        if len(v) == 0:
            raise ValueError('Response must contain at least one model')
        if len(v) > 50:
            raise ValueError('Response cannot contain more than 50 models')
        return v


# Output schemas for API responses
class CarModificationOut(BaseModel):
    """Output schema for CarModificationModel."""

    id: int
    name: str
    engine_type: Optional[str] = None
    engine_volume: Optional[float] = None
    power_hp: Optional[int] = None
    transmission: Optional[str] = None
    drive_type: Optional[str] = None
    generation_id: int


class CarGenerationOut(BaseModel):
    """Output schema for CarGenerationModel."""

    id: int
    name: str
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    model_id: int
    modifications_count: Optional[int] = 0


class CarModelOut(BaseModel):
    """Output schema for CarModel."""

    id: int
    name: str
    is_popular: bool
    mark_id: int
    mark_name: str
    generations_count: Optional[int] = 0


class CarMarkOut(BaseModel):
    """Output schema for CarMarkModel."""

    id: int
    name: str
    is_popular: bool
    logo: Optional[str] = None
    models_count: Optional[int] = 0


class CarColorOut(BaseModel):
    """Output schema for CarColorModel."""

    id: int
    name: str
    hex_code: str
    is_metallic: bool
    is_pearlescent: bool
    is_popular: bool


# Utility functions for LLM prompt generation
def get_generations_prompt_template() -> str:
    """Get prompt template for generating car generations."""
    return """
Generate realistic car generations and modifications data for: {mark_name} {model_name}

Target language: {locale}

Please provide a JSON response that matches this exact structure:
{{
    "generations": [
        {{
            "name": "Generation name (e.g., 'I поколение', 'II поколение', 'E90/E91/E92/E93')",
            "year_start": 2000,
            "year_end": 2007,
            "modifications": [
                {{
                    "name": "Modification name (e.g., '320i', '2.0 TSI', 'V6 3.5')",
                    "engine_type": "petrol",
                    "engine_volume": 2.0,
                    "power_hp": 150,
                    "transmission": "manual",
                    "drive_type": "front"
                }}
            ]
        }}
    ]
}}

Rules:
1. Generate 2-4 realistic generations for this model
2. Each generation should have 2-6 modifications
3. Use realistic years, engine volumes, and power figures
4. Engine types: "petrol", "diesel", "hybrid", "electric"
5. Transmissions: "manual", "automatic", "cvt", "robot"
6. Drive types: "front", "rear", "all"
7. Names should be in the target language ({locale})
8. Ensure chronological order of generations
9. Year range: 1900-2030
10. Engine volume range: 0.1-10.0 liters
11. Power range: 50-2000 HP

Respond ONLY with valid JSON, no additional text or markdown formatting.
"""


def get_colors_prompt_template() -> str:
    """Get prompt template for generating car colors."""
    return """
Generate a comprehensive list of car colors with their properties.

Target language: {locale}

Please provide a JSON response that matches this exact structure:
{{
    "colors": [
        {{
            "name": "Білий",
            "hex_code": "#FFFFFF",
            "is_metallic": false,
            "is_pearlescent": false,
            "is_popular": true
        }}
    ]
}}

MANDATORY REQUIREMENTS:
1. MUST include ALL basic colors: Білий, Чорний, Сірий, Червоний, Синій, Зелений, Жовтий, Коричневий
2. MUST include metallic variants for popular colors: Білий металік, Чорний металік, Сірий металік, Срібний металік
3. MUST include pearlescent variants: Перламутровий білий, Перламутровий чорний

Additional Rules:
4. Generate 25-35 realistic car colors total
5. Names must be in the target language ({locale})
6. Include popular automotive colors (white, black, silver, grey, red, blue)
7. Add metallic variants with "металік" suffix for popular colors
8. Add pearlescent variants with "перламутровий" prefix
9. Use valid hex color codes (e.g., #FF0000)
10. Mark popular colors (white, black, silver, grey) as is_popular: true
11. Mark metallic colors as is_metallic: true
12. Mark pearlescent colors as is_pearlescent: true
13. Include variety: solid colors, metallic, pearlescent, special automotive colors

Example metallic naming:
- "Білий металік" (is_metallic: true)
- "Чорний металік" (is_metallic: true)
- "Сірий металік" (is_metallic: true)

Example pearlescent naming:
- "Перламутровий білий" (is_pearlescent: true)
- "Перламутровий синій" (is_pearlescent: true)

Respond ONLY with valid JSON, no additional text or markdown formatting.
"""
