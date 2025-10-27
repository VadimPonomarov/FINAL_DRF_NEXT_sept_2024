# 💱 Конвертация валют и оформление карточек

## ✅ Конвертация валют работает правильно

### Backend (уже реализовано)

**Файл**: `backend/apps/ads/serializers/car_ad_serializer.py`

#### Как работает:

1. **При создании объявления** пользователь вводит:
   - `price` = 25000
   - `currency` = "USD"

2. **При чтении** backend автоматически рассчитывает через `CurrencyService`:
   - `price_usd` (строки 485-513)
   - `price_eur` (строки 515-543)
   - `price_uah` (строки 545-575)

3. **Конвертация через UAH pivot**:
   ```python
   # Пример: USD → EUR
   # Шаг 1: USD → UAH
   amount_uah = amount * usd_uah_rate
   
   # Шаг 2: UAH → EUR
   price_eur = amount_uah / eur_uah_rate
   ```

#### Пример ответа API:

```json
{
  "id": 348,
  "price": 25000,      // Оригинальная цена
  "currency": "USD",   // Оригинальная валюта
  
  "price_usd": 25000.00,   // ← Рассчитано backend
  "price_eur": 23150.00,   // ← Рассчитано backend (курс ~1.08)
  "price_uah": 1037500.00  // ← Рассчитано backend (курс ~41.5)
}
```

**Источник курсов**: `CurrencyService.get_rate()` - официальные курсы из БД

---

## ✅ Два разных оформления карточек

### 1. Страница списка (SearchPage) - Новое компактное

**Файл**: `frontend/src/components/AutoRia/Pages/SearchPage.tsx`  
**Компонент**: `CarAdCard` (импорт на строке 28)

**Оформление**: Горизонтальное, компактное (~120-140px высота)

```
┌───────────────────────────────────────┐
│ [Image] │ Title                       │
│  48px   │ $25,000 USD                 │
│  wide   │ 2021 • 86 859 км • Болехів │
│         │ 👁️ 0 ⭐ 0 📞 0  [Phone]   │
└───────────────────────────────────────┘
```

**Преимущества**:
- ✅ ~60% экономии места
- ✅ В 2 раза больше объявлений на экране
- ✅ Быстрее сканировать список

**Используется в**:
- `/autoria/search` (страница поиска)
- Возможно в других списках объявлений

---

### 2. Страница деталей (AdDetailPage) - Старое вертикальное

**Файл**: `frontend/src/components/AutoRia/Pages/AdDetailPage.tsx`  
**Компонент**: Inline layout (НЕ использует CarAdCard)

**Оформление**: Вертикальное, детальное

```
┌─────────────────────┐
│                     │
│   Large Gallery     │
│   (full width)      │
│                     │
├─────────────────────┤
│ Title               │
│ $25,000 USD         │
│                     │
│ Full Description    │
│ (много текста)      │
│                     │
│ Characteristics     │
│ (детальная таблица) │
│                     │
│ Contact Info        │
│ Map / Location      │
│                     │
│ Similar Ads         │
└─────────────────────┘
```

**Преимущества**:
- ✅ Полная информация сразу
- ✅ Большие изображения (галерея)
- ✅ Детальное описание
- ✅ Карта, контакты, похожие объявления

**Используется в**:
- `/autoria/ad/[id]` (страница детального просмотра)

---

## Сравнение оформлений

| Аспект | SearchPage (Список) | AdDetailPage (Детали) |
|--------|---------------------|----------------------|
| **Layout** | Горизонтальный | Вертикальный |
| **Высота** | ~120-140px | ~1000-2000px |
| **Изображение** | Маленькое (48px wide) | Большое (full width gallery) |
| **Описание** | Нет | Полное |
| **Характеристики** | Основные (3-4 шт) | Все детали |
| **Цель** | Быстрое сканирование | Полная информация |
| **Компонент** | `CarAdCard` (новый) | Inline (старый) |

---

## Конвертация валют на Frontend

### В списке (SearchPage)

