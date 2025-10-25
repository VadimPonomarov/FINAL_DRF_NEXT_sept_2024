# 🔍 Аудит Celery Tasks

## 📊 Статус: Проведено 25.10.2025

---

## ✅ АКТУАЛЬНІ TASKS

### 1. Token Cleanup (`backend/core/tasks/token_cleanup.py`)

**Task**: `clean_blacklisted_tokens`

**Призначення**: Очищає застарілі JWT токени з БД

**Розклад**: Щоденно о 2:00 AM

**Конфігурація**:
```python
'clean-blacklisted-tokens-daily': {
    'task': 'clean_blacklisted_tokens',
    'schedule': crontab(hour=2, minute=0),
    'args': (30,),  # Keep tokens for 30 days after expiration
}
```

**Що робить**:
- Видаляє `BlacklistedToken` для токенів, що expired
- Видаляє `OutstandingToken` для токенів, що expired
- Зберігає токени ще 30 днів після expiration (safety margin)

**Статус**: ✅ **АКТУАЛЬНО** - необхідно для очистки БД від застарілих JWT токенів

---

### 2. Media Cleanup (`backend/core/tasks/media_cleanup.py`)

**Task**: `clean_generated_media`

**Призначення**: Очищує згенеровані медіа-файли

**Розклад**: Щотижня (неділя) о 3:00 AM

**Конфігурація**:
```python
'clean-generated-media-weekly': {
    'task': 'clean_generated_media',
    'schedule': crontab(hour=3, minute=0, day_of_week=0),
    'args': (7,),  # Keep files for 7 days
}
```

**Що робить**:
- Видаляє файли з `backend/generated_media/` старіше 7 днів
- Логує статистику (кількість файлів, звільнено місця)

**Статус**: ✅ **АКТУАЛЬНО** - необхідно для очистки згенерованих зображень автомобілів

---

### 3. Currency Rates (`backend/apps/currency/tasks.py`)

#### 3.1 Оновлення курсів валют

**Tasks**: 
- `update_currency_rates_daily` (NBU)
- `update_currency_rates_daily` (PRIVATBANK - backup)

**Розклад**: 
- 8:00 AM (NBU)
- 2:00 PM (PRIVATBANK)

**Конфігурація**:
```python
'update-currency-rates-daily': {
    'task': 'apps.currency.tasks.update_currency_rates_daily',
    'schedule': crontab(hour=8, minute=0),
    'kwargs': {'source': 'NBU'}
},
'update-currency-rates-backup': {
    'task': 'apps.currency.tasks.update_currency_rates_daily',
    'schedule': crontab(hour=14, minute=0),
    'kwargs': {'source': 'PRIVATBANK'}
}
```

**Що робить**:
- Оновлює курси валют від НБУ та ПриватБанку
- Зберігає в `CurrencyRate` модель
- Логує в `CurrencyUpdateLog`

**Статус**: ✅ **АКТУАЛЬНО** - необхідно для конвертації цін оголошень

#### 3.2 Очистка старих курсів

**Task**: `cleanup_old_currency_rates`

**Розклад**: Щоденно о 3:00 AM

**Конфігурація**:
```python
'cleanup-old-currency-rates': {
    'task': 'apps.currency.tasks.cleanup_old_currency_rates',
    'schedule': crontab(hour=3, minute=0),
    'kwargs': {'days_to_keep': 30}
}
```

**Що робить**:
- Видаляє курси старіше 30 днів
- Залишає останній курс для кожної пари валют
- Очищує старі логи оновлень

**Статус**: ✅ **АКТУАЛЬНО** - запобігає роздуванню БД

---

### 4. Moderation Tasks (`backend/apps/ads/tasks.py`, `backend/apps/moderation/tasks.py`)

#### 4.1 Notification Tasks

**Tasks**:
- `send_user_moderation_notification` - відправляє нотифікації користувачам
- `send_manager_moderation_notification` - відправляє нотифікації менеджерам
- `moderate_ad_async` - асинхронна модерація складних кейсів

**Розклад**: Викликаються за потребою (не періодичні)

**Що робить**:
- Відправляє email через RabbitMQ
- Створює записи в `ModerationNotification`
- Логує в `NotificationLog`

**Статус**: ✅ **АКТУАЛЬНО** - система модерації активно використовується

#### 4.2 Email Tasks

**Tasks**:
- `send_moderation_email_task` - відправляє email
- `create_moderation_notification_task` - створює нотифікацію в БД
- `process_moderation_notification_task` - обробляє нотифікації з RabbitMQ

