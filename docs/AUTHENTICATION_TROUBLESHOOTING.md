# Руководство по устранению проблем аутентификации

## Оглавление
1. [Проблема: Токены не сохраняются в Redis после логина](#проблема-1-токены-не-сохраняются-в-redis-после-логина)
2. [Проблема: Сессия NextAuth истекает слишком быстро](#проблема-2-сессия-nextauth-истекает-слишком-быстро)
3. [Проблема: Бесконечный редирект (ERR_TOO_MANY_REDIRECTS)](#проблема-3-бесконечный-редирект-err_too_many_redirects)
4. [Проблема: Редирект на несуществующую страницу /signin](#проблема-4-редирект-на-несуществующую-страницу-signin)
5. [Проблема: Старый код кэшируется Turbopack](#проблема-5-старый-код-кэшируется-turbopack)
6. [Проблема: Автоматический редирект на signin из-за CORS ошибок](#проблема-6-автоматический-редирект-на-signin-из-за-cors-ошибок)
7. [Проблема: Автоматический редирект из-за ошибок 400/401](#проблема-7-автоматический-редирект-из-за-ошибок-400401)
8. [Проблема: Откат изменений с proxy - возврат к прямым запросам](#проблема-8-откат-изменений-с-proxy---возврат-к-прямым-запросам)
9. [Проблема: Автоматический refresh токенов при 401 ошибке](#проблема-9-автоматический-refresh-токенов-при-401-ошибке)
10. [Проблема: CORS ошибка с credentials: 'include'](#проблема-10-cors-ошибка-с-credentials-include)

---

## Проблема 1: Токены не сохраняются в Redis после логина

### Симптомы
- После успешного логина на странице `/login` пользователь остается на той же странице
- В логах сервера НЕТ запросов `POST /api/redis` после логина
- Редирект на `/autoria` не происходит
- В логах видно: `[LoginForm] ❌ Tokens were NOT saved to Redis`

### Причина
Неправильный `baseUrl` для клиентских запросов к Redis API в файле `frontend/src/app/api/helpers.ts`.

**Проблемный код:**
```typescript
const baseUrl = isServer
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000')
  : (process.env.NEXTAUTH_URL || 'http://localhost:3000'); // ❌ НЕПРАВИЛЬНО для клиента
```

На клиентской стороне (в браузере) использование абсолютного URL `http://localhost:3000` может вызывать проблемы с CORS и маршрутизацией.

### Решение

**Файл:** `frontend/src/app/api/helpers.ts`

**Найти строки (примерно 299-305):**
```typescript
const baseUrl = isServer
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000')
  : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
```

**Заменить на:**
```typescript
const baseUrl = isServer
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000')
  : ''; // ✅ На клиенте используем относительный URL
```

### Проверка
После исправления в логах сервера должны появиться:
```
POST /api/redis [32m200[39m in 236ms
GET /autoria [32m200[39m in 1315ms
```

---

## Проблема 2: Сессия NextAuth истекает слишком быстро

### Симптомы
- Пользователь выходит из системы через несколько минут после логина
- Редирект на `/api/auth/signin` происходит без видимой причины
- В middleware логи показывают: `[Middleware] No valid NextAuth session`

### Причина
Слишком короткий `maxAge` для JWT сессии в NextAuth конфигурации.

### Решение

**Файл:** `frontend/src/configs/auth.ts`

**Найти секцию `session`:**
```typescript
session: {
  strategy: "jwt",
  maxAge: 60 * 60 * 24, // ❌ 24 часа - слишком мало
  updateAge: 60 * 60 * 24,
},
```

**Заменить на:**
```typescript
session: {
  strategy: "jwt",
  maxAge: 60 * 60 * 24 * 30, // ✅ 30 дней
  updateAge: 60 * 60 * 24, // Обновлять сессию каждые 24 часа
},
```

### Дополнительные настройки

Убедитесь, что в `auth.ts` НЕТ конфигурации `pages`:
```typescript
// ❌ УДАЛИТЬ если есть:
pages: {
  signIn: "/api/auth/signin",
  signOut: "/api/auth/signout",
  error: "/api/auth/error",
},
```

NextAuth должен использовать встроенные страницы.

---

## Проблема 3: Бесконечный редирект (ERR_TOO_MANY_REDIRECTS)

### Симптомы
- Браузер показывает ошибку `ERR_TOO_MANY_REDIRECTS`
- В логах сервера множество запросов `GET /api/auth/signin [34m302[39m`
- Страница `/api/auth/signin` не загружается

### Причина
Конфликт между конфигурацией `pages` в NextAuth и встроенным роутом `[...nextauth]`.

Когда указано `pages: { signIn: "/api/auth/signin" }`, NextAuth думает, что это кастомная страница, но на самом деле это его собственный встроенный роут, что создает бесконечный цикл редиректов.

### Решение

**Файл:** `frontend/src/configs/auth.ts`

**Удалить секцию `pages` полностью:**
```typescript
export const authConfig: AuthOptions = {
  // ... другие настройки ...

  // ❌ УДАЛИТЬ ЭТУ СЕКЦИЮ:
  // pages: {
  //   signIn: "/api/auth/signin",
  //   signOut: "/api/auth/signout",
  //   error: "/api/auth/error",
  // },

  callbacks: {
    // ... callbacks остаются ...
  },
};
```

### Проверка
После исправления:
```
GET /api/auth/signin [32m200[39m in 215ms  // ✅ 200 вместо 302
```

---

## Проблема 4: Редирект на несуществующую страницу /signin

### Симптомы
- При вызове `signOut()` происходит редирект на `/signin` (404)
- В логах: `GET /signin?callbackUrl=%2Fautoria [33m404[39m`

### Причина
NextAuth по умолчанию редиректит на `/signin` после `signOut()`, но правильный путь - `/api/auth/signin`.

### Решение 1: Исправить вызов signOut

**Файл:** `frontend/src/components/Menus/MenuMain/MenuMain.tsx`

**Найти:**
```typescript
await signOut({ callbackUrl: "/api/auth/signin" });
```

**Заменить на:**
```typescript
await signOut({ redirect: false }); // ✅ Отключаем автоматический редирект
window.location.href = '/api/auth/signin'; // Вручную редиректим
```

### Решение 2: Создать редирект-страницу

**Файл:** `frontend/src/app/signin/page.tsx` (создать новый)

```typescript
import { redirect } from 'next/navigation';

/**
 * Server-side redirect page for /signin -> /api/auth/signin
 * NextAuth sometimes redirects to /signin instead of /api/auth/signin
 * This page ensures proper redirection to the correct NextAuth signin page
 */
export default async function SignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;

  console.log('[SignInRedirect] Server-side redirect from /signin to /api/auth/signin', {
    callbackUrl
  });

  if (callbackUrl) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  } else {
    redirect('/api/auth/signin');
  }
}
```

---

## Проблема 5: Старый код кэшируется Turbopack

### Симптомы
- Изменения в коде не применяются
- В логах видны вызовы старых функций
- Например: `[NextAuth signIn] Backend authentication failed` - хотя этот код уже удален

### Причина
Turbopack (dev сервер Next.js 15) кэширует скомпилированный код и не всегда обновляет его при изменениях.

### Решение

**Перезапустить dev сервер:**

```bash
# Остановить текущий процесс (Ctrl+C)
# Затем запустить заново:
npm run dev
```

**Или использовать команду kill:**
```bash
npm run kill 3000 && npm run dev
```

### Проверка
После перезапуска в логах должны быть только актуальные сообщения из текущего кода.

---

## Архитектура двухуровневой аутентификации

### Уровень 1: NextAuth Session
- **Назначение**: Базовая аутентификация для доступа к приложению
- **Хранение**: JWT токен в cookies
- **Срок действия**: 30 дней (с обновлением каждые 24 часа)
- **Проверка**: Middleware использует `getToken()` из `next-auth/jwt`
- **Защищает**: `/login`, `/profile`, `/settings`, `/autoria/*`

### Уровень 2: Backend Tokens в Redis
- **Назначение**: Доступ к защищенным API бэкенда
- **Хранение**: Redis (ключ `backend_auth` или `dummy_auth`)
- **Формат**: `{ access: string, refresh: string, refreshAttempts: number }`
- **Срок действия**: Определяется бэкендом
- **Проверка**: Middleware читает из Redis через `/api/redis`
- **Защищает**: `/autoria/*` (дополнительно к NextAuth)

### Поток аутентификации

```
1. Пользователь → /autoria
   ↓
2. Middleware проверяет NextAuth session
   ↓ (нет)
3. Redirect → /api/auth/signin
   ↓
4. Пользователь вводит email → NextAuth создает session
   ↓
5. Redirect → /login
   ↓
6. Пользователь выбирает backend user и логинится
   ↓
7. useLoginForm.ts → fetchAuth() → Backend API
   ↓
8. Backend возвращает { access, refresh, user }
   ↓
9. fetchAuth() сохраняет токены в Redis (POST /api/redis)
   ↓
10. Redirect → /autoria
    ↓
11. Middleware проверяет:
    - NextAuth session ✅
    - Backend tokens в Redis ✅
    ↓
12. Доступ разрешен → страница загружается
```

---

## Чек-лист для диагностики проблем

### 1. Проверка NextAuth сессии
```bash
# В логах должно быть:
[Middleware] NextAuth session valid, checking backend tokens
```

Если видите:
```bash
[Middleware] No valid NextAuth session - redirecting to signin
```
→ Проблема с NextAuth сессией (см. Проблема 2)

### 2. Проверка токенов в Redis
```bash
# В логах должно быть:
POST /api/redis [32m200[39m in 236ms
[Middleware] backend_auth tokens found in Redis - allowing Autoria access
```

Если НЕТ `POST /api/redis`:
→ Токены не сохраняются (см. Проблема 1)

### 3. Проверка редиректов
```bash
# Правильные редиректы:
GET /api/auth/signin [32m200[39m
POST /api/auth/callback/credentials [34m302[39m
GET /autoria [32m200[39m
```

Если видите:
```bash
GET /api/auth/signin [34m302[39m  # Множество раз
```
→ Бесконечный редирект (см. Проблема 3)

### 4. Проверка файловой структуры
```
frontend/src/app/api/auth/
  └── [...nextauth]/
      └── route.ts  ✅ Единственный файл

НЕ должно быть:
  ├── signin/
  ├── signout/
  ├── session/
  └── login/
```

Если есть пустые директории → удалить их.

---

## Полезные команды для отладки

### Проверка Redis
```bash
# Подключиться к Redis CLI
docker exec -it <redis-container> redis-cli

# Проверить ключи
KEYS *

# Получить значение
GET backend_auth
GET auth_provider
```

### Проверка логов Docker
```bash
# Backend логи
docker logs <backend-container> --tail 100 -f

# Redis логи
docker logs <redis-container> --tail 100 -f
```

### Очистка кэша
```bash
# Удалить .next директорию
rm -rf .next

# Перезапустить dev сервер
npm run dev
```


---

## Проблема 6: Автоматический редирект на signin из-за CORS ошибок

### Симптомы
- Страница `/autoria/search` загружается успешно после логина
- Через 5-10 секунд происходит автоматический редирект на `/api/auth/signin`
- В консоли браузера видны CORS ошибки:
  ```
  Access to fetch at 'http://localhost:8000/api/user/profile/' from origin 'http://localhost:3000'
  has been blocked by CORS policy
  ```
- В логах видно: `[ApiErrorHandler] Critical API error detected`
- После нескольких критических ошибок: `[ApiErrorHandler] Too many critical errors, forcing redirect...`

### Причина
Некоторые компоненты делают **прямые запросы** к backend (`http://localhost:8000`) вместо использования Next.js proxy (`/api/proxy/`).

**Цепочка событий:**
1. Компоненты на странице `/autoria/search` загружают данные пользователя
2. Запросы идут напрямую к `http://localhost:8000/api/user/profile/` и другим эндпоинтам
3. Браузер блокирует эти запросы из-за CORS policy (cross-origin requests)
4. `useApiErrorHandler` (файл `frontend/src/hooks/useApiErrorHandler.ts`) считает CORS ошибки критическими
5. После достижения порога критических ошибок (`criticalErrorThreshold`) срабатывает `handleCriticalError()`
6. Функция вызывает `signOut({ redirect: false })` и делает редирект на `/api/auth/signin`

**Проблемные файлы:**
- `frontend/src/app/api/helpers/publicFetch.ts` - делал прямые запросы к backend
- `frontend/src/services/api/apiClient.ts` - использовал прямой baseUrl к backend

### Решение

#### Вариант 1: Использовать Next.js proxy (РЕКОМЕНДУЕТСЯ)

**Файл 1:** `frontend/src/app/api/helpers/publicFetch.ts`

**Было:**
```typescript
export async function fetchPublicData<T = any>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Build URL with parameters
    const urlParams = new URLSearchParams(params || {});
    const url = `${backendUrl}/${endpoint}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;

    // Make request to Django backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    // ...
  }
}
```

**Стало:**
```typescript
export async function fetchPublicData<T = any>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    // Determine if we're on server or client
    const isServer = typeof window === 'undefined';

    // Build URL with parameters
    const urlParams = new URLSearchParams(params || {});
    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';

    let url: string;

    if (isServer) {
      // Server-side: can make direct requests to backend
      // Use Docker service name if in Docker, otherwise localhost
      const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
      const backendUrl = isDocker
        ? 'http://app:8000'  // Docker service name
        : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

      url = `${backendUrl}/${endpoint}${queryString}`;
      console.log(`[Public Fetch] Server-side GET ${url}`);
    } else {
      // Client-side: use Next.js API proxy to avoid CORS
      url = `/api/proxy/${endpoint}${queryString}`;
      console.log(`[Public Fetch] Client-side GET ${url} (via proxy)`);
    }

    // Make request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    // ...
  }
}
```

**Файл 2:** `frontend/src/services/api/apiClient.ts`

**Было:**
```typescript
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 1;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // ...
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    // ...
  }
}
```

**Стало:**
```typescript
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private useProxy: boolean;

  constructor(options: ApiClientOptions = {}) {
    // IMPORTANT: Client-side code should use Next.js proxy to avoid CORS
    // Only use direct backend URL if explicitly provided in options
    this.useProxy = !options.baseUrl; // Use proxy by default unless custom baseUrl provided
    this.baseUrl = options.baseUrl || '/api/proxy'; // Default to proxy route
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 1;

    console.log(`[ApiClient] Initialized with baseUrl: ${this.baseUrl}, useProxy: ${this.useProxy}`);
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // ...
    let url: string;
    if (endpoint.startsWith('http')) {
      // Absolute URL provided - use as is
      url = endpoint;
    } else if (this.useProxy) {
      // Using proxy - endpoint should be relative to backend (e.g., 'api/user/profile/')
      // Remove leading slash if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      url = `${this.baseUrl}/${cleanEndpoint}`;
    } else {
      // Direct backend URL
      url = `${this.baseUrl}${endpoint}`;
    }

    console.log(`[ApiClient] ${method} ${url} (proxy: ${this.useProxy})`);
    // ...
  }
}
```

**Файл 3:** `frontend/src/app/api/proxy/[...path]/route.ts` (уже исправлен)

Убедитесь, что proxy использует правильный backend URL:
```typescript
// Get backend URL
// IMPORTANT: Frontend runs locally (not in Docker), so always use localhost
// Backend runs in Docker but exposes port 8000 to localhost
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
```

#### Вариант 2: Настроить CORS в Django (НЕ РЕКОМЕНДУЕТСЯ)

Этот вариант не рекомендуется, так как:
- Нарушает архитектуру проекта (все запросы должны идти через Next.js)
- Требует дополнительной настройки CORS
- Может вызвать проблемы с аутентификацией (cookies, credentials)

Если все же нужно:

**Файл:** `backend/config/settings.py`

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

#### Вариант 3: Временно отключить автоматический редирект (ДЛЯ ТЕСТИРОВАНИЯ)

**Файл:** `frontend/src/hooks/useApiErrorHandler.ts`

```typescript
// Увеличить порог критических ошибок
const criticalErrorThreshold = 100; // Было: 5

// Или отключить автоматический редирект
const enableAutoRedirect = false; // Было: true
```

**⚠️ Внимание:** Это только для тестирования! Не используйте в продакшене.

### Проверка

После применения решения:

1. **Очистить кэш браузера** и перезагрузить страницу
2. **Перезапустить dev сервер** (если изменяли код):
   ```bash
   # Остановить текущий процесс (Ctrl+C)
   npm run dev
   ```
3. **Войти в систему** через `/api/auth/signin`
4. **Перейти на** `/autoria/search`
5. **Подождать 10-15 секунд** - редирект НЕ должен произойти
6. **Проверить консоль браузера** - CORS ошибок быть НЕ должно
7. **Проверить Network tab** - все запросы должны идти через `/api/proxy/`

**Ожидаемые логи в консоли:**
```
[Public Fetch] Client-side GET /api/proxy/api/user/profile/ (via proxy)
[ApiClient] GET /api/proxy/api/user/addresses/ (proxy: true)
[ApiClient] GET /api/proxy/api/accounts/contacts/ (proxy: true)
```

**НЕ должно быть:**
```
❌ Access to fetch at 'http://localhost:8000/...' has been blocked by CORS policy
❌ [ApiErrorHandler] Critical API error detected
❌ [ApiErrorHandler] Too many critical errors, forcing redirect...
```

### Дополнительная информация

**Почему возникает CORS ошибка:**
- Frontend работает на `http://localhost:3000`
- Backend работает на `http://localhost:8000`
- Это разные origins (разные порты)
- Браузер блокирует cross-origin запросы по умолчанию

**Почему Next.js proxy решает проблему:**
- Запрос идет на тот же origin: `http://localhost:3000/api/proxy/...`
- Next.js API route проксирует запрос к backend на серверной стороне
- Серверные запросы не подвержены CORS ограничениям
- Backend получает запрос и отвечает
- Next.js возвращает ответ клиенту

**Архитектура:**
```
Browser (localhost:3000)
  ↓ fetch('/api/proxy/api/user/profile/')
Next.js API Route (localhost:3000/api/proxy/[...path])
  ↓ fetch('http://localhost:8000/api/user/profile/')
Django Backend (localhost:8000)
  ↓ response
Next.js API Route
  ↓ response
Browser
```

---

## Контакты и дополнительная информация

- **Документация NextAuth**: https://next-auth.js.org/
- **Документация Redis**: https://redis.io/docs/
- **Next.js 15 Docs**: https://nextjs.org/docs

**Дата создания**: 2025-01-16
**Последнее обновление**: 2025-01-16

---

## Проблема 7: Автоматический редирект из-за ошибок 400/401

### Симптомы
- Страница `/autoria/search` загружается успешно
- Через несколько секунд происходит автоматический `signOut` и редирект на `/signin`
- В логах видно:
  ```
  GET /api/auth/token 400
  POST /api/auth/signout 200
  GET /signin?callbackUrl=%2Fautoria%2Fsearch 200
  ```

### Причина
`useApiErrorHandler` перехватывает **ВСЕ** fetch запросы через `setupGlobalFetchErrorTracking` и считает ошибки 400/401 **критическими**, хотя они являются **нормальными** для API аутентификации.

**Проблемная логика в `isCriticalError`:**
```typescript
// БЫЛО (неправильно):
private isCriticalError(status: number, url: string): boolean {
  const isApiEndpoint = url.includes('/api/') && !url.includes('/api/auth/');

  return (
    (status === 404 && isApiEndpoint) ||
    status >= 500 ||
    status === 0 // Network error
  );
}
```

Проблема: функция НЕ исключала ошибки 400-499 для `/api/auth/*`, `/api/public/*`, `/api/redis`.

### Решение

**Файл 1:** `frontend/src/hooks/useApiErrorHandler.ts`

Обновлена функция `isCriticalError` для исключения нормальных клиентских ошибок:

```typescript
// СТАЛО (правильно):
private isCriticalError(status: number, url: string): boolean {
  // Критические ошибки:
  // 1. 500+ серверные ошибки
  // 2. Network errors (status 0)
  // 3. 404 для API endpoints (НО НЕ для /api/auth/* и /api/public/*)

  // Исключаем все auth endpoints - они могут возвращать 400/401/404 в нормальном режиме
  if (url.includes('/api/auth/')) {
    return false;
  }

  // Исключаем public endpoints - они могут возвращать 404 если данных нет
  if (url.includes('/api/public/')) {
    return false;
  }

  // Исключаем Redis API - он может возвращать 404 если ключа нет
  if (url.includes('/api/redis')) {
    return false;
  }

  // 400-499 ошибки НЕ критические (это клиентские ошибки - неправильный запрос, нет прав и т.д.)
  if (status >= 400 && status < 500) {
    return false;
  }

  const isApiEndpoint = url.includes('/api/');

  return (
    status >= 500 ||  // Серверные ошибки
    status === 0 ||   // Network error
    (status === 404 && isApiEndpoint) // 404 для API (но уже отфильтрованы auth/public/redis выше)
  );
}
```

**Файл 2:** `frontend/src/common/providers/RootProvider.tsx`

Увеличен порог критических ошибок:

```typescript
// БЫЛО:
criticalErrorThreshold: 5

// СТАЛО:
criticalErrorThreshold: 10 // Только серверные 500+ и network errors
```

### Проверка

После исправления:

1. **Войти через `/login`**
2. **Перейти на `/autoria/search`**
3. **Подождать 30+ секунд** - редирект НЕ должен произойти
4. **Проверить логи** - ошибки 400/401 НЕ должны считаться критическими:
   ```
   ✅ GET /api/auth/token 400 - НЕ критическая ошибка
   ✅ GET /api/public/reference/brands 404 - НЕ критическая ошибка
   ✅ GET /api/redis?key=backend_auth 404 - НЕ критическая ошибка

   ❌ GET /api/autoria/cars 500 - КРИТИЧЕСКАЯ ошибка (серверная)
   ❌ Network error (status 0) - КРИТИЧЕСКАЯ ошибка
   ```

### Важные моменты

1. **400-499 ошибки НЕ критические** - это клиентские ошибки (неправильный запрос, нет прав, не найдено)
2. **500+ ошибки КРИТИЧЕСКИЕ** - это серверные ошибки (backend упал, база данных недоступна)
3. **Network errors (status 0) КРИТИЧЕСКИЕ** - это сетевые ошибки (нет интернета, backend недоступен)
4. **Auth endpoints исключены** - `/api/auth/*` может возвращать 400/401 в нормальном режиме
5. **Public endpoints исключены** - `/api/public/*` может возвращать 404 если данных нет
6. **Redis API исключен** - `/api/redis` может возвращать 404 если ключа нет в кэше

---

## Проблема 8: Откат изменений с proxy - возврат к прямым запросам

### Контекст
В Проблеме 6 были внесены изменения для использования Next.js proxy (`/api/proxy/`) для всех запросов к backend.
Однако, эти изменения были **откачены**, потому что:

1. **В коммите `c4d14c783c897a60f6ccd5b1ae26f638dc4f34c6` все работало отлично** с прямыми запросами к backend
2. **Django backend правильно настроен** с `CORS_ALLOW_ALL_ORIGINS = True`
3. **CORS НЕ является проблемой** - все запросы проходят успешно
4. **Proxy добавляет ненужную сложность** без реальной пользы

### Решение: Прямые запросы к backend

Все файлы были возвращены к использованию прямых запросов:

#### 1. `frontend/src/app/api/helpers.ts` - функция `fetchAuth`

```typescript
// Формируем endpoint с использованием Service Registry для backend
let endpoint: string;
if (isUsingDummyAuth) {
  endpoint = `${API_URLS[AuthProvider.Dummy]}/auth/login`;
} else {
  // Используем NEXT_PUBLIC_BACKEND_URL напрямую для большей надежности
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs];
  endpoint = `${backendUrl}/api/auth/login`;
  console.log(`[fetchAuth] Using endpoint: ${endpoint}`);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(credentials),
  cache: "no-store",
});
```

#### 2. `frontend/src/app/api/helpers.ts` - функция `fetchData`

```typescript
try {
  const urlSearchParams = new URLSearchParams(params).toString();
  const headers = await getAuthorizationHeaders();
  const url = `${endpoint}${urlSearchParams ? `?${urlSearchParams}` : ''}`;

  // Определяем ключ для токенов
  const authProvider = (await apiGetRedis("auth_provider")) || AuthProvider.MyBackendDocs;
  const tokenKey = authProvider === AuthProvider.Dummy ? "dummy_auth" : "backend_auth";

  const response = await fetch(url, {
    headers,
    method: "GET",
    cache: 'no-store'
  });
  // ...
}
```

#### 3. `frontend/src/app/api/helpers/publicFetch.ts`

```typescript
export async function fetchPublicData<T = any>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    // Use Docker service name if in Docker, otherwise localhost
    const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
    const backendUrl = isDocker
      ? 'http://app:8000'  // Docker service name
      : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

    // Build URL with parameters
    const urlParams = new URLSearchParams(params || {});
    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
    const url = `${backendUrl}/${endpoint}${queryString}`;

    console.log(`[Public Fetch] GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    // ...
  }
}
```

#### 4. `frontend/src/services/api/apiClient.ts`

```typescript
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private useProxy: boolean;

  constructor(options: ApiClientOptions = {}) {
    // Use environment variable for backend URL
    const defaultBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    this.useProxy = false; // Direct backend requests
    this.baseUrl = options.baseUrl || defaultBaseUrl;
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 1;

    console.log(`[ApiClient] Initialized with baseUrl: ${this.baseUrl}`);
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // ...
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    console.log(`[ApiClient] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    // ...
  }
}
```

### Важные моменты

1. **Environment Variables**: Используем `NEXT_PUBLIC_BACKEND_URL` для всех клиентских запросов
2. **Docker Support**: Проверяем `NEXT_PUBLIC_IS_DOCKER` для определения окружения
3. **No Proxy Needed**: Прямые запросы работают отлично благодаря `CORS_ALLOW_ALL_ORIGINS = True`
4. **Simplicity**: Код стал проще и понятнее без лишних проверок server/client side

### Проверка

После отката изменений:

1. **Перезапустить dev сервер**:
   ```bash
   npm run dev
   ```

2. **Войти через форму `/login`**:
   - Запрос должен идти к `http://localhost:8000/api/auth/login`
   - Токены должны сохраниться в Redis
   - Редирект на `/autoria/search`

3. **На странице `/autoria/search`**:
   - Все запросы должны идти напрямую к `http://localhost:8000`
   - НЕ должно быть CORS ошибок
   - НЕ должно быть автоматического редиректа

**Ожидаемые логи:**
```
[fetchAuth] Using endpoint: http://localhost:8000/api/auth/login
[Public Fetch] GET http://localhost:8000/api/public/reference/brands?page_size=50
[ApiClient] GET http://localhost:8000/api/user/profile/
```

**НЕ должно быть:**
```
❌ /api/proxy/auth/login
❌ /api/proxy/api/user/profile/
❌ Access to fetch at 'http://localhost:8000/...' has been blocked by CORS policy
```

### Вывод

**Proxy НЕ нужен**, если:
- Backend правильно настроен с CORS
- Используются правильные environment variables
- Код использует `NEXT_PUBLIC_BACKEND_URL` для клиентских запросов

**Proxy нужен только**, если:
- Backend НЕ поддерживает CORS
- Нужно скрыть backend URL от клиента
- Требуется дополнительная обработка запросов на стороне Next.js

---

## Проблема 9: Автоматический refresh токенов при 401 ошибке

### Симптомы
- При запросах к внешним API с истекшими токенами возвращается 401 ошибка
- Пользователь сразу перенаправляется на страницу логина
- Нет автоматической попытки обновить токены

### Описание проблемы
Когда токены доступа (access tokens) истекают, первое что должно происходить при получении 401 ошибки - это **автоматический refresh токенов и повтор запроса** (refresh единожды). Это стандартная практика в современных приложениях.

### Архитектура Token Refresh

#### 1. Route `/api/auth/refresh`
**Файл:** `frontend/src/app/api/auth/refresh/route.ts`

**Функциональность:**
- Получает refresh token из Redis (ключ зависит от провайдера: `backend_auth` или `dummy_auth`)
- Определяет текущий провайдер из Redis (`auth_provider`)
- Вызывает соответствующий backend endpoint для обновления токена
- Сохраняет новые токены обратно в Redis
- Сбрасывает счетчик `refreshAttempts` при успехе
- Проверяет валидность новых токенов

**Поддерживаемые провайдеры:**
- **Backend** (`backend_auth`): Django backend на `http://localhost:8000` или `http://app:8000`
- **Dummy** (`dummy_auth`): Dummy API на `http://localhost:3001` или `http://dummy-api:3001`

#### 2. ApiClient с автоматическим refresh
**Файл:** `frontend/src/services/api/apiClient.ts`

**Логика обработки 401:**
```typescript
// Если получили 401 и не пропускаем повтор, пытаемся обновить токены
if (response.status === 401 && !skipAuth && !skipRetry) {
  console.log('[ApiClient] Got 401, attempting token refresh...');

  const refreshSuccess = await this.refreshTokens();
  if (refreshSuccess) {
    console.log('[ApiClient] Token refreshed, retrying request...');
    // Повторяем запрос с новыми токенами (skipRetry: true чтобы избежать бесконечного цикла)
    return this.request<T>(endpoint, { ...options, skipRetry: true });
  } else {
    console.error('[ApiClient] Token refresh failed, redirecting to login');
    throw new Error('Authentication failed');
  }
}
```

**Метод `refreshTokens()`:**
- Вызывает `/api/auth/refresh` route
- Возвращает `true` если refresh успешен
- Возвращает `false` если refresh не удался

#### 3. fetchData с автоматическим refresh
**Файл:** `frontend/src/app/api/helpers.ts`

**Логика обработки 401:**
```typescript
case 401: {
  console.log("Error 401: Token not valid. Attempting to refresh...");
  const refreshResult = await fetchRefresh(key);
  if (!refreshResult) {
    console.log("Refresh failed after all attempts, redirecting to login...");
    redirect("/login");
  }
  // Return null to trigger a retry with new token
  return null;
}
```

**Функция `fetchRefresh()`:**
- Получает refresh token из Redis
- Вызывает backend `/api/auth/refresh` endpoint напрямую
- Сохраняет новые токены в Redis
- Поддерживает retry логику (по умолчанию 3 попытки)
- Отслеживает количество попыток через `refreshAttempts` в Redis

#### 4. TokenRefreshManager (централизованный менеджер)
**Файл:** `frontend/src/utils/auth/tokenRefreshManager.ts`

**Функциональность:**
- Singleton pattern - предотвращает одновременные refresh запросы
- Retry логика с настраиваемыми параметрами
- Progress callbacks для UI обновлений
- Success/Error callbacks
- Метод `smartRefresh()` - обновляет только если токен истек

**Использование:**
```typescript
const manager = TokenRefreshManager.getInstance();
const result = await manager.refreshTokens({
  maxRetries: 3,
  retryDelay: 1000,
  onProgress: (attempt, maxAttempts) => {
    console.log(`Attempt ${attempt}/${maxAttempts}`);
  },
  onSuccess: (result) => {
    console.log('Refresh successful');
  },
  onError: (error) => {
    console.error('Refresh failed:', error);
  }
});
```

### Решение

**Создан route `/api/auth/refresh/route.ts`** со следующими возможностями:

1. **Поддержка обоих провайдеров** (Backend и Dummy)
2. **Автоматическое определение провайдера** из Redis
3. **Сохранение новых токенов** в Redis с обнулением счетчика попыток
4. **Проверка валидности** новых токенов
5. **Очистка невалидных токенов** из Redis при 401

**Интеграция в существующий код:**

- ✅ `ApiClient.request()` - автоматически вызывает refresh при 401
- ✅ `fetchData()` - автоматически вызывает `fetchRefresh()` при 401
- ✅ `TokenRefreshManager` - централизованный менеджер с retry логикой
- ✅ `refreshAccessToken()` в `tokenService.ts` - вспомогательная функция

### Тестирование

1. **Войти через `/login`** с любым провайдером
2. **Подождать истечения access token** (обычно 5-15 минут)
3. **Сделать запрос к API** (например, открыть `/autoria/search`)
4. **Проверить логи:**
   ```
   ✅ [ApiClient] Got 401, attempting token refresh...
   ✅ [Auth Refresh API] Starting token refresh...
   ✅ [Auth Refresh API] Using provider: backend
   ✅ [Auth Refresh API] New tokens saved to Redis
   ✅ [ApiClient] Token refreshed, retrying request...
   ✅ Request successful with new token
   ```

5. **Убедиться, что:**
   - Запрос автоматически повторился с новым токеном
   - Редирект на `/login` НЕ произошел
   - Пользователь остался на странице

### Важные моменты

1. **Refresh происходит ЕДИНОЖДЫ** - параметр `skipRetry: true` в `apiClient` и `retryCount` в `fetchData` предотвращают бесконечный цикл
2. **Счетчик попыток** - `refreshAttempts` в Redis отслеживает количество неудачных попыток (максимум 3)
3. **Временная блокировка** - если refresh неудачен, повторные попытки блокируются на 60 секунд через флаг `lastRefreshFailed` и `lastRefreshTime`
4. **Очистка при неудаче** - если refresh token тоже невалиден (401), токены удаляются из Redis
5. **Поддержка обоих провайдеров** - автоматическое определение Backend или Dummy
6. **Singleton pattern** - `TokenRefreshManager` предотвращает одновременные refresh запросы
7. **Защита от циклов** - если после успешного refresh снова приходит 401, запрос НЕ повторяется, пользователь перенаправляется на `/login`

### Механизм защиты от бесконечных циклов

#### В `apiClient.ts`:
```typescript
// Первый запрос с 401
if (response.status === 401 && !skipAuth && !skipRetry) {
  const refreshSuccess = await this.refreshTokens();
  if (refreshSuccess) {
    // Повтор с skipRetry: true - второй 401 НЕ вызовет refresh
    return this.request<T>(endpoint, { ...options, skipRetry: true });
  }
}
```

#### В `helpers.ts`:
```typescript
// Первый запрос с 401
if (!result && response.status === 401 && retryCount === 0) {
  console.log('[fetchData] Token refreshed, retrying request (attempt 1/1)...');
  return fetchData(endpoint, callbackUrl, params, retryCount + 1);
}

// Второй запрос с 401 - СТОП
if (!result && response.status === 401 && retryCount > 0) {
  console.error('[fetchData] Still got 401 after token refresh, stopping retry');
  redirect("/login");
}
```

#### В `fetchRefresh`:
```typescript
// Проверка временной блокировки
if (lastRefreshFailed && (now - lastRefreshTime) < 60000) {
  console.error('[fetchRefresh] Last refresh failed 30s ago, waiting before retry');
  return false;
}

// Проверка лимита попыток
if (refreshAttempts >= maxAttempts) {
  console.error('[fetchRefresh] Max refresh attempts (3) reached');
  return false;
}
```

**Результат**: Даже если после успешного refresh снова приходит 401, система:
1. НЕ вызывает refresh повторно (из-за `skipRetry` или `retryCount`)
2. Перенаправляет пользователя на `/login`
3. Блокирует повторные попытки refresh на 60 секунд

---

## Проблема 10: CORS ошибка с credentials: 'include'

### Симптомы
```
Access to fetch at 'http://localhost:8000/api/user/addresses/' from origin 'http://localhost:3000'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check:
The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*'
when the request's credentials mode is 'include'.
```

### Описание проблемы
Браузер блокирует запросы, если:
- Запрос использует `credentials: 'include'` (отправляет cookies)
- Backend возвращает `Access-Control-Allow-Origin: *` (разрешает все источники)

Это ограничение безопасности браузера: нельзя одновременно разрешать **все источники** и **отправлять credentials**.

### Решение

#### Вариант 1: Убрать `credentials: 'include'` (РЕКОМЕНДУЕТСЯ)

Мы используем **Bearer токены в заголовках**, а не cookies, поэтому `credentials: 'include'` не нужен.

**Измененные файлы:**

1. **`frontend/src/app/api/common.ts`** (строка 109):
```typescript
// Prepare request options
const requestOptions: RequestInit = {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...customHeaders
  },
  // НЕ используем credentials: 'include', так как мы используем Bearer токены в заголовках
  // credentials: 'include' вызывает CORS ошибку с Access-Control-Allow-Origin: *
  cache: 'no-store'
};
```

2. **`frontend/src/utils/fetchWithAuth.ts`** (строки 4, 23):
```typescript
const resp = await fetch(input, {
  ...init,
  // НЕ используем credentials: 'include'
  headers: {
    'Content-Type': 'application/json',
    ...(init.headers || {})
  },
  cache: 'no-store'
});
```

3. **`frontend/src/app/api/helpers.ts`** (строка 185):
```typescript
const response = await fetch(`${baseUrl}/api/auth/refresh`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ refresh }),
  // НЕ используем credentials: 'include'
  cache: 'no-store'
});
```

#### Вариант 2: Полное отключение CORS на backend (ПРИМЕНЕНО)

Для разработки можно полностью отключить CORS, разрешив **все операции без исключений**.

**Файл 1:** `backend/core/middlewares/cors.py`

```python
def __call__(self, request):
    origin = request.META.get('HTTP_ORIGIN', '')
    print(f"🔧 CORS: Processing request {request.method} {request.path} from origin: {origin}")

    # Полностью отключаем CORS - разрешаем ВСЕ запросы без исключений
    # Это безопасно для разработки и упрощает работу с API
    allow_origin = '*'
    allow_credentials = 'false'  # ВАЖНО: должно быть 'false' при allow_origin = '*'
    print(f"🔧 CORS: Allowing ALL origins and methods (CORS fully disabled for development)")
```

**Файл 2:** `frontend/next.config.js` (строки 192-221)

```javascript
{
  source: '/api/(.*)',
  headers: [
    {
      key: 'Cache-Control',
      value: 'no-store, must-revalidate'
    },
    // CORS headers - полностью отключаем CORS для избегания ошибок запросов
    {
      key: 'Access-Control-Allow-Origin',
      value: '*'
    },
    {
      key: 'Access-Control-Allow-Methods',
      value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    },
    {
      key: 'Access-Control-Allow-Headers',
      value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    },
    {
      key: 'Access-Control-Allow-Credentials',
      value: 'false'
    },
    {
      key: 'Access-Control-Max-Age',
      value: '86400'
    }
  ],
}
```

**Конфигурация:**
- `Access-Control-Allow-Origin: *` - разрешены все источники
- `Access-Control-Allow-Credentials: false` - credentials НЕ разрешены (обязательно при `*`)
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS` - все методы
- `Access-Control-Allow-Headers: Content-Type, Authorization, ...` - все необходимые заголовки
- `Access-Control-Max-Age: 86400` - preflight кэшируется на 24 часа

### Результат

✅ **CORS полностью отключен** - все запросы разрешены без ограничений
✅ **Убран `credentials: 'include'`** - используем только Bearer токены
✅ **Нет CORS ошибок** - браузер не блокирует запросы
✅ **Упрощенная разработка** - не нужно думать о CORS настройках

### Важные моменты

1. **Для production**: Нужно настроить конкретные разрешенные источники вместо `*`
2. **Bearer токены**: Передаются в заголовке `Authorization: Bearer <token>`, не требуют cookies
3. **Preflight кэширование**: `Access-Control-Max-Age: 86400` уменьшает количество OPTIONS запросов
4. **Кастомный middleware**: `CORSMiddleware` имеет приоритет над `django-cors-headers`

