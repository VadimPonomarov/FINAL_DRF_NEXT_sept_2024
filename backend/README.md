# 🔧 AutoRia Backend - Django REST API

[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.14-red.svg)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)

Django REST Framework бекенд для платформи продажу автомобілів з AI модерацією, валютною системою та повнофункціональним API.

## 📋 Зміст

- [Особливості](#-особливості)
- [Вимоги](#-вимоги)
- [Встановлення](#-встановлення)
- [Налаштування](#-налаштування)
- [Запуск](#-запуск)
- [API Документація](#-api-документація)
- [Структура](#-структура)
- [Django Apps](#-django-apps)
- [Services](#-services)
- [Testing](#-testing)

## ✨ Особливості

### 🤖 AI/LLM Модерація
- Hard-block словник: 161 слово (🇺🇦🇷🇺🇬🇧🔤)
- Швидкість: 58ms (hard-block), ~15s (topic analysis)
- Provider: g4f + PollinationsAI (безкоштовно)
- Код: `core/services/llm_moderation.py`

### 💱 Валютна Система
- NBU + PrivatBank API інтеграція
- Redis кеш 24h + DB fallback
- Кросс-конверсія (UAH/USD/EUR)
- Код: `apps/currency/services.py`

### 🔐 Автентифікація та Авторизація
- JWT токени (access + refresh)
- Redis для токен storage
- Роль-based permissions
- NextAuth інтеграція

### 🗺️ Geocoding
- Google Maps API
- Автоматичне визначення координат
- Валідація адрес
- Код: `apps/ads/services/geocoding_service.py`

### ⏰ Celery Tasks
- Очистка тимчасових файлів (щотижня)
- Очистка застарілих токенів (щодня)
- Background jobs для важких операцій

## 📦 Вимоги

- **Python**: 3.11+
- **PostgreSQL**: 15+
- **Redis**: 7+
- **Poetry** або **pip**

## 🚀 Встановлення

### Через Poetry (рекомендовано)

```bash
# Встановити Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Встановити залежності
poetry install

# Активувати virtual environment
poetry shell
```

### Через pip

```bash
# Створити virtual environment
python -m venv venv

# Активувати
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Встановити залежності
pip install -r requirements.txt
```

## ⚙️ Налаштування

### 1. Environment Variables

```bash
# Структура env-config/
env-config/
├── .env.base          # Базові налаштування
├── .env.secrets       # API ключі (зашифровані)
├── .env.local         # Локальні переопределення
└── .env.docker        # Docker specific
```

### 2. Database

```bash
# PostgreSQL (через Docker)
docker run -d \
  --name autoria_db \
  -e POSTGRES_DB=autoria \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Або встановити локально
# https://www.postgresql.org/download/
```

### 3. Redis

```bash
# Redis (через Docker)
docker run -d \
  --name autoria_redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Міграції

```bash
# Застосувати міграції
python manage.py migrate

# Створити суперюзера
python manage.py createsuperuser
```

### 5. Заповнити тестові дані

```bash
# Довідники (марки, моделі, регіони)
python manage.py populate_references

# Тестові користувачі
python manage.py create_test_users

# Мокові оголошення (швидко)
python manage.py create_mock_system --quick

# Повна система (з LLM)
python manage.py populate_test_system --full
```

## 🎯 Запуск

### Development

```bash
# Django development server
python manage.py runserver

# Доступно на http://localhost:8000
```

### Celery (для фонових задач)

```bash
# Worker
celery -A config worker -l info

# Beat (scheduler)
celery -A config beat -l info

# Flower (monitoring)
celery -A config flower
# Відкрити http://localhost:5555
```

### Production

```bash
# З Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

## 📚 API Документація

### Swagger UI
- **URL**: http://localhost:8000/api/doc/
- **Interactive**: Так, можна тестувати endpoints

### ReDoc
- **URL**: http://localhost:8000/api/redoc/
- **Read-only**: Краща для читання документації

### OpenAPI Schema
- **YAML**: http://localhost:8000/api/schema/
- **JSON**: http://localhost:8000/api/schema/?format=json

### Postman
- **Колекція**: `AutoRia_API_Complete_Test_Suite.postman_collection.json`
- **Environment**: `AutoRia_API_Complete_Test_Suite.postman_environment.json`
- **Гайд**: [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md)

## 📁 Структура

```
backend/
├── apps/                           # Django додатки
│   ├── ads/                        # Оголошення
│   │   ├── models/                 # Моделі (CarAd, CarAdImage, etc.)
│   │   ├── serializers/            # DRF серіалізатори
│   │   ├── views/                  # API views
│   │   ├── services/               # Бізнес-логіка
│   │   ├── filters.py              # Django-filters
│   │   └── permissions.py          # Permissions
│   ├── auth/                       # Автентифікація
│   ├── accounts/                   # Типи акаунтів
│   ├── currency/                   # Валюти
│   ├── users/                      # Користувачі
│   ├── chat/                       # WebSocket chat
│   └── moderation/                 # Модерація
├── config/                         # Django налаштування
│   ├── settings.py                 # Основні налаштування
│   ├── urls.py                     # URL routing
│   ├── extra_config/               # Модульні конфіги
│   │   ├── db_config.py
│   │   ├── cache_config.py
│   │   ├── security_config.py
│   │   └── ...
│   └── celery.py                   # Celery налаштування
├── core/                           # Спільні утиліти
│   ├── services/                   # Сервіси
│   │   ├── llm_moderation.py      # LLM модерація (58ms)
│   │   ├── email.py               # Email service
│   │   ├── jwt.py                 # JWT утиліти
│   │   └── ...
│   ├── permissions/                # Спільні permissions
│   ├── serializers/                # Базові серіалізатори
│   └── utils/                      # Утиліти
├── media/                          # Завантажені файли
├── staticfiles/                    # Зібрані статичні файли
├── logs/                           # Логи
│   ├── django.log
│   ├── security.log
│   └── ...
├── manage.py                       # Django CLI
├── pyproject.toml                  # Poetry dependencies
└── requirements.txt                # Pip dependencies
```

## 🎯 Django Apps

### `apps/ads/`
**Оголошення про продаж авто**

Моделі:
- `CarAdModel` - Основне оголошення
- `CarAdImageModel` - Зображення
- `CarAdView` - Перегляди
- `FavoriteModel` - Обране

Ключові ендпоінти:
```http
GET    /api/ads/cars/
POST   /api/ads/cars/
GET    /api/ads/cars/{id}/
PATCH  /api/ads/cars/{id}/
DELETE /api/ads/cars/{id}/
POST   /api/ads/cars/{id}/images/upload/
POST   /api/ads/cars/{id}/images/generate/  # AI generation
```

### `apps/auth/`
**Автентифікація**

Ендпоінти:
```http
POST /api/auth/login/
POST /api/auth/register/
POST /api/auth/logout/
POST /api/auth/token/refresh/
POST /api/auth/password/reset/
POST /api/auth/password/reset/confirm/
```

### `apps/currency/`
**Валютна система**

Моделі:
- `CurrencyRate` - Курси валют

Ендпоінти:
```http
GET  /api/currency/rates/
POST /api/currency/convert/
```

Сервіси:
- `CurrencyService.get_rate()` - Отримати курс з кешем
- `CurrencyService.convert_amount()` - Конвертувати суму
- `CurrencyService.update_single_rate()` - Оновити з NBU/PrivatBank

### `apps/users/`
**Користувачі**

Моделі:
- `UserModel` - Користувач (extends AbstractUser)
- `ProfileModel` - Профіль

Ендпоінти:
```http
GET   /api/users/profile/
PATCH /api/users/profile/
POST  /api/users/avatar/upload/
```

## 🔧 Services

### `core/services/llm_moderation.py`
**LLM Модерація контенту**

```python
from core.services.llm_moderation import moderate_content

result = moderate_content(
    title="Продам Toyota Camry 2020",
    description="Автомобіль в ідеальному стані..."
)

# Результат:
{
    "approved": True,
    "profanity_detected": False,
    "processing_time": 0.058  # 58ms
}
```

**Особливості**:
- Hard-block словник: 161 слово
- Fast-path: 58ms для профанності
- LLM topic analysis: ~15s для чистого контенту
- g4f + PollinationsAI (безкоштовно)

### `apps/currency/services.py`
**Валютний сервіс**

```python
from apps.currency.services import CurrencyService

# Отримати курс (з кешем)
rate = CurrencyService.get_rate('UAH', 'USD')  # 0.0238

# Конвертувати
amount = CurrencyService.convert_amount(100, 'UAH', 'USD')  # 2.38
```

**Особливості**:
- Redis кеш 24h
- DB fallback для старих даних
- Кросс-конверсія через UAH
- Інверсія курсів (правильна інтерпретація NBU даних)

### `apps/ads/services/geocoding_service.py`
**Geocoding сервіс**

```python
from apps.ads.services.geocoding_service import geocode_address

coords = geocode_address("Київ, вул. Хрещатик 1")
# {'lat': 50.4501, 'lng': 30.5234}
```

## 🧪 Testing

### Django Tests

```bash
# Всі тести
python manage.py test

# Конкретний app
python manage.py test apps.ads

# З coverage
coverage run --source='.' manage.py test
coverage report
```

### Postman/Newman

```bash
# Повний набір тестів
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
  -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Core API
newman run AutoRia_API_Core.postman_collection.json \
  -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Модерація
newman run AutoRia_API_Moderation.postman_collection.json \
  -e AutoRia_API_Complete_Test_Suite.postman_environment.json
```

**Результати**: 95%+ pass rate (критичні модулі 100%)

Детальний гайд: [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md)

## 📊 Management Commands

```bash
# Створити тестових користувачів
python manage.py create_test_users

# Заповнити довідники
python manage.py populate_references

# Створити мокові дані (швидко)
python manage.py create_mock_system --quick

# Повна система (з LLM)
python manage.py populate_test_system --full

# Очистка медіа файлів
python manage.py clean_media --days 7

# Оновити валютні курси
python manage.py update_currency_rates
```

## 🔒 Security

- **Django Security Middleware**: Enabled
- **CORS**: Налаштовано для frontend
- **CSRF**: Protection enabled
- **SQL Injection**: Django ORM захищає
- **XSS**: Template escaping
- **Secrets**: Зашифровані через Fernet
- **Rate Limiting**: DRF throttling

## 📈 Performance

- **Database**: Connection pooling, select_related, prefetch_related
- **Cache**: Redis для курсів валют, токенів, сесій
- **Celery**: Фонові задачі для важких операцій
- **Pagination**: DRF пагінація (10-100 items)
- **Indexes**: На всіх FK, часто використовувані поля

## 🔗 Пов'язані документи

- [Повна документація](../docs/README.md)
- [Backend API Guide](../docs/BACKEND_API_GUIDE.md)
- [Backend Services](../docs/BACKEND_SERVICES.md)
- [Setup Guide](../docs/SETUP_GUIDE.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦
