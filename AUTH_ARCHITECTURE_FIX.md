# 🔐 Восстановление многоуровневой архитектуры авторизации

## Проблема
После изменений в middleware нарушилась многоуровневая защита маршрутов. Пользователи могли находиться на защищённых страницах без валидной сессии или токенов.

## Решение
Восстановлена правильная двухуровневая архитектура из коммита `5d32837bf4e9af694be61cf273c3cecdf8bc9e4e`.

---

## Архитектура многоуровневой авторизации

### 📋 Двухуровневая система защиты

```
┌─────────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 1: Middleware - NextAuth Session Guard                 │
│  ════════════════════════════════════════════════════════════    │
│  • Проверяется на КАЖДОМ запросе к /autoria/*                   │
│  • Если НЕТ NextAuth сессии → редирект /api/auth/signin         │
│  • Если ЕСТЬ NextAuth сессия → пропускает запрос дальше (L2)    │
│  • Быстрая проверка (без внешних запросов)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 2: BackendTokenPresenceGate - Backend Tokens Check     │
│  ════════════════════════════════════════════════════════════    │
│  • Проверяется на клиенте в Layout (HOC)                        │
│  • Если НЕТ backend токенов → redirectToAuth()                  │
│  • redirectToAuth умная функция:                                │
│    - Если есть NextAuth сессия → редирект /login                │
│    - Если нет NextAuth сессии → редирект /api/auth/signin       │
│  • Попытка refresh токена перед редиректом                      │
└─────────────────────────────────────────────────────────────────┘
```

### 🛡️ Защита маршрутов

#### Публичные пути (без авторизации)
```typescript
const PUBLIC_PATHS = [
  '/api/auth',      // NextAuth endpoints
  '/api/redis',     // Redis API (protected by cookies)
  '/api/health',    // Health checks
  '/api/reference', // Reference data
  '/api/public',    // Public API
  '/register',      // Registration page
  '/auth'           // Auth redirect page
];
```

#### Пути требующие NextAuth сессию (но не backend токены)
```typescript
const INTERNAL_AUTH_PATHS = [
  '/login',    // Login page (для получения backend токенов)
  '/profile',  // User profile
  '/settings'  // User settings
];
```

#### Пути требующие полную авторизацию (NextAuth + backend токены)
```typescript
const AUTORIA_PATHS = [
  '/autoria/search',
  '/autoria/ad',
  '/autoria/my-ads',
  '/autoria/favorites',
  '/autoria/create',
  '/autoria'  // Все остальные /autoria/* пути
];
```

---

## Изменённые файлы

### 1. ✅ `frontend/src/middleware.ts`

**Критическое изменение:** Убрана проверка backend токенов из middleware (уровень 2)

**Было (НЕПРАВИЛЬНО):**
```typescript
// УРОВЕНЬ 1 и 2: Middleware проверяет ОБА уровня
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  // ... Проверка NextAuth сессии (L1)
  
  // ... Проверка backend токенов в Redis (L2) - ❌ НЕ ДОЛЖНО БЫТЬ ЗДЕСЬ
  const redisCheckUrl = `${baseUrl}/api/redis?key=backend_auth`;
  const response = await fetch(redisCheckUrl, ...);
  
  if (!hasBackendTokens) {
    // Редирект на /login из middleware
    return NextResponse.redirect(loginUrl);
  }
}
```

**Стало (ПРАВИЛЬНО):**
```typescript
// УРОВЕНЬ 1 (из 2): Middleware - ТОЛЬКО NextAuth сессия
async function checkBackendAuth(req: NextRequest): Promise<NextResponse> {
  // Проверяем ТОЛЬКО NextAuth сессию
  const token = await getToken({ req, secret: nextAuthSecret });
  
  if (!token || !token.email) {
    // Нет сессии → редирект на signin
    return NextResponse.redirect(signinUrl);
  }
  
  // Сессия есть → пропускаем дальше к Layout (L2)
  return NextResponse.next();
}
```

