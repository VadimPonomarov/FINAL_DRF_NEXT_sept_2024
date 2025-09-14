# 🎭 Система генерации мокковых данных AutoRia

Комплексная система для создания реалистичных тестовых данных с использованием LLM и Django Ninja.

## 🚀 Автоматическое создание при запуске Docker

При запуске `docker-compose up` автоматически создаются:

1. **Справочники автомобилей** (марки, модели, цвета)
2. **Тестовые пользователи** (админы, менеджеры, покупатели, продавцы)
3. **Мокковая система** (продавцы с объявлениями)

```bash
# Запуск с автоматическим созданием данных
docker-compose up
```

## 🛠️ Ручные команды

### 1. Создание тестовых пользователей

```bash
# Создать базовых тестовых пользователей
docker-compose exec app python manage.py create_test_users

# С кастомным паролем
docker-compose exec app python manage.py create_test_users --password mypass123
```

**Создает:**
- 👑 Суперпользователь: `admin@autoria.com`
- 👔 Менеджеры: `manager@autoria.com`, `moderator@autoria.com`
- 👤 Покупатели: `buyer1@gmail.com`, `buyer2@ukr.net`
- 🏪 Продавцы: `seller1@gmail.com`, `dealer@autohouse.com`

### 2. Создание мокковой системы

```bash
# Быстрое создание (5 продавцов, 20 объявлений)
docker-compose exec app python manage.py create_mock_system --quick

# Стандартное создание (15 продавцов, 50 объявлений)
docker-compose exec app python manage.py create_mock_system

# Очистить и создать заново
docker-compose exec app python manage.py create_mock_system --clear
```

### 3. LLM-генератор данных (расширенный)

```bash
# Генерация с помощью LLM
docker-compose exec app python manage.py generate_mock_data --locale uk_UA --users 50 --car-ads 100

# Полная система
docker-compose exec app python manage.py populate_test_system --full
```

## 🎯 Структура созданных данных

### 👥 Пользователи и роли

| Роль | Email | Пароль | Описание |
|------|-------|--------|----------|
| **Суперпользователь** | admin@autoria.com | test123 | Полный доступ к админке |
| **Менеджер** | manager@autoria.com | test123 | Управление объявлениями |
| **Модератор** | moderator@autoria.com | test123 | Модерация контента |
| **Покупатель** | buyer1@gmail.com | test123 | Поиск и просмотр авто |
| **Продавец** | seller1@gmail.com | test123 | Создание объявлений |
| **Дилер** | dealer@autohouse.com | test123 | Премиум продавец |

### 🚗 Автомобильные данные

**Справочники:**
- **Типы транспорта**: Легкові, Мото, Вантажівки, Автобуси
- **Марки**: Toyota, BMW, Mercedes-Benz, Audi, Volkswagen, Ford, Honda, Nissan
- **Модели**: Camry, Corolla, 3 Series, X5, Golf, Focus, Civic, Qashqai
- **Цвета**: Білий, Чорний, Сірий, Сріблястий, Червоний, Синій

**Объявления:**
- Реалистичные заголовки и описания на украинском
- Цены от 8,000 до 50,000 UAH
- Годы выпуска: 2015-2024
- Пробег: 0-200,000 км
- Различные характеристики (двигатель, КПП, привод)

### 🗺️ Локации

**Регионы:**
- Київська область
- Львівська область  
- Харківська область
- Одеська область
- Дніпропетровська область

**Города:**
- Областные центры + дополнительные города
- Реалистичная численность населения
- Связь регион-город

## 🧠 LLM-генератор (core/services/llm_mock_generator.py)

### Основные возможности

1. **Автоматическое создание Pydantic схем** из Django моделей
2. **Локализация данных** (uk_UA, en_US, ru_RU)
3. **Batch обработка** для больших объемов
4. **Fallback на Faker** если LLM недоступен
5. **Валидация данных** через сериализаторы

### Пример использования

