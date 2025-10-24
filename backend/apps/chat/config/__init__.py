"""Configuration modules for chat app."""

from .dictionaries import TRANSLATION_DICT, LANGUAGE_PATTERNS
from .patterns import PRICE_PATTERNS, URL_PATTERNS, IMAGE_PATTERNS
from .crawler_config import CRAWLER_CONFIG, DEEP_CRAWL_CONFIG

__all__ = [
    'TRANSLATION_DICT',
    'LANGUAGE_PATTERNS',
    'PRICE_PATTERNS',
    'URL_PATTERNS',
    'IMAGE_PATTERNS',
    'CRAWLER_CONFIG',
    'DEEP_CRAWL_CONFIG',
]

