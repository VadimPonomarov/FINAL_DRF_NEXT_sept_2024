# 🚗 AutoRia Backend API - Повне керівництво

## 📋 Огляд

Сучасна платформа для продажу автомобілів з інтеграцією AI/LLM та зовнішніх API сервісів.

## 🎯 Швидкий старт

### Swagger документація
- **Swagger UI**: http://localhost:8000/api/doc/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: Доступна у форматах YAML та JSON

### Postman колекції
- Основна: `backend/AutoRia_API_Complete_Test_Suite.postman_collection.json`
- Детальний гайд: `backend/POSTMAN_TESTING_GUIDE.md`

---

## 🤖 AI/LLM Можливості

### Автоматична модерація контенту
- **Hard-block словник**: 161 слово (українська, російська, англійська, транслітерація)
- **Швидкість**: 58ms для профанності, ~15s для topic analysis
- **LLM Provider**: g4f + PollinationsAI (безкоштовно)
- **Точність**: 100% для профанності

### AI Генерація
- **Аватари**: через g4f API
- **Зображення оголошень**: через LLM prompts

**Код**: `backend/core/services/llm_moderation.py`

---

## 🌐 Зовнішні API Інтеграції

### 💰 Валютні курси (PrivatBank + NBU)
```python
# GET /api/currency/rates/
# POST /api/currency/convert/
{
    "amount": 100,
    "from_currency": "UAH",
    "to_currency": "USD"
}
```

**Особливості**:
- Кеш Redis 24h
- DB fallback для старих даних
- Кросс-конверсія через UAH

**Код**: `backend/apps/currency/services.py`

### 🗺️ Google Maps Geocoding
- Автоматичне визначення координат
- Валідація адрес
- Регіон/місто resolution

### 🤖 g4f API
- Генерація зображень
- LLM запити (безкоштовно)

---

## 👥 Система Ролей та Прав

### Типи користувачів

| Роль | Права | Обмеження |
|------|-------|-----------|
| **Покупець** | Перегляд оголошень, пошук, фільтрація | Немає створення оголошень |
| **Продавець (Basic)** | + Створення оголошень | Максимум 1 активне оголошення |
| **Продавець (Premium)** | + Аналітика, пріоритетна модерація | Без обмежень |
| **Менеджер** | + Модерація контенту | Немає зміни типів акаунтів |
| **Суперюзер** | Повний доступ | Все дозволено |

### Permissions
```python
# backend/core/permissions/permissions.py
IsSuperUser         # Тільки суперюзер
IsPremiumUser       # Premium підписка
IsOwnerOrReadOnly   # Тільки власник може редагувати
```

---

## 🔐 Суперюзерські Ендпоінти

### Управління статусами оголошень

```http
# Отримати детальну інформацію про статус
GET /api/ads/admin/{ad_id}/status/

# Змінити статус оголошення
PATCH /api/ads/admin/{ad_id}/status/
{
    "status": "active",  # pending, active, rejected, blocked
    "reason": "Модерація пройдена успішно"
}

# Пакетна зміна статусів
POST /api/ads/admin/bulk-status-update/
{
    "ad_ids": [1, 2, 3],
    "status": "active"
}
```

### Управління типами акаунтів

```http
# Змінити тип акаунту користувача
POST /api/accounts/change-type/{user_id}/
{
    "account_type": "premium",  # basic, premium
    "expires_at": "2025-12-31T23:59:59Z"
}

# Пакетна зміна типів
POST /api/accounts/bulk-change-type/
{
    "user_ids": [1, 2, 3],
    "account_type": "premium"
}
```

### Статистика платформи

```http
# Загальна статистика
GET /api/ads/admin/statistics/

# Відповідь:
{
    "total_ads": 1523,
    "active_ads": 1234,
    "pending_moderation": 45,
    "rejected_ads": 78,
    "blocked_ads": 12,
    "total_users": 567,
    "premium_users": 89,
    "daily_new_ads": 23,
    "moderation_queue_size": 45
}
```

