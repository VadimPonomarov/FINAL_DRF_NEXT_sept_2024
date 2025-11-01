# 🔐 Протокол безопасности: LOGOUT vs SIGNOUT

## Требования

1. **LOGOUT** - удаляет ТОЛЬКО backend токены (Redis), оставляет NextAuth сессию
2. **SIGNOUT** - удаляет И backend токены И NextAuth сессию
3. **LOGIN** - работает только с backend токенами из Django (Redis)
4. При **401** (Unauthorized) - попытка refresh токена → повтор запроса
5. При **403** (Forbidden) после неудачного refresh - редирект на `/login`

---

## Архитектура

### LOGOUT (только токены)
```
POST /api/auth/logout
  ↓
Удаляет из Redis:
  - provider:{email}
  - tokens:{email}
  - autoria:tokens:{email}
  - backend_auth
  - dummy_auth
  ↓
NextAuth сессия СОХРАНЯЕТСЯ
  ↓
Результат: Бейдж исчезает, но сессия активна
```

### SIGNOUT (токены + сессия)
```
POST /api/auth/signout-full
  ↓
Удаляет из Redis:
  - все токены пользователя
  ↓
Удаляет NextAuth cookies:
  - next-auth.session-token
  - __Secure-next-auth.session-token
  - next-auth.csrf-token
  - __Secure-next-auth.csrf-token
  - next-auth.callback-url
  - __Secure-next-auth.callback-url
  ↓
Результат: Полный выход из системы
```

### LOGIN (получение токенов)
```
/login page
  ↓
Проверка NextAuth сессии
  ↓ ЕСТЬ
Вызов Django API: POST /api/v1/auth/login/
  ↓
Получение access + refresh токенов
  ↓
Сохранение в Redis:
  - backend_auth: { access, refresh }
  ↓
Редирект на callbackUrl (например /autoria)
```

---

## Обработка ошибок 401/403

### Workflow при 401 (Unauthorized)

```
1. Клиент делает запрос → Backend API
   ↓ 401 (токен протух)
   
2. fetchWithAuth перехватывает 401
   ↓
   
3. Попытка refresh токена:
   POST /api/auth/refresh
   ↓
   Получает refresh token из Redis
   ↓
   Вызывает Django: POST /api/auth/refresh
   ↓
   
4a. Refresh УСПЕШЕН:
    ↓
    Сохраняет новые токены в Redis
    ↓
    RETRY оригинального запроса
    ↓
    ✅ Запрос выполнен успешно
    
4b. Refresh ПРОВАЛЕН (404 - токенов нет):
    ↓
    redirectToAuth() проверяет NextAuth сессию
    ↓
    4b1. Есть NextAuth сессия:
         → редирект на /login (получить токены)
    4b2. Нет NextAuth сессии:
         → редирект на /api/auth/signin (войти)
```

### Workflow при 403 (Forbidden)

```
Клиент делает запрос → Backend API
   ↓ 403 (нет прав доступа)
   
fetchWithAuth перехватывает 403
   ↓
СРАЗУ редирект на /login
   ↓
Сообщение: "Необхідна авторизація для доступу до цього ресурсу"
```

---

## API Endpoints

### POST /api/auth/logout
**Назначение:** LOGOUT - удаление backend токенов  
**Действия:**
- Удаляет токены из Redis
- **НЕ** удаляет NextAuth cookies
- NextAuth сессия сохраняется

**Использование:**
```typescript
// Клиент
import { cleanupBackendTokens } from '@/lib/auth/cleanupAuth';
await cleanupBackendTokens();
// Затем редирект на /login

// Или напрямую
await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
```

### POST /api/auth/signout-full
**Назначение:** SIGNOUT - полный выход  
**Действия:**
- Удаляет токены из Redis
- Удаляет NextAuth cookies
- Полная очистка сессии

**Использование:**
```typescript
// Клиент
import { cleanupAuth } from '@/lib/auth/cleanupAuth';
await cleanupAuth('/api/auth/signin');

// Или напрямую
await fetch('/api/auth/signout-full', { method: 'POST', credentials: 'include' });
```

### POST /api/auth/refresh
**Назначение:** Обновление протухшего access токена  
**Действия:**
- Получает refresh token из Redis
- Вызывает Django API для обновления
- Сохраняет новые токены в Redis
- Возвращает новый access token

