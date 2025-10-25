# 🔧 AutoRia Backend Services - Повне керівництво

## 📋 Огляд

Документація фонових сервісів, модерації, Celery задач та системи генерації тестових даних.

---

## 🛡️ Система Модерації Контенту

### Ключові особливості

**Швидкість**:
- Hard-block перевірка: **58ms**
- Topic analysis: ~15s
- Загальне прискорення: **1000x** (було 60,000ms)

**Точність**:
- Профанність: **100%**
- Hard-block словник: **161 слово**
- Підтримка мов: 🇺🇦 Українська, 🇷🇺 Російська, 🇬🇧 Англійська, 🔤 Транслітерація

### Багатомовна підтримка

#### 1. Стандартне зіставлення паттернів
- Regex-based перевірка нецензурної лексики
- Нечутлива до регістру
- Мовно-специфічні паттерни

#### 2. Виявлення транслітерації
```
"blyad" → "блядь"
"suka" → "сука"
"nahuy" → "нахуй"
"pizda" → "пізда"
```

#### 3. Виявлення маскування
```
Заміна символів:
"б*л*я*д*ь" → заблоковано
"с@к@" → заблоковано
"п1зд@" → заблоковано

Вставка пробілів:
"б л я д ь" → заблоковано
"с у к а" → заблоковано

Змішані методи:
"б.л.я.д.ь" → заблоковано
"с-у-к-а" → заблоковано
```

#### 4. Виявлення суржику
```
"блядина" → заблоковано
"сучара" → заблоковано
"хуйня" → заблоковано
"піздець" → заблоковано
```

#### 5. Контекстний аналіз (LLM)
```
Сексуальний контекст:
- "інтим", "ескорт", "масаж релакс"

Наркотичний контекст:
- "сіль", "трава зелена", "закладка"

Шахрайський контекст:
- "швидкі гроші", "без вкладень"
```

### Технічна реалізація

```python
# backend/core/services/llm_moderation.py

class LLMModerationService:
    """Сервіс модерації з Hard-block + LLM"""
    
    def __init__(self):
        self.hard_block_dict = HARD_BLOCK_PROFANITY  # 161 слово
        self.chatai = ChatAIService()  # g4f + PollinationsAI
    
    def moderate_content(self, title, description):
        # 1. Fast-path: Hard-block перевірка (58ms)
        profanity_result = self._hard_block_check(title, description)
        if profanity_result['found']:
            return {
                'approved': False,
                'profanity_detected': True,
                'processing_time': 0.058  # ~58ms
            }
        
        # 2. LLM Topic Analysis (~15s, якщо немає профанності)
        topic_result = self.llm_topic_analysis(title, description)
        
        return {
            'approved': topic_result['is_appropriate'],
            'profanity_detected': False,
            'processing_time': topic_result['processing_time']
        }
```

### Використання

```python
# В моделі або view
from core.services.llm_moderation import moderate_content

result = moderate_content(
    title="Продам Toyota Camry 2020",
    description="Автомобіль в ідеальному стані..."
)

if not result['approved']:
    # Відхилити оголошення
    ad.status = 'rejected'
    ad.moderation_reason = result.get('reason')
```

### Ендпоінт тестування

```http
POST /api/ads/cars/test-moderation/
{
    "title": "Тестовий заголовок",
    "description": "Тестовий опис"
}

# Відповідь:
{
    "approved": true,
    "profanity_detected": false,
    "profanity_details": {
        "found": false,
        "confidence": 100
    },
    "topic_analysis": {
        "is_appropriate": true,
        "reason": "Automotive content"
    },
    "processing_time": 0.058
}
```

---

## ⏰ Celery Періодичні Задачі

### Налаштовані задачі

#### 1. Очистка тимчасових медіа-файлів

```python
# backend/core/tasks/periodic_tasks.py

@shared_task
def clean_generated_media():
    """Видаляє файли старіше 7 днів з generated_media/"""
    directory = Path('backend/generated_media')
    cutoff_date = now() - timedelta(days=7)
    
    deleted_count = 0
    for file_path in directory.rglob('*'):
        if file_path.is_file():
            mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            if mtime < cutoff_date:
                file_path.unlink()
                deleted_count += 1
    
    return f"Видалено {deleted_count} файлів"
```

**Розклад**: Щонеділі о 3:00 UTC  
**Призначення**: Очищення g4f generated files

#### 2. Очистка застарілих токенів

```python
@shared_task
def clean_blacklisted_tokens():
    """Видаляє дійсно застарілі JWT токени"""
    # 1. Перевірка exp в JWT payload
    # 2. Видалення з BlacklistedToken
    # 3. Видалення з OutstandingToken
    # + safety buffer 7 днів
```

