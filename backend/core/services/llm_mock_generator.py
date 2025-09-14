"""
LLM-based mock data generator service.
Generates realistic mock data using AI for testing purposes.
Uses Django Ninja model converters to automatically create Pydantic schemas.
"""
import json
import logging
from typing import Type, List, Dict, Any, Optional, Union
from pydantic import BaseModel, ValidationError
from django.db import models, transaction
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import serializers
from ninja import ModelSchema
from ninja.orm import create_schema

logger = logging.getLogger(__name__)


class MockGenerationError(Exception):
    """Exception raised when mock data generation fails."""
    pass


class LLMMockGenerator:
    """
    Universal mock data generator using LLM.
    
    Generates realistic mock data based on prompts and Pydantic schemas,
    then saves to database using Django models and serializers.
    """
    
    def __init__(self, locale: str = 'uk_UA'):
        """
        Initialize the mock generator.
        
        Args:
            locale: Locale for generated data (uk_UA, en_US, etc.)
        """
        self.locale = locale
        self.locale_config = self._get_locale_config(locale)
    
    def _get_locale_config(self, locale: str) -> Dict[str, Any]:
        """Get locale-specific configuration."""
        configs = {
            'uk_UA': {
                'language': 'українська',
                'country': 'Україна',
                'currency': 'UAH',
                'phone_format': '+380XXXXXXXXX',
                'date_format': 'DD.MM.YYYY',
                'address_format': 'вул. {street}, {building}, {city}, {region}',
                'name_style': 'українські імена та прізвища',
            },
            'en_US': {
                'language': 'English',
                'country': 'United States',
                'currency': 'USD',
                'phone_format': '+1XXXXXXXXXX',
                'date_format': 'MM/DD/YYYY',
                'address_format': '{building} {street}, {city}, {state}',
                'name_style': 'English names and surnames',
            },
            'ru_RU': {
                'language': 'русский',
                'country': 'Россия',
                'currency': 'RUB',
                'phone_format': '+7XXXXXXXXXX',
                'date_format': 'DD.MM.YYYY',
                'address_format': 'ул. {street}, {building}, {city}',
                'name_style': 'русские имена и фамилии',
            }
        }
        return configs.get(locale, configs['uk_UA'])
    
    def generate_mock_data(
        self,
        prompt: str,
        django_model: Type[models.Model],
        serializer_class: Type[serializers.Serializer],
        count: int,
        batch_size: int = 100,
        pydantic_model: Optional[Type[BaseModel]] = None,
        exclude_fields: Optional[List[str]] = None,
        **generation_kwargs
    ) -> List[Any]:
        """
        Generate mock data using LLM and save to database.

        Args:
            prompt: Base prompt for data generation
            django_model: Django model to save data to
            serializer_class: DRF serializer for validation and saving
            count: Number of records to generate
            batch_size: Number of records to process in each batch
            pydantic_model: Optional custom Pydantic model (auto-generated if None)
            exclude_fields: Fields to exclude from auto-generated schema
            **generation_kwargs: Additional parameters for generation

        Returns:
            List of created Django model instances
        """
        logger.info(f"Generating {count} mock records for {django_model.__name__}")

        # Auto-generate Pydantic schema from Django model if not provided
        if pydantic_model is None:
            pydantic_model = self._create_schema_from_model(django_model, exclude_fields)

        created_instances = []

        # Process in batches to avoid memory issues
        for batch_start in range(0, count, batch_size):
            batch_count = min(batch_size, count - batch_start)

            try:
                # Generate batch data
                batch_data = self._generate_batch(
                    prompt=prompt,
                    pydantic_model=pydantic_model,
                    django_model=django_model,
                    count=batch_count,
                    **generation_kwargs
                )
                
                # Validate and save batch
                batch_instances = self._save_batch(
                    data=batch_data,
                    serializer_class=serializer_class,
                    django_model=django_model
                )
                
                created_instances.extend(batch_instances)
                
                logger.info(f"Created batch {batch_start//batch_size + 1}: {len(batch_instances)} records")
                
            except Exception as e:
                logger.error(f"Error processing batch {batch_start//batch_size + 1}: {e}")
                # Continue with next batch instead of failing completely
                continue
        
        logger.info(f"Successfully created {len(created_instances)} records for {django_model.__name__}")
        return created_instances

    def _create_schema_from_model(
        self,
        django_model: Type[models.Model],
        exclude_fields: Optional[List[str]] = None
    ) -> Type[BaseModel]:
        """
        Create Pydantic schema from Django model using Ninja converters.

        Args:
            django_model: Django model to convert
            exclude_fields: Fields to exclude from schema

        Returns:
            Pydantic model class
        """
        try:
            # Default fields to exclude for mock generation
            default_exclude = [
                'id', 'created_at', 'updated_at', 'deleted_at',
                'password', 'last_login', 'date_joined'
            ]

            if exclude_fields:
                default_exclude.extend(exclude_fields)

            # Create schema using Django Ninja
            schema_class = create_schema(
                django_model,
                name=f"{django_model.__name__}MockSchema",
                exclude=default_exclude,
                depth=0  # Don't include related fields by default
            )

            logger.info(f"Created Pydantic schema for {django_model.__name__}")
            return schema_class

        except Exception as e:
            logger.error(f"Error creating schema for {django_model.__name__}: {e}")
            # Fallback to basic schema
            return self._create_basic_schema(django_model, exclude_fields)

    def _create_basic_schema(
        self,
        django_model: Type[models.Model],
        exclude_fields: Optional[List[str]] = None
    ) -> Type[BaseModel]:
        """
        Create basic Pydantic schema as fallback.

        Args:
            django_model: Django model
            exclude_fields: Fields to exclude

        Returns:
            Basic Pydantic model class
        """
        from pydantic import create_model

        exclude_fields = exclude_fields or []
        exclude_fields.extend(['id', 'created_at', 'updated_at', 'deleted_at'])

        field_definitions = {}

        for field in django_model._meta.fields:
            if field.name in exclude_fields:
                continue

            # Map Django field types to Python types
            if isinstance(field, models.CharField):
                field_type = str
            elif isinstance(field, models.TextField):
                field_type = str
            elif isinstance(field, models.IntegerField):
                field_type = int
            elif isinstance(field, models.FloatField):
                field_type = float
            elif isinstance(field, models.DecimalField):
                field_type = float
            elif isinstance(field, models.BooleanField):
                field_type = bool
            elif isinstance(field, models.EmailField):
                field_type = str
            else:
                field_type = str

            # Handle nullable fields
            if field.null:
                field_definitions[field.name] = (Optional[field_type], None)
            else:
                field_definitions[field.name] = (field_type, ...)

        # Create dynamic Pydantic model
        schema_class = create_model(
            f"{django_model.__name__}MockSchema",
            **field_definitions
        )

        return schema_class
    
    def _generate_batch(
        self,
        prompt: str,
        pydantic_model: Type[BaseModel],
        django_model: Type[models.Model],
        count: int,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Generate a batch of mock data using LLM."""
        
        # Build enhanced prompt with locale and schema information
        enhanced_prompt = self._build_enhanced_prompt(
            base_prompt=prompt,
            pydantic_model=pydantic_model,
            django_model=django_model,
            count=count,
            **kwargs
        )

        # Generate data using LLM (mock implementation for now)
        generated_data = self._call_llm(enhanced_prompt, pydantic_model, django_model, count)
        
        # Validate generated data
        validated_data = self._validate_generated_data(generated_data, pydantic_model)
        
        return validated_data
    
    def _build_enhanced_prompt(
        self,
        base_prompt: str,
        pydantic_model: Type[BaseModel],
        django_model: Type[models.Model],
        count: int,
        **kwargs
    ) -> str:
        """Build enhanced prompt with locale and schema information."""
        
        # Get Pydantic model schema
        schema = pydantic_model.model_json_schema()
        schema_str = json.dumps(schema, indent=2, ensure_ascii=False)
        
        # Build locale context
        locale_context = f"""
Локаль: {self.locale}
Язык данных: {self.locale_config['language']}
Страна: {self.locale_config['country']}
Валюта: {self.locale_config['currency']}
Формат телефона: {self.locale_config['phone_format']}
Стиль имен: {self.locale_config['name_style']}
"""
        
        # Additional context from kwargs
        additional_context = ""
        if kwargs:
            additional_context = "\nДополнительный контекст:\n"
            for key, value in kwargs.items():
                additional_context += f"- {key}: {value}\n"
        
        # Add Django model context
        model_context = f"""
Django модель: {django_model.__name__}
Таблица БД: {django_model._meta.db_table}
Описание модели: {django_model.__doc__ or 'Не указано'}
"""

        enhanced_prompt = f"""
{base_prompt}

{locale_context}

{model_context}

Схема данных (Pydantic, автоматически сгенерированная из Django модели):
{schema_str}

Количество записей для генерации: {count}

{additional_context}

ВАЖНО:
1. Генерируй данные на языке локали ({self.locale_config['language']})
2. Используй реалистичные данные соответствующие культуре и стране ({self.locale_config['country']})
3. Соблюдай форматы дат, телефонов и адресов для локали
4. Возвращай данные в формате JSON массива объектов
5. Каждый объект должен соответствовать Pydantic схеме
6. Не добавляй лишних полей, не указанных в схеме
7. Генерируй разнообразные, но реалистичные данные
8. Учитывай контекст Django модели и её назначение
9. Для внешних ключей используй существующие ID или null
10. Соблюдай ограничения полей (max_length, choices, etc.)

Пример формата ответа:
[
  {{"field1": "value1", "field2": "value2"}},
  {{"field1": "value3", "field2": "value4"}}
]
"""
        
        return enhanced_prompt
    
    def _call_llm(
        self,
        prompt: str,
        pydantic_model: Type[BaseModel],
        django_model: Type[models.Model],
        count: int
    ) -> List[Dict[str, Any]]:
        """
        Call LLM to generate data.
        
        This is a mock implementation. In real scenario, you would:
        1. Use OpenAI API, Anthropic Claude, or local LLM
        2. Handle rate limiting and retries
        3. Implement proper error handling
        """
        
        # Mock implementation - replace with actual LLM call
        logger.info(f"Calling LLM to generate {count} records")
        
        # For now, return mock data based on model fields
        mock_data = self._generate_mock_fallback(pydantic_model, django_model, count)

        return mock_data
    
    def _generate_mock_fallback(
        self,
        pydantic_model: Type[BaseModel],
        django_model: Type[models.Model],
        count: int
    ) -> List[Dict[str, Any]]:
        """Fallback mock data generation when LLM is not available."""
        
        from faker import Faker
        
        # Initialize Faker with appropriate locale
        locale_map = {
            'uk_UA': 'uk_UA',
            'en_US': 'en_US',
            'ru_RU': 'ru_RU'
        }
        faker_locale = locale_map.get(self.locale, 'uk_UA')
        fake = Faker(faker_locale)
        
        mock_data = []
        schema = pydantic_model.model_json_schema()
        properties = schema.get('properties', {})
        
        for _ in range(count):
            record = {}
            
            for field_name, field_info in properties.items():
                field_type = field_info.get('type', 'string')
                
                # Generate data based on field type and name
                if field_name in ['email', 'user_email']:
                    record[field_name] = fake.email()
                elif field_name in ['name', 'first_name', 'title']:
                    record[field_name] = fake.first_name()
                elif field_name in ['surname', 'last_name']:
                    record[field_name] = fake.last_name()
                elif field_name in ['phone', 'phone_number']:
                    record[field_name] = fake.phone_number()
                elif field_name in ['address', 'street']:
                    record[field_name] = fake.address()
                elif field_name in ['city']:
                    record[field_name] = fake.city()
                elif field_name in ['description', 'text', 'content']:
                    record[field_name] = fake.text(max_nb_chars=200)
                elif field_type == 'integer':
                    record[field_name] = fake.random_int(min=1, max=1000)
                elif field_type == 'number':
                    record[field_name] = round(fake.random.uniform(1.0, 1000.0), 2)
                elif field_type == 'boolean':
                    record[field_name] = fake.boolean()
                else:
                    record[field_name] = fake.word()
            
            mock_data.append(record)
        
        return mock_data
    
    def _validate_generated_data(
        self,
        data: List[Dict[str, Any]],
        pydantic_model: Type[BaseModel]
    ) -> List[Dict[str, Any]]:
        """Validate generated data against Pydantic model."""
        
        validated_data = []
        
        for i, record in enumerate(data):
            try:
                # Validate using Pydantic model
                validated_record = pydantic_model(**record)
                validated_data.append(validated_record.model_dump())
                
            except ValidationError as e:
                logger.warning(f"Validation error for record {i}: {e}")
                # Skip invalid records or try to fix them
                continue
        
        return validated_data
    
    def _save_batch(
        self,
        data: List[Dict[str, Any]],
        serializer_class: Type[serializers.Serializer],
        django_model: Type[models.Model]
    ) -> List[Any]:
        """Save batch of data using Django serializer."""
        
        created_instances = []
        
        with transaction.atomic():
            for record_data in data:
                try:
                    # Use serializer for validation and saving
                    serializer = serializer_class(data=record_data)
                    
                    if serializer.is_valid():
                        instance = serializer.save()
                        created_instances.append(instance)
                    else:
                        logger.warning(f"Serializer validation failed: {serializer.errors}")
                        
                except Exception as e:
                    logger.error(f"Error saving record: {e}")
                    continue
        
        return created_instances


# Convenience function for quick mock generation
def generate_mock_data(
    prompt: str,
    django_model: Type[models.Model],
    serializer_class: Type[serializers.Serializer],
    count: int,
    locale: str = 'uk_UA',
    pydantic_model: Optional[Type[BaseModel]] = None,
    exclude_fields: Optional[List[str]] = None,
    **kwargs
) -> List[Any]:
    """
    Convenience function for generating mock data.

    Args:
        prompt: Description of what data to generate
        django_model: Django model to save to
        serializer_class: DRF serializer for validation
        count: Number of records to generate
        locale: Locale for generated data
        pydantic_model: Optional custom Pydantic model (auto-generated if None)
        exclude_fields: Fields to exclude from auto-generated schema
        **kwargs: Additional generation parameters

    Returns:
        List of created Django model instances
    """
    generator = LLMMockGenerator(locale=locale)
    return generator.generate_mock_data(
        prompt=prompt,
        django_model=django_model,
        serializer_class=serializer_class,
        count=count,
        pydantic_model=pydantic_model,
        exclude_fields=exclude_fields,
        **kwargs
    )
