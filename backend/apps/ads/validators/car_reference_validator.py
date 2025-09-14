"""
Validator for checking if car brands and models exist in the reference dictionary.
"""
import os
import csv
from typing import Dict, Set, Tuple
from django.conf import settings

class CarReferenceValidator:
    """
    Validates car brands and models against a reference dictionary.
    The reference file is expected to be a CSV with format: type,brand,model
    """
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CarReferenceValidator, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.car_types: Set[str] = set()
            self.brands_by_type: Dict[str, Set[str]] = {}
            self.models_by_brand: Dict[Tuple[str, str], Set[str]] = {}
            self._load_reference_data()
            self._initialized = True
    
    def _load_reference_data(self):
        """Load car reference data from the CSV file."""
        # Path to the reference file
        ref_file = os.path.join(settings.BASE_DIR, 'core', 'data', 'cars_dict_output.csv')
        
        try:
            with open(ref_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 3:
                        car_type, brand, model = row[0].strip(), row[1].strip(), row[2].strip()
                        
                        # Add to car types
                        self.car_types.add(car_type)
                        
                        # Add to brands by type
                        if car_type not in self.brands_by_type:
                            self.brands_by_type[car_type] = set()
                        self.brands_by_type[car_type].add(brand)
                        
                        # Add to models by brand
                        brand_key = (car_type, brand)
                        if brand_key not in self.models_by_brand:
                            self.models_by_brand[brand_key] = set()
                        self.models_by_brand[brand_key].add(model)
        except Exception as e:
            # Log error but don't fail initialization
            print(f"Warning: Could not load car reference data: {e}")
    
    def validate_car(self, car_type: str, brand: str, model: str) -> Tuple[bool, str]:
        """
        Validate if the car type, brand and model exist in the reference.
        
        Args:
            car_type: Type of the car (e.g., 'Легкові', 'Мото')
            brand: Car brand (e.g., 'Toyota', 'BMW')
            model: Car model (e.g., 'Camry', 'X5')
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Normalize inputs
        car_type = car_type.strip() if car_type else ''
        brand = brand.strip() if brand else ''
        model = model.strip() if model else ''
        
        if not car_type:
            return False, "Тип транспортного засобу є обов'язковим полем"
            
        if not brand:
            return False, "Марка автомобіля є обов'язковим полем"
            
        if not model:
            return False, "Модель автомобіля є обов'язковим полем"
        
        # Check if car type exists
        if car_type not in self.car_types:
            return False, f"Невідомий тип транспортного засобу: {car_type}"
        
        # Check if brand exists for the given type
        if brand not in self.brands_by_type.get(car_type, set()):
            # Try to find similar brands (case-insensitive)
            similar_brands = [b for b in self.brands_by_type.get(car_type, []) 
                           if b.lower() == brand.lower()]
            
            if similar_brands:
                return False, f"Марка '{brand}' не знайдена. Можливо ви мали на увазі: {', '.join(similar_brands)}"
            return False, f"Марка '{brand}' не знайдена для типу '{car_type}'"
        
        # Check if model exists for the given brand and type
        brand_key = (car_type, brand)
        if model not in self.models_by_brand.get(brand_key, set()):
            # Try to find similar models (case-insensitive)
            similar_models = [m for m in self.models_by_brand.get(brand_key, []) 
                            if m.lower() == model.lower()]
            
            if similar_models:
                return False, f"Модель '{model}' не знайдена. Можливо ви мали на увазі: {', '.join(similar_models)}"
            return False, f"Модель '{model}' не знайдена для марки '{brand}'"
        
        return True, ""

# Singleton instance
car_reference_validator = CarReferenceValidator()

# Backward compatibility alias (temporary during migration)
make_reference_validator = car_reference_validator
# TODO: Remove this alias after all code has been updated to use car_reference_validator directly