```tsx
// frontend/src/components/AutoRia/Components/CarAdCard.tsx
const getPriceInCurrency = (): { price: number | null; currency: string } => {
  switch (currency) {
    case 'USD':
      return { price: ad.price_usd || ad.price, currency: 'USD' };
    case 'EUR':
      return { price: ad.price_eur || ad.price, currency: 'EUR' };
    case 'UAH':
      return { price: ad.price_uah || ad.price, currency: 'UAH' };
    default:
      return { price: ad.price, currency: ad.currency || 'USD' };
  }
};
```

### На странице деталей (AdDetailPage)

Использует `usePriceConverter` hook или аналогичную логику для отображения цены в выбранной валюте.

---

## Примеры конвертации

### Пример 1: Объявление в USD

**Input** (при создании):
```json
{
  "price": 25000,
  "currency": "USD"
}
```

**Output** (при чтении):
```json
{
  "price": 25000,
  "currency": "USD",
  "price_usd": 25000.00,
  "price_eur": 23150.00,  // Курс 1 USD = 0.926 EUR
  "price_uah": 1037500.00 // Курс 1 USD = 41.5 UAH
}
```

### Пример 2: Объявление в EUR

**Input**:
```json
{
  "price": 20000,
  "currency": "EUR"
}
```

**Output**:
```json
{
  "price": 20000,
  "currency": "EUR",
  "price_usd": 21598.00,  // 1 EUR = 1.0799 USD
  "price_eur": 20000.00,
  "price_uah": 896000.00  // 1 EUR = 44.8 UAH
}
```

### Пример 3: Объявление в UAH

**Input**:
```json
{
  "price": 1000000,
  "currency": "UAH"
}
```

**Output**:
```json
{
  "price": 1000000,
  "currency": "UAH",
  "price_usd": 24096.00,  // 1 UAH = 0.024096 USD
  "price_eur": 22321.00,  // 1 UAH = 0.022321 EUR
  "price_uah": 1000000.00
}
```

---

## Проверка курсов

Курсы берутся из `CurrencyService`:

```python
# backend/apps/currency/services.py
usd_uah = CurrencyService.get_rate("UAH", "USD")  # UAH за 1 USD
eur_uah = CurrencyService.get_rate("UAH", "EUR")  # UAH за 1 EUR
```

**Формула конвертации:**

```python
# USD → EUR
amount_uah = amount_usd * usd_uah_rate
price_eur = amount_uah / eur_uah_rate

# Или напрямую:
price_eur = amount_usd * (usd_uah_rate / eur_uah_rate)
```

---

## Резюме

### ✅ Что работает:

1. **Конвертация валют**:
   - ✅ Backend автоматически рассчитывает все 3 валюты
   - ✅ Использует реальные курсы через UAH pivot
   - ✅ Округление до 2 знаков после запятой

2. **Оформление карточек**:
   - ✅ SearchPage: новое компактное (CarAdCard)
   - ✅ AdDetailPage: старое вертикальное (inline)

3. **Пользовательский опыт**:
   - ✅ Можно переключать валюту через CurrencySelector
   - ✅ Цены пересчитываются мгновенно (данные уже есть)
   - ✅ Быстрое сканирование списка + детальный просмотр

### 📝 Примечания:

- Курсы обновляются через `CurrencyService` (см. документацию currency app)
- Frontend получает все 3 цены в одном запросе (нет дополнительных запросов)
- Конвертация происходит на backend (единая логика, легко поддерживать)

---

## Файлы

**Backend**:
- `backend/apps/ads/serializers/car_ad_serializer.py` - конвертация цен

**Frontend**:
- `frontend/src/components/AutoRia/Components/CarAdCard.tsx` - компактная карточка (список)
- `frontend/src/components/AutoRia/Pages/SearchPage.tsx` - страница списка
- `frontend/src/components/AutoRia/Pages/AdDetailPage.tsx` - страница деталей (старое оформление)
- `frontend/src/contexts/CurrencyContext.tsx` - переключатель валют

