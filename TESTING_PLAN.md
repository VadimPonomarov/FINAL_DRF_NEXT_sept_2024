# План тестирования универсального краулера

## 🎯 Цель теста

Проверить что **новый универсальный LLM-based краулер** корректно извлекает курсы валют с `kurs.com.ua`.

## 🔧 Внесенные улучшения

### 1. Увеличен delay перед извлечением
- **Было**: 3 секунды
- **Стало**: 5 секунд
- **Причина**: Недостаточно времени для загрузки JS-контента

### 2. Добавлено активное ожидание элементов
```javascript
// Проверяет наличие текста USD, EUR или элементов с классами rate/currency
const waitForCurrencyRates = async () => {
    for (let i = 0; i < 20; i++) {  // До 10 секунд
        const hasCurrencyData = 
            document.body.innerText.includes('USD') || 
            document.body.innerText.includes('EUR') ||
            document.querySelector('[class*="rate"]') ||
            document.querySelector('[class*="currency"]');
        
        if (hasCurrencyData) break;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};
```

### 3. Увеличена задержка после скроллинга
- **Было**: 1 секунда после скроллинга
- **Стало**: 2 секунды после скроллинга

## 📋 Тест кейсы

### Test Case 1: Краулинг курсов валют

**Запрос:**
```
спарси курсы валют с https://kurs.com.ua/ru/gorod/742-zaporoje
```

**Ожидаемый результат:**
```
🎯 Универсальное извлечение данных с https://kurs.com.ua/...
📊 Тип данных: currency_rates
✅ Найдено элементов: 3-10

📦 Данные:
• currency: USD | buy: 41.XX | sell: 41.XX
• currency: EUR | buy: 44.XX | sell: 45.XX
• currency: PLN | buy: 10.XX | sell: 10.XX

[Красивая таблица в TableDisplay component]

🌐 Просканировано: 1 страниц
```

**НЕ должно быть:**
- ❌ Только ссылки меню (Деньги, Новости, Общение)
- ❌ "Цены не найдены"
- ❌ Пустая таблица

### Test Case 2: Отображение таблицы

**Проверить:**
- ✅ Таблица отображается через TableDisplay component
- ✅ Есть колонки: Валюта, Покупка, Продажа
- ✅ Данные в таблице соответствуют тексту
- ✅ Таблица стилизована (Bootstrap классы)

### Test Case 3: Актуальность данных

**Проверить:**
- ✅ Курсы реальные (не исторические)
- ✅ Значения разумные (USD ~41-42, EUR ~44-46)
- ✅ Формат чисел корректный (XX.XX)

## 🔍 Что проверять в логах

### Backend logs (если возникнут проблемы):

```bash
docker logs final_drf_next_sept_2024-app-1 --tail=100 | grep -E "краулинг|Crawl|Universal|LLM"
```

**Искать:**
- ✅ "🚀 Универсальный краулинг"
- ✅ "📄 Краулинг (глубина 0)"
- ✅ "🤖 LLM извлечение данных"
- ✅ "✅ LLM извлекло X элементов"
- ✅ "📊 Тип данных: currency_rates"

**Ошибки:**
- ❌ "Crawl4AI not available"
- ❌ "LLM extraction failed"
- ❌ "No data extracted"

## 📊 Критерии успеха

| Критерий | Статус |
|----------|--------|
| Извлечены реальные курсы валют | ⏳ |
| Таблица отображается красиво | ⏳ |
| Данные актуальные (не меню) | ⏳ |
| LLM определил тип как currency_rates | ⏳ |
| Минимум 3 валюты извлечено | ⏳ |

## 🐛 Troubleshooting

### Если опять только ссылки меню:

1. **Проверить что бекенд перезапустился:**
   ```bash
   docker ps | grep app
   # Должно показать "Up X seconds" (недавно запущен)
   ```

2. **Проверить логи на момент краулинга:**
   ```bash
   docker logs final_drf_next_sept_2024-app-1 --tail=50 -f
   ```

3. **Проверить что используется новый сервис:**
   ```bash
   docker exec final_drf_next_sept_2024-app-1 python -c "from apps.chat.services.universal_crawler_service import universal_crawler_service; print('OK')"
   ```

### Если "Crawl4AI not available":

```bash
docker exec final_drf_next_sept_2024-app-1 pip list | grep crawl4ai
```

### Если delay недостаточен:

Увеличить в `universal_crawler_service.py`:
```python
delay_before_return_html=7.0,  # Увеличить до 7 секунд
```

## 🎯 Альтернативные тест-сайты

Если `kurs.com.ua` не работает, протестировать на:

1. **Простые статические сайты:**
   - `https://www.xe.com/currency-rates/`
   - `https://www.google.com/finance/quote/USD-UAH`

2. **Другие динамические сайты:**
   - `https://minfin.com.ua/currency/`
   - `https://finance.ua/currency`

## ⏱️ Timeline

- **13:00** - Перезапуск бекенда
- **13:05** - Тестирование через чатбот
- **13:10** - Анализ результатов
- **13:15** - Корректировки (если нужны)

## 📝 Заметки

- Сайт `kurs.com.ua` использует **тяжелый JavaScript** для загрузки курсов
- Crawl4AI должен подождать **networkidle** перед извлечением
- LLM должен **интеллектуально** определить что это currency_rates
- Никакого хардкодинга - только AI intelligence

---

**Готов к тестированию через 5 минут!** 🚀

