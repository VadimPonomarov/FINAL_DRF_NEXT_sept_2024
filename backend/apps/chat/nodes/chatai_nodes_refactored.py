"""
ChatAI integration nodes for text and image generation (REFACTORED).
Упрощенная версия с использованием service слоя.
"""

import logging
from typing import List, Dict, Any
from apps.chat.types.types import AgentState, ChatMessage
from apps.chat.services.translation_service import translation_service
from apps.chat.services.image_service import image_generation_service
from apps.chat.utils.text_processing import detect_language
from apps.chat.config.llm_config import call_llm, get_llm_for_task, get_model_for_task

logger = logging.getLogger(__name__)


class ChatAIService:
    """Service for ChatAI text and image generation."""
    
    def __init__(self):
        self.image_model = "flux-schnell"
    
    def generate_text(self, messages: List[Dict[str, str]], task: str = 'text_generation') -> str:
        """
        Generate text response using centralized LLM config.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            task: Task name for model selection
            
        Returns:
            Generated text response
        """
        try:
            response = call_llm(messages=messages, task=task)
            logger.debug(f"Generated text for task '{task}' with model {get_model_for_task(task)}")
            return response
        except Exception as e:
            logger.error(f"ChatAI text generation error: {e}")
            raise


# Global service instance
chatai_service = ChatAIService()


def chatai_text_node(state: AgentState) -> AgentState:
    """
    Generate text response using ChatAI.
    Simplified version delegating to service layer.
    """
    try:
        # Prepare messages
        messages = [{
            "role": "system",
            "content": state.context.get("system_prompt",
                "You are a helpful AI assistant. Always respond in the same language as the user's question.")
        }]
        
        # Add chat history
        for msg in state.get_recent_messages(10):
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current query
        messages.append({"role": "user", "content": state.query})
        
        # Generate response
        response = chatai_service.generate_text(messages)
        
        # Add to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "chatai_model": chatai_service.text_model
            }
        })
        
    except Exception as e:
        error_msg = f"ChatAI text generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def chatai_image_node(state: AgentState) -> AgentState:
    """
    Generate image using pollinations.ai flux model.
    Simplified version delegating to service layer.
    """
    try:
        original_prompt = state.query
        logger.info(f"🎨 chatai_image_node called with prompt: {original_prompt}")
        user_language = detect_language(original_prompt)
        
        # Translate to English for better results
        english_prompt = translation_service.translate_to_english(original_prompt)
        
        # Enhance prompt if needed
        if state.context.get("image_style"):
            english_prompt = translation_service.enhance_prompt(
                english_prompt, 
                state.context["image_style"]
            )
        
        logger.info(f"Image generation: '{original_prompt}' -> '{english_prompt}'")
        
        # Generate image
        image_url = image_generation_service.generate_image(english_prompt)
        
        # Critical check
        if not image_url or image_url.strip() == "":
            logger.error(f"❌ Image URL is EMPTY! Retrying with original prompt...")
            image_url = image_generation_service.generate_image(original_prompt)
        
        logger.info(f"✅ Generated image URL: {image_url[:150] if image_url else 'EMPTY!!!'}")
        
        # Store image URL
        state.images.append(image_url)
        
        # Create minimal response text
        response = image_generation_service.generate_response_text(original_prompt, user_language)
        
        # Add to chat history
        state.add_chat_message("assistant", response, {"image_url": image_url})
        
        return state.model_copy(update={
            "result": response,
            "image_url": image_url,
            "images": state.images,
            "metadata": {
                **state.metadata,
                "chatai_image_model": image_generation_service.model,
                "original_prompt": original_prompt,
                "english_prompt": english_prompt,
                "user_language": user_language,
            }
        })
        
    except Exception as e:
        error_msg = f"ChatAI image generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def chatai_enhanced_text_node(state: AgentState) -> AgentState:
    """
    Enhanced text generation with context awareness.
    Simplified version.
    """
    try:
        # Build system prompt with context
        system_parts = [
            "You are a helpful AI assistant with access to user's previous conversation context.",
            "Always respond in the same language as the user's question."
        ]
        
        if state.context.get("additional_context"):
            system_parts.append(f"Additional context: {state.context['additional_context']}")
        
        system_prompt = "\n\n".join(system_parts)
        
        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add recent chat history
        for msg in state.get_recent_messages(8):
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current query
        messages.append({"role": "user", "content": state.query})
        
        # Generate response
        response = chatai_service.generate_text(messages)
        
        # Add to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "enhanced_generation": True,
                "context_messages": len(state.get_recent_messages(8))
            }
        })
        
    except Exception as e:
        error_msg = f"Enhanced ChatAI generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})

