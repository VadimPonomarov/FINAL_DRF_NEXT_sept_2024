# 🔧 Срочное исправление: Middleware блокирует публичные API

## Проблема

Middleware защищал ВСЕ пути начинающиеся с `/autoria`, включая:
- ✅ `/autoria` (страница) - ДОЛЖНО быть защищено
- ✅ `/autoria/search` (страница) - ДОЛЖНО быть защищено  
- ❌ `/api/autoria/users` (API route) - НЕ ДОЛЖНО быть защищено! Это публичный endpoint

Результат:
- Селектор пользователей на `/login` не загружается
- Запрос к `/api/autoria/users` блокируется middleware
- Ошибка 401/403 или редирект на signin

## Исправление

### В `frontend/src/middleware.ts`:

**БЫЛО:**
```typescript
if (pathname.startsWith('/autoria')) {
  return await checkBackendAuth(req);
}
```

**СТАЛО:**
```typescript
// Исключаем API routes из middleware защиты
if (pathname.startsWith('/autoria') && !pathname.startsWith('/api/')) {
  return await checkBackendAuth(req);
}
```

### Логика:

1. **Страницы `/autoria/*`** - защищаются middleware (требуют NextAuth + backend токены)
2. **API routes `/api/autoria/*`** - НЕ защищаются middleware, имеют собственную защиту внутри handlers
3. **Публичные API** (например `/api/autoria/users`) - доступны без авторизации

## Почему предупреждение "Duplicate page detected" всё ещё появляется?

Next.js кеширует информацию о маршрутах в `.next/` директории. Даже после удаления файла:
```
frontend/src/app/api/(backend)/autoria/users/route.ts
```

Next.js dev server все еще "помнит" этот маршрут из кеша.

### Решение:

1. **Остановите dev server** (Ctrl+C)

2. **Удалите кеш:**
   ```bash
   cd frontend
   rm -r .next
   rm -r .turbo  # если есть
   ```

3. **Перезапустите:**
   ```bash
   npm run dev
   ```

4. **Если не помогло - hard reset:**
   ```bash
   # Остановите dev server
   cd frontend
   rm -r .next
   rm -r node_modules/.cache  # если есть
   npm run dev
   ```

## Проверка после исправления

### 1. Селектор пользователей на `/login`

Откройте `/login` и проверьте Network (F12):

**Должен быть запрос:**
```
GET /api/autoria/users
Status: 200 OK
Response: { success: true, data: { results: [...], count: N } }
```

**НЕ должно быть:**
- 401 Unauthorized
- 403 Forbidden
- Редирект на /api/auth/signin

### 2. Защита страниц `/autoria` работает

Откройте инкогнито и перейдите на `/autoria`:

**Должен быть:**
- Редирект на `/api/auth/signin` (нет NextAuth сессии)
- ИЛИ редирект на `/login` (есть NextAuth, но нет backend токенов)

### 3. Логи в консоли

**При открытии `/autoria` (страница):**
```
[Middleware] Autoria page detected, checking NextAuth session (Level 1)
[Middleware L1] Checking NextAuth session for Autoria access
```

**При запросе `/api/autoria/users` (API):**
```
[AutoRia Users API - proxy] Getting users...
[AutoRia Users API - proxy] Got users from backend: 10
```

**НЕ должно быть:**
```
[Middleware] Autoria path detected... (для API routes)
```

## Итог изменений

✅ **Middleware** - исключены API routes из защиты `/autoria`
✅ **BackendTokenPresenceGate** - добавлен short-circuit (проверка Redis перед запросами)
✅ **API route** - `/api/autoria/users` теперь доступен без авторизации
✅ **Deploy env** - исправлен `NEXT_PUBLIC_BACKEND_URL` для Docker

## Следующие шаги

1. Остановить dev server
2. Удалить `.next/`
3. Запустить `npm run dev`
4. Проверить что селектор пользователей загружается на `/login`
5. Проверить что защита `/autoria` работает в инкогнито режиме
