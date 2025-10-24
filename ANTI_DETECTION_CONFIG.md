# 🥷 Anti-Detection Configuration

## Добавленные меры обхода

### 1. Realistic Headers
```python
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8'
'Sec-Fetch-*': Реалистичные значения
```

### 2. Viewport
```python
width: 1920, height: 1080  # Реальный десктоп
```

### 3. JavaScript Anti-Detection
```javascript
navigator.webdriver = false  // Скрыть автоматизацию
navigator.plugins = [1,2,3,4,5]  // Фейковые плагины
navigator.languages = ['uk-UA', 'uk', 'en-US']  // Реальные языки
```

### 4. Crawl4AI Magic Mode
```python
'magic': True  // Встроенная защита от обнаружения
```

### 5. Random Delays
```javascript
3000 + Math.random() * 2000  // 3-5 секунд случайно
```

### 6. Extended Wait Time
```python
delay_before_return_html: 7.0  // Увеличено с 5 до 7 секунд
```

## Изменения применены
- ✅ Realistic headers
- ✅ Viewport 1920x1080
- ✅ Anti-webdriver detection
- ✅ Fake plugins
- ✅ Random delays
- ✅ Magic mode
- ✅ Extended delay (7 sec)

## Тестирование
После перезапуска контейнера, запрос должен обойти защиту kurs.com.ua

