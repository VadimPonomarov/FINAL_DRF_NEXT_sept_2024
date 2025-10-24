"""Translation service for image prompts."""

import logging
from typing import Optional
from ..config.dictionaries import TRANSLATION_DICT
from ..utils.text_processing import is_english

logger = logging.getLogger(__name__)


class TranslationService:
    """Service for translating prompts to English for better image generation."""
    
    def __init__(self):
        self.translation_dict = TRANSLATION_DICT
    
    def translate_to_english(self, text: str) -> str:
        """
        Translate text to English using dictionary-based translation.
        Avoids using g4f.ChatCompletion which requires login.
        
        Args:
            text: Text to translate
            
        Returns:
            English translation or original text if already in English
        """
        try:
            # If text is already in English, return as is
            if is_english(text):
                return text

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
                        if phrase in self.translation_dict:
                            translated_words.append(self.translation_dict[phrase])
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
    
    def enhance_prompt(self, prompt: str, style: Optional[str] = None) -> str:
        """
        Enhance image generation prompt with additional style information.
        
        Args:
            prompt: Base prompt
            style: Optional style to add
            
        Returns:
            Enhanced prompt
        """
        enhanced = prompt
        if style:
            enhanced = f"{enhanced}, {style}"
        return enhanced


# Global service instance
translation_service = TranslationService()

