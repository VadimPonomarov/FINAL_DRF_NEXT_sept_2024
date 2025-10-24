# Universal LLM-Based Web Crawler

## Концепция

**Универсальный краулер** - это новый подход к веб-краулингу, где **НИКАКОГО хардкодинга** - только **интеллект LLM моделей**.

### Ключевые принципы

1. **🧠 Интеллект вместо паттернов**: LLM сама определяет структуру данных и извлекает их
2. **🌍 Универсальность**: Работает с ЛЮБЫМИ сайтами - курсы валют, цены, статьи, товары
3. **🚀 JavaScript-ready**: Полная поддержка динамически загружаемого контента
4. **📊 Автоматическое форматирование**: LLM создает таблицы автоматически
5. **🎯 Контекстная обработка**: Понимает запрос пользователя и извлекает именно то, что нужно

## Архитектура

### UniversalCrawlerService

Основной сервис для универсального краулинга с LLM extraction.

```python
from apps.chat.services.universal_crawler_service import universal_crawler_service

# Использование
result = await universal_crawler_service.crawl_with_llm_extraction(
    url="https://kurs.com.ua/ru/gorod/742-zaporoje",
    query="спарсь курсы валют",
    max_depth=2,
    max_links=5
)
```

### Процесс работы

```
1. 📡 Запрос пользователя
       ↓
2. 🤖 LLM определяет нужен ли deep crawl
       ↓
3. 🌐 Crawl4AI с JavaScript rendering
       ↓ (авто-скроллинг, ожидание network idle)
4. 📄 Собирается контент со всех страниц
       ↓
5. 🧠 LLM анализирует контент и извлекает данные
       ↓
6. 📊 Автоматическое создание таблицы
       ↓
7. ✅ Возврат структурированных данных
```

## Методы

### `crawl_with_llm_extraction(url, query, max_depth, max_links)`

Главный метод для универсального краулинга.

**Параметры:**
- `url` (str): URL для краулинга
- `query` (str): Запрос пользователя (объясняет что извлекать)
- `max_depth` (int): Глубина краулинга (default: 2)
- `max_links` (int): Максимум внутренних ссылок (default: 5)

**Возвращает:**
```python
{
    'success': True,
    'url': 'https://example.com',
    'extracted_data': {
        'items': [
            {'field1': 'value1', 'field2': 'value2'},
            ...
        ],
        'summary': 'Краткое описание',
        'data_type': 'currency_rates|products|articles|...',
        'columns': ['field1', 'field2', ...]
    },
    'table_html': '<table>...</table>',  # Стилизованная таблица
    'table_data': [...],  # Данные для таблицы
    'total_pages': 3
}
```

### `_crawl_with_js(url, max_depth, max_links)`

Внутренний метод для краулинга с JavaScript rendering.

**Особенности:**
- Автоматический скроллинг для lazy-loading
- Ожидание `networkidle` для AJAX запросов
- Задержка 3 секунды после рендеринга
- Рекурсивный обход внутренних ссылок

### `_extract_with_llm(content, url, query)`

Интеллектуальное извлечение данных через LLM.

**Промпт стратегия:**
1. Анализ контента (до 15000 символов)
2. Определение типа данных
3. Извлечение в структурированный JSON
4. Гибкие названия полей

**Примеры извлечения:**

**Курсы валют:**
```json
{
  "items": [
    {"currency": "USD", "buy": "41.50", "sell": "42.00"},
    {"currency": "EUR", "buy": "45.20", "sell": "46.10"}
  ],
  "summary": "Извлечено 2 курса валют",
  "data_type": "currency_rates",
  "columns": ["currency", "buy", "sell"]
}
```

**Товары:**
```json
{
  "items": [
    {"name": "Товар А", "price": "100.00", "currency": "UAH"},
    {"name": "Товар Б", "price": "150.00", "currency": "UAH"}
  ],
  "summary": "Найдено 2 товара",
  "data_type": "products",
  "columns": ["name", "price", "currency"]
}
```

### `_format_as_table(extracted, query)`

Автоматическое создание HTML таблицы из извлеченных данных.

**Использует:**
- pandas для структурирования
- Bootstrap классы для стилизации
- Сохраняет порядок колонок

## Интеграция

### В crawler_nodes_refactored.py

```python
from apps.chat.services.universal_crawler_service import universal_crawler_service

def crawl4ai_ask_node(state: AgentState) -> AgentState:
    """
    Universal crawler using LLM-based intelligent extraction.
    """
    # Использует universal_crawler_service для deep crawl
    if needs_deep:
        result = await universal_crawler_service.crawl_with_llm_extraction(
            url=url,
            query=state.query,
            max_depth=DEEP_CRAWL_CONFIG['max_depth'],
            max_links=DEEP_CRAWL_CONFIG['max_links']
        )
```

## Примеры использования

### Пример 1: Курсы валют

**Запрос:**
```
спарсь курсы валют с https://kurs.com.ua/ru/gorod/742-zaporoje
```

**Результат:**
```python
{
    'success': True,
    'extracted_data': {
        'items': [
            {'currency': 'USD', 'buy': '41.45', 'sell': '41.95'},
            {'currency': 'EUR', 'buy': '44.80', 'sell': '45.40'},
            {'currency': 'PLN', 'buy': '10.20', 'sell': '10.50'}
        ],
        'data_type': 'currency_rates',
        'summary': 'Извлечено 3 курса валют для города Запорожье'
    },
    'table_html': '<table class="table table-striped">...</table>',
    'total_pages': 1
}
```

