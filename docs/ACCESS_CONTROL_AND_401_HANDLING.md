# 🛡️ Система Контроля Доступа и Обработка 401 Ошибок

## 📋 Огляд

Проект реалізує **трирівневу систему контролю доступу** з автоматичною обробкою 401 помилок через механізм auto-refresh токенів. Вся система побудована на принципі **Defense in Depth** (захист в глибину) з кількома рівнями валідації.

---

## 🏗️ Архітектура Захисту

### Рівні Захисту

```
┌─────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 1: Middleware (Next.js)                         │
│  ─────────────────────────────────────────────────────  │
│  Перевірка: NextAuth сессія (HTTP-only cookie)           │
│  Дія при відсутності: Редирект → /api/auth/signin       │
│  Файл: frontend/src/middleware.ts                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 2: BackendTokenPresenceGate (React HOC)         │
│  ─────────────────────────────────────────────────────  │
│  Перевірка: Backend токени в Redis                       │
│  Дія при відсутності: Редирект → /login (через         │
│                       redirectToAuth)                   │
│  Файл: frontend/src/components/AutoRia/Auth/             │
│         BackendTokenPresenceGate.tsx                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 3: Runtime Обробка (API Routes + fetchWithAuth) │
│  ─────────────────────────────────────────────────────  │
│  Перевірка: Валідність токенів при API запитах          │
│  Дія при 401: Auto-refresh → Retry → redirectToAuth    │
│  Файли:                                                  │
│    - frontend/src/utils/fetchWithAuth.ts               │
│    - frontend/src/app/api/*/route.ts                    │
│    - frontend/src/services/api/apiClient.ts             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Рівень 1: Middleware - Захист на Рівні Роутингу

### Призначення
Перша лінія захисту, яка спрацьовує **ДО** рендерингу сторінки. Перевіряє наявність NextAuth сессії для всіх захищених маршрутів.

### Файл
`frontend/src/middleware.ts`

### Логіка Роботи

```typescript
// Для AutoRia секції
if (AUTORIA_PATHS.some(path => pathname.startsWith(path))) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || !token.email) {
    // ❌ Немає NextAuth сессії
    return NextResponse.redirect('/api/auth/signin?callbackUrl=<original_url>');
  }
  
  // ✅ NextAuth сессія існує - пропускаємо далі до рівня 2
  return NextResponse.next();
}
```

### Що Перевіряється
- ✅ Наявність NextAuth сессії (HTTP-only cookie)
- ✅ Валідність токену через `getToken()`
- ✅ Наявність `email` в токені

### Дії при Відсутності Авторизації
1. Створюється URL для редиректу: `/api/auth/signin?callbackUrl=<original_path>`
2. Користувач перенаправляється на сторінку OAuth авторизації
3. Після успішної авторизації - повернення на `callbackUrl`

### Типи Шляхів

#### PUBLIC_PATHS (не потребують авторизації)
```typescript
[
  '/api/auth',      // NextAuth internal endpoints
  '/api/redis',     // Redis API
  '/api/health',    // Health checks
  '/api/public',    // Public API endpoints
  '/register',     // User registration
  '/auth'          // Auth redirect page
]
```

#### INTERNAL_AUTH_PATHS (потребують NextAuth сессію, але не backend токени)
```typescript
[
  '/login',    // Login page (для отримання backend токенів)
  '/profile',  // User profile
  '/settings'  // Settings page
]
```

#### AUTORIA_PATHS (потребують NextAuth сессію + backend токени)
```typescript
[
  '/autoria/search',
  '/autoria/ad',
  '/autoria/my-ads',
  '/autoria/favorites',
  '/autoria/create',
  '/autoria'  // All other autoria paths
]
```

### Особливості
- ✅ Працює на **серверній стороні** (edge runtime)
- ✅ Виконується **ДО** рендерингу компонентів
- ✅ Мінімальна затримка (не чекає на client-side перевірки)
- ⚠️ **НЕ перевіряє** backend токени (це рівень 2)

---

## 🔐 Рівень 2: BackendTokenPresenceGate - Захист на Рівні Компонентів

### Призначення
Друга лінія захисту, яка перевіряє наявність backend токенів в Redis **після** того, як middleware підтвердив NextAuth сессію.

### Файл
`frontend/src/components/AutoRia/Auth/BackendTokenPresenceGate.tsx`

### Логіка Роботи

```typescript
const checkBackendTokens = async (isRetry = false) => {
  // 1. Перевірка токенів через /api/auth/me (перевіряє Redis)
  const tokenCheck = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  if (tokenCheck.ok) {
    // ✅ Backend токени знайдені і валідні
    setIsLoading(false);
    return;
  }

  // 2. Якщо 401 і це перша спроба - пробуємо refresh
  if (tokenCheck.status === 401 && !isRetry) {
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store'
    });

    if (refreshResponse.ok) {
      // ✅ Refresh успішний - повторюємо перевірку
      return checkBackendTokens(true);
    }
    
    // ❌ Refresh не вдався (404 = токени не знайдені)
    if (refreshResponse.status === 404) {
      redirectToAuth(currentPath, 'tokens_not_found');
      return;
    }
  }

  // 3. Використовуємо універсальну утиліту для правильного редиректу
  redirectToAuth(currentPath, 'auth_required');
};
```

### Що Перевіряється
- ✅ Наявність backend токенів в Redis (через `/api/auth/me`)
- ✅ Валідність токенів (через backend перевірку)
- ✅ Можливість auto-refresh при 401

### Дії при Відсутності Токенів

1. **Спроба auto-refresh** (якщо отримали 401):
   - Викликається `/api/auth/refresh`
   - Якщо успішно - повторна перевірка токенів
   - Якщо 404 - токени не знайдені в Redis

2. **Використання `redirectToAuth()`**:
   - Перевіряє наявність NextAuth сессії
   - Якщо сессія є → редирект на `/login` (для отримання backend токенів)
   - Якщо сессії немає → редирект на `/api/auth/signin` (для отримання сессії)

### API Endpoint `/api/auth/me`
Перевіряє наявність токенів в Redis та валідність NextAuth сессії:

```typescript
// GET /api/auth/me
// Повертає:
{
  authenticated: true,
  user: { id, email, name, ... }
}
// Або 401 якщо немає сессії або токенів
```

### Особливості
- ✅ Працює на **клієнтській стороні** (client component)
- ✅ Виконується **після** рендерингу Layout
- ✅ Показує loader під час перевірки
- ✅ Використовує `redirectToAuth()` для правильних редиректів

---

## 🔐 Рівень 3: Runtime Обробка 401 - Захист Під Час Виконання

### Призначення
Третя лінія захисту, яка обробляє 401 помилки під час реальних API запитів. Автоматично оновлює токени та повторює запити.

### Компоненти Системи

#### 1. `fetchWithAuth` - Утиліта для Клієнтських Запитів

**Файл:** `frontend/src/utils/fetchWithAuth.ts`

**Логіка:**

```typescript
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  // 1. Робимо запит БЕЗ додавання токенів на клієнті
  // Токени додаються на сервері в API routes через getAuthorizationHeaders()
  const resp = await fetch(input, {
    ...init,
    credentials: 'include', // Важливо для передачі cookies з сессією
    cache: 'no-store'
  });

  // 2. Якщо не 401/403 - повертаємо відповідь
  if (resp.status !== 401 && resp.status !== 403) {
    return resp;
  }

  // 3. 403 Forbidden - відразу редирект
  if (resp.status === 403) {
    redirectToAuth(currentPath, 'forbidden');
    return resp;
  }

  // 4. 401 Unauthorized - спроба refresh
  const refresh = await fetch('/api/auth/refresh', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include'
  });

  if (refresh.ok) {
    // ✅ Refresh успішний - повторюємо оригінальний запит
    const retry = await fetch(input, { ...init, credentials: 'include' });
    
    if (retry.status !== 401) {
      return retry; // ✅ Успіх
    }
  }

  // 5. Refresh не вдався або retry все ще 401
  if (refresh.status === 404) {
    // Токени не знайдені в Redis
    redirectToAuth(currentPath, 'tokens_not_found');
  } else {
    // Інша помилка
    redirectToAuth(currentPath, 'auth_required');
  }

  return resp;
}
```

**Ключові Особливості:**
- ✅ **НЕ додає токени на клієнті** - токени додаються на сервері в API routes
- ✅ Автоматичний refresh при 401
- ✅ Повторний запит після успішного refresh
- ✅ Правильний редирект через `redirectToAuth()`

#### 2. `getAuthorizationHeaders` - Отримання Токенів для API Routes

**Файл:** `frontend/src/common/constants/headers.ts`

**Логіка:**

```typescript
export const getAuthorizationHeaders = async (baseUrlOverride?: string) => {
  // 1. Отримуємо токени з Redis
  const redisUrl = `${baseUrl}/api/redis?key=backend_auth`;
  const response = await fetch(redisUrl, { cache: 'no-store' });
  
  let accessToken: string | undefined;
  if (response.ok) {
    const data = await response.json();
    const authData = JSON.parse(data.value);
    accessToken = authData?.access;
  }

  // 2. Якщо токен не знайдений - пробуємо refresh
  if (!accessToken) {
    const refreshResp = await fetch(`${baseUrl}/api/auth/refresh`, { 
      method: 'POST', 
      cache: 'no-store' 
    });
    if (refreshResp.ok) {
      const refreshData = await refreshResp.json();
      accessToken = refreshData?.access;
    }
  }

  // 3. Повертаємо заголовки з токеном (якщо є)
  if (!accessToken) {
    return { 'Content-Type': 'application/json' };
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };
};
```

**Використання в API Routes:**

```typescript
// frontend/src/app/api/(backend)/autoria/cars/route.ts
export async function GET(request: NextRequest) {
  // Отримуємо заголовки з токеном з Redis
  const authHeaders = await getAuthorizationHeaders(request.nextUrl.origin);
  
  // Проксируємо запит до Django з токеном
  const response = await fetch(`${backendUrl}/api/ads/cars/`, {
    method: 'GET',
    headers: authHeaders
  });
  
  // Якщо 401 - повертаємо помилку (клієнт обробить через fetchWithAuth)
  if (!response.ok) {
    return NextResponse.json(
      { error: 'Backend request failed' },
      { status: response.status }
    );
  }
  
  return NextResponse.json(await response.json());
}
```

#### 3. `ServerAuthManager` - Серверна Авторизація

**Файл:** `frontend/src/utils/auth/serverAuth.ts`

**Призначення:** Для server-side запитів (SSR, API routes) з автоматичним refresh токенів.

**Логіка:**

```typescript
static async authenticatedFetch(
  request: NextRequest,
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  // 1. Отримуємо токени з Redis
  let tokens = await this.getTokensFromRedis(request);
  if (!tokens) {
    throw new Error('No authentication tokens available');
  }

  // 2. Перевіряємо чи access token не застарів (по exp claim)
  if (this.isTokenExpired(tokens.access)) {
    // Автоматичний refresh ПЕРЕД запитом
    const newAccessToken = await this.refreshToken(request, tokens.refresh);
    if (!newAccessToken) {
      throw new Error('Failed to refresh access token');
    }
    tokens.access = newAccessToken;
  }

  // 3. Робимо запит з токеном
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${tokens.access}`
    }
  });

  // 4. Якщо 401 - пробуємо refresh і повторюємо
  if (response.status === 401) {
    const newAccessToken = await this.refreshToken(request, tokens.refresh);
    if (!newAccessToken) {
      throw new Error('Authentication failed - unable to refresh token');
    }

    // Повторюємо запит з новим токеном
    return await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${newAccessToken}`
      }
    });
  }

  return response;
}
```

**Особливості:**
- ✅ Провідна перевірка exp claim (проактивний refresh)
- ✅ Автоматичний refresh при 401
- ✅ Retry з новим токеном

#### 4. `ApiClient` - Клієнтський API Клієнт

**Файл:** `frontend/src/services/api/apiClient.ts`

**Логіка:**

```typescript
async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  // 1. Отримуємо токени з Redis (на клієнті)
  if (!skipAuth) {
    const tokens = await this.getTokens(); // GET /api/redis?key=backend_auth
    if (tokens?.access) {
      requestHeaders['Authorization'] = `Bearer ${tokens.access}`;
    }
  }

  // 2. Робимо запит
  const response = await fetch(url, { method, headers: requestHeaders, body });

  // 3. Якщо 401 - пробуємо refresh
  if (response.status === 401 && !skipAuth && !skipRetry) {
    const refreshSuccess = await this.refreshTokens(); // POST /api/auth/refresh
    
    if (refreshSuccess) {
      // Повторюємо запит з новим токеном
      return this.request<T>(endpoint, { ...options, skipRetry: true });
    } else {
      // Редирект на /login
      window.location.href = `/login?callbackUrl=${currentUrl}&error=session_expired`;
      throw new Error('Authentication failed - session expired');
    }
  }

  return await response.json();
}
```

---

## 🔄 Процес Обробки 401 Помилок

### Сценарій 1: Застарілий Access Token (Найпоширеніший)

```
Користувач робить API запит
    ↓
