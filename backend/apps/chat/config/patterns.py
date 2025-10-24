"""Regular expression patterns for text extraction."""

import re

# Паттерны для извлечения цен
PRICE_PATTERNS = [
    # Формат "Ціна: 150 ₴" или "Цена: 150 грн"
    re.compile(r'(?:ціна|цена|price|вартість)[:\s]+(\d{2,}(?:[.,]\d{2})?)\s*(?:грн|₴|uah)', re.IGNORECASE),
    # Просто "150 грн" с word boundary
    re.compile(r'\b(\d{2,}(?:[.,]\d{2})?)\s*(?:грн|₴|uah)\b', re.IGNORECASE),
    # В скобках или после тире "(150 грн)" или "- 150 грн"
    re.compile(r'[\(\-]\s*(\d{2,}(?:[.,]\d{2})?)\s*(?:грн|₴|uah)', re.IGNORECASE),
]

# Паттерны для извлечения URL
URL_PATTERNS = [
    re.compile(r'https?://[^\s<>"{}|\\^`\[\]]+', re.IGNORECASE),
    re.compile(r'www\.[^\s<>"{}|\\^`\[\]]+', re.IGNORECASE),
]

# Паттерны для удаления base64 изображений
IMAGE_PATTERNS = [
    re.compile(r'data:image/[^;]+;base64,[A-Za-z0-9+/=]{50,}', re.DOTALL),
    re.compile(r'!\[.*?\]\(data:image[^\)]*\)', re.IGNORECASE),
    re.compile(r'<img[^>]*src="data:image[^"]*"[^>]*>', re.IGNORECASE),
]

# Паттерны для очистки текста от мусора
CLEANUP_PATTERNS = [
    re.compile(r'\(https?://[^\)]+\)', re.IGNORECASE),  # URL в скобках
    re.compile(r'[*_\[\]#]+'),  # Markdown символы
    re.compile(r'!\[.*?\]\([^\)]+\)', re.IGNORECASE),  # Markdown изображения
]

# Паттерны для извлечения математических выражений
MATH_PATTERNS = [
    # Тригонометрические функции
    re.compile(r'(?:sin|cos|tan|log|ln|sqrt|abs)\s*\([^)]+\)', re.IGNORECASE),
    # Алгебраические уравнения
    re.compile(r'[x]\s*[+\-*/]\s*\d+\s*=\s*\d+', re.IGNORECASE),
    # Простые выражения
    re.compile(r'[\d+\-*/().]+'),
]

# Минимальная и максимальная цена для валидации
PRICE_RANGE = {
    'min': 10,
    'max': 100000
}

