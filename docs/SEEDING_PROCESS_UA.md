# 🌱 Процес сідингу даних при розгортанні AutoRia Clone

## 📋 Зміст
- [Загальний огляд](#загальний-огляд)
- [Послідовність запуску](#послідовність-запуску)
- [Етапи ініціалізації](#етапи-ініціалізації)
- [Розумний сідинг](#розумний-сідинг)
- [Порядок заповнення даних](#порядок-заповнення-даних)
- [Система відстеження](#система-відстеження)
- [Управління сідингом](#управління-сідингом)
- [Налаштування](#налаштування)

## 🎯 Загальний огляд

Процес сідингу даних в AutoRia Clone - це автоматизована система заповнення бази даних початковими даними при першому розгортанні проекту. Система забезпечує:

- ✅ **Автоматичне заповнення** довідників та тестових даних
- ✅ **Захист від дублювання** - не створює дані повторно
- ✅ **Відновлення після збоїв** - продовжує з місця зупинки
- ✅ **Гнучке управління** - можна вимкнути або примусово перезапустити

## 🚀 Послідовність запуску

### Docker Compose команда
```yaml
command: >
  sh -c "
    echo '🚀 Starting Django with seeding...' &&
    python manage.py wait_db --timeout=60 &&
    python manage.py wait_redis --timeout=60 &&
    python manage.py wait_rabbitmq --timeout=60 &&
    echo '🔄 Running migrations...' &&
    python manage.py migrate --noinput &&
    echo '🌱 Seeding database...' &&
    python manage.py init_project_data &&
    echo '📁 Collecting static files...' &&
    python manage.py collectstatic --noinput --clear &&
    echo '✅ Setup complete! Starting server...' &&
    python manage.py runserver 0.0.0.0:8000
  "
```

### Схема запуску
```
1. 🐳 Docker Compose запускає app контейнер
2. ⏳ Очікування готовності залежностей (PostgreSQL, Redis, RabbitMQ)
3. 🔄 Застосування міграцій Django
4. 🌱 Розумний сідинг даних (init_project_data)
5. 📁 Збір статичних файлів
6. 🚀 Запуск Django сервера
```

## 🔄 Етапи ініціалізації

### Етап 1: Очікування залежностей
- **PostgreSQL** - очікує готовності БД (60 сек)
- **Redis** - очікує готовності кешу (60 сек)
- **RabbitMQ** - очікує готовності черг (60 сек)

### Етап 2: Міграції
```bash
python manage.py migrate --noinput
```
- Створює структуру таблиць
- Застосовує всі міграції Django

### Етап 3: Сідинг даних
```bash
python manage.py init_project_data
```
- Розумне заповнення даних з відстеженням
- Захист від дублювання
- Відновлення після збоїв

## 🧠 Розумний сідинг

### Основна команда: `init_project_data.py`

Команда виконує наступні кроки:

1. **Перевірка змінних середовища**
   ```python
   run_seeds = os.getenv('RUN_SEEDS', 'true').lower() in ('true', '1', 't', 'yes')
   ```

2. **Аналіз стану бази даних**
   ```python
   def _analyze_database_state(self):
       empty_tables = []
       if not CarMarkModel.objects.exists():
           empty_tables.append('reference_data')
       if not User.objects.filter(email__contains='test').exists():
           empty_tables.append('test_users')
       return empty_tables
   ```

3. **Розумний сідинг з відстеженням**
   ```python
   seeding_operations = [
       ('reference_data', 'Довідкові дані (регіони, міста, марки/моделі)', self._populate_reference_data),
       ('test_users', 'Тестові користувачі', self._create_test_users),
       ('car_generations', 'Покоління та модифікації автомобілів', self._create_car_generations),
       ('formatted_addresses', 'Форматовані адреси', self._create_formatted_addresses),
       ('car_ads', 'Оголошення автомобілів', self._create_car_advertisements),
       ('car_images', 'Зображення автомобілів', self._create_car_images),
   ]
   ```

## 📊 Порядок заповнення даних

### 1. Довідкові дані (reference_data)
**Що створюється:**
- 🌍 **Регіони та міста** з CSV файлів
- 🚗 **Марки автомобілів** (BMW, Mercedes, Toyota, Audi, тощо)
- 🔧 **Моделі автомобілів** для кожної марки
- 🎨 **Кольори автомобілів** (стандартна палітра)

**Джерела даних:**
- `backend/core/data/cars_dict_output.csv` - марки та моделі
- `backend/core/data/regions.csv` - регіони України
- `backend/core/data/cities.csv` - міста України

### 2. Тестові користувачі (test_users)
**Що створюється:**
- 👤 **Звичайні користувачі** (BASIC аккаунти)
- 💎 **Преміум користувачі** (PREMIUM аккаунти)
- 🔧 **Адміністратори** для тестування

**Приклади користувачів:**
```python
users_data = [
    {'email': 'test.user1@example.com', 'account_type': 'BASIC'},
    {'email': 'premium.user@example.com', 'account_type': 'PREMIUM'},
    {'email': 'admin@example.com', 'is_staff': True, 'is_superuser': True},
]
```

### 3. Покоління автомобілів (car_generations)
**Що створюється:**
- 📅 **Покоління** для популярних моделей
- ⚙️ **Модифікації** з технічними характеристиками
- 🔧 **Двигуни** та їх параметри

### 4. Форматовані адреси (formatted_addresses)
**Що створюється:**
- 📍 **Геолокаційні дані** для адрес
- 🗺️ **Координати** для карт
- 🏢 **Структуровані адреси**

### 5. Оголошення автомобілів (car_ads)
**Що створюється:**
- 📢 **Тестові оголошення** для демонстрації
- 💰 **Різні цінові категорії**
- 📊 **Статистичні дані** для аналітики

### 6. Зображення автомобілів (car_images)
**Що створюється:**
- 🖼️ **Placeholder зображення**
- 📸 **Мініатюри** для списків
- 🎨 **Галереї** для детальних сторінок

## 🔍 Система відстеження

### SeedingTracker клас
```python
class SeedingTracker:
    def __init__(self, tracker_file: str = None):
        if tracker_file is None:
            # Зберігається в media директорії (персистентна)
            tracker_file = "/app/media/seeding_history.json"
```

### Файл відстеження: `seeding_history.json`
```json
{
  "version": "1.0.0",
  "created_at": "2025-01-14T10:30:00",
  "seeding_operations": {
    "reference_data": {
      "status": "completed",
      "completed_at": "2025-01-14T10:31:00",
      "environment": "docker",
      "records_created": 1250
    },
    "test_users": {
      "status": "completed",
      "completed_at": "2025-01-14T10:31:30",
      "environment": "docker",
      "records_created": 24
    }
  }
}
```

### Особливості системи відстеження:
- ✅ **Запобігає дублюванню** - не створює дані повторно
- ✅ **Відновлення після збоїв** - продовжує з місця зупинки
- ✅ **Персистентність** - зберігає історію між перезапусками
- ✅ **Детальна статистика** - кількість створених записів

## 🎛️ Управління сідингом

### Змінні середовища

#### Основні налаштування:
```bash
# Увімкнути/вимкнути сідинг
RUN_SEEDS=true

# Примусовий пересід (очистити історію)
FORCE_RESEED=true

# Визначення Docker середовища
IS_DOCKER=true

# Рівень деталізації логів
SEEDING_VERBOSITY=2
```

#### Налаштування в `.env.docker`:
```bash
IS_DOCKER=true
DEBUG=true
RUN_SEEDS=true
```

### Команди управління

#### Повна ініціалізація:
```bash
# Стандартний запуск
python manage.py init_project_data

# З детальними логами
python manage.py init_project_data --verbosity=2

# Примусовий пересід
python manage.py init_project_data --force
```

#### Часткова ініціалізація:
```bash
# Пропустити користувачів
python manage.py init_project_data --skip-users

# Пропустити довідники
python manage.py init_project_data --skip-references

# Пропустити міграції
python manage.py init_project_data --skip-migrations
```

#### Окремі команди:
```bash
# Тільки довідники
python manage.py populate_car_references

# Тільки користувачі
python manage.py create_test_users

# Безпечне заповнення з моніторингом пам'яті
python manage.py seed_references_safe --monitor-memory
```

## ⚙️ Налаштування

### Конфігурація в Docker Compose
```yaml
environment:
  IS_DOCKER: true
  RUN_SEEDS: true
  FORCE_RESEED: false
  SEEDING_VERBOSITY: 1
```

### Налаштування розміру батчів
```python
# В команді populate_car_references
parser.add_argument(
    '--batch-size',
    type=int,
    default=1000,
    help='Розмір батчу для bulk операцій (за замовчуванням: 1000)',
)
```

### Обмеження для тестування
```python
# Обмежити кількість записів для тестування
parser.add_argument(
    '--limit',
    type=int,
    help='Обмежити кількість рядків для обробки',
)
```

## 📈 Моніторинг та логування

### Рівні деталізації:
- `--verbosity=0` - тільки помилки
- `--verbosity=1` - основна інформація (за замовчуванням)
- `--verbosity=2` - детальна інформація
- `--verbosity=3` - максимальна деталізація

### Приклад логів:
```
🚀 Starting Django with seeding...
✅ All dependencies are ready!
🔄 Running migrations...
🌱 Seeding database...
📊 Analyzing database state...
✅ Reference data already exists (1,250 records)
✅ Test users already exists (24 records)
⏭️ Skipping completed operations
📈 Database summary:
  - Car marks: 45
  - Car models: 1,205
  - Users: 24 (4 premium)
  - Advertisements: 8
✅ Project initialization completed successfully!
```

## 🔄 Сценарії використання

### Перший запуск (чиста БД):
```
1. 🔍 Перевірка RUN_SEEDS=true
2. 📋 Аналіз стану БД (порожня)
3. 🌱 Створення всіх даних (~2-3 хвилини)
4. 📝 Збереження історії в seeding_history.json
5. ✅ Готова система з тестовими даними
```

### Повторний запуск:
```
1. 🔍 Перевірка RUN_SEEDS=true
2. 📋 Аналіз стану БД (дані існують)
3. ⏭️ Пропуск створення існуючих даних (~10-15 секунд)
4. 📝 Оновлення історії
5. ✅ Швидкий запуск без дублювання
```

### Примусовий пересід:
```bash
# Через змінну середовища
FORCE_RESEED=true docker-compose up

# Або через команду
docker-compose exec app python manage.py init_project_data --force
```

### Вимкнення сідингу:
```bash
# Для продакшн середовища
RUN_SEEDS=false docker-compose up
```

## 🎯 Результат

Після успішного завершення сідингу база даних містить:

- 📚 **1,250+ довідкових записів** (марки, моделі, регіони, міста)
- 👥 **24 тестових користувачі** (20 BASIC + 4 PREMIUM)
- 🚗 **Покоління та модифікації** для популярних автомобілів
- 📍 **Форматовані адреси** з геолокацією
- 📢 **8 тестових оголошень** для демонстрації
- 🖼️ **Placeholder зображення** для інтерфейсу

**Система готова до роботи з повнофункціональними dropdown'ами, фільтрами та статистикою!** 🎉
