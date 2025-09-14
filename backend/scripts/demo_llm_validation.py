"""
Demo script showing the complete flow of car ad submission with LLM validation.
This is a standalone script that demonstrates the validation flow without requiring Django.
"""
import json
import os
import sys
from typing import Dict, Any, Tuple, List, Optional

# Mock the car reference validator
class CarReferenceValidator:
    """Mock implementation of the car reference validator for demo purposes."""
    
    def __init__(self):
        # Load a small subset of the reference data for demo purposes
        self.reference_data = {
            'Легкові': {
                'Toyota': {'Corolla', 'Camry', 'RAV4', 'Land Cruiser'},
                'Honda': {'Civic', 'Accord', 'CR-V', 'Pilot'},
                'BMW': {'3 Series', '5 Series', 'X3', 'X5'},
                'Audi': {'A4', 'A6', 'Q5', 'Q7'},
                'Volkswagen': {'Golf', 'Passat', 'Tiguan', 'Touareg'}
            },
            'Мото': {
                'Yamaha': {'MT-07', 'YZF-R1', 'MT-09', 'Ténéré 700'},
                'Honda': {'CBR600RR', 'CB500F', 'Africa Twin', 'Rebel 500'},
                'Kawasaki': {'Ninja ZX-10R', 'Z900', 'Versys 650', 'KLR650'},
                'BMW': {'R 1250 GS', 'S 1000 RR', 'F 900 R', 'R 18'},
                'Ducati': {'Panigale V4', 'Monster', 'Multistrada', 'Diavel'}
            }
        }
    
    def validate_car(self, car_type: str, brand: str, model: str) -> Tuple[bool, str]:
        """Validate if the car type, brand and model exist in the reference."""
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
        if car_type not in self.reference_data:
            return False, f"Невідомий тип транспортного засобу: {car_type}"
        
        # Check if brand exists for the given type
        if brand not in self.reference_data[car_type]:
            # Try to find similar brands (case-insensitive)
            similar_brands = [b for b in self.reference_data[car_type].keys() 
                           if b.lower() == brand.lower()]
            
            if similar_brands:
                return False, f"Марка '{brand}' не знайдена. Можливо ви мали на увазі: {', '.join(similar_brands)}"
            return False, f"Марка '{brand}' не знайдена для типу '{car_type}'"
        
        # Check if model exists for the given brand and type
        if model not in self.reference_data[car_type][brand]:
            # Try to find similar models (case-insensitive)
            similar_models = [m for m in self.reference_data[car_type][brand] 
                            if m.lower() == model.lower()]
            
            if similar_models:
                return False, f"Модель '{model}' не знайдена. Можливо ви мали на увазі: {', '.join(similar_models)}"
            return False, f"Модель '{model}' не знайдена для марки '{brand}'"
        
        return True, ""

# Create a singleton instance
car_reference_validator = CarReferenceValidator()