API route отримує токен з Redis через getAuthorizationHeaders()
    ↓
Запит до Django з Authorization: Bearer <access_token>
    ↓
Django повертає 401 (токен застарів)
    ↓
[Рівень 3] fetchWithAuth отримує 401
    ↓
1. Викликає POST /api/auth/refresh
   ↓
   a. /api/auth/refresh отримує refresh_token з Redis
   b. Викликає Django /api/auth/refresh
   c. Отримує новий access_token
   d. Зберігає в Redis
   e. Повертає новий access_token
    ↓
2. Повторює оригінальний запит з новим токеном
    ↓
3. Якщо успішно - повертає дані
   Якщо знову 401 - редирект через redirectToAuth()
```

### Сценарій 2: Refresh Token також застарів

```
Користувач робить API запит
    ↓
Отримуємо 401 від Django
    ↓
Спроба refresh через /api/auth/refresh
    ↓
Django повертає 401 (refresh_token також застарів)
    ↓
/api/auth/refresh повертає 401
    ↓
fetchWithAuth викликає redirectToAuth(currentPath, 'session_expired')
    ↓
redirectToAuth:
  1. Перевіряє NextAuth сессію через /api/auth/session
     ↓
     a. Якщо сессія є → редирект на /login (для отримання нових токенів)
     b. Якщо сессії немає → редирект на /api/auth/signin (для OAuth)
