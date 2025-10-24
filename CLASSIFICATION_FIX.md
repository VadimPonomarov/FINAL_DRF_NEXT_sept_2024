# 🐛 Проблема с Классификацией Intent

## Симптом
Запрос "спарси курсы валют с https://kurs.com.ua" попадает в **IMAGE_GENERATION** вместо **WEB_CRAWLING**

## Причина
G4F модель неправильно классифицирует запрос, несмотря на правильные примеры в `intelligent_classifier.py`

## Доказательства
1. ✅ Граф правильный: `Intent.WEB_CRAWLING → crawl4ai_ask`
2. ✅ Примеры в классификаторе правильные: `"Спарсь курсы валют с https://example.com" → WEB_CRAWLING`
3. ❌ Пользователь видит сгенерированное изображение вместо таблицы с курсами

## Решение

### Вариант 1: Улучшить примеры (QUICK FIX)
Добавить больше явных примеров для парсинга курсов:

```python
**Examples:**
- "спарси курсы валют с https://kurs.com.ua" → WEB_CRAWLING + REALTIME  
- "спарсь курсы с сайта" → WEB_CRAWLING + REALTIME
- "покажи курсы валют с kurs.com.ua" → WEB_CRAWLING + REALTIME
- "извлеки курсы с https://kurs.com.ua" → WEB_CRAWLING + REALTIME
- "Спарсь курсы валют с https://example.com" → WEB_CRAWLING + REALTIME
```

### Вариант 2: Добавить ключевые слова (FAILSAFE)
Добавить явную проверку в классификатор:

```python
def classify(self, query: str) -> IntentClassification:
    query_lower = query.lower()
    
    # FAILSAFE: Explicit URL crawling patterns
    crawl_patterns = ['спарс', 'парс', 'извлеч', 'crawl', 'scrape', 'extract']
    has_url = 'http' in query_lower or 'www.' in query_lower
    
    if has_url and any(pattern in query_lower for pattern in crawl_patterns):
        logger.info(f"🎯 FAILSAFE: Detected URL crawling pattern")
        return IntentClassification(
            intent=Intent.WEB_CRAWLING,
            data_mode=DataMode.REALTIME,
            confidence=0.95,
            reasoning="URL crawling pattern detected (failsafe)"
        )
    
    # Continue with LLM classification...
```

### Вариант 3: Upgrade G4F (LONG TERM)
Обновить g4f до последней версии:
```bash
pip install -U g4f
# Current: 0.5.7.6
# Available: 0.6.4.3
```

## Немедленные Действия

1. **Добавить failsafe проверку** в `intelligent_classifier.py`
2. **Добавить больше примеров** для парсинга курсов
3. **Логировать классификацию** для отладки

## Код для Внедрения

```python
# В intelligent_classifier.py, метод classify():

def classify(self, query: str) -> IntentClassification:
    """Classify with failsafe for URL crawling."""
    
    # FAILSAFE for URL crawling
    query_lower = query.lower()
    crawl_keywords = ['спарс', 'парс', 'extract', 'crawl', 'scrape', 'курс', 'цен']
    has_url = bool(re.search(r'https?://|www\.', query))
    
    if has_url:
        # Check for crawling intent
        if any(kw in query_lower for kw in ['спарс', 'парс', 'extract', 'crawl']):
            logger.warning(f"🎯 FAILSAFE ROUTE: URL + parsing keyword → WEB_CRAWLING")
            return IntentClassification(
                intent=Intent.WEB_CRAWLING,
                data_mode=DataMode.REALTIME,
                confidence=0.95,
                reasoning="Failsafe: URL parsing pattern detected"
            )
        
        # Check for currency/price extraction
        if any(kw in query_lower for kw in ['курс', 'валют', 'цен', 'price', 'rate']):
            logger.warning(f"🎯 FAILSAFE ROUTE: URL + currency/price → WEB_CRAWLING")
            return IntentClassification(
                intent=Intent.WEB_CRAWLING,
                data_mode=DataMode.REALTIME,
                confidence=0.95,
                reasoning="Failsafe: Currency/price extraction from URL"
            )
    
    # Continue with LLM classification...
    return self._llm_classify(query)
```

## Тестирование

```python
# Test cases
test_queries = [
    "спарси курсы валют с https://kurs.com.ua",
    "спарсь курсы с https://minfin.com.ua",
    "извлеки курсы валют с kurs.com.ua",
    "покажи курсы с https://example.com",
]

for query in test_queries:
    result = classifier.classify(query)
    assert result.intent == Intent.WEB_CRAWLING, f"Failed for: {query}"
    print(f"✅ {query} → {result.intent}")
```

## Приоритет: 🔴 CRITICAL
Без этого фикса краулер не работает!