# Mock LLM service for demo purposes
class MockLLMService:
    def get_completion(self, prompt: str) -> str:
        """Mock LLM response for demo purposes."""
        # Simulate API call delay
        import time
        time.sleep(0.5)
        
        # Parse the input data from the prompt
        data_start = prompt.find("Form Data (field: value):") + len("Form Data (field: value):")
        data_section = prompt[data_start:]
        
        # Extract field values
        fields = {}
        for line in data_section.split('\n'):
            line = line.strip()
            if line.startswith('-') and ': ' in line:
                field_part = line[1:].strip()
                if ': ' in field_part:
                    field, value = field_part.split(': ', 1)
                    field = field.strip()
                    if value == '[EMPTY]':
                        value = ''
                    fields[field] = value.strip()
        
        # Simple validation rules for demo
        errors = {}
        corrections = {}
        
        # Required field checks
        if not fields.get('title'):
            errors['title'] = ["Это поле обязательно для заполнения"]
        elif len(fields.get('title', '')) < 10:
            errors['title'] = ["Заголовок слишком короткий. Минимум 10 символов."]
        
        if not fields.get('description'):
            errors['description'] = ["Пожалуйста, укажите описание"]
        elif len(fields.get('description', '')) < 20:
            errors['description'] = ["Описание слишком короткое. Пожалуйста, укажите больше деталей."]
        
        # Price validation
        price_str = fields.get('price', '')
        if not price_str:
            errors['price'] = ["Укажите цену"]
        else:
            try:
                price = float(price_str.replace(' ', '').replace(',', '.'))
                if price <= 0:
                    errors['price'] = ["Цена должна быть больше 0"]
            except (ValueError, TypeError):
                errors['price'] = ["Некорректный формат цены. Используйте только цифры и точку/запятую"]
        
        # Year validation
        year_str = fields.get('year', '')
        if not year_str:
            errors['year'] = ["Укажите год выпуска"]
        else:
            try:
                year = int(year_str)
                current_year = 2024  # This should be dynamic in a real app
                if year < 1900 or year > current_year + 1:  # +1 for new cars
                    errors['year'] = [f"Укажите год выпуска от 1900 до {current_year + 1}"]
            except (ValueError, TypeError):
                errors['year'] = ["Некорректный формат года"]
        
        # Mileage validation
        mileage_str = fields.get('mileage', '')
        if mileage_str:  # Mileage is required but we'll be lenient in this demo
            try:
                mileage = int(mileage_str.replace(' ', ''))
                if mileage < 0:
                    errors['mileage'] = ["Пробег не может быть отрицательным"]
            except (ValueError, TypeError):
                errors['mileage'] = ["Некорректный формат пробега. Используйте только цифры"]
        
        # Make/Model validation and auto-corrections
        make = fields.get('make', '').strip()
        model = fields.get('model', '').strip()
        
        if make and model:
            # Auto-correct common misspellings
            make_lower = make.lower()
            model_lower = model.lower()
            
            # Common make corrections
            make_corrections = {
                'toyota': 'Toyota',
                'vaz': 'ВАЗ',
                'lada': 'Lada',
                'bmw': 'BMW',
                'vw': 'Volkswagen',
                'volkswagen': 'Volkswagen',
                'mercedes': 'Mercedes-Benz',
                'audi': 'Audi'
            }
            
            # Common model corrections
            model_corrections = {
                'corola': 'Corolla',
                'camry': 'Camry',
                'priora': 'Priora',
                'vesta': 'Vesta',
                'granta': 'Granta',
                'x5': 'X5',
                'x6': 'X6',
                'passat': 'Passat',
                'polo': 'Polo'
            }
            
            # Apply make corrections
            for wrong, right in make_corrections.items():
                if make_lower == wrong:
                    corrections['make'] = right
                    break
            
            # Apply model corrections
            for wrong, right in model_corrections.items():
                if model_lower == wrong:
                    corrections['model'] = right
                    break
        
        # Add some example corrections for demo purposes
        if 'make' not in corrections and 'make' in fields and fields['make']:
            # If make is Toyota, capitalize it if not already
            if fields['make'].lower() == 'toyota' and fields['make'] != 'Toyota':
                corrections['make'] = 'Toyota'
        
        # If no errors, return success with any corrections
        if not errors:
            result = {
                "is_valid": True,
                "errors": {},
                "corrections": corrections
            }
        else:
            result = {
                "is_valid": False,
                "errors": errors,
                "corrections": corrections
            }
        
        # Pretty print for demo
        return json.dumps(result, indent=2, ensure_ascii=False)

# Mock the LLM validator
class MockLLMValidator:
    def __init__(self, llm_service):
        self.llm = llm_service
    
    def validate_form_data(self, form_data: Dict[str, Any], field_definitions: Dict[str, Any], language: str = 'uk') -> Any:
        """Mock validation method for demo."""
        class Result:
            def __init__(self, data):
                self.is_valid = data['is_valid']
                self.errors = data.get('errors', {})
                self.corrected_values = data.get('corrections', {})
        
        # In a real app, this would call the actual LLM service
        prompt = self._build_mock_prompt(form_data, field_definitions, language)
        response = self.llm.get_completion(prompt)
        data = json.loads(response)
        return Result(data)
    
    def _build_mock_prompt(self, form_data, field_definitions, language):
        """Build a mock prompt for demo purposes."""
        return f"""Validation request (language: {language}):
        
Field Definitions:
{json.dumps(field_definitions, indent=2)}

Form Data (field: value):
""" + "\n".join([f"- {k}: {v if v is not None else '[EMPTY]'}" for k, v in form_data.items()])