```

### Сценарій 3: Токени не знайдені в Redis (404)

```
Користувач робить API запит
    ↓
getAuthorizationHeaders() не знаходить токени в Redis
    ↓
Спроба refresh через /api/auth/refresh
    ↓
/api/auth/refresh отримує 404 (токени не знайдені в Redis)
    ↓
fetchWithAuth обробляє 404 від refresh
    ↓
redirectToAuth(currentPath, 'tokens_not_found')
    ↓
redirectToAuth:
  1. Перевіряє NextAuth сессію
     ↓
     a. Якщо сессія є → редирект на /login (отримати токени)
     b. Якщо сессії немає → редирект на /api/auth/signin
```

### Сценарій 4: 403 Forbidden (Немає Прав Доступу)

```
Користувач робить API запит
    ↓
Django повертає 403 (недостатньо прав)
    ↓
fetchWithAuth обробляє 403
    ↓
НЕ пробує refresh (403 не означає невалідний токен)
    ↓
Відразу редирект через redirectToAuth(currentPath, 'forbidden')
    ↓
Редирект на /login з повідомленням про відсутність прав
```

---

## 🌐 WebSocket Чат - Обробка Помилок Авторизації (Код 4001)

### Призначення
WebSocket з'єднання для чату потребують особливої обробки помилок авторизації, оскільки вони не можуть використовувати стандартні HTTP статуси. Натомість використовуються **спеціальні коди закриття WebSocket** (4000-4999 для помилок).

### Коди Помилок WebSocket

| Код | Призначення | Опис |
|-----|-------------|------|
| `4000` | Внутрішня помилка сервера | Загальна помилка під час з'єднання |
| `4001` | Помилка авторизації | Користувач не авторизований або токен невалідний |
| `1008` | Policy Violation | Стандартний код для помилки авторизації |

### Архітектура Захисту WebSocket

```
┌─────────────────────────────────────────────────────────┐
│  Backend Middleware: JWTAuthMiddleware                   │
│  ─────────────────────────────────────────────────────  │
│  Файл: backend/core/middlewares/auth_socket.py           │
│                                                          │
│  1. Отримує токен з query параметрів або headers        │
│  2. Валідує токен через JwtService.validate_any_token() │
│  3. Якщо токен валідний → scope["user"] = user          │
│  4. Якщо токен невалідний → scope["user"] = None        │
│     (але дозволяє анонімне з'єднання для refresh)       │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Consumer: EnhancedChatConsumer                  │
│  ─────────────────────────────────────────────────────  │
│  Файл: backend/apps/chat/consumer.py                     │
│                                                          │
│  async def connect(self):                                │
│    self.user = self.scope.get("user")                    │
│    if not self._is_user_authorized():                    │
│      await self.close(code=4001)  # ❌ Закриваємо         │
│      return                                               │
│    await self.accept()  # ✅ Приймаємо з'єднання        │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Frontend: useChatWebSocket Hook                         │
│  ─────────────────────────────────────────────────────  │
│  Файл: frontend/src/components/ChatBot/                  │
│         hooks/useChatWebSocket.ts                         │
│                                                          │
│  Обробка socket.onclose:                                 │
│    if (event.code === 4001 || event.code === 1008) {    │
│      1. Спроба refresh токенів (макс. 3 спроби)        │
│      2. Якщо refresh успішний → переподключення       │
│      3. Якщо refresh не вдався → redirectToAuth()      │
│    }                                                      │
└─────────────────────────────────────────────────────────┘
```

### Backend: JWTAuthMiddleware

**Файл:** `backend/core/middlewares/auth_socket.py`

**Особливості:**
- ✅ **Не блокує з'єднання** навіть якщо токен невалідний (для можливості refresh)
- ✅ Позначає `scope["user"] = None` та `scope["auth_required"] = True` якщо токен відсутній/невалідний
- ✅ Дозволяє `EnhancedChatConsumer` прийняти рішення про закриття

**Логіка:**

```python
async def __call__(self, scope, receive, send):
    # 1. Отримуємо токен з query параметрів або headers
    token = self._extract_token(query_params, headers)
    
    if not token:
        # Дозволяємо анонімне з'єднання (для можливості refresh)
        scope["user"] = None
        scope["auth_required"] = True
        return await super().__call__(scope, receive, send)
    
    # 2. Валідуємо токен
    try:
        validated_user = await self._validate_token(token)
        if validated_user:
            scope["user"] = validated_user
            scope["auth_required"] = False
        else:
            scope["user"] = None
            scope["auth_required"] = True
    except Exception:
        scope["user"] = None
        scope["auth_required"] = True
    
    return await super().__call__(scope, receive, send)
```

### Backend: EnhancedChatConsumer

**Файл:** `backend/apps/chat/consumer.py`

**Логіка:**

```python
async def connect(self):
    self.user = self.scope.get("user")
    
    # Перевірка авторизації
    if not self._is_user_authorized():
        logger.warning("🛑 Unauthorized connection attempt")
        await self._send_error("Authentication required")
        await self.close(code=4001)  # ❌ Закриваємо з кодом 4001
        return
    
    # ✅ Користувач авторизований
    await self.accept()
    # ... ініціалізація чату
```

**Метод `_is_user_authorized()`:**
```python
def _is_user_authorized(self) -> bool:
    # Перевіряємо чи користувач аутентифікований
    if not self.user or not self.user.is_authenticated:
        return False
    
    # Можна додати додаткові перевірки (ролі, права доступу)
    return True
```

### Frontend: Обробка Помилок в `useChatWebSocket`

**Файл:** `frontend/src/components/ChatBot/hooks/useChatWebSocket.ts`

#### 1. Отримання Токена для WebSocket

```typescript
const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  // 1. Перевірка кількості спроб refresh
  if (forceRefresh && tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
    redirectToLogin("Too many authentication attempts. Please login again.");
    return null;
  }

  // 2. Отримуємо токени з Redis через /api/auth/token
  const tokenResponse = await fetch("/api/auth/token", {
    method: "GET",
    credentials: "include",
  });

  if (tokenResponse.ok) {
    const data = await tokenResponse.json();
    const accessToken = data?.access;
    
    // Перевірка на істечення (по exp claim)
    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken; // ✅ Валідний токен
    }
  }

  // 3. Якщо токен не знайдений або застарів - спроба refresh
  if (forceRefresh || !accessToken) {
    tokenRefreshAttemptsRef.current++;
    
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      return refreshData?.access; // ✅ Новий токен
    }
  }

  return null;
};
```

#### 2. Встановлення WebSocket З'єднання

```typescript
const connect = async (customChannelId?: string) => {
  // 1. Отримуємо токен доступу
  let token = await getAccessToken(false);
  
  // 2. Якщо токен не отримано - спроба примусового refresh
  if (!token && tokenRefreshAttemptsRef.current < MAX_TOKEN_REFRESH_ATTEMPTS) {
    token = await getAccessToken(true); // Примусовий refresh
  }

  // 3. Якщо токен все ще відсутній - помилка
  if (!token) {
    toast({
      title: "Connection Error",
      description: "Failed to get authentication token. Redirecting to login...",
      variant: "destructive",
    });
    redirectToLogin("Authentication failed. Please login again.");
    return;
  }

  // 4. Створюємо WebSocket з'єднання з токеном
  const wsUrl = `wss://backend.example.com/api/chat/${channelId}/?token=${token}`;
  const socket = new WebSocket(wsUrl);

  // 5. Обробка подій
  socket.onopen = () => {
    // ✅ З'єднання встановлено
    setIsConnected(true);
    tokenRefreshAttemptsRef.current = 0; // Скидаємо лічильник
  };

  socket.onclose = (event) => {
    // Обробка помилок авторизації
    if (event.code === 4001 || event.code === 1008) {
      handleAuthError(event);
    }
  };
};
```

#### 3. Обробка Помилок Авторизації (4001)

```typescript
socket.onclose = (event) => {
  // Обрабатываем ошибки авторизации
  if (event.code === 1008 || event.code === 4001) {
    wsLogger.error(
      `WebSocket closed due to authentication error: code=${event.code}, reason=${event.reason}`,
    );

    // Автоматична спроба refresh токенів
    (async () => {
      wsLogger.info("Attempting to refresh token after authentication error");

      // Показуємо уведомлення користувачу
      toast({
        title: "Authentication",
        description: "Refreshing authentication token...",
        duration: 5000,
      });

      // Примусово оновлюємо токен (з лічильником спроб)
      const newToken = await getAccessToken(true);

      if (newToken) {
        wsLogger.info("Token refreshed successfully, reconnecting...");

        toast({
          title: "Authentication",
          description: "Token refreshed successfully, reconnecting...",
          duration: 3000,
        });

        // ✅ Токен оновлено - переподключаємось
        setTimeout(() => {
          connect(targetChannelId);
        }, 1000);
      } else {
        // ❌ Не вдалося оновити токен після всіх спроб
        wsLogger.error(
          "Failed to refresh token after all attempts, redirecting to login page",
        );
        redirectToLogin("Authentication failed after multiple attempts. Please login again.");
      }
    })();
    return; // Важливо: виходимо, щоб не обробляти як звичайне закриття
  }

  // Обробка інших помилок (4000, звичайні закриття тощо)
  // ...
};
```

#### 4. Обробка Помилок Під Час З'єднання (`onerror`)

```typescript
socket.onerror = (error) => {
  wsLogger.error(`WebSocket error for channel ${targetChannelId}`, { error });

  // Якщо це помилка авторизації та ще є спроби refresh
  if (tokenRefreshAttemptsRef.current < MAX_TOKEN_REFRESH_ATTEMPTS) {
    tokenRefreshAttemptsRef.current += 1;

    toast({
      title: "Connection Error",
      description: `Refreshing authentication tokens... (${tokenRefreshAttemptsRef.current}/${MAX_TOKEN_REFRESH_ATTEMPTS})`,
      variant: "destructive",
      duration: 3000,
    });

    (async () => {
      // Примусове оновлення токенів
      const newToken = await getAccessToken(true);

      if (newToken) {
        wsLogger.info("Token forcefully refreshed successfully, reconnecting...");
        toast({
          title: "Authentication Updated",
          description: "Tokens refreshed successfully, reconnecting...",
          duration: 2000,
        });

        // Переподключаємось
        setTimeout(() => {
          connect(targetChannelId);
        }, 1500);
      } else {
        // Не вдалося оновити - редирект
        redirectToLogin("Authentication failed. Please login again.");
      }
    })();
  }
};
```

### Процес Обробки 4001 Помилок

#### Сценарій 1: Токен Відсутній або Невалідний

```
Frontend: Створює WebSocket з'єднання БЕЗ токена або з невалідним токеном
    ↓
