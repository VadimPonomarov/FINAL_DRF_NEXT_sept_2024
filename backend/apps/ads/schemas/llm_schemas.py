"""
Pydantic schemas for LLM responses and structured data.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, validator


class CarModificationLLMSchema(BaseModel):
    """Schema for car modification data from LLM."""
    
    name: str = Field(..., description="Modification name (e.g., '320i', '2.0 TSI', 'V6 3.5')")
    engine_type: Literal["petrol", "diesel", "hybrid", "electric"] = Field(
        ..., 
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
        ...,
        description="Transmission type"
    )
    drive_type: Literal["front", "rear", "all"] = Field(
        ...,
        description="Drive type"
    )
    
    @validator('name')
    def validate_name(cls, v):
        """Validate modification name."""
        if not v or len(v.strip()) < 1:
            raise ValueError('Modification name cannot be empty')
        return v.strip()
    
    @validator('engine_volume')
    def validate_engine_volume(cls, v):
        """Validate engine volume."""
        if v is not None and (v < 0.1 or v > 10.0):
            raise ValueError('Engine volume must be between 0.1 and 10.0 liters')
        return v
    
    @validator('power_hp')
    def validate_power_hp(cls, v):
        """Validate engine power."""
        if v is not None and (v < 50 or v > 2000):
            raise ValueError('Engine power must be between 50 and 2000 HP')
        return v


class CarGenerationLLMSchema(BaseModel):
    """Schema for car generation data from LLM."""
    
    name: str = Field(..., description="Generation name (e.g., 'I поколение', 'E90/E91/E92/E93')")
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
    modifications: List[CarModificationLLMSchema] = Field(
        default_factory=list,
        description="List of modifications for this generation"
    )
    
    @validator('name')
    def validate_name(cls, v):
        """Validate generation name."""
        if not v or len(v.strip()) < 1:
            raise ValueError('Generation name cannot be empty')
        return v.strip()
    
    @validator('year_start')
    def validate_year_start(cls, v):
        """Validate start year."""
        if v is not None and (v < 1900 or v > 2030):
            raise ValueError('Start year must be between 1900 and 2030')
        return v
    
    @validator('year_end')
    def validate_year_end(cls, v):
        """Validate end year."""
        if v is not None and (v < 1900 or v > 2030):
            raise ValueError('End year must be between 1900 and 2030')
        return v
    
    @validator('modifications')
    def validate_modifications(cls, v):
        """Validate modifications list."""
        if len(v) == 0:
            raise ValueError('Generation must have at least one modification')
        if len(v) > 20:
            raise ValueError('Generation cannot have more than 20 modifications')
        return v
    
    def validate_year_range(self):
        """Validate that year_end is after year_start."""
        if (self.year_start is not None and 
            self.year_end is not None and 
            self.year_end < self.year_start):
            raise ValueError('End year must be after start year')


class CarGenerationsLLMResponse(BaseModel):
    """Schema for complete LLM response with multiple generations."""
    
    generations: List[CarGenerationLLMSchema] = Field(
        ...,
        description="List of car generations"
    )
    
    @validator('generations')
    def validate_generations(cls, v):
        """Validate generations list."""
        if len(v) == 0:
            raise ValueError('Response must contain at least one generation')
        if len(v) > 10:
            raise ValueError('Response cannot contain more than 10 generations')
        return v
    
    def validate_chronological_order(self):
        """Validate that generations are in chronological order."""
        for i in range(len(self.generations) - 1):
            current = self.generations[i]
            next_gen = self.generations[i + 1]
            
            if (current.year_start is not None and 
                next_gen.year_start is not None and
                current.year_start > next_gen.year_start):
                raise ValueError('Generations must be in chronological order')


class CarColorLLMSchema(BaseModel):
    """Schema for car color data from LLM."""
    
    name: str = Field(..., description="Color name in Ukrainian")
    hex_code: str = Field(..., description="Hex color code (e.g., '#FF0000')")
    is_metallic: bool = Field(default=False, description="Is metallic color")
    is_pearlescent: bool = Field(default=False, description="Is pearlescent color")
    is_popular: bool = Field(default=False, description="Is popular color")
    
    @validator('name')
    def validate_name(cls, v):
        """Validate color name."""
        if not v or len(v.strip()) < 1:
            raise ValueError('Color name cannot be empty')
        return v.strip()
    
    @validator('hex_code')
    def validate_hex_code(cls, v):
        """Validate hex color code."""
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError('Invalid hex color code format')
        return v.upper()


class CarColorsLLMResponse(BaseModel):
    """Schema for LLM response with car colors."""
    
    colors: List[CarColorLLMSchema] = Field(
        ...,
        description="List of car colors"
    )
    
    @validator('colors')
    def validate_colors(cls, v):
        """Validate colors list."""
        if len(v) == 0:
            raise ValueError('Response must contain at least one color')
        if len(v) > 50:
            raise ValueError('Response cannot contain more than 50 colors')
        return v


# Utility functions for LLM prompt generation
def get_generations_prompt_template() -> str:
    """Get prompt template for generating car generations."""
    return """
Generate realistic car generations and modifications data for: {mark_name} {model_name}

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
7. Names should be in Ukrainian or international format
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

Rules:
1. Generate 20-30 realistic car colors
2. Names must be in Ukrainian
3. Include popular colors (white, black, silver, etc.)
4. Include some metallic and pearlescent variants
5. Use valid hex color codes (e.g., #FF0000)
6. Mark popular colors appropriately
7. Include variety: basic colors, metallic, pearlescent

Respond ONLY with valid JSON, no additional text or markdown formatting.
"""
