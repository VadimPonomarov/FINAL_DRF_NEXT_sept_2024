# 🔐 Суперюзерские эндпоинты

## Обзор

Данный документ описывает специальные API эндпоинты, доступные только суперюзерам системы. Эти эндпоинты предназначены для административного управления платформой и требуют максимального уровня доступа.

## 🛡️ Безопасность

**⚠️ ВАЖНО**: Все эндпоинты в этом разделе требуют:
- Аутентификации пользователя
- Статуса `is_superuser = True`
- Использования HTTPS в продакшене
- Логирования всех действий

## 📊 Управление статусами объявлений

### Базовый URL: `/api/ads/admin/`

#### 1. Получение детальной информации о статусе объявления
```http
GET /api/ads/admin/{ad_id}/status/
```

**Описание**: Получить подробную информацию о статусе модерации объявления.

**Ответ**:
```json
{
  "id": 123,
  "title": "Toyota Camry 2020",
  "status": "active",
  "status_display": "Активно",
  "is_validated": true,
  "moderated_by": 1,
  "moderated_by_name": "Admin User",
  "moderated_at": "2024-01-15T10:30:00Z",
  "moderation_reason": "Автоодобрено",
  "validation_errors": {},
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "moderation_history": [
    {
      "action": "auto_approved",
      "status": "active",
      "reason": "Контент прошел автоматическую проверку",
      "moderator": "Auto-moderation",
      "timestamp": "2024-01-15T10:30:00Z",
      "details": {}
    }
  ]
}
```

#### 2. Изменение статуса объявления
```http
PATCH /api/ads/admin/{ad_id}/status/update/
```

**Тело запроса**:
```json
{
  "status": "active",
  "moderation_reason": "Объявление соответствует требованиям",
  "notify_user": true
}
```

**Валидные переходы статусов**:
- `DRAFT` → `ACTIVE`, `NEEDS_REVIEW`, `REJECTED`
- `NEEDS_REVIEW` → `ACTIVE`, `REJECTED`, `INACTIVE`
- `ACTIVE` → `INACTIVE`, `NEEDS_REVIEW`, `REJECTED`
- `REJECTED` → `NEEDS_REVIEW`, `ACTIVE`
- `INACTIVE` → `ACTIVE`, `NEEDS_REVIEW`

#### 3. Быстрое одобрение объявления
```http
POST /api/ads/admin/{ad_id}/approve/
```

**Описание**: Быстро одобрить объявление (устанавливает статус `ACTIVE`).

#### 4. Быстрое отклонение объявления
```http
POST /api/ads/admin/{ad_id}/reject/
```

**Тело запроса**:
```json
{
  "reason": "Нарушение правил платформы"
}
```

#### 5. Массовое изменение статусов
```http
POST /api/ads/admin/bulk/status/update/
```

**Тело запроса**:
```json
{
  "ad_ids": [123, 124, 125],
  "status": "active",
  "moderation_reason": "Массовое одобрение после проверки",
  "notify_users": true
}
```

**Ограничения**: Максимум 100 объявлений за один запрос.

#### 6. Dashboard модерации
```http
GET /api/ads/admin/moderation/dashboard/
```

**Ответ**:
```json
{
  "status_counts": {
    "draft": 45,
    "needs_review": 12,
    "active": 1250,
    "rejected": 8,
    "inactive": 23
  },
  "recent_activity": [
    {
      "ad_id": 123,
      "title": "Toyota Camry",
      "status": "active",
      "moderated_by": "Admin User",
      "moderated_at": "2024-01-15T10:30:00Z",
      "owner": "user@example.com"
    }
  ],
  "pending_review": 12,
  "total_ads": 1338,
  "dashboard_updated_at": "2024-01-15T11:00:00Z"
}
```

#### 7. Список объявлений для модерации
```http
GET /api/ads/admin/moderation/list/
```

**Параметры запроса**:
- `status` - фильтр по статусу
- `needs_review=true` - только объявления, требующие проверки
- `search` - поиск по заголовку и описанию
- `user_email` - фильтр по email владельца

## 👤 Управление типами аккаунтов

### Базовый URL: `/api/accounts/admin/`

#### 1. Изменение типа аккаунта
```http
PATCH /api/accounts/admin/{account_id}/type/
```

**Тело запроса**:
```json
{
  "account_type": "PREMIUM",
  "reason": "Переход на премиум по запросу пользователя",
  "notify_user": true,
  "valid_until": "2025-01-15T00:00:00Z"
}
```

**Доступные типы**:
- `BASIC` - Базовый аккаунт (по умолчанию)
- `PREMIUM` - Премиум аккаунт

