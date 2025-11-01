"""
ChatAI integration nodes for text and image generation.
"""

import logging
from typing import List, Dict, Any, Optional
from apps.chat.types.types import AgentState, ChatMessage, Intent
import g4f
from g4f.client import Client

logger = logging.getLogger(__name__)


def _translate_to_english(text: str) -> str:
    """
    Translate text to English using ChatAI for better image generation.

    Args:
        text: Text to translate

    Returns:
        English translation
    """
    try:
        # If text is already in English, return as is
        if _is_english(text):
            return text

        # Create translation prompt
        translation_prompt = f"""Translate the following text to English for image generation.
        Keep it concise and descriptive for AI image generation:

        Text: {text}

        English translation:"""

        response = g4f.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": translation_prompt}],
            stream=False
        )

        # Clean up the response
        english_text = str(response).strip()
        # Remove common prefixes
        prefixes_to_remove = ["English translation:", "Translation:", "English:"]
        for prefix in prefixes_to_remove:
            if english_text.startswith(prefix):
                english_text = english_text[len(prefix):].strip()

        logger.info(f"Translated '{text}' -> '{english_text}'")
        return english_text

    except Exception as e:
        logger.warning(f"Translation failed: {e}, using original text")
        return text


def _translate_response_to_user_language(english_response: str, target_language: str, original_prompt: str) -> str:
    """
    Translate response back to user's language.

    Args:
        english_response: Response in English
        target_language: Target language code ('ru', 'en', etc.)
        original_prompt: Original user prompt for context

    Returns:
        Translated response
    """
    try:
        if target_language == 'en':
            return english_response

        # Create translation prompt based on target language
        if target_language == 'ru':
            translation_prompt = f"""Translate the following English response to Russian.
            Keep the same meaning and structure. The response is about image generation based on user's request: "{original_prompt}"

            English response: {english_response}

            Russian translation:"""
        else:
            # Default fallback for other languages
            translation_prompt = f"""Translate the following English response to the target language.
            Keep the same meaning and structure.

            English response: {english_response}

            Translation:"""

        response = g4f.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": translation_prompt}],
            stream=False
        )

        # Clean up the response
        translated_text = str(response).strip()
        # Remove common prefixes
        prefixes_to_remove = ["Russian translation:", "Translation:", "Перевод:", "Русский перевод:"]
        for prefix in prefixes_to_remove:
            if translated_text.startswith(prefix):
                translated_text = translated_text[len(prefix):].strip()

        logger.info(f"Translated response to {target_language}: '{english_response}' -> '{translated_text}'")
        return translated_text

    except Exception as e:
        logger.warning(f"Response translation failed: {e}, using original response")
        return english_response


def _is_english(text: str) -> bool:
    """Check if text is primarily in English."""
    # Simple heuristic: if text contains mostly ASCII characters and common English words
    english_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'portrait', 'image', 'picture', 'draw', 'create', 'generate', 'realistic'}
    words = text.lower().split()
    english_word_count = sum(1 for word in words if word in english_words)

    # If more than 30% are common English words, consider it English
    if len(words) > 0 and english_word_count / len(words) > 0.3:
        return True

    # Check for Cyrillic characters (Russian)
    cyrillic_count = sum(1 for char in text if '\u0400' <= char <= '\u04FF')
    return cyrillic_count == 0


def _detect_language(text: str) -> str:
    """Detect the language of the input text."""
    # Check for Cyrillic characters (Russian)
    cyrillic_count = sum(1 for char in text if '\u0400' <= char <= '\u04FF')
    if cyrillic_count > 0:
        return 'ru'

    # Default to English
    return 'en'


def _generate_image_response(original_prompt: str, english_prompt: str, image_url: str, user_language: str) -> str:
    """Generate image response message in the user's language."""
    try:
        # Create response based on detected language
        if user_language == 'ru':
            if original_prompt != english_prompt:
                response = f"Я создал изображение по вашему запросу: {original_prompt}\n\nАнглийский промпт: {english_prompt}\n\nСсылка на изображение: {image_url}"
            else:
                response = f"Я создал изображение по вашему запросу: {original_prompt}\n\nСсылка на изображение: {image_url}"
        else:
            # Default to English
            if original_prompt != english_prompt:
                response = f"I've generated an image based on your request: {original_prompt}\n\nEnglish prompt used: {english_prompt}\n\nImage URL: {image_url}"
            else:
                response = f"I've generated an image based on your request: {original_prompt}\n\nImage URL: {image_url}"

        logger.info(f"Generated response in {user_language}: {response[:100]}...")
        return response

    except Exception as e:
        logger.error(f"Error generating image response: {e}")
        # Fallback to English
        if original_prompt != english_prompt:
            return f"I've generated an image based on your request: {original_prompt}\n\nEnglish prompt used: {english_prompt}\n\nImage URL: {image_url}"
        else:
            return f"I've generated an image based on your request: {original_prompt}\n\nImage URL: {image_url}"


