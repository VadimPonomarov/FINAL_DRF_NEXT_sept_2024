# 🚗 AutoRia - Інтелектуальна платформа автомобільних оголошень

## 📋 Опис проекту

AutoRia - це сучасна платформа для розміщення автомобільних оголошень з інтелектуальною системою модерації на основі LLM та автоматичним оновленням курсів валют. Система побудована на Django REST Framework з використанням мікросервісної архітектури.

## 🏗️ Архітектура системи

### Основні компоненти:
- **Backend**: Django REST Framework + PostgreSQL
- **Черги**: RabbitMQ + Celery
- **Кешування**: Redis
- **Модерація**: LLM-система з промптами
- **Валюти**: Автооновлення через API НБУ/ПриватБанк
- **Тестування**: Postman колекції

## 🧠 Інтелектуальна система модерації

### Особливості LLM-модерації:

#### 🌍 **Багатомовна модерація**
- **Українська мова**: `блять`, `хуй`, `пизда`, `сука` → автоблокування
- **Російська мова**: `блядь`, `хуй`, `пизда`, `сука` → автоблокування
- **Англійська мова**: `fuck`, `shit`, `bitch`, `damn` → автоблокування
- **Транслітерація**: `blyat`, `hui`, `pizda`, `suka` → автоблокування
- **Замаскована**: `bl4at`, `hu1`, `p1zda`, `s0ka` → інтелектуальне виявлення

#### ⭐ **Цензурування зірочками**
```
блять → б****
хуй → х**
пизда → п****
fuck → f***
blyat → b****
```

#### 🎯 **Двоетапний процес модерації**

**ЕТАП 1: LLM-аналіз**
- Виявлення нецензурної лексики на будь-якій мові
- Тематична перевірка (дозволений тільки транспорт)
- Цензурування знайдених слів
- Визначення мови та впевненості

**ЕТАП 2: Додаткові перевірки**
- Перевірка адекватності ціни
- Аналіз довжини контенту
- Детекція спаму (повтори, КАПС)
- Оцінка повноти інформації

#### 📊 **Финальные статусы**
- `APPROVED` - объявление одобрено
- `REJECTED` - объявление отклонено
- `NEEDS_REVIEW` - требует ручной проверки

### Файлы модерации:
```
backend/core/services/llm_moderation.py     # LLM-система на промптах
backend/apps/ads/views/car_ad_views.py      # TestModerationView
```

## 💱 Система автообновления курсов валют

### Особенности работы с курсами:

#### 🔄 **Автоматическое обновление при отсутствии данных**
- При запросе курса → если отсутствует в БД → автозапрос к API
- При устаревшем курсе (>24ч) → автообновление
- Кэширование курсов на 1 час для производительности

#### 🕐 **Celery Beat расписание**
```python
# config/celery.py
'update-currency-rates-daily': {
    'task': 'apps.currency.tasks.update_currency_rates_daily',
    'schedule': crontab(hour=8, minute=0),  # 08:00 ежедневно
    'kwargs': {'source': 'NBU'}
},
'update-currency-rates-backup': {
    'task': 'apps.currency.tasks.update_currency_rates_daily', 
    'schedule': crontab(hour=14, minute=0), # 14:00 резерв
    'kwargs': {'source': 'PRIVATBANK'}
},
'cleanup-old-currency-rates': {
    'task': 'apps.currency.tasks.cleanup_old_currency_rates',
    'schedule': crontab(hour=3, minute=0),  # 03:00 очистка
    'kwargs': {'days_to_keep': 30}
}
```

#### 📊 **Множественные источники данных**
- **НБУ** (Национальный банк Украины) - основной источник
- **ПриватБанк** - резервный источник  
- **ExchangeRate-API** - международный источник

#### 🔧 **API endpoints для курсов**
```
GET  /api/currency/rates/                    # Все курсы с автообновлением
GET  /api/currency/rates/UAH/USD/            # Конкретный курс
POST /api/currency/convert/                  # Конвертация валют
GET  /api/currency/status/                   # Статус системы
POST /api/currency/update/UAH/USD/           # Принудительное обновление
GET  /api/currency/logs/                     # История обновлений
```