#### 2. Массовое изменение типов аккаунтов
```http
POST /api/accounts/admin/bulk/type/update/
```

**Тело запроса**:
```json
{
  "account_ids": [1, 2, 3],
  "account_type": "PREMIUM",
  "reason": "Промо-акция",
  "notify_users": true,
  "valid_until": "2025-12-31T23:59:59Z"
}
```

#### 3. Статистика по типам аккаунтов
```http
GET /api/accounts/admin/stats/
```

**Ответ**:
```json
{
  "account_types": {
    "BASIC": 1250,
    "PREMIUM": 150
  },
  "recent_upgrades": [
    {
      "account_id": 123,
      "user_email": "user@example.com",
      "old_type": "BASIC",
      "new_type": "PREMIUM",
      "changed_at": "2024-01-15T10:30:00Z",
      "changed_by": "Admin User"
    }
  ],
  "premium_expiring_soon": [
    {
      "account_id": 124,
      "user_email": "premium@example.com",
      "expires_at": "2024-02-01T00:00:00Z"
    }
  ]
}
```

## 📚 Управление справочниками

### Базовый URL: `/api/ads/reference/`

**Права доступа**: Staff и Superuser могут создавать/редактировать, все остальные - только чтение.

#### Доступные справочники:
- `/marks/` - Марки автомобилей
- `/models/` - Модели автомобилей
- `/generations/` - Поколения автомобилей
- `/modifications/` - Модификации автомобилей
- `/colors/` - Цвета автомобилей

#### Пример создания марки:
```http
POST /api/ads/reference/marks/
```

**Тело запроса**:
```json
{
  "name": "Tesla",
  "vehicle_type": 1,
  "is_popular": true,
  "country_origin": "USA"
}
```

## 🔧 Системные эндпоинты

### 1. Настройка разрешений
```http
POST /api/admin/setup-permissions/
```

**Описание**: Создает системные разрешения и группы пользователей.

### 2. Очистка токенов
```http
POST /api/admin/cleanup-tokens/
```

**Описание**: Удаляет истекшие JWT токены из базы данных.

### 3. Статистика системы
```http
GET /api/admin/system/stats/
```

**Ответ**:
```json
{
  "users": {
    "total": 1500,
    "active": 1350,
    "staff": 5,
    "superusers": 2
  },
  "ads": {
    "total": 1338,
    "active": 1250,
    "pending_moderation": 12
  },
  "accounts": {
    "basic": 1250,
    "premium": 150
  },
  "system": {
    "database_size": "2.5GB",
    "media_files": "15.2GB",
    "last_backup": "2024-01-15T02:00:00Z"
  }
}
```

## 📝 Логирование и аудит

Все действия суперюзеров автоматически логируются:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "user_id": 1,
  "user_email": "admin@example.com",
  "action": "ad_status_changed",
  "resource_type": "CarAd",
  "resource_id": 123,
  "old_values": {"status": "needs_review"},
  "new_values": {"status": "active"},
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "reason": "Объявление соответствует требованиям"
}
```

## 🚨 Уведомления

При изменениях через суперюзерские эндпоинты автоматически отправляются уведомления:

### Пользователям:
- Изменение статуса объявления
- Изменение типа аккаунта
- Массовые операции

### Администраторам:
- Критические изменения в системе
- Массовые операции
- Ошибки в работе системы

## 🔒 Безопасность и ограничения

### Rate Limiting:
- Обычные операции: 100 запросов/минуту
- Массовые операции: 10 запросов/минуту
- Dashboard: 60 запросов/минуту

### IP Whitelist:
В продакшене рекомендуется ограничить доступ к суперюзерским эндпоинтам определенными IP-адресами.

### Мониторинг:
- Все действия логируются в отдельный файл
- Критические операции отправляют уведомления в Slack/Telegram
- Подозрительная активность блокируется автоматически

## 📋 Примеры использования

### Модерация объявления:
```bash
# Получить информацию об объявлении
curl -H "Authorization: Bearer <token>" \
     GET /api/ads/admin/123/status/

# Одобрить объявление
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Соответствует требованиям"}' \
     POST /api/ads/admin/123/approve/
```

### Обновление аккаунта до премиум:
```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"account_type": "PREMIUM", "reason": "Переход на премиум"}' \
     PATCH /api/accounts/admin/456/type/
```

## 🆘 Поддержка

При возникновении проблем с суперюзерскими эндпоинтами:
1. Проверьте логи в `/var/log/django/superuser.log`
2. Убедитесь в корректности прав доступа
3. Проверьте rate limiting
4. Обратитесь к системному администратору