**Использование:** Автоматически вызывается в `fetchWithAuth` при 401

### GET /api/auth/pre-signin
**Назначение:** Полная очистка перед входом  
**Действия:**
- Вызывает `/api/auth/signout-full`
- Редиректит на `/api/auth/signin?callbackUrl=/login`

**Использование:** Кнопка "Войти" в UI

### GET /logout
**Назначение:** Страница выхода из backend (сохраняет NextAuth)  
**Действия:**
- Вызывает `/api/auth/logout`
- Редиректит на `/login`

**Использование:** Ссылка на `/logout` в меню

---

## NextAuth Events

### events.signOut
**Триггер:** Вызов `signOut()` от NextAuth  
**Действия:** Автоматически удаляет токены из Redis

```typescript
events: {
  async signOut(message) {
    const email = token?.email || session?.user?.email;
    // Удаляет все ключи пользователя из Redis
    await redis.del(`provider:${email}`);
    await redis.del(`tokens:${email}`);
    await redis.del(`autoria:tokens:${email}`);
    await redis.del('backend_auth');
    await redis.del('dummy_auth');
  }
}
```

### events.signIn
**Триггер:** Успешный вход через NextAuth  
**Действия:** Превентивно удаляет старые токены перед новым входом

```typescript
events: {
  async signIn(message) {
    const email = user?.email;
    // Превентивно чистим старые токены
    await redis.del(`provider:${email}`);
    await redis.del(`tokens:${email}`);
    await redis.del(`autoria:tokens:${email}`);
  }
}
```

---

## Клиентские утилиты

### cleanupAuth() - SIGNOUT

```typescript
import { cleanupAuth } from '@/lib/auth/cleanupAuth';

// Полный выход из системы
await cleanupAuth('/api/auth/signin');

// Что делает:
// 1. POST /api/auth/signout-full (Redis + NextAuth cookies)
// 2. signOut() от NextAuth (клиентская часть)
// 3. localStorage.clear() (кроме theme и language)
// 4. sessionStorage.clear()
// 5. Диспатчит событие 'auth:signout'
// 6. Редирект на /api/auth/signin
```

### cleanupBackendTokens() - LOGOUT

```typescript
import { cleanupBackendTokens } from '@/lib/auth/cleanupAuth';

// Выход из backend (сохраняет NextAuth сессию)
await cleanupBackendTokens();

// Что делает:
// 1. POST /api/auth/logout (только Redis токены)
// 2. localStorage.removeItem('backend_auth', 'accessToken', 'refreshToken')
// 3. sessionStorage.removeItem('backend_auth')
// НЕ удаляет NextAuth сессию!
```

### redirectToAuth()

```typescript
import { redirectToAuth } from '@/utils/auth/redirectToAuth';

// Умный редирект с проверкой сессии
await redirectToAuth(currentPath, 'tokens_not_found');

// Логика:
// 1. Проверяет наличие NextAuth сессии
// 2a. Если есть сессия → редирект на /login (получить токены)
// 2b. Если нет сессии → редирект на /api/auth/signin (войти)
```

---

## UI Интеграция

### Кнопка "Войти"
```typescript
<Button href="/api/auth/pre-signin">
  Войти
</Button>

// Или
<Button onClick={async () => {
  window.location.href = '/api/auth/pre-signin';
}}>
  Войти
</Button>
```

### Кнопка "Выйти из AutoRia" (LOGOUT)
```typescript
import { cleanupBackendTokens } from '@/lib/auth/cleanupAuth';

<Button onClick={async () => {
  await cleanupBackendTokens();
  window.location.href = '/login';
}}>
  Выйти из AutoRia
</Button>

// Или через ссылку
<a href="/logout">Выйти из AutoRia</a>
```

### Кнопка "Полный выход" (SIGNOUT)
```typescript
import { signOut } from 'next-auth/react';

<Button onClick={async () => {
  await signOut({ callbackUrl: '/api/auth/signin' });
}}>
  Полный выход
</Button>

// Или через cleanupAuth
import { cleanupAuth } from '@/lib/auth/cleanupAuth';

<Button onClick={async () => {
  await cleanupAuth('/api/auth/signin');
}}>
  Полный выход
</Button>
```

### Кнопка "Сменить пользователя"
```typescript
<Button href="/api/auth/pre-signin">
  Сменить пользователя
</Button>
```

---

