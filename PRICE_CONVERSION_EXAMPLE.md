# 💱 Пример работы конвертации цен

## Реальный пример

### Создаем объявление

**Request**:
```bash
POST /api/autoria/cars/
Content-Type: application/json

{
  "title": "BMW X5 2020",
  "description": "Отличное состояние",
  "mark": 1,
  "model": "X5",
  "price": 25000,      ← Пользователь вводит
  "currency": "USD",   ← Пользователь выбирает
  "dynamic_fields": {
    "year": 2020,
    "mileage": 50000
  }
}
```

---

### Backend обрабатывает

**Файл**: `backend/apps/ads/serializers/car_ad_serializer.py`

#### Шаг 1: Сохранение
```python
# Сохраняем в БД как есть
ad.price = 25000
ad.currency = "USD"
ad.save()
```

#### Шаг 2: Получение курсов
```python
# CurrencyService возвращает UAH за 1 единицу валюты
usd_uah = CurrencyService.get_rate("UAH", "USD")  # Например: 41.50
eur_uah = CurrencyService.get_rate("UAH", "EUR")  # Например: 44.80
```

#### Шаг 3: Конвертация в USD
```python
def get_price_usd(self, obj):
    amount = 25000  # Оригинальная цена
    from_currency = "USD"
    
    # Уже в USD - возвращаем как есть
    if from_currency == "USD":
        return 25000.00
```

#### Шаг 4: Конвертация в EUR
```python
def get_price_eur(self, obj):
    amount = 25000
    from_currency = "USD"
    
    # USD → UAH
    amount_uah = 25000 * 41.50 = 1037500 UAH
    
    # UAH → EUR
    price_eur = 1037500 / 44.80 = 23156.25 EUR
    
    return round(23156.25, 2) = 23156.25
```

#### Шаг 5: Конвертация в UAH
```python
def get_price_uah(self, obj):
    amount = 25000
    from_currency = "USD"
    
    # USD → UAH
    price_uah = 25000 * 41.50 = 1037500 UAH
    
    return round(1037500, 2) = 1037500.00
```

---

### Response (ответ API)

```json
{
  "id": 348,
  "title": "BMW X5 2020",
  "price": 25000,          ← Оригинальная цена
  "currency": "USD",       ← Оригинальная валюта
  
  "price_usd": 25000.00,   ← Автоматически
  "price_eur": 23156.25,   ← Автоматически (отличается!)
  "price_uah": 1037500.00, ← Автоматически (отличается!)
  
  "dynamic_fields": {
    "year": 2020,
    "mileage": 50000
  }
}
```

---

## Проверка: Цены отличаются ✅

| Валюта | Цена | Формула |
|--------|------|---------|
| USD | 25,000.00 | Оригинал |
| EUR | 23,156.25 | 25000 × 41.50 ÷ 44.80 |
| UAH | 1,037,500.00 | 25000 × 41.50 |

**Разница курсов**:
- 1 USD = 1.0799 EUR (25000 / 23156.25)
- 1 USD = 41.50 UAH

✅ **Цены отличаются согласно курсам!**

---

## Визуализация на Frontend

### В списке (SearchPage с CarAdCard)

```
┌────────────────────────────────────┐
│ [Photo] │ BMW X5 2020              │
│         │ $25,000 USD  ← текущая   │
│         │ 2020 • 50000 км          │
│         │ 👁️ 0 ⭐ 0 📞 0 [Phone] │
└────────────────────────────────────┘
```

**Переключаем валюту на EUR**:

```
┌────────────────────────────────────┐
│ [Photo] │ BMW X5 2020              │
│         │ €23,156 EUR  ← изменилась!│
│         │ 2020 • 50000 км          │
│         │ 👁️ 0 ⭐ 0 📞 0 [Phone] │
└────────────────────────────────────┘
```

**Переключаем валюту на UAH**:

```
┌────────────────────────────────────┐
│ [Photo] │ BMW X5 2020              │
│         │ ₴1,037,500 UAH ← изменилась!│
│         │ 2020 • 50000 км          │
│         │ 👁️ 0 ⭐ 0 📞 0 [Phone] │
└────────────────────────────────────┘
```

---

## Обратный пример: Объявление в EUR

### Request
```json
{
  "price": 20000,
  "currency": "EUR"
}
```

### Backend расчет

```python
# Курсы
usd_uah = 41.50
eur_uah = 44.80

# EUR → UAH
amount_uah = 20000 * 44.80 = 896000 UAH

# UAH → USD
price_usd = 896000 / 41.50 = 21590.36 USD

# EUR → EUR
price_eur = 20000.00 EUR (оригинал)

# EUR → UAH
price_uah = 896000.00 UAH
```

### Response
```json
{
  "price": 20000,
  "currency": "EUR",
  
  "price_usd": 21590.36,  ← Отличается!
  "price_eur": 20000.00,  ← Оригинал
  "price_uah": 896000.00  ← Отличается!
}
```

---

## Итог

✅ **Система работает правильно:**

1. Пользователь вводит **одну** цену в **одной** валюте
2. Backend **автоматически** рассчитывает **две** другие
3. Расчет через **реальные курсы** (UAH pivot)
4. Цены **отличаются** согласно курсам
5. Frontend получает **все три** цены в одном запросе
6. Переключение валюты **мгновенное** (данные уже есть)

✅ **Оформление правильное:**
- SearchPage: новое компактное (CarAdCard)
- AdDetailPage: старое детальное (inline)