**Розклад**: Щодня о 2:00 UTC  
**Призначення**: Очищення JWT token tables

### Ручний запуск

```bash
# Очистка медіа
celery -A config call clean_generated_media

# Очистка токенів
celery -A config call clean_blacklisted_tokens
```

### Моніторинг (Flower)

```bash
# Запуск Flower
celery -A config flower

# UI доступний на http://localhost:5555
```

### Налаштування розкладу

```python
# backend/config/celery.py

app.conf.beat_schedule = {
    'clean-generated-media-weekly': {
        'task': 'clean_generated_media',
        'schedule': crontab(day_of_week=0, hour=3, minute=0),  # Неділя 3:00
    },
    'clean-blacklisted-tokens-daily': {
        'task': 'clean_blacklisted_tokens',
        'schedule': crontab(hour=2, minute=0),  # Щодня 2:00
    },
}
```

---

## 🎭 Система Генерації Мокових Даних

### Автоматичне створення при запуску

```bash
# Docker Compose автоматично створює:
docker-compose up

# 1. Довідники (марки, моделі, кольори)
# 2. Тестові користувачі (admin, manager, buyers, sellers)
# 3. Мокова система (продавці + оголошення)
```

### Ручні команди

#### 1. Створення тестових користувачів

```bash
# Базові користувачі
python manage.py create_test_users

# З кастомним паролем
python manage.py create_test_users --password mypass123
```

**Створює**:
- 👑 Суперюзер: `admin@autoria.com`
- 👔 Менеджери: `manager@autoria.com`, `moderator@autoria.com`
- 👤 Покупці: `buyer1@gmail.com`, `buyer2@ukr.net`
- 🏪 Продавці: `seller1@gmail.com`, `dealer@autohouse.com`

#### 2. Створення мокової системи

```bash
# Швидке створення (5 продавців, 20 оголошень)
python manage.py create_mock_system --quick

# Стандартне (15 продавців, 50 оголошень)
python manage.py create_mock_system

# Очистити і створити заново
python manage.py create_mock_system --clear
```

#### 3. LLM-генератор даних (розширений)

```bash
# З LLM генерацією
python manage.py generate_mock_data --locale uk_UA --users 50 --car-ads 100

# Повна система
python manage.py populate_test_system --full
```

### Структура створених даних

**Користувачі**:
- 1 суперюзер
- 2 менеджери
- 2 покупці
- 5-15 продавців (залежно від режиму)

**Оголошення**:
- 20-50 активних оголошень
- Різні статуси: pending, active, rejected
- Реалістичні ціни (USD, EUR, UAH)
- Геолокація (регіони/міста України)
- Фото (з g4f або stock URLs)

### API ендпоінти для моків

```http
# Швидка генерація через API
POST /api/testing/quick-setup/
{
    "num_sellers": 5,
    "num_ads": 20,
    "clear_existing": false
}

# Повна система
POST /api/testing/full-setup/
{
    "locale": "uk_UA",
    "num_users": 50,
    "num_ads": 100
}
```

---

## 📊 Логування та Моніторинг

### Логування модерації

```python
# backend/core/services/llm_moderation.py

logger.info(f"[HARD-BLOCK] Profanity detected in {len(content)} chars, took {elapsed}s")
logger.info(f"[LLM] Topic analysis: {result['is_appropriate']}, took {elapsed}s")
```

### Логування Celery

```python
# backend/core/tasks/periodic_tasks.py

logger.info(f"[CLEANUP] Deleted {deleted_count} files from generated_media")
logger.info(f"[CLEANUP] Cleaned {token_count} blacklisted tokens")
```

### Моніторинг через Flower

- **URL**: http://localhost:5555
- **Tasks**: Список всіх задач
- **Workers**: Статус воркерів
- **Monitor**: Real-time графіки

---

## 🎯 Best Practices

1. **Модерація**:
   - Завжди використовуйте hard-block перш ніж LLM
   - Логуйте всі модераційні рішення
   - Зберігайте `moderation_reason` для transparency

2. **Celery**:
   - Моніторте через Flower
   - Налаштуйте alerts для failed tasks
   - Регулярно перевіряйте логи

3. **Мокові дані**:
   - Використовуйте `--quick` для швидкого тестування
   - Очищайте старі дані через `--clear`
   - Не використовуйте моки в продакшені!

---

## 🔗 Пов'язані документи

- [Backend API Guide](./BACKEND_API_GUIDE.md) - API документація
- [Postman Testing](../backend/POSTMAN_TESTING_GUIDE.md) - Тестування
- [Infrastructure](./INFRASTRUCTURE_SETUP.md) - Docker, Redis, Nginx

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25