## Файловая структура

```
frontend/src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── logout/route.ts          # POST - LOGOUT (только токены)
│   │       ├── signout-full/route.ts    # POST - SIGNOUT (токены + сессия)
│   │       ├── refresh/route.ts         # POST - обновление токенов
│   │       ├── pre-signin/route.ts      # GET - очистка перед входом
│   │       ├── me/route.ts              # GET - проверка токенов
│   │       └── cleanup/route.ts         # POST - очистка провайдеров
│   │
│   └── logout/route.ts                  # GET - страница logout
│
├── configs/
│   └── auth.ts                          # NextAuth config + events
│
├── lib/
│   └── auth/
│       └── cleanupAuth.ts               # cleanupAuth(), cleanupBackendTokens()
│
└── utils/
    ├── auth/
    │   ├── redirectToAuth.ts            # redirectToAuth(), redirectToLogin()
    │   └── tokenRefreshManager.ts       # Управление refresh
    │
    └── fetchWithAuth.ts                 # 401/403 обработка + auto-refresh
```

---

## Тестирование

### 1. Тест LOGOUT (только токены)
```bash
# Войти в систему
# Открыть /autoria → видим бейдж с email
# Выполнить logout
await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
# Обновить страницу → бейдж исчезает
# Редирект на /login (через BackendTokenPresenceGate)
# NextAuth сессия АКТИВНА (/api/auth/session возвращает user)
```

### 2. Тест SIGNOUT (токены + сессия)
```bash
# Войти в систему
# Открыть /autoria → видим бейдж с email
# Выполнить signout
await signOut();
# Редирект на /api/auth/signin
# NextAuth сессия УДАЛЕНА (/api/auth/session возвращает {})
```

### 3. Тест 401 → refresh → retry
```bash
# Войти в систему
# Дождаться протухания access токена (или удалить вручную из Redis)
# Сделать любой запрос к AutoRia API
# Должно произойти:
# 1. 401 перехвачен
# 2. Автоматический refresh
# 3. Retry запроса
# 4. Успешный результат
```

### 4. Тест 403 → redirect /login
```bash
# Войти в систему
# Попытаться получить доступ к ресурсу без прав
# Должно произойти:
# 1. 403 перехвачен
# 2. Редирект на /login
# 3. Сообщение об ошибке
```

### 5. Тест pre-signin
```bash
# Перейти на /api/auth/pre-signin
# Должно произойти:
# 1. Полная очистка (Redis + cookies)
# 2. Редирект на /api/auth/signin?callbackUrl=/login
# 3. После входа → редирект на /login
# 4. На /login получение backend токенов
# 5. Редирект на /autoria
```

---

## Безопасность

### Что защищает система

✅ **Защита от протухших токенов**
- Автоматический refresh при 401
- Максимум 3 попытки refresh
- После провала → редирект на правильную страницу

✅ **Защита от несанкционированного доступа**
- Двухуровневая проверка (NextAuth + backend)
- Middleware блокирует на уровне сервера
- BackendTokenPresenceGate блокирует на клиенте

✅ **Защита от утечки данных**
- Токены хранятся только в Redis (не в localStorage)
- Cookies HttpOnly для NextAuth сессии
- Автоматическая очистка при выходе

✅ **Защита от повторного использования токенов**
- events.signIn превентивно чистит старые токены
- events.signOut автоматически чистит Redis
- Счетчик попыток refresh (max 3)

### Что НЕ защищает (требует дополнительной работы)

⚠️ **CSRF защита**
- NextAuth имеет встроенную CSRF защиту
- Backend API должен проверять CSRF токены

⚠️ **Rate limiting**
- Нужно добавить ограничение на количество refresh попыток
- Нужно добавить ограничение на количество login попыток

⚠️ **Session hijacking**
- Нужно добавить проверку IP адреса
- Нужно добавить проверку User-Agent

---

## Статус

✅ **Протокол LOGOUT/SIGNOUT реализован**

**Дата:** 2025-11-02 00:48 UTC+02:00  
**Версия:** 2.0  
**Тестирование:** Требуется ручное тестирование UI  

**Изменения:**
- Разделены LOGOUT и SIGNOUT
- Добавлена обработка 401 → refresh → retry
- Добавлена обработка 403 → redirect /login
- Добавлены NextAuth events для автоматической очистки
- Обновлены клиентские утилиты
