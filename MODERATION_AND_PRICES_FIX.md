# 🔧 Исправления: Модерация и Цены

## ✅ Исправление 1: Показ всех объявлений на странице модерации

### Проблема
На странице модерации не отображались объявления в статусе `DRAFT`

### Решение
**Файл**: `backend/apps/ads/views/moderation_queue_views.py`

**Было**:
```python
queryset = queryset.filter(
    status__in=[
        AdStatusEnum.PENDING,
        AdStatusEnum.NEEDS_REVIEW,
        AdStatusEnum.REJECTED,
        AdStatusEnum.BLOCKED,
        AdStatusEnum.ACTIVE,
    ]
)
```

**Стало**:
```python
# Если статус указан в параметрах - фильтруем по нему
status_filter = self.request.GET.get("status")
if status_filter:
    queryset = queryset.filter(status=status_filter)
# Если статус не указан - показываем ВСЕ объявления
# (включая DRAFT, PENDING, ACTIVE, REJECTED, BLOCKED, NEEDS_REVIEW и т.д.)
```

Теперь на странице модерации показываются **все объявления** независимо от статуса.

---

## ✅ Исправление 2: Генерация тестовых объявлений с разными статусами

### Проблема
Все тестовые объявления создавались только в статусе `ACTIVE` или `DRAFT`

### Решение
**Файл**: `backend/apps/ads/management/commands/seed_car_ads.py`

**Было**:
```python
'status': AdStatusEnum.ACTIVE,  # Все активны
'is_validated': True,
```

**Стало**:
```python
# Генерируем разные статусы для реалистичных тестовых данных
# 50% - активные, 20% - на модерации, 15% - черновики, 10% - требуют проверки, 5% - отклоненные
status_weights = [
    (AdStatusEnum.ACTIVE, 50),
    (AdStatusEnum.PENDING, 20),
    (AdStatusEnum.DRAFT, 15),
    (AdStatusEnum.NEEDS_REVIEW, 10),
    (AdStatusEnum.REJECTED, 5),
]
statuses, weights = zip(*status_weights)
ad_status = random.choices(statuses, weights=weights)[0]

'status': ad_status,
'is_validated': (ad_status == AdStatusEnum.ACTIVE),  # Валидированы только активные
```

### Распределение статусов:
- 🟢 **50%** - `ACTIVE` (активные, опубликованные)
- 🟡 **20%** - `PENDING` (ожидают модерации)
- ⚪ **15%** - `DRAFT` (черновики)
- 🟠 **10%** - `NEEDS_REVIEW` (требуют проверки)
- 🔴 **5%** - `REJECTED` (отклоненные)

---

## 💰 Конвертация цен в три валюты

### Как работает
**Файл**: `backend/apps/ads/serializers/car_ad_serializer.py`

1. **Пользователь вводит**:
   - `price` (число, например 15000)
   - `currency` (валюта, например "USD")

2. **Backend автоматически рассчитывает**:
   - `price_usd` - цена в USD
   - `price_eur` - цена в EUR
   - `price_uah` - цена в UAH

### Алгоритм конвертации (через UAH pivot):

```python
# Шаг 1: Конвертируем введенную цену в UAH
if currency == "UAH":
    amount_uah = price
elif currency == "USD":
    usd_to_uah_rate = CurrencyService.get_rate("UAH", "USD")
    amount_uah = price * usd_to_uah_rate
elif currency == "EUR":
    eur_to_uah_rate = CurrencyService.get_rate("UAH", "EUR")
    amount_uah = price * eur_to_uah_rate

# Шаг 2: Из UAH конвертируем во все валюты
price_usd = amount_uah / usd_to_uah_rate
price_eur = amount_uah / eur_to_uah_rate
price_uah = amount_uah
```

### Пример:
```
Пользователь вводит: 15000 USD
↓
Backend конвертирует:
  1. 15000 USD → 555000 UAH (по курсу 37 UAH за 1 USD)
  2. 555000 UAH → price_usd: 15000 USD (исходная)
  3. 555000 UAH → price_eur: 13636 EUR (по курсу ~40.7 UAH за 1 EUR)
  4. 555000 UAH → price_uah: 555000 UAH

Frontend получает:
{
  "price": 15000,
  "currency": "USD",
  "price_usd": 15000.00,
  "price_eur": 13636.36,
  "price_uah": 555000.00
}
```

---

## 🚀 Как применить

### 1. Перезапустить backend (для применения изменений в коде)
```bash
docker-compose restart app
```

### 2. Пересоздать тестовые объявления (опционально)
```bash
docker-compose exec app python manage.py seed_car_ads --count=50 --clear
```

### 3. Проверить результат
- Откройте: http://localhost:3000/autoria/moderation
- Вы должны увидеть объявления со всеми статусами
- Цены должны отображаться корректно во всех валютах

---

## 📊 Результаты

✅ На странице модерации теперь показываются **ВСЕ** объявления  
✅ Тестовые данные создаются с **разными статусами** (реалистично)  
✅ Цены автоматически конвертируются в **три валюты** (USD, EUR, UAH)  
✅ Конвертация работает через **UAH pivot** с актуальными курсами

