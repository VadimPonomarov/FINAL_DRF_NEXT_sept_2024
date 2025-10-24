# 🚨 ПРОБЛЕМА: LLM не извлекает курсы валют

## Диагностика

### ✅ Что работает:
1. WebSocket подключение
2. Запрос доходит до бекенда
3. `crawl4ai_ask_node` вызывается
4. `universal_crawler_service.crawl_with_llm_extraction()` запускается
5. Код возвращает `state.model_copy(update={table_html, table_data})`

### ❌ Что НЕ работает:
1. **LLM извлечение данных** - `extracted['items']` пустой
2. **Crawl4AI возвращает только ссылки меню**, а не реальные курсы
3. **JavaScript wait script недостаточен** для kurs.com.ua

## Причина

`_crawl_with_js()` возвращает **markdown ссылок меню** вместо данных:
```
**🔍 Анализ https://kurs.com.ua/...:**
🔗 Деньги
🔗 Новости
🔗 Курс валют в Киеве
...
```

**Почему:**
- kurs.com.ua имеет **тяжелую JS защиту**
- Данные загружаются через **AJAX после полной загрузки страницы**
- `delay_before_return_html=5.0` и wait script **недостаточны**
- Возможно требуется **реальный браузер** (не headless)

## Быстрое Решение

### Вариант 1: Использовать NBU API (RECOMMENDED) 
Национальный Банк Украины предоставляет бесплатное API:

```python
async def get_currency_rates():
    url = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"
    response = await httpx.get(url)
    rates = response.json()
    
    # Формат: [{'r030': 840, 'txt': 'Долар США', 'rate': 41.25, ...}]
    return rates
```

### Вариант 2: Использовать PrivatBank API
```python
url = "https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5"
# Возвращает: [{'ccy': 'USD', 'base_ccy': 'UAH', 'buy': '41.20', 'sale': '41.60'}]
```

### Вариант 3: Увеличить delay до 15 секунд
```python
delay_before_return_html=15.0,  # Было 5.0
```

И добавить более агрессивный wait:
```javascript
await new Promise(resolve => setTimeout(resolve, 10000)); // 10 sec initial wait
```

### Вариант 4: Добавить Regex Fallback
Если LLM не извлекает - попробовать regex:

```python
if not extracted.get('items'):
    # Fallback: regex extraction
    import re
    pattern = r'(USD|EUR|PLN).*?(\d+\.\d{2}).*?(\d+\.\d{2})'
    matches = re.findall(pattern, content)
    extracted['items'] = [
        {'currency': m[0], 'buy': m[1], 'sell': m[2]}
        for m in matches
    ]
```

## Рекомендация

**Для продакшна**: Использовать API (NBU или PrivatBank)  
**Для демонстрации краулера**: Выбрать более простой сайт (не kurs.com.ua)

## Альтернативные сайты для тестирования:
1. `https://minfin.com.ua/currency/` (более простой)
2. `https://finance.ua/currency` (статический HTML)
3. `https://www.xe.com/currency-rates/` (международный)

## Следующий шаг

Что предпочитаете:
1. **Добавить NBU API** для курсов валют?
2. **Увеличить delay до 15 сек** и протестировать еще раз?
3. **Переключиться на другой сайт** для демонстрации краулера?
4. **Добавить regex fallback** для извлечения?