def _create_search_enhanced_prompt(original_query: str, search_context: str, user_language: str) -> str:
    """Create search-enhanced prompt in the user's language using translation."""
    # Create base English prompt
    english_prompt = f"""
Based on the following search results, please provide a comprehensive answer to the user's question: "{original_query}"

Search Context:
{search_context}

Please synthesize this information and provide a helpful, accurate response. Include relevant details and cite sources when appropriate.
IMPORTANT: Always respond in the same language as the user's original question.
"""

    # For now, we'll use the English prompt but add language instruction
    # The ChatAI model will handle the language matching based on the system prompt
    return english_prompt


class ChatAIService:
    """Service for ChatAI interactions."""
    
    def __init__(self):
        self.client = Client()
        self.text_model = "gpt-4"
        self.image_model = "flux-schnell"
    
    def generate_text(self, messages: List[Dict[str, str]], model: Optional[str] = None) -> str:
        """Generate text response using ChatAI."""
        try:
            response = g4f.ChatCompletion.create(
                model=model or self.text_model,
                messages=messages,
                stream=False
            )
            return str(response)
        except Exception as e:
            logger.error(f"ChatAI text generation error: {e}")
            raise
    
    def generate_image(self, prompt: str, model: Optional[str] = None) -> str:
        """Generate image using ChatAI flux-schnell."""
        try:
            # Use the client for image generation
            response = self.client.images.generate(
                model=model or self.image_model,
                prompt=prompt,
                response_format="url"
            )
            
            if hasattr(response, 'data') and response.data:
                return response.data[0].url
            else:
                # Fallback for different response formats
                return str(response)
                
        except Exception as e:
            logger.error(f"ChatAI image generation error: {e}")
            raise


# Global service instance
chatai_service = ChatAIService()


def chatai_text_node(state: AgentState) -> AgentState:
    """
    Generate text response using ChatAI.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with ChatAI response
    """
    try:
        # Prepare messages for ChatAI
        messages = []
        
        # Add system context with language matching
        system_prompt = state.context.get("system_prompt",
            "You are a helpful AI assistant. Always respond in the same language as the user's question. "
            "If the user writes in Russian, respond in Russian. If in English, respond in English."
        )
        messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Add chat history (last 10 messages for context)
        recent_messages = state.get_recent_messages(10)
        for msg in recent_messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current query
        messages.append({
            "role": "user",
            "content": state.query
        })
        
        # Add timestamp context
        if state.now:
            timestamp_context = f"Current time: {state.get_timestamp()}"
            if messages and messages[0]["role"] == "system":
                messages[0]["content"] += f"\n{timestamp_context}"
            else:
                messages.insert(0, {
                    "role": "system",
                    "content": timestamp_context
                })
        
        # Generate response
        response = chatai_service.generate_text(messages)
        
        # Add response to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "chatai_model": chatai_service.text_model,
                "message_count": len(messages)
            }
        })
        
    except Exception as e:
        error_msg = f"ChatAI text generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def chatai_image_node(state: AgentState) -> AgentState:
    """
    Generate image using ChatAI flux-schnell.

    Args:
        state: Current agent state

    Returns:
        Updated state with generated image
    """
    try:
        # Extract image prompt from query or use query directly
        original_prompt = state.query

        # Detect user's language
        user_language = _detect_language(original_prompt)

        # Translate prompt to English for better image generation
        english_prompt = _translate_to_english(original_prompt)

        # Enhance prompt if needed
        if state.context.get("image_style"):
            english_prompt = f"{english_prompt}, {state.context['image_style']}"

        logger.info(f"Image generation: '{original_prompt}' -> '{english_prompt}' (user_lang: {user_language})")

        # Generate image
        image_url = chatai_service.generate_image(english_prompt)

        # Store image URL
        state.images.append(image_url)

        # Create response message in user's language
        response = _generate_image_response(original_prompt, english_prompt, image_url, user_language)

        # Add to chat history
        state.add_chat_message("assistant", response, {"image_url": image_url})
        
        return state.model_copy(update={
            "result": response,
            "images": state.images,
            "metadata": {
                **state.metadata,
                "chatai_image_model": chatai_service.image_model,
                "original_prompt": original_prompt,
                "english_prompt": english_prompt,
                "user_language": user_language,
                "translation_used": original_prompt != english_prompt
            }
        })
        
    except Exception as e:
        error_msg = f"ChatAI image generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def _needs_search(query: str, data_mode: Optional[Any] = None) -> bool:
    """
    Determine if a query needs internet search for current information.
    
    Args:
        query: User query
        data_mode: Data mode from state
        
    Returns:
        True if search is needed
    """
    query_lower = query.lower()
    
    # Check data mode first
    if data_mode and hasattr(data_mode, 'value') and data_mode.value == "realtime":
        return True
    
    # Keywords indicating need for current information
    current_info_keywords = [
        "current", "latest", "recent", "now", "today", "currently", "who is",
        "who is the", "who is currently", "acting", "president", "leader",
        "election", "news", "latest news", "current events",
        "сейчас", "текущий", "текущий президент", "кто сейчас", "кто является",
        "действующий", "президент", "лидер", "выборы", "новости", "последние новости"
    ]
    
    # Political/leadership patterns
    political_patterns = [
        "president of", "who is the president", "current president",
        "leader of", "current leader", "who leads", "prime minister",
        "кто президент", "кто является президентом", "кто лидер"
    ]
    
    # Check if query matches patterns
    has_current_keywords = any(keyword in query_lower for keyword in current_info_keywords)
    has_political_pattern = any(pattern in query_lower for pattern in political_patterns)
    
    # Questions about "who" with temporal context
    is_who_question = (
        ("who" in query_lower or "кто" in query_lower) and
        any(word in query_lower for word in ["now", "current", "currently", "today", "сейчас", "текущий"])
    )
    
    return has_current_keywords or has_political_pattern or is_who_question