# Mock the CarAd model
class CarAdModel:
    """Mock implementation of the CarAd model for demo purposes."""
    
    def __init__(self, **kwargs):
        self.dynamic_fields = {}
        self.is_validated = False
        self.validation_errors = {}
        self.id = 1  # Mock ID
        for k, v in kwargs.items():
            setattr(self, k, v)
    
    def save(self):
        """Mock save method that prints the data that would be saved."""
        print("\n[SAVING TO DATABASE]")
        print(f"Title: {getattr(self, 'title', '')}")
        print(f"Description: {getattr(self, 'description', '')}")
        print(f"Make: {getattr(self, 'make', '')}")
        print(f"Model: {getattr(self, 'model', '')}")
        print(f"Year: {getattr(self, 'year', '')}")
        print(f"Price: {getattr(self, 'price', '')}")
        print(f"Mileage: {getattr(self, 'mileage', '')}")
        
        if hasattr(self, 'dynamic_fields') and self.dynamic_fields:
            print("Dynamic Fields:")
            for k, v in self.dynamic_fields.items():
                print(f"  {k}: {v}")
                
        print(f"Validation Status: {'Valid' if self.is_validated else 'Invalid'}")
        if hasattr(self, 'validation_errors') and self.validation_errors:
            print("Validation Errors:")
            for field, errors in self.validation_errors.items():
                print(f"  {field}: {', '.join(errors)}")
    
    @classmethod
    def get_dynamic_fields(cls):
        """Return dynamic fields configuration."""
        return {
            'brand': {'type': 'text', 'required': True, 'label': 'Марка'},
            'model': {'type': 'text', 'required': True, 'label': 'Модель'},
            'year': {'type': 'year', 'required': True, 'label': 'Рік випуску'},
            'mileage': {'type': 'number', 'required': True, 'label': 'Пробіг (км)'},
            'price': {'type': 'number', 'required': True, 'label': 'Ціна'},
            'color': {'type': 'text', 'required': False, 'label': 'Колір'},
            'transmission': {'type': 'text', 'required': False, 'label': 'Коробка передач'},
            'fuel_type': {'type': 'text', 'required': False, 'label': 'Тип палива'},
            'engine_volume': {'type': 'number', 'required': False, 'label': 'Об\'єм двигуна (л)'},
            'body_type': {'type': 'text', 'required': False, 'label': 'Тип кузова'},
            'drive_type': {'type': 'text', 'required': False, 'label': 'Тип привіду'},
            'state': {'type': 'text', 'required': False, 'label': 'Стан'}
        }
        return self