### Файлы валютной системы:
```
backend/apps/currency/models.py              # Модели курсов и логов
backend/apps/currency/services.py            # CurrencyService
backend/apps/currency/tasks.py               # Celery задачи
backend/apps/currency/views.py               # API endpoints
```

## 🔐 Система аутентификации и авторизации

### Многоуровневая система доступа:
- **JWT токены** для API аутентификации
- **OAuth2** для внешних интеграций
- **Роли пользователей**: обычный, премиум, модератор, админ
- **Ограничения по аккаунтам**: базовый (10 объявлений), премиум (безлимит)

## 📊 Система уведомлений

### RabbitMQ + Celery интеграция:
- **Email уведомления** о статусе модерации
- **Система 3 попыток** для неудачных объявлений
- **Ежедневная статистика** для пользователей
- **Уведомления о курсах валют**

## 🗄️ Структура базы данных

### Основные модели:
```python
# Пользователи и аккаунты
User                    # Пользователи системы
Account                 # Аккаунты (базовый/премиум)
UserProfile            # Профили пользователей

# Объявления
CarAd                  # Автомобильные объявления
CarMark, CarModel      # Справочники марок и моделей
Region, City           # Географические данные

# Модерация
ModerationResult       # Результаты модерации
ModerationLog          # Логи модерации

# Валюты
CurrencyRate           # Курсы валют
CurrencyUpdateLog      # Логи обновлений курсов

# Уведомления
Notification           # Уведомления пользователей
EmailLog               # Логи отправки email
```

## 🧪 Тестирование системы

### Postman коллекции:

#### 📁 **simple_test.postman_collection.json**
Базовые тесты функциональности:
- Создание пользователей и аккаунтов
- CRUD операции с объявлениями
- Аутентификация и авторизация
- Базовая модерация

#### 📁 **AutoRia_COMPLETE_MODERATION_Process.postman_collection.json**
Полное тестирование модерации:
- ✅ Чистый контент (украинский) → APPROVED
- 🇺🇦 Украинская нецензурщина → REJECTED + цензура
- 🇷🇺 Русская нецензурщина → REJECTED + цензура  
- 🇺🇸 Английская нецензурщина → REJECTED + цензура
- 🔤 Транслитерация → REJECTED + цензура
- 🎭 Замаскированная нецензурщина → REJECTED + цензура
- 🚫 Запрещенная тематика → REJECTED
- 💰 Подозрительная цена → NEEDS_REVIEW
- 📢 Спам контент → NEEDS_REVIEW

#### 📁 **AutoRia_CURRENCY_AUTO_UPDATE_Tests.postman_collection.json**
Тестирование автообновления курсов:
- 💱 Получение курса USD (автообновление)
- 💱 Получение курса EUR (автообновление)  
- 💰 Конвертация 1000 USD в UAH
- 📊 Статус системы курсов
- 🔄 Принудительное обновление USD
- 📝 История обновлений курсов
- 📋 Все курсы валют

### Запуск тестов:
```bash
# Базовые тесты
newman run simple_test.postman_collection.json

# Тесты модерации
newman run AutoRia_COMPLETE_MODERATION_Process.postman_collection.json

# Тесты курсов валют
newman run AutoRia_CURRENCY_AUTO_UPDATE_Tests.postman_collection.json
```

## 🚀 Установка и запуск

### Требования:
- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.8+

### Установка:
```bash
# Клонирование репозитория
git clone <repository-url>
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных окружения
cp .env.example .env.local
# Отредактируйте .env.local

# Миграции базы данных
python manage.py makemigrations
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Загрузка справочных данных
python manage.py loaddata fixtures/car_marks.json
python manage.py loaddata fixtures/regions.json
```

### Запуск сервисов:
```bash
# Django сервер
python manage.py runserver 0.0.0.0:8000

# Celery worker (в отдельном терминале)
celery -A config worker -l info

# Celery beat (в отдельном терминале)
celery -A config beat -l info

# Celery flower (мониторинг, опционально)
celery -A config flower
```