**Статус**: ✅ **АКТУАЛЬНО** - інтеграція з mailing сервісом

---

### 5. Analytics Tasks (`backend/apps/ads/tasks/analytics_tasks.py`)

**Tasks**:
- `generate_quick_stats` - швидка статистика (кожні 15 хвилин)
- `generate_analytics_for_all_locales` - повна аналітика (щогодини)
- `generate_daily_report` - щоденний звіт (9:00 AM)
- `cleanup_old_analytics_cache` - очистка кешу (1:00 AM)

**Розклад**:
```python
'generate-quick-stats-every-15min': {
    'task': 'apps.ads.tasks.analytics_tasks.generate_quick_stats',
    'schedule': crontab(minute='*/15'),
},
'generate-platform-analytics-hourly': {
    'task': 'apps.ads.tasks.analytics_tasks.generate_analytics_for_all_locales',
    'schedule': crontab(minute=0),
},
'generate-daily-report': {
    'task': 'apps.ads.tasks.analytics_tasks.generate_daily_report',
    'schedule': crontab(hour=9, minute=0),
},
'cleanup-analytics-cache-daily': {
    'task': 'apps.ads.tasks.analytics_tasks.cleanup_old_analytics_cache',
    'schedule': crontab(hour=1, minute=0),
}
```

**Статус**: ✅ **АКТУАЛЬНО** - надає аналітику платформи

---

## ❌ НЕАКТУАЛЬНІ / ВІДСУТНІ TASKS

### 1. `clean_temp_files` - TASK НЕ ІСНУЄ ❌

**Налаштовано в beat_schedule**:
```python
'clean-temp-files-daily': {
    'task': 'clean_temp_files',
    'schedule': crontab(hour=4, minute=0),
    'args': (7,),
}
```

**Проблема**: Task не знайдено в жодному файлі

**Рекомендація**: **ВИДАЛИТИ** з beat_schedule (task не існує)

---

### 2. `cleanup_chat_temp_files` - TASK НЕ ІСНУЄ ❌

**Налаштовано в beat_schedule**:
```python
'cleanup-chat-temp-files-hourly': {
    'task': 'cleanup_chat_temp_files',
    'schedule': crontab(minute=0),
    'args': (),
}
```

**Проблема**: Task не знайдено в жодному файлі

**Рекомендація**: **ВИДАЛИТИ** з beat_schedule (task не існує)

---

## 📋 ПІДСУМОК

### Статистика

- **Актуальні tasks**: 13
- **Відсутні tasks**: 2
- **Періодичних tasks у beat_schedule**: 13
- **On-demand tasks**: 7

### Категорії

| Категорія | Кількість | Статус |
|-----------|-----------|--------|
| Token cleanup | 1 | ✅ Актуально |
| Media cleanup | 1 | ✅ Актуально |
| Currency | 3 | ✅ Актуально |
| Moderation | 6 | ✅ Актуально |
| Analytics | 4 | ✅ Актуально |
| **Відсутні** | **2** | ❌ **Видалити** |

---

## 🔧 РЕКОМЕНДАЦІЇ

### 1. Видалити неіснуючі tasks з beat_schedule

Видалити з `backend/config/celery.py`:
- `clean-temp-files-daily`
- `cleanup-chat-temp-files-hourly`

### 2. Можливі покращення

#### 2.1 Redis Token Cleanup

Наразі є cleanup для JWT токенів у PostgreSQL, але **немає cleanup для Redis токенів** (NextAuth tokens).

**Рекомендація**: Створити task для очистки застарілих токенів з Redis:
- Очищувати токени старіше N днів
- Перевіряти TTL ключів
- Логувати статистику

#### 2.2 Media Cleanup Extension

Можливо додати cleanup для інших папок:
- `staticfiles` (якщо накопичуються старі версії)
- `logs` (файли логів)

#### 2.3 Database Optimization

Можливо додати task для оптимізації БД:
- `VACUUM` операції
- Очистка старих логів
- Архівація старих оголошень

---

## ✅ ВИСНОВОК

Більшість Celery tasks **АКТУАЛЬНІ** та виконують важливі функції:
- ✅ Очистка JWT токенів
- ✅ Очистка згенерованих медіа
- ✅ Оновлення курсів валют
- ✅ Модерація та нотифікації
- ✅ Аналітика платформи

**Критичні проблеми**:
- ❌ 2 неіснуючі tasks в beat_schedule (потрібно видалити)

**Рекомендації**:
1. Видалити неіснуючі tasks з `beat_schedule`
2. Додати Redis token cleanup (опціонально)
3. Моніторити виконання tasks через Flower