**Почему это важно:**
- ✅ Middleware быстрый (без внешних запросов к Redis)
- ✅ Нет таймаутов и задержек при проверке
- ✅ Проверка backend токенов делается в клиенте (более гибкая обработка)
- ✅ Правильное разделение ответственности

### 2. ✅ `frontend/src/components/AutoRia/Auth/BackendTokenPresenceGate.tsx`

**Статус:** Файл уже правильный из коммита `5d32837`

**Функции:**
```typescript
// УРОВЕНЬ 2: Проверка backend токенов
export default function BackendTokenPresenceGate({ children }) {
  const checkBackendTokens = async () => {
    // 1. Проверка через /api/auth/me
    const tokenCheck = await fetch('/api/auth/me', ...);
    
    if (tokenCheck.ok) {
      // Токены валидны
      return setIsLoading(false);
    }
    
    // 2. Попытка refresh при 401
    if (tokenCheck.status === 401 && !isRetry) {
      const refreshResponse = await fetch('/api/auth/refresh', ...);
      if (refreshResponse.ok) {
        return checkBackendTokens(true); // Retry
      }
    }
    
    // 3. Умный редирект через redirectToAuth
    const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
    redirectToAuth(currentPath, 'tokens_not_found');
  };
}
```

### 3. ✅ `frontend/src/utils/auth/redirectToAuth.ts`

**Статус:** Файл уже правильный из коммита `5d32837`

**Умная логика редиректа:**
```typescript
export async function redirectToAuth(currentPath, reason) {
  // Проверяем NextAuth сессию
  const hasSession = await checkNextAuthSession();
  
  if (hasSession) {
    // ✅ Сессия есть → редирект на /login для backend токенов
    window.location.href = `/login?callbackUrl=${path}`;
  } else {
    // ❌ Сессии нет → редирект на /api/auth/signin
    window.location.href = `/api/auth/signin?callbackUrl=${path}`;
  }
}
```

### 4. ✅ `frontend/src/app/(main)/(backend)/autoria/layout.tsx`

**Статус:** Правильный, без изменений

```typescript
export default function AutoRiaLayoutWrapper({ children }) {
  return (
    <BackendTokenPresenceGate>
      {/* ↑ УРОВЕНЬ 2: Проверка backend токенов */}
      <AutoRiaLayout>
        {children}
      </AutoRiaLayout>
    </BackendTokenPresenceGate>
  );
}
```

---

## Сценарии работы системы

### Сценарий 1: Пользователь не авторизован (нет ничего)

```
Запрос: GET /autoria
           ↓
[Middleware L1] NextAuth сессия?
           ↓ НЕТ
Редирект: /api/auth/signin?callbackUrl=/autoria
           ↓
Пользователь входит через Google/Email
           ↓
NextAuth создаёт сессию (cookie)
           ↓
Редирект: /login?callbackUrl=/autoria
           ↓
Страница /login вызывает Django API
           ↓
Backend создаёт access/refresh токены
           ↓
Токены сохраняются в Redis
           ↓
Редирект: /autoria (callbackUrl)
           ↓
[Middleware L1] NextAuth сессия? ✅ ДА
           ↓
[Layout L2] Backend токены? ✅ ДА
           ↓
Доступ разрешён ✅
```

### Сценарий 2: Есть NextAuth сессия, но нет backend токенов

```
Запрос: GET /autoria
           ↓
[Middleware L1] NextAuth сессия? ✅ ДА
           ↓
Запрос проходит дальше
           ↓
[Layout L2] Backend токены?
           ↓ НЕТ (404 от /api/auth/me)
[redirectToAuth] Проверка NextAuth сессии
           ↓ ЕСТЬ сессия
Редирект: /login?callbackUrl=/autoria&error=tokens_not_found
           ↓
Страница /login получает backend токены
           ↓
Редирект: /autoria
           ↓
Доступ разрешён ✅
```

### Сценарий 3: Есть сессия и токены, но токены expired

