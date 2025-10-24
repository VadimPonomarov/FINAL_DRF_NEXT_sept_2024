"""Text processing utilities."""

import re
from typing import Optional
from ..config.patterns import IMAGE_PATTERNS, CLEANUP_PATTERNS
from ..config.dictionaries import LANGUAGE_PATTERNS


def remove_base64_images(text: str) -> str:
    """
    Remove base64 encoded images from text.
    
    Args:
        text: Input text potentially containing base64 images
        
    Returns:
        Text with base64 images removed
    """
    result = text
    for pattern in IMAGE_PATTERNS:
        result = pattern.sub('', result)
    return result


def clean_text(text: str, max_length: Optional[int] = None) -> str:
    """
    Clean text from unwanted patterns (URLs in parentheses, markdown symbols, etc.).
    
    Args:
        text: Input text
        max_length: Maximum length of returned text
        
    Returns:
        Cleaned text
    """
    result = text
    for pattern in CLEANUP_PATTERNS:
        result = pattern.sub('', result)
    
    result = result.strip()
    
    if max_length and len(result) > max_length:
        result = result[:max_length]
    
    return result


def extract_item_name_from_context(context: str, max_length: int = 50) -> str:
    """
    Extract item name from price context.
    Takes the last line/sentence before the price.
    
    Args:
        context: Text context around the price
        max_length: Maximum length of item name
        
    Returns:
        Extracted item name or "Товар" as fallback
    """
    # Берем последнюю строку/предложение перед ценой
    item_name = context.split('\n')[-1].strip()
    
    if not item_name or len(item_name) < 3:
        return "Товар"
    
    # Очищаем от мусора
    item_name = clean_text(item_name, max_length)
    
    return item_name if item_name else "Товар"


def detect_language(text: str) -> str:
    """
    Detect language of text (simple heuristic).
    
    Args:
        text: Input text
        
    Returns:
        Language code ('ru' or 'en')
    """
    if not text:
        return 'en'
    
    # Count Cyrillic and Latin characters
    cyrillic_count = len(re.findall(LANGUAGE_PATTERNS['ru'], text))
    latin_count = len(re.findall(LANGUAGE_PATTERNS['en'], text))
    
    # Return language with more characters
    return 'ru' if cyrillic_count > latin_count else 'en'


def is_english(text: str) -> bool:
    """
    Check if text is primarily in English.
    
    Args:
        text: Input text
        
    Returns:
        True if text is in English
    """
    return detect_language(text) == 'en'

