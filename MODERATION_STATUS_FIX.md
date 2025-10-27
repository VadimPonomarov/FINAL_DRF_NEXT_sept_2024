# 🔧 Исправление изменения статусов в модерации

## Проблема
При попытке изменить статус объявления из черновика в активное возникала ошибка валидации переходов статусов.

## Решение

### 1. ✅ Backend изменения (ad_status_serializer.py)

**Добавлена проверка для суперюзеров:**
- Суперюзеры теперь могут переводить объявление в **ЛЮБОЙ** статус без ограничений
- Для обычных пользователей сохранена валидация переходов

```python
def validate_status(self, value):
    """Validate status transitions for superusers."""
    # Superusers can transition to ANY status without restrictions
    if request and request.user and request.user.is_superuser:
        return value
    # ... остальная валидация для обычных пользователей
```

**Обновлены допустимые переходы статусов для обычных пользователей:**
```python
DRAFT → PENDING, ACTIVE, NEEDS_REVIEW, REJECTED
PENDING → ACTIVE, NEEDS_REVIEW, REJECTED, BLOCKED
NEEDS_REVIEW → ACTIVE, REJECTED, BLOCKED, PENDING
ACTIVE → SOLD, ARCHIVED, BLOCKED, NEEDS_REVIEW, REJECTED
REJECTED → NEEDS_REVIEW, PENDING, ACTIVE
BLOCKED → ACTIVE, NEEDS_REVIEW, ARCHIVED
SOLD → ARCHIVED, ACTIVE
ARCHIVED → ACTIVE, NEEDS_REVIEW
```

### 2. ✅ Frontend изменения (ModerationPage.tsx)

**Добавлен статус SOLD в селектор:**
- Статус "Продано" (💰) теперь доступен в обоих режимах просмотра (grid/list)
- Все 8 статусов системы теперь доступны в UI

**Список всех статусов:**
1. 📝 Draft (Черновик)
2. ⏳ Pending (Ожидание)
3. 🔍 Needs Review (Требует проверки)
4. ✅ Active (Активно)
5. ❌ Rejected (Отклонено)
6. 🚫 Blocked (Заблокировано)
7. 💰 Sold (Продано) - **НОВЫЙ**
8. 📦 Archived (Архивировано)

### 3. ✅ Права суперюзера

Суперюзер (администратор системы с максимальными полномочиями) теперь может:
- ✅ Переводить любое объявление из любого статуса в любой другой
- ✅ Обходить стандартные ограничения переходов статусов
- ✅ Управлять полным жизненным циклом объявлений

## Endpoint

`PATCH /api/ads/admin/{id}/status/update/`

**Request body:**
```json
{
  "status": "active",
  "moderation_reason": "Статус изменен модератором",
  "notify_user": true
}
```

## Проверка

После этих изменений:
1. ✅ Суперюзер может изменить статус из DRAFT → ACTIVE
2. ✅ Суперюзер может изменить статус в любой другой статус
3. ✅ Все переходы работают без ошибок валидации
4. ✅ UI отображает все доступные статусы

## Файлы изменены

- `backend/apps/ads/serializers/ad_status_serializer.py` - убрана валидация для суперюзеров
- `frontend/src/components/AutoRia/Pages/ModerationPage.tsx` - добавлен статус SOLD