Backend: JWTAuthMiddleware
    ↓
    scope["user"] = None
    scope["auth_required"] = True
    ↓
Backend: EnhancedChatConsumer.connect()
    ↓
    if not self._is_user_authorized():
        await self.close(code=4001)  # ❌ Закриваємо з'єднання
    ↓
Frontend: socket.onclose(event.code === 4001)
    ↓
    1. Показуємо toast: "Refreshing authentication token..."
    2. Викликаємо getAccessToken(true) - примусовий refresh
       ↓
       a. POST /api/auth/refresh
       b. Отримуємо новий токен з Redis
       c. Викликаємо Django /api/auth/refresh
       d. Отримуємо новий access_token
       e. Зберігаємо в Redis
    ↓
    3. Якщо refresh успішний:
       a. Показуємо toast: "Token refreshed, reconnecting..."
       b. setTimeout(() => connect(channelId), 1000)
       c. Створюємо НОВЕ WebSocket з'єднання з новим токеном
    ↓
    4. Якщо refresh не вдався (макс. спроб досягнуто):
       a. redirectToLogin("Authentication failed...")
       b. Редирект на /login або /api/auth/signin
```

#### Сценарій 2: Токен Застарів Під Час Роботи

```
WebSocket з'єднання встановлено з валідним токеном
    ↓
