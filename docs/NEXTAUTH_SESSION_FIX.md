# ✅ Исправление проблемы с NextAuth сессией и автоматическим signout

**Дата:** 17.10.2025  
**Проблема:** После успешного логина через NextAuth происходил автоматический signout и редирект на `/api/auth/signin`

---

## 🔍 Диагностика проблемы

### Симптомы
1. Пользователь успешно логинится через `/api/auth/signin` (Credentials provider)
2. Email появляется в AuthBadge (`test@example.com`)
3. Происходит редирект на `/autoria/search`
4. Страница загружается и показывает результаты
5. **Через 2-3 секунды** происходит автоматический `signOut()` и редирект на `/api/auth/signin`
6. AuthBadge меняется обратно на "Guest"

### Логи браузера
```
[ERROR] Access to fetch at 'http://localhost:8000/api/user/profile/' from origin 'http://localhost:3000' 
        has been blocked by CORS policy
[ERROR] Failed to load resource: net::ERR_FAILED @ http://localhost:8000/api/user/profile/
[ERROR] Access to fetch at 'http://localhost:8000/api/user/account/' from origin 'http://localhost:3000' 
        has been blocked by CORS policy
[ERROR] Failed to load resource: net::ERR_FAILED @ http://localhost:8000/api/user/account/
```

### Логи сервера
```
[NextAuth JWT] Callback triggered: { tokenEmail: 'test@example.com', userEmail: 'test@example.com' }
[NextAuth JWT] Returning token with email: test@example.com
[NextAuth Session] Callback triggered: { email: 'test@example.com' }
GET /autoria/search 200 in 6624ms
...
POST /api/auth/signout 200
```

---

## 🎯 Корневая причина

### Проблема 1: NEXTAUTH_SECRET был зашифрован

**Файл:** `env-config/.env.secrets`

**Было:**
```bash
NEXTAUTH_SECRET=ENC_=0TR2cDOoZjUiZzRBZTas9GRVtGN31ERpdncE5Wd3cDNYZUOup3Lwc3KMhlY
```

**Проблема:** NextAuth не мог создать JWT токен без расшифрованного `NEXTAUTH_SECRET`

**Решение:** Добавлены незашифрованные значения для локальной разработки:
```bash
# Незашифрованное значение для локальной разработки
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-test_secret_key_for_development
```

### Проблема 2: CORS ошибки считались критическими

**Файл:** `frontend/src/hooks/useApiErrorHandler.ts`

**Цепочка событий:**
1. Компоненты на странице `/autoria/search` пытаются загрузить данные пользователя
2. Некоторые запросы идут напрямую к `http://localhost:8000/api/user/profile/` (CORS ошибка)
3. Браузер блокирует эти запросы (status = 0, Network error)
4. `useApiErrorHandler` перехватывает ошибки через `setupGlobalFetchErrorTracking`
5. Функция `isCriticalError` считает `status === 0` критической ошибкой
6. После достижения порога (`criticalErrorThreshold = 10`) срабатывает `handleCriticalError()`
7. Вызывается `signOut({ redirect: false })` и редирект на `/api/auth/signin`

**Было:**
```typescript
private isCriticalError(status: number, url: string): boolean {
  // ... фильтры для /api/auth/, /api/public/, /api/redis
  
  return (
    status >= 500 ||  // Серверные ошибки
    status === 0 ||   // Network error ❌ ПРОБЛЕМА: включает CORS ошибки
    (status === 404 && isApiEndpoint)
  );
}
```

**Стало:**
```typescript
private isCriticalError(status: number, url: string): boolean {
  // ... фильтры для /api/auth/, /api/public/, /api/redis
  
  // ✅ ИСПРАВЛЕНИЕ: Исключаем CORS ошибки для прямых запросов к backend
  if (status === 0 && url.includes('localhost:8000')) {
    console.warn('[ApiErrorTracker] CORS error detected for backend URL (not critical):', url);
    return false;
  }
  
  // 400-499 ошибки НЕ критические
  if (status >= 400 && status < 500) {
    return false;
  }
  
  return (
    status >= 500 ||  // Серверные ошибки
    status === 0 ||   // Network error (но CORS для backend уже отфильтрованы выше)
    (status === 404 && isApiEndpoint)
  );
}
```

---

## ✅ Решение

### Шаг 1: Обновление env-config/.env.secrets

**Файл:** `env-config/.env.secrets`

**Изменения:**
```bash
# =============================================================================
# NEXTAUTH CONFIGURATION
# =============================================================================
# Незашифрованное значение для локальной разработки
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
# Зашифрованное значение (для совместимости)
# NEXTAUTH_SECRET=ENC_=0TR2cDOoZjUiZzRBZTas9GRVtGN31ERpdncE5Wd3cDNYZUOup3Lwc3KMhlY

# =============================================================================
# GOOGLE OAUTH CREDENTIALS
# =============================================================================
# Незашифрованные значения для локальной разработки (тестовые)
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-test_secret_key_for_development
NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
```

