"""
LangChain-based seed data generator with chaining and Pydantic schemas.
"""
import json
import logging
from typing import List, Type, Dict, Any, Optional
from pydantic import BaseModel, ValidationError

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.schema import BaseOutputParser
from langchain.output_parsers import PydanticOutputParser
from langchain_community.llms import OpenAI

from django.db import models, transaction
from rest_framework import serializers

logger = logging.getLogger(__name__)


class PydanticListOutputParser(BaseOutputParser):
    """Custom output parser for lists of Pydantic models."""
    
    def __init__(self, pydantic_object: Type[BaseModel]):
        self.pydantic_object = pydantic_object
    
    def parse(self, text: str) -> List[BaseModel]:
        """Parse LLM output into list of Pydantic objects."""
        try:
            # Try to parse as JSON
            data = json.loads(text.strip())
            
            # Handle both single objects and lists
            if isinstance(data, dict):
                if 'items' in data:
                    data = data['items']
                elif 'data' in data:
                    data = data['data']
                else:
                    data = [data]
            
            # Validate each item
            validated_items = []
            for item in data:
                try:
                    validated_items.append(self.pydantic_object(**item))
                except ValidationError as e:
                    logger.warning(f"Validation error for item {item}: {e}")
                    continue
            
            return validated_items
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return []
        except Exception as e:
            logger.error(f"Parsing error: {e}")
            return []
    
    def get_format_instructions(self) -> str:
        """Get format instructions for the LLM."""
        schema = self.pydantic_object.schema()
        return f"""
        Return a JSON array of objects matching this schema:
        {json.dumps(schema, indent=2)}
        
        Example format:
        [
            {json.dumps(schema.get('example', {}), indent=2)},
            ...
        ]
        """


class LangChainSeedGenerator:
    """LangChain-based seed data generator."""
    
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        """Initialize the generator."""
        self.llm = self._initialize_llm(model_name)
    
    def _initialize_llm(self, model_name: str):
        """Initialize LLM based on model name."""
        try:
            # Try to use OpenAI
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model=model_name, temperature=0.7)
        except ImportError:
            # Fallback to mock LLM for development
            from langchain_community.llms.fake import FakeListLLM
            return FakeListLLM(responses=[
                '{"items": [{"name": "Test Region", "code": "TR", "is_active": true}]}',
                '{"items": [{"name": "Test City", "population": 100000, "is_regional_center": true, "is_active": true}]}'
            ])
    
    def generate_seed_data(
        self,
        prompt_template: str,
        pydantic_schema: Type[BaseModel],
        django_model: Type[models.Model],
        serializer_class: Type[serializers.Serializer],
        count: int,
        locale: str = 'uk_UA',
        **kwargs
    ) -> List[models.Model]:
        """
        Generate seed data using LangChain chaining.
        
        Args:
            prompt_template: Template for LLM prompt
            pydantic_schema: Pydantic schema for validation
            django_model: Django model to save to
            serializer_class: DRF serializer for final validation
            count: Number of items to generate
            locale: Locale for generation
            **kwargs: Additional template variables
        
        Returns:
            List of created Django model instances
        """
        logger.info(f"Generating {count} {django_model.__name__} instances with LangChain")
        
        try:
            # Create output parser
            output_parser = PydanticListOutputParser(pydantic_schema)
            
            # Create prompt template
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["count", "locale"] + list(kwargs.keys()),
                partial_variables={"format_instructions": output_parser.get_format_instructions()}
            )
            
            # Create LangChain chain
            chain = LLMChain(
                llm=self.llm,
                prompt=prompt,
                output_parser=output_parser
            )
            
            # Generate data
            pydantic_objects = chain.run(
                count=count,
                locale=locale,
                **kwargs
            )
            
            # Convert to Django models and save
            return self._save_to_database(
                pydantic_objects=pydantic_objects,
                django_model=django_model,
                serializer_class=serializer_class
            )
            
        except Exception as e:
            logger.error(f"Error generating seed data: {e}")
            return []
    
    def generate_chained_data(
        self,
        chains: List[Dict[str, Any]],
        dependencies: Optional[Dict[str, str]] = None
    ) -> Dict[str, List[models.Model]]:
        """
        Generate data using multiple chained LLM calls.
        
        Args:
            chains: List of chain configurations
            dependencies: Dependencies between chains
        
        Returns:
            Dictionary of generated data by chain name
        """
        results = {}
        
        for chain_config in chains:
            chain_name = chain_config['name']
            logger.info(f"Executing chain: {chain_name}")
            
            # Prepare kwargs with dependency data
            chain_kwargs = chain_config.get('kwargs', {})
            if dependencies and chain_name in dependencies:
                dependency_name = dependencies[chain_name]
                if dependency_name in results:
                    chain_kwargs['dependency_data'] = results[dependency_name]
            
            # Generate data for this chain
            chain_results = self.generate_seed_data(
                prompt_template=chain_config['prompt_template'],
                pydantic_schema=chain_config['pydantic_schema'],
                django_model=chain_config['django_model'],
                serializer_class=chain_config['serializer_class'],
                count=chain_config['count'],
                locale=chain_config.get('locale', 'uk_UA'),
                **chain_kwargs
            )
            
            results[chain_name] = chain_results
            logger.info(f"Chain {chain_name} completed: {len(chain_results)} items")
        
        return results
    
    def _save_to_database(
        self,
        pydantic_objects: List[BaseModel],
        django_model: Type[models.Model],
        serializer_class: Type[serializers.Serializer]
    ) -> List[models.Model]:
        """Save Pydantic objects to database using DRF serializers."""
        created_instances = []
        
        with transaction.atomic():
            for pydantic_obj in pydantic_objects:
                try:
                    # Convert Pydantic to dict
                    data = pydantic_obj.dict()
                    
                    # Validate with DRF serializer
                    serializer = serializer_class(data=data)
                    if serializer.is_valid():
                        # Save to database
                        instance = serializer.save()
                        created_instances.append(instance)
                        logger.debug(f"Created {django_model.__name__}: {instance}")
                    else:
                        logger.warning(f"Serializer validation failed: {serializer.errors}")
                        
                except Exception as e:
                    logger.error(f"Error saving {django_model.__name__}: {e}")
                    continue
        
        logger.info(f"Successfully created {len(created_instances)} {django_model.__name__} instances")
        return created_instances


# Convenience function
def generate_seed_data(
    prompt_template: str,
    pydantic_schema: Type[BaseModel],
    django_model: Type[models.Model],
    serializer_class: Type[serializers.Serializer],
    count: int,
    locale: str = 'uk_UA',
    model_name: str = "gpt-3.5-turbo",
    **kwargs
) -> List[models.Model]:
    """
    Convenience function for generating seed data.
    
    Args:
        prompt_template: Template for LLM prompt
        pydantic_schema: Pydantic schema for validation
        django_model: Django model to save to
        serializer_class: DRF serializer for final validation
        count: Number of items to generate
        locale: Locale for generation
        model_name: LLM model name
        **kwargs: Additional template variables
    
    Returns:
        List of created Django model instances
    """
    generator = LangChainSeedGenerator(model_name=model_name)
    return generator.generate_seed_data(
        prompt_template=prompt_template,
        pydantic_schema=pydantic_schema,
        django_model=django_model,
        serializer_class=serializer_class,
        count=count,
        locale=locale,
        **kwargs
    )
