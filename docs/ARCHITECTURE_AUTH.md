# 🔐 Архитектура авторизации (3 уровня защиты)

## Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 1: Middleware (NextAuth Session)                        │
│ ✓ Проверка NextAuth сессии                                      │
│ ✗ Нет сессии → redirect /api/auth/signin                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 2: AutoRiaAuthGuard (Backend Tokens)                    │
│ ✓ Проверка backend токенов (access, refresh)                    │
│ ✗ Нет токенов → redirect /login                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 3: API Error Handlers (401/403)                         │
│ ✓ Автоматический refresh токенов при 401                        │
│ ✗ Refresh failed → redirect /login                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Middleware - Первая линия защиты (NextAuth Session)

**Файл**: `frontend/src/middleware.ts`

**Что проверяет**:
- Наличие NextAuth сессии (через `getToken()`)
- Защищает маршруты `/autoria/*`, `/profile/*`, `/admin/*`

**Поведение**:
- ✅ Сессия есть → пропускает на страницу
- ❌ Сессии нет → редирект на `/api/auth/signin?callbackUrl=<current_path>`

**Важно**:
- Это первый и самый ранний барьер
- Выполняется на edge runtime (быстро)
- НЕ проверяет backend токены (это делает следующий уровень)

---

## 2. AutoRiaAuthGuard - Вторая линия защиты (Backend Tokens)

**Файл**: `frontend/src/components/AutoRia/Auth/AutoRiaAuthGuard.tsx`

**Применение**: Используется в серверном layout AutoRia `frontend/src/app/(main)/(backend)/autoria/layout.tsx`

```typescript
export default function AutoRiaLayoutWrapper({ children }) {
  return (
    <AutoRiaAuthGuard requireBackendAuth={true}>
      <AutoRiaLayout>
        {children}
      </AutoRiaLayout>
    </AutoRiaAuthGuard>
  );
}
```

**Что проверяет**:
- Наличие backend токенов в `localStorage.backend_auth`
- Валидность токенов (`access` и `refresh` присутствуют)

**Поведение**:
- ✅ Токены валидны → рендерит children
- ❌ Токенов нет/невалидны → редирект на `/login?callbackUrl=<current_path>&error=backend_auth_required`

**Важно**:
- **Клиентский компонент** ("use client"), но не делает весь layout клиентским
- НЕ проверяет NextAuth сессию (это сделал middleware)
- Показывает loader во время проверки
- Очищает невалидные токены из localStorage
- Позволяет использовать серверные компоненты внутри layout

**Почему клиентский компонент, а не HOC?**:
- HOC с "use client" делает все вложенные компоненты клиентскими
- Клиентский guard внутри серверного layout сохраняет SSR для страниц

---

## 3. API Error Handlers - Третья линия защиты (Runtime)

### fetchWithAuth - Основной API клиент

**Файл**: `frontend/src/lib/api/fetchWithAuth.ts`

**Функционал**:
- Автоматически добавляет `Authorization: Bearer <token>` к запросам
- При 401 ошибке → автоматический refresh токенов
- При неудаче refresh → редирект на `/login`
- При 403 (Forbidden) → редирект на `/login`

**Пример**:
```typescript
const response = await fetchWithAuth('/api/autoria/ads', {
  method: 'GET',
});

// Автоматически обрабатывает 401 и делает refresh
// Если refresh провалился → редирект /login
```

---

## 🔑 Полная очистка авторизации (cleanupAuth)

**Файл**: `frontend/src/lib/auth/cleanupAuth.ts`

### Функции:

#### 1. `cleanupAuth(redirectUrl?)` - Полная очистка
- Очищает Redis (провайдеры, токены)
- Очищает NextAuth сессию (`signOut`)
- Очищает localStorage (кроме темы и языка)
- Очищает sessionStorage
- Опционально редиректит

**Использование**:
```typescript
import { cleanupAuth } from '@/lib/auth/cleanupAuth';

// При logout
await cleanupAuth('/api/auth/signin');
```

#### 2. `cleanupBackendTokens()` - Очистка только backend токенов
- Удаляет `backend_auth`, `accessToken`, `refreshToken` из localStorage/sessionStorage
- НЕ трогает NextAuth сессию

#### 3. `cleanupProviders()` - Очистка провайдеров в Redis
- Вызывает `/api/auth/cleanup-providers`
- Очищает только `provider:<email>` в Redis

### API Endpoints для очистки:

**`POST /api/auth/cleanup`**:
- Очищает `provider:<email>`, `tokens:<email>`, `autoria:tokens:<email>` в Redis
- Требует NextAuth сессию

**`POST /api/auth/cleanup-providers`**:
- Очищает только `provider:<email>` в Redis
- Требует NextAuth сессию

---

## 📋 Порядок работы при входе пользователя

1. **Пользователь заходит на `/autoria/search`**
   - Middleware проверяет NextAuth сессию
   - Если нет → `/api/auth/signin?callbackUrl=/autoria/search`

2. **Middleware пропустил (есть NextAuth сессия)**
   - Рендерится layout `AutoRiaLayoutWrapper`
   - `AutoRiaAuthGuard` проверяет `localStorage.backend_auth`
   - Если нет → `/login?callbackUrl=/autoria/search&error=backend_auth_required`

3. **AuthGuard пропустил (есть backend токены)**
   - Страница рендерится
   - Компоненты делают API запросы через `fetchWithAuth`

4. **API запрос вернул 401**
   - `fetchWithAuth` автоматически пытается обновить токены
   - Если refresh успешен → повторяет запрос
   - Если refresh провалился → редирект `/login`

---

## 🚀 Примеры использования

### Защита страницы AutoRia (уже настроено)

Layout уже защищен `AutoRiaAuthGuard`:

```typescript
// frontend/src/app/(main)/(backend)/autoria/layout.tsx
export default function AutoRiaLayoutWrapper({ children }) {
  return (
    <AutoRiaAuthGuard requireBackendAuth={true}>
      <AutoRiaLayout>
        {children}
      </AutoRiaLayout>
    </AutoRiaAuthGuard>
  );
}
```

### API запрос с автоматической авторизацией

```typescript
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

// Автоматически добавляет токены, обрабатывает 401
const data = await fetchWithAuth('/api/autoria/ads');
```

### Logout с полной очисткой

```typescript
import { cleanupAuth } from '@/lib/auth/cleanupAuth';

const handleLogout = async () => {
  await cleanupAuth('/api/auth/signin');
};
```

---

## ⚠️ Важные замечания

1. **Middleware НЕ проверяет backend токены** - только NextAuth сессию
2. **AuthGuard НЕ проверяет NextAuth сессию** - только backend токены
3. **fetchWithAuth автоматически обрабатывает 401** - не нужно вручную делать refresh
4. **Всегда используйте `cleanupAuth` при logout** - для полной очистки Redis и токенов
5. **Layout AutoRia - серверный**, AuthGuard - клиентский (сохраняет SSR)

---

## 🔍 Дебаг

Все компоненты логируют свои действия в консоль:

```
[Middleware] Checking auth for path: /autoria/search
[AutoRiaAuthGuard] Checking backend tokens (session already validated by middleware)
[fetchWithAuth] Request to /api/autoria/ads
[fetchWithAuth] 401 error, attempting token refresh...
[fetchWithAuth] ✅ Token refresh successful
[CleanupAuth] Starting full authentication cleanup...
```

Поиск по логам:
- `[Middleware]` - проверка NextAuth сессии
- `[AutoRiaAuthGuard]` - проверка backend токенов
- `[fetchWithAuth]` - API запросы и refresh
- `[CleanupAuth]` - очистка авторизации