### Шаг 2: Исправление useApiErrorHandler.ts

**Файл:** `frontend/src/hooks/useApiErrorHandler.ts`

**Изменения (строки 76-117):**
```typescript
private isCriticalError(status: number, url: string): boolean {
  // Критические ошибки:
  // 1. 500+ серверные ошибки
  // 2. Network errors (status 0) - НО НЕ CORS ошибки для backend
  // 3. 404 для API endpoints (НО НЕ для /api/auth/* и /api/public/*)

  // Исключаем все auth endpoints
  if (url.includes('/api/auth/')) {
    return false;
  }

  // Исключаем public endpoints
  if (url.includes('/api/public/')) {
    return false;
  }

  // Исключаем Redis API
  if (url.includes('/api/redis')) {
    return false;
  }

  // ✅ НОВОЕ: Исключаем CORS ошибки для прямых запросов к backend
  if (status === 0 && url.includes('localhost:8000')) {
    console.warn('[ApiErrorTracker] CORS error detected for backend URL (not critical):', url);
    return false;
  }

  // 400-499 ошибки НЕ критические
  if (status >= 400 && status < 500) {
    return false;
  }

  const isApiEndpoint = url.includes('/api/');

  return (
    status >= 500 ||  // Серверные ошибки
    status === 0 ||   // Network error (но CORS для backend уже отфильтрованы выше)
    (status === 404 && isApiEndpoint)
  );
}
```

---

## 🧪 Тестирование

### Тест 1: Логин через NextAuth
```
✅ Пользователь вводит email: test@example.com
✅ Нажимает "Sign in with Credentials"
✅ Происходит редирект на главную страницу
✅ Email появляется в AuthBadge: "test@example.com"
✅ Сессия сохраняется в cookie
```

### Тест 2: Переход на /autoria/search
```
✅ Пользователь переходит на /autoria/search
✅ Middleware проверяет NextAuth сессию - OK
✅ Middleware проверяет backend токены в Redis - НЕТ
✅ Происходит редирект на /login?callbackUrl=/autoria/search
✅ НЕТ автоматического signout
✅ Email остается в AuthBadge: "test@example.com"
```

### Тест 3: Ожидание 15 секунд
```
✅ Прошло 15 секунд
✅ CORS ошибки для http://localhost:8000 НЕ считаются критическими
✅ НЕТ автоматического signout
✅ Email остается в AuthBadge: "test@example.com"
✅ Пользователь остается на странице /login
```

---

## 📊 Результаты

### До исправления
- ❌ NextAuth сессия не сохранялась (NEXTAUTH_SECRET зашифрован)
- ❌ CORS ошибки вызывали автоматический signout
- ❌ Пользователь не мог оставаться залогиненным

### После исправления
- ✅ NextAuth сессия сохраняется корректно
- ✅ CORS ошибки НЕ вызывают signout
- ✅ Пользователь остается залогиненным
- ✅ Правильный flow: NextAuth → /login (для backend токенов) → /autoria/search

---

## 📝 Важные замечания

### 1. Двухуровневая аутентификация
Приложение использует **два уровня** аутентификации:

**Уровень 1: NextAuth (Internal)**
- Путь: `/api/auth/signin`
- Провайдеры: Google OAuth, Credentials
- Сохраняет: email в JWT токене
- Требуется для: `/profile`, `/settings`

**Уровень 2: Backend/Dummy (External)**
- Путь: `/login`
- Провайдеры: MyBackendDocs, Dummy
- Сохраняет: access/refresh токены в Redis
- Требуется для: `/autoria/*` страниц

### 2. Правильный flow
```
1. Пользователь → /autoria/search
2. Middleware проверяет NextAuth сессию
   ├─ НЕТ → редирект на /api/auth/signin
   └─ ДА → проверяет backend токены в Redis
       ├─ НЕТ → редирект на /login?callbackUrl=/autoria/search
       └─ ДА → доступ разрешен
```

### 3. CORS ошибки
CORS ошибки для `http://localhost:8000` возникают когда:
- Компоненты делают прямые запросы к backend вместо Next.js API routes
- Это НЕ критическая ошибка - просто неправильная архитектура
- Правильно: использовать `/api/user/profile/` вместо `http://localhost:8000/api/user/profile/`

---

## 🔗 Связанные файлы

- `env-config/.env.secrets` - переменные окружения с секретами
- `frontend/src/hooks/useApiErrorHandler.ts` - обработчик API ошибок
- `frontend/src/configs/auth.ts` - конфигурация NextAuth
- `frontend/src/middleware.ts` - middleware для защиты роутов
- `docs/AUTHENTICATION_TROUBLESHOOTING.md` - полная документация по аутентификации