def chatai_enhanced_text_node(state: AgentState) -> AgentState:
    """
    Enhanced text generation with context awareness and automatic search when needed.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with enhanced response
    """
    try:
        # Check if search context already exists (we're already processing with search)
        has_search_context = state.context.get("enhanced_with_search", False)
        search_already_performed = state.metadata.get("enhanced_with_tavily", False)
        
        # Check if this query needs search for current information
        needs_search = _needs_search(state.query, state.data_mode)
        
        # If search is needed and not already performed, redirect to search-enhanced processing
        if needs_search and state.intent != Intent.FACTUAL_SEARCH and not has_search_context and not search_already_performed:
            logger.info(f"Query '{state.query}' needs search - redirecting to tavily_enhanced_search_node")
            # Import here to avoid circular dependency
            from .tavily_nodes import tavily_enhanced_search_node
            return tavily_enhanced_search_node(state)
        
        # Build enhanced system prompt
        system_parts = []
        
        # Base system prompt with language matching
        system_parts.append(
            "You are a helpful AI assistant. Provide accurate, helpful, and engaging responses. "
            "Use the conversation history and any additional context provided. "
            "IMPORTANT: Always respond in the same language as the user's question. "
            "If the user writes in Russian, respond in Russian. If in English, respond in English. "
            "Match the language of the user's input exactly."
        )
        
        # Add timestamp
        if state.now:
            system_parts.append(f"Current time: {state.get_timestamp()}")
        
        # Add data mode context
        if state.data_mode:
            if state.data_mode.value == "realtime":
                system_parts.append(
                    "Focus on providing current, up-to-date information. "
                    "If you don't have recent data, acknowledge this limitation and suggest searching for current information."
                )
            else:
                system_parts.append(
                    "Use your training data to provide comprehensive responses. "
                    "You can draw from your knowledge base."
                )
        
        # Add any custom context
        if state.context.get("additional_context"):
            system_parts.append(f"Additional context: {state.context['additional_context']}")
        
        system_prompt = "\n\n".join(system_parts)
        
        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add recent chat history
        recent_messages = state.get_recent_messages(8)
        for msg in recent_messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current query
        messages.append({
            "role": "user",
            "content": state.query
        })
        
        # Generate response
        response = chatai_service.generate_text(messages)
        
        # Add to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "metadata": {
                **state.metadata,
                "enhanced_generation": True,
                "system_prompt_length": len(system_prompt),
                "context_messages": len(recent_messages),
                "search_check_performed": True,
                "search_needed": needs_search
            }
        })
        
    except Exception as e:
        error_msg = f"Enhanced ChatAI generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