## 📈 Мониторинг и логирование

### Логи системы:
- **Django логи**: стандартное логирование Django
- **Celery логи**: логи фоновых задач
- **Модерация логи**: детальные логи LLM-модерации
- **Валютные логи**: логи обновления курсов
- **Email логи**: логи отправки уведомлений

### Мониторинг:
- **Celery Flower**: веб-интерфейс для мониторинга задач
- **Django Admin**: административная панель
- **API endpoints**: статусы системы через API

## 🔧 Конфигурация

### Основные настройки:
```python
# config/settings.py
INSTALLED_APPS = [
    'apps.users',           # Пользователи
    'apps.accounts',        # Аккаунты
    'apps.ads',            # Объявления
    'apps.currency',       # Валюты
    'apps.notifications',  # Уведомления
]

# Celery настройки
CELERY_BROKER_URL = 'amqp://guest@localhost//'
CELERY_RESULT_BACKEND = 'redis://localhost:6379'

# Кэш настройки
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

## 🎯 Ключевые особенности проекта

### 1. **Интеллектуальная модерация**
- Работает через LLM-промпты, а не жесткие правила
- Обнаруживает нецензурщину на любом языке
- Интеллектуально цензурирует найденные слова
- Двухэтапный процесс с детальной аналитикой

### 2. **Автоматические курсы валют**
- Автообновление при отсутствии данных
- Множественные источники с fallback
- Celery Beat для ежедневного обновления
- Кэширование для производительности

### 3. **Микросервисная архитектура**
- Разделение на независимые приложения
- RabbitMQ для асинхронной обработки
- Redis для кэширования и сессий
- Celery для фоновых задач

### 4. **Комплексное тестирование**
- Postman коллекции для всех функций
- Автоматизированные тесты модерации
- Тесты автообновления курсов
- Интеграционные тесты API

### 5. **Производственная готовность**
- Детальное логирование всех операций
- Мониторинг через Celery Flower
- Обработка ошибок и retry логика
- Масштабируемая архитектура

## 📞 Контакты и поддержка

Для вопросов по проекту обращайтесь к документации или создавайте issues в репозитории.

---

**AutoRia** - современная платформа автомобильных объявлений с интеллектуальной модерацией! 🚗✨

## 🚀 Установка и запуск

### Требования:
- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.8+

### Установка:
```bash
# Клонирование репозитория
git clone <repository-url>
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных окружения
cp .env.example .env.local
# Отредактируйте .env.local

# Миграции базы данных
python manage.py makemigrations
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Загрузка справочных данных
python manage.py loaddata fixtures/car_marks.json
python manage.py loaddata fixtures/regions.json
```

### Запуск сервисов:
```bash
# Django сервер
python manage.py runserver 0.0.0.0:8000

# Celery worker (в отдельном терминале)
celery -A config worker -l info

# Celery beat (в отдельном терминале)  
celery -A config beat -l info

# Celery flower (мониторинг, опционально)
celery -A config flower
```

## 📈 Мониторинг и логирование

### Логи системы:
- **Django логи**: стандартное логирование Django
- **Celery логи**: логи фоновых задач
- **Модерация логи**: детальные логи LLM-модерации
- **Валютные логи**: логи обновления курсов
- **Email логи**: логи отправки уведомлений

### Мониторинг:
- **Celery Flower**: веб-интерфейс для мониторинга задач
- **Django Admin**: административная панель
- **API endpoints**: статусы системы через API

## 🔧 Конфигурация

### Основные настройки:
```python
# config/settings.py
INSTALLED_APPS = [
    'apps.users',           # Пользователи
    'apps.accounts',        # Аккаунты  
    'apps.ads',            # Объявления
    'apps.currency',       # Валюты
    'apps.notifications',  # Уведомления
]

# Celery настройки
CELERY_BROKER_URL = 'amqp://guest@localhost//'
CELERY_RESULT_BACKEND = 'redis://localhost:6379'

# Кэш настройки
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```