Користувач використовує чат (надсилає повідомлення)
    ↓
Backend: Django перевіряє токен при обробці повідомлення
    ↓
❌ Token expired → Backend закриває з'єднання з кодом 4001
    ↓
Frontend: socket.onclose(event.code === 4001)
    ↓
Автоматичний refresh та переподключення (як у Сценарії 1)
```

#### Сценарій 3: Refresh Token також Застарів

```
Frontend: socket.onclose(event.code === 4001)
    ↓
Спроба refresh через getAccessToken(true)
    ↓
POST /api/auth/refresh
    ↓
Django повертає 401 (refresh_token також застарів)
    ↓
getAccessToken повертає null
    ↓
redirectToLogin("Authentication failed after multiple attempts...")
    ↓
redirectToAuth():
  1. Перевіряє NextAuth сессію через /api/auth/session
  2. Якщо сессія є → редирект на /login
  3. Якщо сессії немає → редирект на /api/auth/signin
```

### Захист від Зациклення

**Лічильник Спрроб:**
```typescript
const MAX_TOKEN_REFRESH_ATTEMPTS = 3;
const tokenRefreshAttemptsRef = useRef<number>(0);

// Перевірка перед refresh
if (tokenRefreshAttemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
  redirectToLogin("Too many authentication attempts. Please login again.");
  return null;
}

// Збільшення лічильника
tokenRefreshAttemptsRef.current++;

// Скидання при успішному з'єднанні
socket.onopen = () => {
  tokenRefreshAttemptsRef.current = 0;
  reconnectAttempts.current = 0;
};
```

**Лічильник Переподключень:**
```typescript
const reconnectAttempts = useRef(0);
const maxReconnectAttempts = 3;