### Пример 2: Цены на товары

**Запрос:**
```
извлеки все цены с https://rozetka.com.ua/ua/
```

**Результат:**
```python
{
    'success': True,
    'extracted_data': {
        'items': [
            {'name': 'Ноутбук ASUS', 'price': '25999', 'currency': 'грн'},
            {'name': 'Телефон Samsung', 'price': '15999', 'currency': 'грн'}
        ],
        'data_type': 'products',
        'summary': 'Найдено 2 товара с ценами'
    },
    'table_html': '<table>...</table>',
    'total_pages': 3
}
```

### Пример 3: Статьи/Новости

**Запрос:**
```
покажи последние новости с https://news.example.com
```

**Результат:**
```python
{
    'extracted_data': {
        'items': [
            {'title': 'Заголовок 1', 'date': '2024-01-20', 'summary': '...'},
            {'title': 'Заголовок 2', 'date': '2024-01-19', 'summary': '...'}
        ],
        'data_type': 'articles'
    }
}
```

## Преимущества

### ✅ Vs. Hardcoded Patterns

| Hardcoded | Universal LLM |
|-----------|---------------|
| ❌ Работает только с известными сайтами | ✅ Работает с ЛЮБЫМИ сайтами |
| ❌ Регулярные выражения для каждого типа | ✅ LLM сама определяет структуру |
| ❌ Ломается при изменении разметки | ✅ Адаптируется к любой разметке |
| ❌ Нужно обновлять код для новых сайтов | ✅ Нулевое обслуживание |
| ❌ Сложно добавить новые типы данных | ✅ Автоматически понимает новые типы |

### 🚀 Технические преимущества

1. **JavaScript rendering**: Полная поддержка SPA и динамического контента
2. **Auto-scrolling**: Автоматическая прокрутка для lazy-loading
3. **Network idle waiting**: Ожидание завершения AJAX
4. **Deep crawling**: Следование по внутренним ссылкам
5. **Smart deduplication**: Умное дедупликация контента
6. **Flexible schema**: Гибкая схема данных

## Конфигурация

### LLM модели

Использует централизованную конфигурацию из `llm_config.py`:

```python
# Для извлечения данных
task='classification'  # Точная модель с низкой temperature
model='gpt-4o-mini'
temperature=0.1
max_tokens=1500

# Для deep crawl detection
task='deep_crawl_detection'
temperature=0.0
max_tokens=10
```

### Crawl4AI конфигурация

```python
{
    'headless': True,
    'browser_type': 'chromium',
    'page_timeout': 60000,
    'verbose': False,
    'bypass_cache': True,
    'wait_for': 'networkidle',
    'delay_before_return_html': 3.0
}
```

## Обработка ошибок

### Fallback механизм

Если Crawl4AI недоступен:
```python
async def _fallback_extraction(url, query):
    # Использует requests + LLM extraction
    # Работает без JavaScript rendering
```

### Error handling

```python
try:
    result = await crawl_with_llm_extraction(url, query)
except Exception as e:
    return {
        'success': False,
        'error': str(e),
        'fallback_used': True
    }
```

## Лучшие практики

### ✅ DO

- Предоставляйте четкий контекст в `query`
- Используйте `max_depth=2-3` для оптимальной производительности
- Ограничивайте `max_links=5-10` для скорости

### ❌ DON'T

- Не используйте слишком большой `max_depth` (>3)
- Не полагайтесь на жестко заданную структуру данных
- Не игнорируйте `success` флаг

## Производительность

### Типичное время работы

- **Simple crawl**: 2-5 секунд
- **Deep crawl (2 уровня)**: 10-20 секунд
- **Deep crawl (3 уровня)**: 30-60 секунд

### Оптимизация

1. Используйте `max_links` для ограничения
2. Снижайте `max_depth` если не нужно
3. LLM extraction кэшируется на уровне Crawl4AI

## Расширение

### Добавление новых типов данных

Не требуется! LLM автоматически определит новый тип:

```python
# LLM сама создаст структуру для новых данных
query = "извлеки расписание рейсов"
# Результат: data_type='flight_schedule'
#            columns=['flight', 'departure', 'arrival', 'status']
```

### Кастомизация промптов

Можно переопределить `_extract_with_llm()` для специфичных задач.

## Мониторинг

### Логирование

```python
logger.info(f"🚀 Универсальный краулинг: {url}")
logger.info(f"📝 Запрос пользователя: {query}")
logger.info(f"✅ Краулинг завершен: {len(all_content)} страниц")
logger.info(f"🤖 LLM извлечение данных из {len(content)} символов")
logger.info(f"✅ LLM извлекло {len(items)} элементов")
logger.info(f"📊 Тип данных: {data_type}")
```

### Метрики

```python
metadata = {
    "crawl_method": "universal_llm",
    "total_pages": 3,
    "items_found": 15,
    "data_type": "currency_rates",
    "has_table": True,
    "universal_extraction": True
}
```

## Требования

```bash
# Python packages
pip install crawl4ai
pip install pandas

# Опционально для визуализации
pip install seaborn matplotlib
```

## Заключение

**Universal LLM-Based Crawler** - это революционный подход к веб-краулингу:
- ✅ Никакого хардкодинга
- ✅ Работает с любыми сайтами
- ✅ Полная поддержка JavaScript
- ✅ Интеллектуальное извлечение
- ✅ Автоматическое форматирование

**Главный принцип**: "Модель сама понимает что нужно извлечь"