# Mock the serializer
class CarAdSerializer:
    """Mock serializer for car ad validation."""
    
    class Meta:
        model = CarAdModel
    
    def __init__(self, data=None, instance=None, **kwargs):
        self.initial_data = data or {}
        self.instance = instance
        self.validated_data = {}
        self.context = kwargs.get('context', {})
        self.llm_validator = MockLLMValidator(MockLLMService())
    
    def is_valid(self, raise_exception=False):
        """Validate the data including LLM validation."""
        try:
            return self._validate()
        except Exception as e:
            if raise_exception:
                raise e
            self.validated_data = {
                'is_validated': False,
                'validation_errors': {'__all__': [f'Validation error: {str(e)}']}
            }
            return False
    
    def _validate(self):
        """Async validation wrapper."""
        # Prepare data for validation
        data = {**self.initial_data}
        dynamic_fields = data.pop('dynamic_fields', {})
        
        # Get field definitions from the model
        field_defs = self.Meta.model.get_dynamic_fields()
        
        # Combine all fields for validation
        validation_data = {**data, **dynamic_fields}
        
        # 1. First, validate car type, make and model against reference
        car_type = 'Легкові'  # Default car type
        make = validation_data.get('make', '')
        model = validation_data.get('model', '')
        
        is_valid, error_msg = car_reference_validator.validate_car(car_type, make, model)
        if not is_valid:
            self.validated_data = {
                'is_validated': False,
                'validation_errors': {
                    'make': [error_msg] if 'Марка' in error_msg else [],
                    'model': [error_msg] if 'Модель' in error_msg else [],
                    '__all__': [error_msg] if 'Тип' in error_msg else []
                },
                'corrections': {}
            }
            # Remove empty error lists
            self.validated_data['validation_errors'] = {
                k: v for k, v in self.validated_data['validation_errors'].items() 
                if v  # Only keep non-empty lists
            }
            return False
        
        # 2. Perform LLM validation on all fields
        result = self.llm_validator.validate_form_data(
            validation_data,
            field_defs,
            self.context.get('language', 'uk')
        )
        
        # Apply corrections
        corrected_data = {**validation_data}
        for field, value in result.corrected_values.items():
            if field in data:
                data[field] = value
            elif field in dynamic_fields:
                dynamic_fields[field] = value
            corrected_data[field] = value
        
        # Check if validation passed
        if not result.is_valid:
            self.validated_data = {
                'is_validated': False,
                'validation_errors': result.errors,
                'corrections': result.corrected_values
            }
            return False
        
        # If we got here, validation passed
        self.validated_data = {
            **data,
            'dynamic_fields': dynamic_fields,
            'is_validated': True,
            'validation_errors': {},
            'corrections': result.corrected_values
        }
        return True
    
    def save(self):
        """Save the instance after validation."""
        if not hasattr(self, 'validated_data') or not self.validated_data.get('is_validated', False):
            raise ValueError("Cannot save unvalidated data")
        
        # Create a new instance if one doesn't exist
        if self.instance is None:
            self.instance = CarAdModel()
        
        # Update instance with validated data
        for attr, value in self.validated_data.items():
            if attr not in ['is_validated', 'validation_errors']:
                if attr == 'dynamic_fields':
                    # Handle dynamic fields specially
                    if not hasattr(self.instance, 'dynamic_fields'):
                        self.instance.dynamic_fields = {}
                    if isinstance(value, dict):
                        self.instance.dynamic_fields.update(value)
                else:
                    # Ensure the instance has the attribute before setting it
                    if not hasattr(self.instance, attr):
                        setattr(self.instance, attr, value)
                    else:
                        setattr(self.instance, attr, value)
        
        # Ensure required fields are set
        required_fields = ['title', 'description', 'price', 'year', 'make', 'model', 'mileage']
        for field in required_fields:
            if not hasattr(self.instance, field) or getattr(self.instance, field) is None:
                setattr(self.instance, field, self.validated_data.get(field, ''))
        
        # Save the instance
        self.instance.save()
        return self.instance
    
    def get_field_definitions(self):
        """Get field definitions for validation."""
        return {
            'title': {'type': 'text', 'required': True, 'label': 'Title'},
            'description': {'type': 'text', 'required': True, 'label': 'Description'},
            'price': {'type': 'number', 'required': True, 'label': 'Price'},
            'year': {'type': 'year', 'required': True, 'label': 'Year'},
            'make': {'type': 'text', 'required': True, 'label': 'Make'},
            'model': {'type': 'text', 'required': True, 'label': 'Model'},
            'mileage': {'type': 'number', 'required': True, 'label': 'Mileage'},
        }
    
    @classmethod
    def get_model(cls):
        """Get the model class."""
        return CarAdModel