// При закритті (не через 4001)
if (reconnectAttempts.current < maxReconnectAttempts) {
  reconnectAttempts.current++;
  setTimeout(() => connect(channelId), 2000 * reconnectAttempts.current);
}
```

### Особливості Реалізації

#### 1. Анонімне З'єднання для Refresh

Backend дозволяє анонімні WebSocket з'єднання (з `scope["user"] = None`), щоб frontend міг спробувати refresh токенів. Але `EnhancedChatConsumer` закриває такі з'єднання з кодом 4001.

#### 2. Перевірка Токена ДО З'єднання

Frontend отримує токен з Redis (`/api/auth/token`) та перевіряє його на істечення (по `exp` claim) **ПЕРЕД** створенням WebSocket з'єднання. Це проактивний підхід, який зменшує кількість невдалих з'єднань.

#### 3. Автоматичний Retry з Затримкою

Після успішного refresh токенів, frontend автоматично переподключається через 1 секунду, даючи час backend зберегти нові токени в Redis.

#### 4. Уведомлення Користувачу

Система показує toast-повідомлення на кожному етапі:
- "Refreshing authentication token..." (початок refresh)
- "Token refreshed successfully, reconnecting..." (успішний refresh)
- "Authentication failed..." (не вдалося оновити)

### Порівняння з HTTP 401

| Аспект | HTTP 401 | WebSocket 4001 |
|--------|----------|---------------|
| **Виявлення** | Статус відповіді HTTP | Код закриття WebSocket |
| **Обробка** | `fetchWithAuth` автоматично refresh | `socket.onclose` → ручна обробка |
| **Retry** | Автоматичний retry запиту | Ручне переподключення через `connect()` |
| **Стан з'єднання** | Кожен запит незалежний | З'єднання закрите, потрібне нове |

### Файли, Які Беруть Участь

**Backend:**
- `backend/core/middlewares/auth_socket.py` - Middleware для валідації токенів
- `backend/apps/chat/consumer.py` - Consumer, який закриває з'єднання з кодом 4001
- `backend/core/services/jwt.py` - Валідація JWT токенів

**Frontend:**
- `frontend/src/components/ChatBot/hooks/useChatWebSocket.ts` - Головний хук для WebSocket
- `frontend/src/app/api/auth/refresh/route.ts` - API route для refresh токенів
- `frontend/src/app/api/auth/token/route.ts` - API route для отримання токенів з Redis
- `frontend/src/utils/auth/redirectToAuth.ts` - Утиліта для редиректів

---

## 🎯 Універсальна Утиліта `redirectToAuth`

### Призначення
Централізована утиліта для правильного редиректу з урахуванням багаторівневої системи авторизації.

**Файл:** `frontend/src/utils/auth/redirectToAuth.ts`

### Логіка

```typescript
export async function redirectToAuth(
  currentPath?: string,
  reason: 'session_expired' | 'tokens_not_found' | 'auth_required' = 'session_expired'
): Promise<void> {
  const path = currentPath || window.location.pathname + window.location.search;

  // 1. Перевіряємо наявність NextAuth сессії
  const hasSession = await checkNextAuthSession(); // GET /api/auth/session

  if (hasSession) {
    // ✅ Уровень 1 пройдено (NextAuth сессія є)
    // Редирект на /login для отримання backend токенів (уровень 2)
    const loginUrl = `/login?callbackUrl=${path}&error=${reason}&message=${message}`;
    window.location.href = loginUrl;
  } else {
    // ❌ Уровень 1 не пройдено (немає NextAuth сессії)
    // Редирект на /api/auth/signin для отримання сессії
    await fetch('/api/auth/logout', { method: 'POST' }); // Очистка перед signin
    const signinUrl = `/api/auth/signin?callbackUrl=${path}`;
    window.location.href = signinUrl;
  }
}
```

### Типи Причин (`reason`)

| Причина | Опис | Редирект (якщо є NextAuth) | Редирект (якщо немає NextAuth) |
|---------|------|----------------------------|-------------------------------|
| `session_expired` | Refresh token застарів | `/login?error=session_expired` | `/api/auth/signin` |
| `tokens_not_found` | Токени не знайдені в Redis | `/login?error=tokens_not_found` | `/api/auth/signin` |
| `auth_required` | Потрібна авторизація | `/login?error=auth_required` | `/api/auth/signin` |

---

## 🔄 API Route `/api/auth/refresh` - Механізм Оновлення Токенів

### Призначення
Централізований endpoint для оновлення access token через refresh token.

**Файл:** `frontend/src/app/api/auth/refresh/route.ts`

### Повний Алгоритм

```typescript
export async function POST(request: NextRequest) {
  // 1. Визначаємо провайдер (backend/dummy)
  const provider = await getProviderFromRedis(); // 'backend' | 'dummy'
  const authKey = provider === 'dummy' ? 'dummy_auth' : 'backend_auth';

  // 2. Отримуємо токени з Redis
  const redisData = await fetch(`/api/redis?key=${authKey}`);
  if (!redisData.exists || !redisData.value) {
    return NextResponse.json(
      { error: 'No tokens found in Redis' },
      { status: 404 } // ❌ Токени не знайдені
    );
  }

  const tokenData = JSON.parse(redisData.value);
  const { refresh: refreshToken, refreshAttempts = 0 } = tokenData;

  // 3. Перевіряємо кількість спроб refresh
  const maxAttempts = 3;
  if (refreshAttempts >= maxAttempts) {
    return NextResponse.json(
      { error: 'Max refresh attempts reached' },
      { status: 429 }
    );
  }

  // 4. Збільшуємо лічильник спроб
  const newAttempts = refreshAttempts + 1;

  // 5. Викликаємо Django /api/auth/refresh
  const backendResponse = await fetch(`${backendUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  });

  if (!backendResponse.ok) {
    // ❌ Django відхилив refresh (токен невалідний)
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: backendResponse.status } // 401 або інше
    );
  }

  // 6. Отримуємо нові токени від Django
  const { access, refresh: newRefresh } = await backendResponse.json();

  // 7. Зберігаємо нові токени в Redis (з скинутим лічильником)
  await fetch('/api/redis', {
    method: 'POST',
    body: JSON.stringify({
      key: authKey,
      value: JSON.stringify({
        access,
        refresh: newRefresh || refreshToken, // Використовуємо новий або старий
        refreshAttempts: 0, // Скидаємо лічильник при успіху
        lastRefreshTime: Date.now()
      })
    })
  });

  // 8. Повертаємо нові токени
  return NextResponse.json({
    success: true,
    access,
    refresh: newRefresh || refreshToken,
    provider
  });
}
```

### Захист від Зациклення

- ✅ Лічильник спроб (`refreshAttempts`) - максимум 3 спроби
- ✅ Якщо досягнуто максимум - повертається 429 (Too Many Requests)
- ✅ Лічильник скидається при успішному refresh

### Статуси Відповіді

| Статус | Причина | Дія клієнта |
|--------|---------|-------------|
| `200 OK` | Refresh успішний | Використати новий `access` токен |
| `401` | Refresh token невалідний | Редирект на `/login` |
| `404` | Токени не знайдені в Redis | Редирект на `/login` (через `redirectToAuth`) |
| `429` | Максимум спроб досягнуто | Редирект на `/login` |

---

## 🏗️ Backend (Django) - Перевірка Токенів

### Механізм Перевірки

Django використовує **djangorestframework-simplejwt** для валідації JWT токенів:

```python
# backend/core/services/jwt.py
class JwtService:
    @staticmethod
    def validate_any_token(token):
        """Validate a JWT token using DRF SimpleJWT."""
        authenticator = JWTAuthentication()
        validated_token = authenticator.get_validated_token(token)  # Decode and verify
        user = authenticator.get_user(validated_token)  # Get user
        return user
```

### Обробка Помилок

```python
# backend/core/enums/exceptions.py
JWT_ERROR = {
    "exceptions": [JwtException, AuthenticationFailed, NotAuthenticated],
    "code": "jwt_error",
    "message": "Authentication failed or invalid JWT token.",
    "status": status.HTTP_401_UNAUTHORIZED,
}
```

### Коли Django Повертає 401

1. **Access token відсутній** або має неправильний формат
2. **Access token застарів** (перевищив `ACCESS_TOKEN_LIFETIME`)
3. **Access token невалідний** (неправильна підпис, змінений payload)
4. **Refresh token невалідний** (при спробі refresh)

### Процес Валідації

```
Django отримує запит з Authorization: Bearer <token>
    ↓
JWTAuthentication.get_validated_token(token)
    ↓
1. Декодує JWT токен
2. Перевіряє підпис (signature)
3. Перевіряє exp (expiration time)
4. Перевіряє iat (issued at)
5. Перевіряє чорний список токенів
    ↓
Якщо валідація не пройдена:
    ↓
Повертає 401 Unauthorized з деталями помилки
```

---

## 🔄 Повний Flow Обробки 401

### Приклад: Користувач робить запит до `/api/autoria/cars`

```
┌─────────────────────────────────────────────────────────────┐
│ 1. КЛІЄНТ (React Component)                                  │
│    fetchWithAuth('/api/autoria/cars')                        │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API ROUTE (Next.js Server)                                │
│    frontend/src/app/api/(backend)/autoria/cars/route.ts     │
│                                                              │
│    const authHeaders = await getAuthorizationHeaders();      │
│    // Отримує токен з Redis через /api/redis                │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND (Django)                                          │
│    GET /api/ads/cars/                                        │
│    Authorization: Bearer <access_token>                       │
│                                                              │
│    JWTAuthentication.validate_token()                        │
│    ❌ Token expired → 401 Unauthorized                       │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. API ROUTE (Next.js Server)                                │
│    Повертає 401 клієнту                                      │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. КЛІЄНТ (fetchWithAuth)                                    │
│    Отримав 401 → спроба refresh                             │
│    POST /api/auth/refresh                                    │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. API ROUTE /api/auth/refresh                               │
│    a. Отримує refresh_token з Redis                        │
│    b. Викликає Django POST /api/auth/refresh                │
│    c. Django валідує refresh_token і повертає новий access  │
│    d. Зберігає новий access в Redis                         │
│    e. Повертає новий access клієнту                         │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. КЛІЄНТ (fetchWithAuth)                                    │
│    ✅ Refresh успішний → повторює оригінальний запит        │
│    fetchWithAuth('/api/autoria/cars') [RETRY]               │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. API ROUTE (Next.js Server)                                │
│    Отримує НОВИЙ токен з Redis (оновлений після refresh)   │
│    const authHeaders = await getAuthorizationHeaders();     │
│    Authorization: Bearer <NEW_access_token>                  │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. BACKEND (Django)                                          │
│    JWTAuthentication.validate_token()                        │
│    ✅ Token valid → 200 OK з даними                          │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. КЛІЄНТ (React Component)                                │
│     Отримує дані → відображає в UI                          │
└─────────────────────────────────────────────────────────────┘
```

### Альтернативний Сценарій: Refresh не Вдався

```
... (кроки 1-5 такі ж) ...
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. API ROUTE /api/auth/refresh                               │
│    Django повертає 401 (refresh_token також застарів)      │
│    /api/auth/refresh повертає 401 клієнту                   │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. КЛІЄНТ (fetchWithAuth)                                    │
│    ❌ Refresh не вдався                                       │
│    redirectToAuth(currentPath, 'session_expired')          │
└───────────────────┬─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. redirectToAuth()                                           │
│    a. Перевіряє NextAuth сессію через /api/auth/session    │
│    b. Якщо сессія є → редирект на /login                   │
│    c. Якщо сессії немає → редирект на /api/auth/signin     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Особливості Реалізації

### 1. Токени Зберігаються Тільки в Redis

**❌ НЕ в localStorage:**
- Токени не зберігаються в `localStorage` на клієнті
- Це підвищує безпеку (XSS атаки не зможуть вкрасти токени)

**✅ Тільки в Redis:**
- Токени зберігаються тільки на сервері (Redis)
- Доступ через API routes (`/api/redis`, `/api/auth/token`)
- Автоматичне очищення при signout

### 2. Подвійна Перевірка Токенів

**На Сервері (API Routes):**
```typescript
// Проактивна перевірка exp claim
if (this.isTokenExpired(tokens.access)) {
  // Refresh ПЕРЕД запитом
  const newToken = await this.refreshToken(...);
}
```

**На Клієнті (Runtime):**
```typescript
// Реактивна перевірка при 401
if (response.status === 401) {
  // Refresh ПІСЛЯ отримання 401
  const refresh = await fetch('/api/auth/refresh', ...);
}
```

### 3. Захист від Race Conditions

**Лічильник Спрроб:**
- Максимум 3 спроби refresh на токени в Redis
- Запобігає зацикленню при проблемах з токенами

**Флаг `skipRetry`:**
- `fetchWithAuth` та `ApiClient` використовують `skipRetry` для запобігання нескінченним циклам
- Після першої спроби refresh встановлюється `skipRetry = true`

### 4. Централізована Обробка Помилок

**Універсальна Утиліта:**
- `redirectToAuth()` - централізована логіка редиректів
- Використовується в усіх компонентах системи
- Правильно визначає куди редиректити залежно від стану авторизації

### 5. Різні Шляхи для Різних Рівнів

**Public API:**
- Не потребують авторизації
- Доступні без токенів

**Internal API:**
- Потребують тільки NextAuth сессію
- Доступні для `/login`, `/profile`

**Backend API (AutoRia):**
- Потребують NextAuth сессію + backend токени
- Максимальний захист

---

## 📊 Діаграма Повного Flow

```
Користувач намагається отримати доступ до /autoria/search
                    ↓
┌─────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 1: Middleware                                    │
│ Перевірка NextAuth сессії                                │
│                                                          │
│ ✅ Сессія є → Продовжуємо                               │
│ ❌ Сессії немає → Редирект → /api/auth/signin           │
└─────────────────────────────────────────────────────────┘
                    ↓ (сессія є)
┌─────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 2: BackendTokenPresenceGate                      │
│ Перевірка backend токенів в Redis                        │
│                                                          │
│ GET /api/auth/me → перевіряє Redis                       │
│                                                          │
│ ✅ Токени є → Показуємо сторінку                        │
│ ❌ Токени відсутні:                                      │
│    - Спроба refresh (якщо 401)                          │
│    - redirectToAuth() → /login                           │
└─────────────────────────────────────────────────────────┘
                    ↓ (токени є)
┌─────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 3: Runtime API Запити                            │
│                                                          │
│ Користувач робить запит (наприклад, завантаження огол.)│
│                                                          │
│ API Route: getAuthorizationHeaders()                     │
│   → Отримує токен з Redis                                │
│   → Якщо немає → спроба refresh                         │
│                                                          │
│ Запит до Django з Authorization: Bearer <token>        │
│                                                          │
│ Django повертає:                                         │
│   ✅ 200 OK → Дані повертаються                         │
│   ❌ 401 Unauthorized → Обробка помилки:                │
│      1. fetchWithAuth отримує 401                       │
│      2. Викликає POST /api/auth/refresh                 │
│      3. Якщо refresh успішний → повторює запит          │
│      4. Якщо refresh не вдався → redirectToAuth()        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Налаштування та Конфігурація

### Ліміти Refresh

```typescript
// frontend/src/app/api/auth/refresh/route.ts
const maxAttempts = 3; // Максимум спроб refresh
```

### Lifetime Токенів

```python
# backend/config/extra_config/simple_jwt_config.py
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)  # Access token: 15 хв
REFRESH_TOKEN_LIFETIME = timedelta(days=7)    # Refresh token: 7 днів
```

### Timeout для Redis Запитів

```typescript
// frontend/src/common/constants/headers.ts
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд
```

---

## ✅ Переваги Цієї Архітектури

### Безпека
- ✅ **Defense in Depth** - кілька рівнів захисту
- ✅ Токени тільки в Redis (не доступні через XSS)
- ✅ Автоматичне оновлення токенів
- ✅ Захист від race conditions

### UX
- ✅ Seamless refresh (користувач не помічає оновлення токенів)
- ✅ Автоматичні редиректи на правильні сторінки
- ✅ Понятливі повідомлення про помилки

### Розробка
- ✅ Централізована логіка (легко підтримувати)
- ✅ Модульність (кожен рівень незалежний)
- ✅ Легко тестувати кожен рівень окремо
- ✅ Детальне логування для debugging

---

## 🐛 Troubleshooting

### Проблема: Нескінченні Refresh Спроби

**Причина:** Race condition між кількома запитами

**Рішення:**
- Використовуйте `skipRetry` флаг після першої спроби
- Перевірте лічильник `refreshAttempts` в Redis

### Проблема: 401 навіть після refresh

**Причина:** Нові токени не збережені в Redis

**Рішення:**
- Перевірте, чи `/api/auth/refresh` успішно зберігає токени
- Перевірте логіку збереження в `/api/auth/refresh/route.ts`

### Проблема: Неправильний редирект

**Причина:** `redirectToAuth` не правильно визначає стан

**Рішення:**
- Перевірте, чи `/api/auth/session` правильно повертає стан
- Перевірте логіку в `redirectToAuth.ts`

---

## 📝 Висновок

Система контролю доступу та обробки 401 реалізована як **трирівневий захист** з автоматичним оновленням токенів:

1. **Рівень 1 (Middleware)** - перевіряє NextAuth сессію на рівні роутингу
2. **Рівень 2 (HOC)** - перевіряє backend токени після рендерингу
3. **Рівень 3 (Runtime)** - обробляє 401 помилки під час API запитів

Всі рівні використовують централізовані утиліти (`redirectToAuth`, `getAuthorizationHeaders`) для узгодженої обробки помилок та правильних редиректів.

