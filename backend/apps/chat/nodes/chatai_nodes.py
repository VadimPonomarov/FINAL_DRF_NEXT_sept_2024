"""
ChatAI integration nodes for text and image generation.
"""

import logging
from typing import List, Dict, Any, Optional
from apps.chat.types.types import AgentState, ChatMessage
import g4f
from g4f.client import Client

logger = logging.getLogger(__name__)


def _translate_to_english(text: str) -> str:
    """
    Translate text to English using simple dictionary for better image generation.
    Избегаем использования g4f.ChatCompletion т.к. требует логин.

    Args:
        text: Text to translate

    Returns:
        English translation
    """
    try:
        # If text is already in English, return as is
        if _is_english(text):
            return text

        # Расширенный словарь для базовых переводов (без API)
        ru_to_en_dict = {
            # Команды
            'создай': 'create', 'сгенерируй': 'generate', 'нарисуй': 'draw', 'изобрази': 'depict',
            
            # Объекты и существа
            'портрет': 'portrait', 'изображение': 'image', 'картинку': 'picture',
            'человека': 'person', 'мужчины': 'man', 'женщины': 'woman',
            'кота': 'cat', 'собаки': 'dog', 'собаку': 'dog', 'кошку': 'cat',
            'пейзаж': 'landscape', 'природу': 'nature', 'город': 'city',
            
            # Транспорт
            'мотоцикл': 'motorcycle', 'мотоцикла': 'motorcycle',
            'спортивный мотоцикл': 'sport motorcycle', 'гоночный мотоцикл': 'racing motorcycle',
            'автомобиль': 'car', 'машину': 'car', 'самолет': 'airplane',
            
            # Цвета
            'красный': 'red', 'синий': 'blue', 'зеленый': 'green', 'желтый': 'yellow',
            'черный': 'black', 'белый': 'white', 'серый': 'gray', 'оранжевый': 'orange',
            'фиолетовый': 'purple', 'розовый': 'pink', 'коричневый': 'brown',
            'голубой': 'light blue', 'темно-синий': 'dark blue',
            
            # Стили
            'в стиле': 'in style of', 'реалистичный': 'realistic', 'реализм': 'photorealistic',
            'карикатура': 'caricature', 'карикатурный': 'caricature style',
            'абстрактный': 'abstract', 'минимализм': 'minimalism', 'минималистичный': 'minimalist',
            'современный': 'modern', 'классический': 'classic', 'винтажный': 'vintage',
            'аниме': 'anime', 'комикс': 'comic', 'мультяшный': 'cartoon',
            
            # Характеристики
            'спортивный': 'sport', 'спортивная': 'sport', 'спортивное': 'sport',
            'красивый': 'beautiful', 'красивая': 'beautiful', 'большой': 'big',
            'маленький': 'small', 'быстрый': 'fast', 'мощный': 'powerful',
            
            # Известные личности
            'дональда трампа': 'Donald Trump', 'трампа': 'Trump',
        }
        
        # Переводим по словам
        words = text.lower().split()
        translated_words = []
        
        i = 0
        while i < len(words):
            # Пытаемся найти фразу из 2-3 слов
            found = False
            for phrase_len in [3, 2, 1]:
                if i + phrase_len <= len(words):
                    phrase = ' '.join(words[i:i+phrase_len])
                    if phrase in ru_to_en_dict:
                        translated_words.append(ru_to_en_dict[phrase])
                        i += phrase_len
                        found = True
                        break
            if not found:
                # Слово не найдено в словаре - оставляем как есть
                translated_words.append(words[i])
                i += 1
        
        english_text = ' '.join(translated_words).strip()
        
        # Если перевод почти не изменился или пустой, возвращаем оригинал
        if not english_text or len(english_text) < 3:
            logger.warning(f"⚠️ Translation too short, using original: '{text}'")
            return text
        
        logger.info(f"✅ Translated (dict): '{text}' -> '{english_text}'")
        return english_text

    except Exception as e:
        logger.warning(f"⚠️ Translation failed: {e}, using original text")
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


