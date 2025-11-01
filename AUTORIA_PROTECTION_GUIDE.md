# 🛡️ Руководство по защите AutoRia

## Обязательное требование

**ДЛЯ ДОСТУПА К AUTORIA ТРЕБУЮТСЯ ОБА КОМПОНЕНТА ОДНОВРЕМЕННО:**
1. ✅ NextAuth сессия (HTTP-only cookies)
2. ✅ Backend токены (Redis: access + refresh)

**Приоритет редиректов:**
- 🔴 **Высший**: Нет NextAuth сессии → `/api/auth/signin`
- 🟡 **Низший**: Нет backend токенов → `/login`

---

## Двухуровневая защита

### Уровень 1: Middleware (Server-Side)

**Файл:** `frontend/src/middleware.ts`

**Что делает:**
```typescript
// Проверяет КАЖДЫЙ запрос к /autoria/*
if (pathname.startsWith('/autoria')) {
  // Проверка NextAuth сессии
  const token = await getToken({ req, secret: nextAuthSecret });
  
  if (!token || !token.email) {
    // Редирект на signin
    return NextResponse.redirect('/api/auth/signin?callbackUrl=...');
  }
  
  // Пропускаем на Уровень 2
  return NextResponse.next();
}
```

**Защищает:**
- ✅ Все маршруты `/autoria/*`
- ✅ Все API запросы к `/api/autoria/*`
- ✅ Все статические ресурсы AutoRia

**Что проверяет:**
- ✅ Наличие NextAuth JWT токена в cookies
- ✅ Валидность подписи токена
- ✅ Email пользователя в токене

**Что НЕ проверяет:**
- ❌ Backend токены (делает Уровень 2)
- ❌ Права доступа (делает Backend API)

---

### Уровень 2: BackendTokenPresenceGate (Client-Side)

**Файл:** `frontend/src/components/AutoRia/Auth/BackendTokenPresenceGate.tsx`

**Расположение:** В layout AutoRia - защищает ВСЕ страницы

```typescript
// frontend/src/app/(main)/(backend)/autoria/layout.tsx
export default function AutoRiaLayoutWrapper({ children }) {
  return (
    <BackendTokenPresenceGate>  {/* Уровень 2 */}
      <AutoRiaLayout>
        {children}
      </AutoRiaLayout>
    </BackendTokenPresenceGate>
  );
}
```

**Что делает:**
```typescript
useEffect(() => {
  async function checkBackendTokens() {
    // 1. Проверка токенов через /api/auth/me
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    
    if (response.ok) {
      setIsLoading(false); // Токены валидны ✅
      return;
    }
    
    // 2. Попытка refresh при 401
    if (response.status === 401) {
      const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });
      if (refreshResponse.ok) {
        return checkBackendTokens(); // Повторная проверка
      }
    }
    
    // 3. Умный редирект через redirectToAuth
    const { redirectToAuth } = await import('@/utils/auth/redirectToAuth');
    redirectToAuth(currentPath, 'tokens_not_found');
  }
  
  checkBackendTokens();
}, []);
```

**Защищает:**
- ✅ Весь UI AutoRia
- ✅ Все клиентские компоненты
- ✅ Все data fetching запросы

**Что проверяет:**
- ✅ Наличие backend токенов в Redis
- ✅ Валидность access токена
- ✅ Возможность refresh при протухании

**Workflow:**
1. Показывает loader пока проверяет токены
2. Если токены OK → показывает содержимое
3. Если 401 → пытается refresh → retry
4. Если refresh failed → redirectToAuth:
   - Есть NextAuth → /login
   - Нет NextAuth → /api/auth/signin

---

## Защита Server Components

**Файл:** `frontend/src/utils/auth/serverAuthCheck.ts`

**Использование в Server Component:**
```typescript
import { requireAutoRiaAuth } from '@/utils/auth/serverAuthCheck';

export default async function AutoRiaPage() {
  // Проверка + redirect если нет авторизации
  await requireAutoRiaAuth();
  
  // Код выполнится только если авторизация OK
  const data = await fetchData();
  
  return <div>{data}</div>;
}
```

**Использование в Server Action:**
```typescript
'use server';
import { requireAutoRiaAuth } from '@/utils/auth/serverAuthCheck';

export async function myServerAction() {
  await requireAutoRiaAuth();
  
  // Код выполнится только если авторизация OK
  return { success: true };
}
```

**Что делает:**
```typescript
async function requireAutoRiaAuth() {
  // 1. Проверка NextAuth сессии
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    redirect('/api/auth/signin'); // Server redirect
  }
  
  // 2. Проверка backend токенов в Redis
  const tokens = await redis.get('backend_auth');
  if (!tokens?.access) {
    redirect('/login'); // Server redirect
  }
}
```

---

## Обработка ошибок 401/403

### 401 Unauthorized (протух токен)

**Файл:** `frontend/src/utils/fetchWithAuth.ts`

```
Запрос → 401
  ↓
fetchWithAuth перехватывает
  ↓
POST /api/auth/refresh
  ↓ SUCCESS
Новый access токен → сохранение в Redis
  ↓
RETRY оригинального запроса
  ↓
✅ Запрос выполнен
```

**Код:**
```typescript
if (response.status === 401) {
  // Попытка refresh
  const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });
  
  if (refreshResponse.ok) {
    // Retry оригинального запроса
    return fetch(originalRequest);
  }
  
  // Refresh failed → redirect
  redirectToAuth(currentPath, 'tokens_not_found');
}
```

### 403 Forbidden (нет прав)

```
Запрос → 403
  ↓
fetchWithAuth перехватывает
  ↓
СРАЗУ redirect → /login
  ↓
Сообщение: "Потрібна авторизація"
```

