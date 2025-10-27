# 🚀 Быстрое создание тестовых объявлений

## 📌 Проблемы

1. **Медленное создание** - генерация изображений занимает много времени
2. **Нерелевантные шилдики** - AI генератор добавляет неправильные логотипы брендов
3. **Создается мало объявлений** - лимиты базовых аккаунтов (1 объявление на аккаунт)

## ✅ Решение

### Команда `quick_seed_ads`

Новая команда для **быстрого** создания объявлений БЕЗ изображений:

```bash
# В Docker
docker-compose exec app python manage.py quick_seed_ads --count=10

# Локально
python manage.py quick_seed_ads --count=20
```

### Особенности:

1. **Быстрая генерация** - создает объявления БЕЗ AI изображений
2. **Популярные модели** - использует реальные названия моделей (Camry, Golf, A4 и т.д.)
3. **Разные статусы** - генерирует объявления в разных статусах:
   - 50% Active
   - 20% Pending
   - 15% Draft
   - 10% Needs Review
   - 5% Rejected

4. **Нет лимитов аккаунтов** - создает объявления для случайных аккаунтов без ограничений

### Параметры:

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `--count` | Количество объявлений | 10 |

## 📊 Статистика создания

### Старая команда `seed_car_ads`:
- ⏱️ Время: ~30-60 секунд на 10 объявлений (С изображениями)
- 📊 Лимит: 1 объявление на базовый аккаунт
- 🎨 Изображения: Генерируются синхронно

### Новая команда `quick_seed_ads`:
- ⏱️ Время: **~1-2 секунды на 10 объявлений**
- 📊 Лимит: **Без ограничений**
- 🎨 Изображения: **Не генерируются** (для скорости)

## 🔧 Как использовать

### 1. Создать быстрые объявления

```bash
# Создать 20 объявлений БЕЗ изображений (быстро)
docker-compose exec app python manage.py quick_seed_ads --count=20
```

### 2. Затем сгенерировать изображения отдельно (опционально)

```bash
# Сгенерировать изображения для существующих объявлений
docker-compose exec app python manage.py generate_test_ads_with_images --count=5
```

## 🎯 Рекомендации

### Для тестирования UI:
```bash
docker-compose exec app python manage.py quick_seed_ads --count=50
```
- Быстро создает 50 объявлений
- Не тратит время на AI генерацию
- Идеально для проверки списков, фильтров, пагинации

### Для демонстрации с изображениями:
```bash
# Шаг 1: Создать объявления
docker-compose exec app python manage.py quick_seed_ads --count=10

# Шаг 2: Добавить изображения для первых 3-5 объявлений
docker-compose exec app python manage.py generate_test_ads_with_images --count=3
```

## ⚠️ Проблема с нерелевантными шилдиками

### Причина:
AI модель (flux) игнорирует инструкции о том, какие логотипы НЕ нужно генерировать.

### Решения:

1. **Краткосрочное** - Использовать real photos вместо AI:
   - Интеграция с Unsplash/Pixabay API
   - Поиск реальных фото по марке/модели
   - ✅ Гарантированно правильные шилдики

2. **Среднесрочное** - Улучшить промпт:
   - Использовать более строгие negative prompts
   - Добавить postprocessing для удаления логотипов
   - Использовать другую модель (DALL-E 3, Midjourney API)

3. **Долгосрочное** - Гибридный подход:
   - Генерировать AI изображение БЕЗ логотипов (generic car)
   - Накладывать правильный логотип через OpenCV/Pillow

## 📝 Примеры использования

### Очистить все объявления и создать новые:
```bash
docker-compose exec app python manage.py seed_car_ads --clear --count=0
docker-compose exec app python manage.py quick_seed_ads --count=30
```

### Добавить больше объявлений к существующим:
```bash
docker-compose exec app python manage.py quick_seed_ads --count=50
```

### Проверить статистику:
```bash
docker-compose exec app python manage.py shell
>>> from apps.ads.models import CarAd
>>> CarAd.objects.count()
>>> CarAd.objects.values('status').annotate(count=Count('id'))
```

## 🎨 Генерация изображений (отдельно)

Если нужны изображения для демонстрации:

```bash
# Способ 1: Real photos (быстро, без AI)
docker-compose exec app python manage.py fetch_real_car_photos --count=10

# Способ 2: AI generation (медленно, но уникально)
docker-compose exec app python manage.py generate_test_ads_with_images --count=5
```

## 🐛 Отладка

### Проверить созданные объявления:
```bash
docker-compose exec app python manage.py shell
>>> from apps.ads.models import CarAd
>>> ads = CarAd.objects.all()[:5]
>>> for ad in ads:
...     print(f"{ad.id}: {ad.title} - {ad.status}")
```

### Удалить все объявления:
```bash
docker-compose exec app python manage.py shell
>>> from apps.ads.models import CarAd
>>> CarAd.objects.all().delete()
```