```
Запрос: GET /autoria
           ↓
[Middleware L1] NextAuth сессия? ✅ ДА
           ↓
[Layout L2] Backend токены?
           ↓ 401 (expired)
[BackendTokenPresenceGate] Попытка refresh
           ↓
POST /api/auth/refresh
           ↓ ✅ Успех
Новые токены сохранены в Redis
           ↓
Retry: GET /api/auth/me
           ↓ ✅ OK
Доступ разрешён ✅
```

### Сценарий 4: Сессия expired во время работы

```
Пользователь на странице /autoria
           ↓
NextAuth сессия истекла (cookie expired)
           ↓
Следующий запрос: GET /autoria/my-ads
           ↓
[Middleware L1] NextAuth сессия? ❌ НЕТ
           ↓
Редирект: /api/auth/signin?callbackUrl=/autoria/my-ads
           ↓
Пользователь входит снова
           ↓
Весь процесс повторяется с начала
```

---

## Критические требования безопасности

### ✅ ЧТО НУЖНО ДЕЛАТЬ

1. **Middleware проверяет ТОЛЬКО NextAuth сессию**
   - Быстрая проверка без внешних запросов
   - Не проверяет backend токены

2. **BackendTokenPresenceGate проверяет backend токены**
   - Работает на клиенте в Layout
   - Использует умную утилиту redirectToAuth

3. **redirectToAuth умная функция**
   - Проверяет наличие NextAuth сессии
   - Редиректит на правильный путь (/login или /signin)

4. **Никто не может обойти защиту**
   - Middleware блокирует на уровне сервера
   - Layout блокирует на уровне клиента
   - Двойная защита

### ❌ ЧТО НЕ НУЖНО ДЕЛАТЬ

1. **НЕ проверять backend токены в middleware**
   - Создаёт таймауты
   - Замедляет все запросы
   - Нарушает архитектуру

2. **НЕ делать прямые редиректы на /login из Layout**
   - Нужно использовать redirectToAuth
   - Она проверит наличие NextAuth сессии

3. **НЕ пропускать проверки**
   - Middleware ВСЕГДА проверяет сессию
   - Layout ВСЕГДА проверяет токены

4. **НЕ игнорировать ошибки**
   - При ошибке всегда редирект на авторизацию
   - Никогда не пропускать запрос с ошибкой

---

## Тестирование

### Проверка защиты маршрутов

```bash
# 1. Без авторизации (должен редиректить на signin)
curl -I http://localhost:3000/autoria
# Expected: 307 → /api/auth/signin?callbackUrl=%2Fautoria

# 2. С NextAuth сессией, но без backend токенов
# (должен пропустить через middleware, но BackendTokenPresenceGate редиректит на /login)
# Тестируется в браузере

# 3. С полной авторизацией (должен показать страницу)
# Тестируется в браузере
```

### Логи для диагностики

```
# Middleware (L1)
[Middleware] Processing: /autoria
[Middleware] Autoria path, checking backend_auth tokens in Redis
[Middleware L1] Checking NextAuth session for Autoria access
[Middleware L1] getToken result: Token exists email: user@example.com
[Middleware L1] ✅ NextAuth session valid (email: user@example.com) - passing to L2 (Layout HOC)

# BackendTokenPresenceGate (L2)
[BackendTokenPresenceGate] Level 2: Checking backend tokens...
[BackendTokenPresenceGate] ✅ Backend tokens valid, access granted

# redirectToAuth (при проблемах)
[redirectToAuth] Checking NextAuth session before redirect...
[redirectToAuth] ✅ NextAuth session exists, redirecting to /login for backend tokens
```

---

## Рабочие коммиты

- **OAuth:** `c133ce18735dc21474338c1ea667ba3f651ad12e` (Fri Oct 31 14:45:11 2025)
- **Auth Architecture:** `5d32837bf4e9af694be61cf273c3cecdf8bc9e4e` (Sat Nov 1 01:10:15 2025)

---

## Статус

✅ **Многоуровневая авторизация восстановлена**

**Дата:** 2025-11-01 23:15 UTC+02:00  
**Тесты:** Требуют запуска приложения для проверки