**⚠️ ВАЖЛИВО**: Всі суперюзерські ендпоінти:
- Вимагають аутентифікації
- Перевіряють `is_superuser = True`
- Логують всі дії
- Використовують HTTPS в продакшені

---

## 🔍 Система Фільтрації, Пагінації та Сортування

### Фільтрація оголошень

**Базовий URL**: `GET /api/ads/cars/`

#### Фільтри по ціні
```http
# Діапазон цін
/api/ads/cars/?price_min=10000&price_max=50000&currency=USD

# Конкретна валюта
/api/ads/cars/?currency=UAH
```

#### Фільтри по характеристиках
```http
# Марка та модель
/api/ads/cars/?mark=Toyota&model=Camry

# Рік випуску
/api/ads/cars/?year_min=2015&year_max=2023

# Пробіг
/api/ads/cars/?mileage_max=100000

# Тип палива
/api/ads/cars/?fuel_type=petrol
```

#### Фільтри по локації
```http
# Регіон та місто
/api/ads/cars/?region=1&city=3

# Тільки з координатами
/api/ads/cars/?has_coordinates=true
```

#### Фільтри по статусу
```http
# Статус модерації
/api/ads/cars/?status=active

# Тільки валідовані
/api/ads/cars/?is_validated=true

# Тип продавця
/api/ads/cars/?seller_type=dealer
```

#### Пошук по тексту
```http
# Пошук в заголовку та описі
/api/ads/cars/?search=Toyota+Camry+2020
```

### Сортування

```http
# По ціні (за зростанням/спаданням)
/api/ads/cars/?ordering=price
/api/ads/cars/?ordering=-price

# По даті створення (найновіші)
/api/ads/cars/?ordering=-created_at

# По пробігу
/api/ads/cars/?ordering=mileage

# Множинне сортування
/api/ads/cars/?ordering=-created_at,price
```

**Доступні поля для сортування**:
- `price`, `created_at`, `updated_at`
- `year`, `mileage`, `engine_volume`
- `views_count`, `phone_views_count`

### Пагінація

```http
# PageNumberPagination (за замовчуванням)
/api/ads/cars/?page=2&page_size=20

# Відповідь:
{
    "count": 1523,
    "next": "http://localhost:8000/api/ads/cars/?page=3",
    "previous": "http://localhost:8000/api/ads/cars/?page=1",
    "results": [...]
}
```

**Налаштування**:
- Дефолтний розмір сторінки: 10
- Максимальний розмір сторінки: 100

### Комбіновані запити

```http
# Приклад: Premium Toyota Camry у Києві до $30k
/api/ads/cars/?mark=Toyota&model=Camry&city=1&price_max=30000&currency=USD&ordering=-created_at&page_size=20
```

---

## 📊 Код та Імплементація

### CarAdFilter
```python
# backend/apps/ads/filters.py
class CarAdFilter(django_filters.FilterSet):
    price_min = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    year_min = django_filters.NumberFilter(method='filter_year_min')
    year_max = django_filters.NumberFilter(method='filter_year_max')
    # ... інші фільтри
```

### ViewSet
```python
# backend/apps/ads/views/car_ad_views.py
class CarAdViewSet(viewsets.ModelViewSet):
    filterset_class = CarAdFilter
    pagination_class = PageNumberPagination
    ordering_fields = ['price', 'created_at', 'mileage']
    search_fields = ['title', 'description']
```

---

## 🎯 Best Practices

1. **Завжди використовуйте пагінацію** для списків
2. **Комбінуйте фільтри** для точного пошуку
3. **Використовуйте сортування** для кращого UX
4. **Кешуйте результати** на фронтенді
5. **Логуйте суперюзерські дії**

---

## 🔗 Пов'язані документи

- [Backend Services](./BACKEND_SERVICES.md) - Модерація, Celery, Media
- [Postman Testing Guide](../backend/POSTMAN_TESTING_GUIDE.md) - Повне тестування API
- [Setup Guide](./SETUP_GUIDE.md) - Налаштування зовнішніх сервісів

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25

