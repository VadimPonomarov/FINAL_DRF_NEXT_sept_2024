"""
Centralized AI models configuration for chatbot.
Manages providers and models for different tasks: LLM, Image, Audio, etc.
"""

import os
from typing import Dict, Any, Optional, Literal
import logging

logger = logging.getLogger(__name__)

ModelType = Literal['llm', 'image_generation', 'image_analysis', 'embedding', 'tts', 'stt']


class AIModelsConfig:
    """
    Centralized configuration for AI models.
    
    Manages different model types:
    - LLM (Language Models): text generation, classification, etc.
    - Image Generation: creating images from text
    - Image Analysis: understanding/describing images
    - Embeddings: vector representations
    - TTS/STT: speech synthesis/recognition
    """
    
    def __init__(self):
        """Initialize AI models configuration."""
        # Default providers by model type
        self.default_providers = {
            'llm': os.getenv('LLM_PROVIDER', 'g4f'),
            'image_generation': os.getenv('IMAGE_PROVIDER', 'pollinations'),
            'image_analysis': os.getenv('IMAGE_ANALYSIS_PROVIDER', 'g4f'),
            'embedding': os.getenv('EMBEDDING_PROVIDER', 'openai'),
            'tts': os.getenv('TTS_PROVIDER', 'elevenlabs'),
            'stt': os.getenv('STT_PROVIDER', 'openai'),
        }
        
        # LLM (Language Models) - Task-specific configurations
        # Используются для текстовых задач с разными параметрами
        self.llm_tasks = {
            'classification': {
                'provider': self.default_providers['llm'],
                'model': os.getenv('LLM_CLASSIFICATION_MODEL', 'gpt-4o-mini'),
                'temperature': 0.1,
                'max_tokens': 500,
                'description': 'Intent and context classification',
                'used_in': [
                    'apps/chat/classifiers/intelligent_classifier.py - IntelligentIntentClassifier.classify()',
                    'apps/chat/graph.py - classify_intent_node()',
                ]
            },
            'deep_crawl_detection': {
                'provider': self.default_providers['llm'],
                'model': os.getenv('LLM_CRAWL_DETECTION_MODEL', 'gpt-4o-mini'),
                'temperature': 0.0,
                'max_tokens': 10,
                'description': 'Detect if deep web crawling is needed',
                'used_in': [
                    'apps/chat/nodes/crawler_nodes_refactored.py - _needs_deep_crawl()',
                ]
            },
            'text_generation': {
                'provider': self.default_providers['llm'],
                'model': os.getenv('LLM_TEXT_MODEL', 'gpt-4o-mini'),
                'temperature': 0.7,
                'max_tokens': 2000,
                'description': 'General conversational text generation',
                'used_in': [
                    'apps/chat/nodes/chatai_nodes_refactored.py - chatai_text_node()',
                    'apps/chat/nodes/chatai_nodes_refactored.py - chatai_enhanced_text_node()',
                    'apps/chat/nodes/chatai_nodes.py - chatai_node()',
                ]
            },
            'search_enhancement': {
                'provider': self.default_providers['llm'],
                'model': os.getenv('LLM_SEARCH_MODEL', 'gpt-4o-mini'),
                'temperature': 0.5,
                'max_tokens': 1500,
                'description': 'Enhance search queries and results',
                'used_in': [
                    'apps/chat/nodes/duckduckgo_nodes.py - duckduckgo_enhanced_search_node()',
                ]
            },
            'translation': {
                'provider': self.default_providers['llm'],
                'model': os.getenv('LLM_TRANSLATION_MODEL', 'gpt-4o-mini'),
                'temperature': 0.3,
                'max_tokens': 500,
                'description': 'Language translation',
                'used_in': [
                    'apps/chat/services/translation_service.py - TranslationService.translate_to_english()',
                    'apps/chat/services/translation_service.py - TranslationService.enhance_prompt()',
                ]
            },
            'code_generation': {
                'provider': self.default_providers['llm'],
                'model': os.getenv('LLM_CODE_MODEL', 'gpt-4o'),
                'temperature': 0.2,
                'max_tokens': 3000,
                'description': 'Code generation and completion',
                'used_in': [
                    'apps/chat/nodes/code_nodes.py - code_execution_node() (если существует)',
                ]
            },
        }
        
        # Image Generation Models
        # Используются для создания изображений из текстовых описаний
        self.image_generation_models = {
            'default': {
                'provider': self.default_providers['image_generation'],
                'model': os.getenv('IMAGE_GEN_MODEL', 'flux-schnell'),
                'size': '1024x1024',
                'quality': 'standard',
                'description': 'Default image generation',
                'used_in': [
                    'apps/chat/nodes/chatai_nodes_refactored.py - chatai_image_node()',
                    'apps/chat/services/image_service.py - ImageGenerationService.generate_image()',
                    'apps/chat/views/image_generation_views.py - generate_image()',
                ]
            },
            'high_quality': {
                'provider': 'pollinations',
                'model': 'flux-pro',
                'size': '1024x1024',
                'quality': 'hd',
                'description': 'High quality image generation',
                'used_in': [
                    'Для премиум запросов генерации изображений высокого качества',
                ]
            },
            'fast': {
                'provider': 'pollinations',
                'model': 'flux-schnell',
                'size': '512x512',
                'quality': 'standard',
                'description': 'Fast image generation',
                'used_in': [
                    'Для быстрых превью и тестовых изображений',
                ]
            },
        }
        
        # Image Analysis Models (Vision)
        # Используются для анализа и описания изображений
        self.image_analysis_models = {
            'default': {
                'provider': self.default_providers['image_analysis'],
                'model': os.getenv('IMAGE_ANALYSIS_MODEL', 'gpt-4-vision-preview'),
                'max_tokens': 1000,
                'description': 'Image understanding and description',
                'used_in': [
                    'apps/chat/nodes/file_nodes.py - analyze_image() (если существует)',
                    'Для анализа загруженных пользователем изображений',
                ]
            },
        }
        
        # Embedding Models
        # Используются для векторного представления текста (поиск, семантическое сравнение)
        self.embedding_models = {
            'default': {
                'provider': self.default_providers['embedding'],
                'model': os.getenv('EMBEDDING_MODEL', 'text-embedding-ada-002'),
                'dimensions': 1536,
                'description': 'Text embeddings for search and similarity',
                'used_in': [
                    'Для семантического поиска по истории чата',
                    'Для поиска похожих документов и контекста',
                    'Для RAG (Retrieval-Augmented Generation) если реализовано',
                ]
            },
        }
        
        # Provider-specific configurations
        self.provider_configs = {
            'g4f': {
                'llm_models': [
                    'gpt-4o-mini',
                    'gpt-4o',
                    'gpt-4',
                    'gpt-3.5-turbo',
                    'claude-3-sonnet',
                    'claude-3-haiku',
                    'gemini-pro',
                ],
                'image_analysis_models': [
                    'gpt-4-vision-preview',
                ],
                'default_params': {
                    'stream': False,
                },
            },
            'openai': {
                'api_key': os.getenv('OPENAI_API_KEY'),
                'llm_models': [
                    'gpt-4-turbo-preview',
                    'gpt-4',
                    'gpt-3.5-turbo',
                ],
                'image_analysis_models': [
                    'gpt-4-vision-preview',
                ],
                'embedding_models': [
                    'text-embedding-ada-002',
                    'text-embedding-3-small',
                    'text-embedding-3-large',
                ],
                'default_params': {},
            },
            'pollinations': {
                'image_generation_models': [
                    'flux-schnell',
                    'flux-pro',
                    'flux-realism',
                    'flux-anime',
                    'flux-3d',
                ],
                'base_url': 'https://image.pollinations.ai/prompt/',
            },
        }
        
        logger.info(f"AI Models Config initialized: LLM provider={self.default_providers['llm']}, Image provider={self.default_providers['image_generation']}")
    
    def get_llm_config(self, task: str) -> Dict[str, Any]:
        """
        Get LLM configuration for specific task.
        
        Args:
            task: Task name (e.g., 'classification', 'text_generation')
            
        Returns:
            Dict with provider, model, and parameters
        """
        config = self.llm_tasks.get(task, {
            'provider': self.default_providers['llm'],
            'model': 'gpt-4o-mini',
            'temperature': 0.7,
            'max_tokens': 1000,
            'description': 'Default LLM task'
        })
        
        logger.debug(f"LLM config for task '{task}': {config}")
        return config
    
    def get_image_generation_config(self, quality: str = 'default') -> Dict[str, Any]:
        """
        Get image generation model configuration.
        
        Args:
            quality: Quality level ('default', 'high_quality', 'fast')
            
        Returns:
            Dict with provider, model, and parameters
        """
        config = self.image_generation_models.get(quality, self.image_generation_models['default'])
        logger.debug(f"Image generation config for quality '{quality}': {config}")
        return config
    
    def get_image_analysis_config(self) -> Dict[str, Any]:
        """Get image analysis model configuration."""
        return self.image_analysis_models['default']
    
    def get_embedding_config(self) -> Dict[str, Any]:
        """Get embedding model configuration."""
        return self.embedding_models['default']
    
    def get_provider_config(self, provider: Optional[str] = None, model_type: str = 'llm') -> Dict[str, Any]:
        """
        Get provider-specific configuration.
        
        Args:
            provider: Provider name (defaults to default provider for model_type)
            model_type: Type of model ('llm', 'image_generation', etc.)
            
        Returns:
            Provider configuration dict
        """
        provider = provider or self.default_providers.get(model_type, 'g4f')
        return self.provider_configs.get(provider, {})
    
    def create_llm_client(self, task: str = 'text_generation'):
        """
        Create LLM client for specific task.
        
        Args:
            task: Task name
            
        Returns:
            Configured LLM client
        """
        config = self.get_llm_config(task)
        provider = config['provider']
        
        if provider == 'g4f':
            import g4f
            from g4f.client import Client
            return Client()
        elif provider == 'openai':
            import openai
            api_key = self.provider_configs['openai'].get('api_key')
            if not api_key:
                logger.warning("OpenAI API key not found, falling back to G4F")
                import g4f
                from g4f.client import Client
                return Client()
            return openai.OpenAI(api_key=api_key)
        else:
            logger.warning(f"Unknown provider '{provider}', falling back to G4F")
            import g4f
            from g4f.client import Client
            return Client()
    
    def call_llm(
        self, 
        messages: list, 
        task: str = 'text_generation',
        **override_params
    ) -> str:
        """
        Call LLM with automatic provider/model selection.
        
        Args:
            messages: List of message dicts
            task: Task name for model selection
            **override_params: Override default parameters
            
        Returns:
            LLM response text
        """
        config = self.get_llm_config(task)
        provider = config['provider']
        model = config['model']
        
        # Merge parameters
        params = {
            'temperature': config.get('temperature', 0.7),
            'max_tokens': config.get('max_tokens', 1000),
        }
        params.update(override_params)
        
        try:
            if provider == 'g4f':
                import g4f
                response = g4f.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    stream=False,
                    **params
                )
                return str(response)
            elif provider == 'openai':
                client = self.create_llm_client(task)
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    **params
                )
                return response.choices[0].message.content
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"LLM call failed for task '{task}': {e}")
            raise
    
    def get_available_llm_models(self, provider: Optional[str] = None) -> list:
        """
        Get list of available LLM models for provider.
        
        Args:
            provider: Provider name (defaults to default LLM provider)
            
        Returns:
            List of available LLM model names
        """
        provider = provider or self.default_providers['llm']
        provider_config = self.get_provider_config(provider, 'llm')
        return provider_config.get('llm_models', [])
    
    def get_available_image_models(self, provider: Optional[str] = None) -> list:
        """Get available image generation models for provider."""
        provider = provider or self.default_providers['image_generation']
        provider_config = self.get_provider_config(provider, 'image_generation')
        return provider_config.get('image_generation_models', [])
    
    def update_llm_task_model(self, task: str, model: str, **params):
        """
        Update LLM model configuration for specific task.
        
        Args:
            task: Task name
            model: Model name
            **params: Additional parameters (temperature, max_tokens, etc.)
        """
        if task not in self.llm_tasks:
            self.llm_tasks[task] = {}
        
        self.llm_tasks[task]['model'] = model
        self.llm_tasks[task].update(params)
        
        logger.info(f"Updated LLM model for task '{task}': {model} with params {params}")


# Global instance
ai_models_config = AIModelsConfig()

# Backward compatibility
llm_config = ai_models_config


# Convenience functions for LLM
def get_llm_for_task(task: str):
    """Get LLM client configured for specific task."""
    return ai_models_config.create_llm_client(task)


def call_llm(messages: list, task: str = 'text_generation', **params) -> str:
    """Call LLM with task-specific configuration."""
    return ai_models_config.call_llm(messages, task, **params)


def get_model_for_task(task: str) -> str:
    """Get model name for specific LLM task."""
    config = ai_models_config.get_llm_config(task)
    return config['model']


# Convenience functions for Image Generation
def get_image_generation_model(quality: str = 'default') -> Dict[str, Any]:
    """Get image generation model configuration."""
    return ai_models_config.get_image_generation_config(quality)

