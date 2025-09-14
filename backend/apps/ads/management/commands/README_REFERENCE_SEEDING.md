# 📚 Car Reference Data Seeding

Система автоматичного заповнення довідників автомобілів з контролем пам'яті та з'єднань.

## 🚀 Автоматичне заповнення

### При запуску проекту

Довідники автоматично заповнюються при запуску проекту, якщо вони пустые:

```bash
# В Docker контейнері (автоматично)
docker-compose up

# Локально з змінною середовища
AUTO_POPULATE_REFERENCES=true python manage.py runserver
```

### Налаштування автоматичного заповнення

Автоматичне заповнення спрацьовує в наступних випадках:

1. **Docker контейнер**: `IS_DOCKER=true`
2. **Змінна середовища**: `AUTO_POPULATE_REFERENCES=true`
3. **Django settings**: `AUTO_POPULATE_REFERENCES = True`

## 🛠️ Ручні команди

### 1. Автоматичне заповнення (швидке)

```bash
# Заповнити тільки якщо пусто
python manage.py auto_populate_references

# Примусове заповнення
python manage.py auto_populate_references --force
```

**Особливості:**
- Обробляє перші 10,000 рядків для швидкості
- Оптимізовано для запуску при старті
- Автоматично закриває з'єднання

### 2. Безпечне заповнення (повне)

```bash
# Повне заповнення з моніторингом пам'яті
python manage.py seed_references_safe --monitor-memory

# Очистити та заповнити заново
python manage.py seed_references_safe --clear

# З налаштуванням розміру батчу
python manage.py seed_references_safe --batch-size 500
```

**Особливості:**
- Обробляє всі дані з CSV
- Моніторинг використання пам'яті
- Контроль розміру батчів
- Детальне логування

### 3. Оптимізоване заповнення (розширене)

```bash
# Повне заповнення з контролем пам'яті
python manage.py populate_car_references --memory-check

# З обмеженням кількості рядків
python manage.py populate_car_references --limit 5000

# З налаштуванням батчу
python manage.py populate_car_references --batch-size 2000
```

## 📊 Структура даних

### Що заповнюється:

1. **Типи транспорту** (`VehicleTypeModel`)
   - Легкові, Мото, Вантажівки, Причепи, Спецтехніка, тощо

2. **Марки автомобілів** (`CarMarkModel`)
   - Toyota, BMW, Mercedes-Benz, Audi, тощо
   - Прив'язані до типів транспорту

3. **Моделі автомобілів** (`CarModel`)
   - Camry, Golf, Focus, тощо
   - Прив'язані до марок

4. **Кольори автомобілів** (`CarColorModel`)
   - Стандартний набір кольорів з hex-кодами

### Джерело даних:

```
backend/core/data/cars_dict_output.csv
```

Формат: `Тип_транспорту,Марка,Модель`

## 🧠 Контроль пам'яті

### Оптимізації:

1. **Bulk операції** замість окремих INSERT
2. **Батчування** для великих наборів даних
3. **Garbage collection** між батчами
4. **Закриття з'єднань** після операцій
5. **Моніторинг пам'яті** (опціонально)

### Моніторинг:

```bash
# Увімкнути моніторинг пам'яті
python manage.py seed_references_safe --monitor-memory

# Вивід:
# 🧠 Memory at Start: 45.23 MB
# 🧠 Memory at Row 5000: 67.45 MB
# 🧠 Memory at End: 48.12 MB
```

## 🔧 Налаштування

### Docker Compose

```yaml
environment:
  AUTO_POPULATE_REFERENCES: true  # Автоматичне заповнення
  IS_DOCKER: true                 # Детекція Docker середовища
```

### Django Settings

```python
# settings.py
AUTO_POPULATE_REFERENCES = True  # Увімкнути автозаповнення
```

### Змінні середовища

```bash
export AUTO_POPULATE_REFERENCES=true
export IS_DOCKER=true
```

## 🧪 Тестування

```bash
# Запустити тести автозаповнення
python manage.py test apps.ads.tests.test_auto_populate

# Тести включають:
# - Автозаповнення при пустих довідниках
# - Пропуск при існуючих даних
# - Контроль пам'яті
# - Закриття з'єднань
# - Обробка помилок
```

## 📈 Продуктивність

### Типові показники:

- **Швидке заповнення**: ~30 секунд (10k рядків)
- **Повне заповнення**: ~2-5 хвилин (20k+ рядків)
- **Використання пам'яті**: 50-100 MB
- **Розмір батчу**: 500-2000 записів

### Рекомендації:

1. **Для production**: використовуйте автоматичне заповнення
2. **Для розробки**: `seed_references_safe --clear`
3. **Для тестування**: `auto_populate_references --force`

## ⚠️ Важливі моменти

### Безпека:

1. **Транзакції**: всі операції в atomic блоках
2. **Ignore conflicts**: уникнення дублікатів
3. **Graceful errors**: не ламає запуск при помилках
4. **Resource cleanup**: автоматичне очищення ресурсів

### Обмеження:

1. **CSV файл**: повинен існувати в `backend/core/data/`
2. **Формат**: строго 3 колонки (тип, марка, модель)
3. **Кодування**: UTF-8
4. **Розмір**: оптимізовано для файлів до 50MB

## 🔍 Діагностика

### Перевірка стану:

```python
from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel

# Перевірити кількість записів
print(f"Vehicle types: {VehicleTypeModel.objects.count()}")
print(f"Car marks: {CarMarkModel.objects.count()}")
print(f"Car models: {CarModel.objects.count()}")
```

### Логи:

```bash
# Перевірити логи Docker
docker-compose logs app | grep "Auto-populating"

# Очікуваний вивід:
# 🚀 Auto-populating car reference data...
# ✅ Created 8 vehicle types
# ✅ Created 245 car marks
# ✅ Created 3420 car models
```

## 🚨 Усунення проблем

### Проблема: Дані не заповнюються

```bash
# Перевірити налаштування
echo $AUTO_POPULATE_REFERENCES
echo $IS_DOCKER

# Примусове заповнення
python manage.py auto_populate_references --force
```

### Проблема: Помилки пам'яті

```bash
# Зменшити розмір батчу
python manage.py seed_references_safe --batch-size 100

# Моніторинг пам'яті
python manage.py seed_references_safe --monitor-memory
```

### Проблема: Повільне заповнення

```bash
# Швидке заповнення (обмежена кількість)
python manage.py auto_populate_references

# Або з лімітом
python manage.py populate_car_references --limit 5000
```