**Код:**
```typescript
if (response.status === 403) {
  console.log('[fetchWithAuth] ❌ 403 Forbidden - redirecting to /login');
  window.location.replace('/login?error=forbidden&message=...');
}
```

---

## Умный редирект: redirectToAuth

**Файл:** `frontend/src/utils/auth/redirectToAuth.ts`

**Логика:**
```typescript
async function redirectToAuth(currentPath, reason) {
  // 1. Проверяем наличие NextAuth сессии
  const hasSession = await checkNextAuthSession();
  
  if (hasSession) {
    // NextAuth есть → на /login для получения backend токенов
    window.location.replace(`/login?callbackUrl=${currentPath}`);
  } else {
    // NextAuth нет → на /api/auth/signin для получения сессии
    await fetch('/api/auth/signout-full', { method: 'POST' }); // Очистка
    window.location.replace(`/api/auth/signin?callbackUrl=${currentPath}`);
  }
}
```

**Использование:**
```typescript
import { redirectToAuth, redirectToLogin, redirectToSignin } from '@/utils/auth/redirectToAuth';

// Умный редирект (проверяет сессию и выбирает куда)
await redirectToAuth('/autoria', 'tokens_not_found');

// Прямой редирект на /login (когда точно знаем что сессия есть)
redirectToLogin('/autoria', 'session_expired');

// Прямой редирект на signin (когда точно знаем что сессии нет)
redirectToSignin('/autoria');
```

---

## Тестирование защиты

### 1. Без NextAuth сессии
```bash
# Открыть браузер в режиме инкогнито
# Перейти на http://localhost:3000/autoria

Ожидаемое поведение:
1. Middleware перехватывает запрос
2. Редирект на /api/auth/signin?callbackUrl=/autoria
3. Страница входа NextAuth
```

### 2. Есть NextAuth, нет backend токенов
```bash
# Войти через Google/Email (получить NextAuth сессию)
# Удалить backend токены из Redis
# Перейти на http://localhost:3000/autoria

Ожидаемое поведение:
1. Middleware пропускает (NextAuth OK)
2. BackendTokenPresenceGate проверяет токены
3. Токенов нет → redirectToAuth
4. redirectToAuth видит NextAuth → редирект на /login
5. Страница /login для получения backend токенов
```

### 3. Протух access токен
```bash
# Войти в систему (есть NextAuth + backend токены)
# Подождать протухания access токена (или удалить вручную)
# Сделать запрос к AutoRia API

Ожидаемое поведение:
1. Запрос возвращает 401
2. fetchWithAuth перехватывает
3. Автоматический refresh через /api/auth/refresh
4. Retry оригинального запроса
5. ✅ Запрос выполнен успешно
```

### 4. Нет прав доступа (403)
```bash
# Войти в систему
# Попытаться получить доступ к ресурсу без прав

Ожидаемое поведение:
1. Запрос возвращает 403
2. fetchWithAuth перехватывает
3. Редирект на /login с сообщением об ошибке
```

---

## Чеклист правильной защиты

### Middleware (Уровень 1)
- [x] Проверяет ВСЕ пути `/autoria/*`
- [x] Использует `getToken` для проверки NextAuth
- [x] Редиректит на `/api/auth/signin` если нет сессии
- [x] НЕ проверяет backend токены (делегирует Level 2)
- [x] Логирует все проверки

### Layout (Уровень 2)
- [x] `BackendTokenPresenceGate` обернут вокруг `AutoRiaLayout`
- [x] Проверяет backend токены через `/api/auth/me`
- [x] Пытается refresh при 401
- [x] Использует `redirectToAuth` для умного редиректа
- [x] Показывает loader пока проверяет

### Server Components
- [x] Используют `requireAutoRiaAuth()` для защиты
- [x] Делают server redirect при отсутствии авторизации
- [x] Код выполняется только если авторизация OK

### Обработка ошибок
- [x] 401 → auto-refresh → retry
- [x] 403 → redirect /login
- [x] Timeout → redirect
- [x] Network error → redirect

### Редиректы
- [x] Используют `window.location.replace` (не `href`)
- [x] Логируют перед редиректом
- [x] Проверяют наличие NextAuth перед выбором куда

---

## Общие проблемы и решения

### Проблема: Бесконечный loader
**Причина:** BackendTokenPresenceGate не может сделать редирект
**Решение:**
1. Проверить console.log - выполняется ли `redirectToAuth`?
2. Проверить network - делается ли запрос к `/api/auth/me`?
3. Проверить `window.location.replace` - работает ли?

### Проблема: Редирект не срабатывает
**Причина:** Используется `window.location.href` вместо `replace`
**Решение:** Заменить на `window.location.replace(url)`

### Проблема: Данные не загружаются
**Причина:** Нет backend токенов для API запросов
**Решение:**
1. Проверить Redis: есть ли ключ `backend_auth`?
2. Проверить `/api/auth/me` - возвращает ли токены?
3. Проверить `fetchWithAuth` - добавляет ли токены в заголовки?

### Проблема: 401 после входа
**Причина:** Backend токены не сохранились в Redis
**Решение:**
1. Проверить `/login` page - вызывается ли Django API?
2. Проверить ответ API - возвращает ли access + refresh?
3. Проверить сохранение в Redis - успешно ли?

---

## Статус

✅ **Двухуровневая защита реализована полностью**

**Дата:** 2025-11-02 01:14 UTC+02:00  
**Версия:** 3.0 (исправлена проверка всех путей /autoria)

**Изменения:**
- Middleware теперь проверяет ВСЕ пути `/autoria/*`, а не только из списка
- Добавлена серверная утилита `requireAutoRiaAuth` для Server Components
- Редиректы используют `window.location.replace` вместо `href`
- Улучшено логирование для отладки

**Готово к тестированию!** 🚀