def _enhance_image_prompt(english_prompt: str) -> str:
    """
    Enhance the English prompt with system prompt for better image quality.
    Adds quality modifiers and clear instructions for the image generation model.
    
    Args:
        english_prompt: Basic English prompt
        
    Returns:
        Enhanced prompt with quality modifiers
    """
    try:
        # Системный промпт для улучшения качества
        # Добавляем модификаторы качества только если их еще нет
        quality_keywords = ['high quality', 'detailed', '4k', '8k', 'professional', 'masterpiece']
        has_quality = any(keyword in english_prompt.lower() for keyword in quality_keywords)
        
        # Базовое улучшение промпта
        enhanced = english_prompt.strip()
        
        # Добавляем модификаторы качества в конец
        if not has_quality:
            enhanced += ", high quality, detailed, professional photograph"
        
        logger.info(f"🎨 Enhanced prompt: '{english_prompt}' -> '{enhanced}'")
        return enhanced
        
    except Exception as e:
        logger.error(f"Error enhancing prompt: {e}")
        return english_prompt


def _generate_image_response(original_prompt: str, english_prompt: str, image_url: str, user_language: str) -> str:
    """Generate image response message in the user's language - NO TEXT, only image."""
    try:
        # Только изображение без текста - картинка говорит сама за себя
        response = " "  # Пустое место для изображения
        
        logger.info(f"Generated image response without text prompt")
        return response

    except Exception as e:
        logger.error(f"Error generating image response: {e}")
        # Fallback - минимальный текст
        return " "


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
        """Generate image using pollinations.ai with flux model - always free, no auth required."""
        try:
            import urllib.parse
            import time
            
            logger.info(f"🎨 Generating image with pollinations.ai flux model: {prompt[:50]}...")
            
            # Создаем уникальный seed для каждого изображения
            seed = abs(hash(f"{prompt}_{int(time.time())}")) % 1000000
            
            # Кодируем промпт для URL
            encoded_prompt = urllib.parse.quote(prompt)
            
            # Генерируем URL изображения через pollinations.ai с flux моделью
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&model=flux&enhance=true&seed={seed}&nologo=true"
            
            logger.info(f"✅ Image URL generated: {image_url[:100]}...")
            return image_url
                
        except Exception as e:
            logger.error(f"❌ Image generation error: {e}")
            # Даже при ошибке возвращаем URL (pollinations.ai очень надежный)
            import urllib.parse
            encoded_prompt = urllib.parse.quote(prompt)
            return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&model=flux&nologo=true"


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

        # Enhance prompt with quality modifiers
        english_prompt = _enhance_image_prompt(english_prompt)

        # Add custom style if specified
        if state.context.get("image_style"):
            english_prompt = f"{english_prompt}, {state.context['image_style']}"

        logger.info(f"🎨 Image generation: '{original_prompt}' -> '{english_prompt}' (user_lang: {user_language})")

        # Generate image
        image_url = chatai_service.generate_image(english_prompt)
        
        # КРИТИЧЕСКАЯ ПРОВЕРКА
        if not image_url or image_url.strip() == "":
            logger.error(f"❌ Image URL is EMPTY! Prompt was: '{english_prompt}'")
            image_url = chatai_service.generate_image(original_prompt)  # Попытка с оригинальным промптом
            logger.warning(f"⚠️ Retry with original prompt, URL: {image_url[:100] if image_url else 'STILL EMPTY'}")
        
        logger.info(f"✅ Generated image URL: {image_url[:150] if image_url else 'EMPTY!!!'}")

        # Store image URL
        state.images.append(image_url)

        # Create response message in user's language
        response = _generate_image_response(original_prompt, english_prompt, image_url, user_language)

        # Add to chat history
        state.add_chat_message("assistant", response, {"image_url": image_url})
        
        return state.model_copy(update={
            "result": response,
            "image_url": image_url,  # Add image_url directly to state
            "images": state.images,
            "metadata": {
                **state.metadata,
                "chatai_image_model": chatai_service.image_model,
                "original_prompt": original_prompt,
                "english_prompt": english_prompt,
                "user_language": user_language,
                "translation_used": original_prompt != english_prompt,
                "image_url": image_url  # Also add to metadata for backwards compatibility
            }
        })
        
    except Exception as e:
        error_msg = f"ChatAI image generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})


def chatai_enhanced_text_node(state: AgentState) -> AgentState:
    """
    Enhanced text generation with context awareness.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with enhanced response
    """
    try:
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
                    "If you don't have recent data, acknowledge this limitation."
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
                "context_messages": len(recent_messages)
            }
        })
        
    except Exception as e:
        error_msg = f"Enhanced ChatAI generation error: {str(e)}"
        logger.error(error_msg)
        return state.model_copy(update={"error": error_msg})