```python
from core.services.llm_mock_generator import generate_mock_data
from apps.users.models import UserModel
from apps.users.serializers import UserSerializer

# Генерация пользователей
users = generate_mock_data(
    prompt="Создай украинских пользователей для AutoRia",
    django_model=UserModel,
    serializer_class=UserSerializer,
    count=50,
    locale='uk_UA',
    exclude_fields=['password', 'last_login']
)
```

### Конфигурация локалей

```python
# Украинская локаль
'uk_UA': {
    'language': 'українська',
    'country': 'Україна',
    'currency': 'UAH',
    'phone_format': '+380XXXXXXXXX',
    'name_style': 'українські імена та прізвища',
}
```

## 📊 Мониторинг и статистика

### Проверка созданных данных

```bash
# Статистика системы
docker-compose exec app python manage.py shell -c "
from apps.users.models import UserModel
from apps.accounts.models import AddsAccount  
from apps.ads.models import CarAd

print(f'Пользователи: {UserModel.objects.count()}')
print(f'Продавцы: {AddsAccount.objects.count()}')
print(f'Объявления: {CarAd.objects.count()}')
"
```

### Тестирование API

```bash
# Получить список объявлений
curl http://localhost:8000/api/ads/

# Авторизация
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "seller1@gmail.com", "password": "test123"}'
```

## 🔧 Настройка и кастомизация

### Изменение количества данных

```python
# В create_mock_system.py
self.config = {
    'sellers': 20,      # Количество продавцов
    'buyers': 40,       # Количество покупателей  
    'car_ads': 100,     # Количество объявлений
    'regions': 8        # Количество регионов
}
```

### Добавление новых типов данных

```python
# Создание генератора для новой модели
from core.services.llm_mock_generator import generate_mock_data

generate_mock_data(
    prompt="Создай отзывы о автомобилях",
    django_model=ReviewModel,
    serializer_class=ReviewSerializer,
    count=100,
    locale='uk_UA'
)
```

### Кастомные Pydantic схемы

```python
from pydantic import BaseModel

class CustomUserSchema(BaseModel):
    email: str
    name: str
    age: int

# Использование кастомной схемы
generate_mock_data(
    prompt="Создай пользователей",
    django_model=UserModel,
    serializer_class=UserSerializer,
    count=50,
    pydantic_model=CustomUserSchema
)
```

## 🚨 Устранение проблем

### Проблема: Данные не создаются

```bash
# Проверить логи
docker-compose logs app | grep -E "(Creating|Error)"

# Ручное создание
docker-compose exec app python manage.py create_test_users
docker-compose exec app python manage.py create_mock_system --quick
```

### Проблема: Ошибки валидации

```bash
# Проверить модели и сериализаторы
docker-compose exec app python manage.py check

# Создать миграции
docker-compose exec app python manage.py makemigrations
docker-compose exec app python manage.py migrate
```

### Проблема: Нет справочных данных

```bash
# Принудительное создание справочников
docker-compose exec app python manage.py auto_populate_references --force
```

## 📈 Производительность

### Оптимизация для больших объемов

1. **Увеличить batch_size** для bulk операций
2. **Использовать транзакции** для группировки
3. **Отключить сигналы** Django при массовой загрузке
4. **Мониторить память** при генерации

```python
# Пример оптимизированной генерации
generate_mock_data(
    prompt="...",
    django_model=CarAd,
    serializer_class=CarAdSerializer,
    count=1000,
    batch_size=200,  # Увеличенный batch
    locale='uk_UA'
)
```

## 🎯 Готовые сценарии тестирования

После создания мокковых данных доступны:

1. **Тестирование авторизации** - разные роли пользователей
2. **Тестирование CRUD операций** - создание/редактирование объявлений  
3. **Тестирование поиска** - фильтрация по марке, цене, году
4. **Тестирование модерации** - разные статусы объявлений
5. **Тестирование API** - полный набор эндпоинтов
6. **Нагрузочное тестирование** - большое количество данных

**Система мокковых данных готова для полноценного тестирования AutoRia! 🎉**