# Demo function
def demo_car_ad_submission():
    """Demonstrate the car ad submission flow with validation."""
    print("\n=== Демонстрация процесса ввода и валидации объявления ===\n")
    print("В этом демо мы покажем, как работает процесс:")
    print("1. Пользователь вводит данные об автомобиле")
    print("2. Система проверяет марку и модель по справочнику")
    print("3. Система валидирует данные с помощью LLM")
    print("4. При необходимости вносятся автоматические исправления")
    print("5. Показывается результат валидации\n")
    
    # Skip interactive prompt for demo
    print("\n" + "="*80 + "\n")
    
    # Example 1: Valid ad with known brand/model
    print("\n--- Пример 1: Корректное объявление с известной маркой/моделью ---\n")
    
    ad_data = {
        "title": "Продам Toyota Corolla 2020 года",
        "description": "Отличное состояние, один хозяин, полная сервисная история",
        "price": "25000",
        "year": "2020",
        "brand": "Toyota",
        "model": "Corolla",
        "mileage": "45 000",
        "dynamic_fields": {
            "color": "серый металлик",
            "transmission": "автомат",
            "fuel_type": "бензин",
            "body_type": "седан",
            "engine_volume": "1.8"
        }
    }
    
    print("\nВходные данные:")
    print(json.dumps(ad_data, indent=2, ensure_ascii=False))
    
    print("\nПроцесс валидации...")
    serializer = CarAdSerializer(data=ad_data)
    is_valid = serializer.is_valid()
    
    print("\nРезультат валидации:")
    if is_valid:
        print("✅ Валидация пройдена успешно!")
        print("Сохранение в базу данных...")
        ad = serializer.save()
        print("✅ Объявление успешно сохранено!")
    else:
        print("❌ Ошибки валидации:")
        print(json.dumps(serializer.validated_data.get('validation_errors', {}), indent=2, ensure_ascii=False))
    
    # Skip interactive prompt for demo
    print("\n" + "="*80 + "\n")
    
    # Example 2: Ad with validation errors
    print("\n--- Пример 2: Объявление с ошибками валидации ---\n")
    
    ad_data = {
        "title": "Продам",
        "description": "Машина",
        "price": "десять тысяч",
        "year": "2025",
        "brand": "Toyota",
        "model": "Corolla",
        "mileage": "сто тысяч",
        "dynamic_fields": {
            "color": "синий",
            "transmission": "автомат"
        }
    }
    
    print("\nВходные данные:")
    print(json.dumps(ad_data, indent=2, ensure_ascii=False))
    
    print("\nПроцесс валидации...")
    serializer = CarAdSerializer(data=ad_data)
    is_valid = serializer.is_valid()
    
    print("\nРезультат валидации:")
    if is_valid:
        print("✅ Валидация пройдена успешно!")
        print("\nИсправленные значения:")
        print(json.dumps(serializer.validated_data, indent=2, ensure_ascii=False))
        
        print("\nСохранение в базу данных...")
        ad = serializer.save()
    else:
        print("❌ Обнаружены ошибки:")
        print(json.dumps(serializer.validated_data.get('validation_errors', {}), indent=2, ensure_ascii=False))
    
    print("\nВходные данные:")
    print(json.dumps(ad_data, indent=2, ensure_ascii=False))
    
    print("\nПроцесс валидации...")
    serializer = CarAdSerializer(data=ad_data)
    is_valid = serializer.is_valid()
    
    print("\nРезультат валидации:")
    if is_valid:
        print("✅ Валидация пройдена успешно!")
    else:
        print("❌ Обнаружены ошибки:")
        errors = serializer.validated_data.get('validation_errors', {})
        print(json.dumps(errors, indent=2, ensure_ascii=False))
        
        print("\nИсправленные значения:")
        corrections = {
            k: v for k, v in serializer.validated_data.items()
            if k not in ad_data or v != ad_data.get(k)
        }
        print(json.dumps(corrections, indent=2, ensure_ascii=False))
    
    # Skip interactive prompt for demo
    print("\n" + "="*80 + "\n")
    
    # Example 3: Ad with unknown brand/model
    print("\n--- Пример 3: Объявление с неизвестной маркой/моделью ---\n")
    
    ad_data = {
        "title": "Продам TestCar TestModel 2021 года",
        "description": "Новая машина, тестовая модель",
        "price": "10000",
        "year": "2021",
        "brand": "TestCar",
        "model": "TestModel",
        "mileage": "1000",
        "dynamic_fields": {
            "color": "красный",
            "transmission": "механика"
        }
    }
    
    print("\nВходные данные:")
    print(json.dumps(ad_data, indent=2, ensure_ascii=False))
    
    print("\nПроцесс валидации...")
    serializer = CarAdSerializer(data=ad_data)
    is_valid = serializer.is_valid()
    
    print("\nРезультат валидации:")
    if is_valid:
        print("✅ Валидация пройдена успешно!")
        print("\nИсправленные значения:")
        print(json.dumps(serializer.validated_data, indent=2, ensure_ascii=False))
        
        print("\nСохранение в базу данных...")
        ad = serializer.save()
    else:
        print("❌ Обнаружены ошибки:")
        print(json.dumps(serializer.validated_data.get('validation_errors', {}), indent=2, ensure_ascii=False))
    
    print("\n" + "="*80 + "\n")
    print("\n=== Демонстрация завершена ===")

# Run the demo
if __name__ == "__main__":
    demo_car_ad_submission()
