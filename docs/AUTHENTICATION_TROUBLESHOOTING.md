# Руководство по устранению проблем аутентификации

## Оглавление
1. [Проблема: Токены не сохраняются в Redis после логина](#проблема-1-токены-не-сохраняются-в-redis-после-логина)
2. [Проблема: Сессия NextAuth истекает слишком быстро](#проблема-2-сессия-nextauth-истекает-слишком-быстро)
3. [Проблема: Бесконечный редирект (ERR_TOO_MANY_REDIRECTS)](#проблема-3-бесконечный-редирект-err_too_many_redirects)
4. [Проблема: Редирект на несуществующую страницу /signin](#проблема-4-редирект-на-несуществующую-страницу-signin)
5. [Проблема: Старый код кэшируется Turbopack](#проблема-5-старый-код-кэшируется-turbopack)

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

## Контакты и дополнительная информация

- **Документация NextAuth**: https://next-auth.js.org/
- **Документация Redis**: https://redis.io/docs/
- **Next.js 15 Docs**: https://nextjs.org/docs

**Дата создания**: 2025-01-16
**Последнее обновление**: 2025-01-16

