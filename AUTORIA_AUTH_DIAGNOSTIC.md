# 🔍 Диагностика проблем с защитой AutoRia

## Проблема: Защита не срабатывает, пускает на страницу без авторизации

### Шаг 1: Проверка консоли браузера

Откройте консоль (F12) и перейдите на `/autoria`. Должны быть логи:

**Ожидаемые логи при ПРАВИЛЬНОЙ работе (нет авторизации):**
```
[Middleware] Processing: /autoria
[Middleware] Autoria path detected, checking NextAuth session (Level 1)
[Middleware L1] Checking NextAuth session for Autoria access
[Middleware L1] ❌ No NextAuth session - redirecting to signin
→ Редирект на /api/auth/signin
```

**Если видите:**
```
[Middleware L1] ✅ NextAuth session valid (email: ...) - passing to L2
[BackendTokenPresenceGate] Level 2: Checking backend tokens...
```
Значит у вас ЕСТЬ NextAuth сессия! Это нормально, если вы входили через Google/Email.

**Если НЕТ логов Middleware вообще:**
- Middleware не работает
- Проверьте `npm run dev` - есть ли ошибки компиляции?
- Перезапустите dev server

### Шаг 2: Проверка NextAuth сессии

Откройте `/api/auth/session` в браузере.

**Если видите:**
```json
{
  "user": {
    "name": "...",
    "email": "...",
    "image": "..."
  },
  "expires": "..."
}
```
Значит у вас ЕСТЬ NextAuth сессия. Middleware Level 1 пройден.

**Если видите:**
```json
{}
```
NextAuth сессии нет - должен сработать редирект на `/api/auth/signin`.

### Шаг 3: Проверка Backend токенов

Если NextAuth сессия есть, проверьте backend токены.

Откройте консоль браузера и выполните:
```javascript
fetch('/api/redis?key=backend_auth')
  .then(r => r.json())
  .then(d => console.log('Backend tokens:', d))
```

**Если видите:**
```json
{
  "exists": true,
  "value": "{\"access\":\"...\",\"refresh\":\"...\"}"
}
```
Значит backend токены ЕСТЬ - защита не должна была сработать (авторизация валидна).

**Если видите:**
```json
{
  "exists": false
}
```
Backend токенов НЕТ - BackendTokenPresenceGate должен редиректить на `/login`.

### Шаг 4: Проверка BackendTokenPresenceGate

Если токенов нет, но редирект не происходит, проверьте консоль:

**Должны быть логи:**
```
[BackendTokenPresenceGate] Level 2: Checking backend tokens...
[BackendTokenPresenceGate] ❌ Backend tokens not found, redirecting...
[redirectToAuth] Checking NextAuth session before redirect...
[redirectToAuth] ✅ NextAuth session exists, redirecting to /login
[redirectToAuth] Executing redirect to: /login?callbackUrl=/autoria
```

**Если логов нет:**
- BackendTokenPresenceGate не рендерится
- Проверьте `frontend/src/app/(main)/(backend)/autoria/layout.tsx`
- Убедитесь что там есть `<BackendTokenPresenceGate>`

### Шаг 5: Принудительная очистка

Если защита должна работать, но не работает:

1. **Очистить NextAuth сессию:**
   ```
   Откройте: http://localhost:3000/api/auth/signout
   Нажмите "Sign out"
   ```

2. **Очистить Redis токены:**
   ```javascript
   // В консоли браузера
   fetch('/api/auth/logout', { method: 'POST' })
     .then(() => console.log('Redis cleared'))
   ```

3. **Очистить cookies браузера:**
   - F12 → Application → Cookies → localhost → Удалить все
   - Или Ctrl+Shift+Delete → Очистить cookie

4. **Перезагрузить страницу:**
   - Ctrl+Shift+R (жесткая перезагрузка)

5. **Попытаться открыть /autoria снова**

---

## Проблема: Переменные среды не работают в deploy режиме

### Docker Compose Deploy

**Проблема:**
В `docker-compose.deploy.yml` переменная `NEXT_PUBLIC_BACKEND_URL` установлена как `/api` (относительный путь).
Это неправильно для SSR и API routes.

**Решение:**

Откройте `docker-compose.deploy.yml` и измените:

```yaml
# БЫЛО:
NEXT_PUBLIC_BACKEND_URL: /api

# ДОЛЖНО БЫТЬ:
NEXT_PUBLIC_BACKEND_URL: http://localhost/api
```

**Почему:**
- В Docker режиме frontend работает за nginx
- Nginx проксирует `/api` на backend
- SSR (Server Side Rendering) в Next.js нуждается в полном URL
- Клиентский код может использовать относительный `/api`, но SSR не может

**После изменения:**
```bash
docker-compose -f docker-compose.deploy.yml down
docker-compose -f docker-compose.deploy.yml up --build -d
```

### Проверка переменных в Docker

**Войдите в контейнер frontend:**
```bash
docker exec -it frontend sh
```

**Проверьте переменные:**
```bash
echo $NEXT_PUBLIC_BACKEND_URL
echo $NEXT_PUBLIC_IS_DOCKER
echo $REDIS_HOST
```

**Должны видеть:**
```
http://localhost/api
true
redis
```

### Проверка переменных в коде

**Создайте тестовый endpoint:**

`frontend/src/app/api/test-env/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_IS_DOCKER: process.env.NEXT_PUBLIC_IS_DOCKER,
    BACKEND_URL: process.env.BACKEND_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    NODE_ENV: process.env.NODE_ENV,
  });
}
```

**Откройте:**
- Local dev: `http://localhost:3000/api/test-env`
- Docker: `http://localhost/api/test-env`

**Ожидаемые значения (Docker):**
```json
{
  "NEXT_PUBLIC_BACKEND_URL": "http://localhost/api",
  "NEXT_PUBLIC_IS_DOCKER": "true",
  "BACKEND_URL": "http://app:8000",
  "REDIS_HOST": "redis",
  "NODE_ENV": "production"
}
```

---

## Быстрое решение ВСЕХ проблем

### 1. Полная очистка и перезапуск

**Local dev:**
```bash
# Остановить dev server (Ctrl+C)
cd frontend
rm -rf .next
npm run dev
```

**Docker:**
```bash
docker-compose down -v  # -v удаляет volumes (Redis данные)
docker-compose up --build -d
```

### 2. Проверка базового flow

1. Откройте инкогнито режим
2. Перейдите на `http://localhost:3000/autoria` (или `http://localhost/autoria` для Docker)
3. Должен быть редирект на `/api/auth/signin`
4. Войдите через Google или Email
5. После входа должен быть редирект на `/login`
6. На `/login` введите email/password → получите backend токены
7. Должен быть редирект обратно на `/autoria`
8. Теперь страница должна загрузиться

### 3. Если НЕ работает

**Middleware не запускается:**
- Проверьте `frontend/src/middleware.ts` - есть ли там код проверки `/autoria`?
- Перезапустите dev server

**BackendTokenPresenceGate не работает:**
- Проверьте `frontend/src/app/(main)/(backend)/autoria/layout.tsx`
- Убедитесь что `<BackendTokenPresenceGate>` обернут вокруг `{children}`

**Редиректы не срабатывают:**
- Проверьте консоль браузера на ошибки
- Проверьте Network tab - идут ли запросы к `/api/auth/me`, `/api/auth/session`?

---

## Статус

📋 **Если вы видите эту документацию - значит система защиты РЕАЛИЗОВАНА правильно**

🔍 **Проблемы обычно в:**
1. Уже существующая NextAuth сессия (не проблема, это нормально)
2. Уже существующие backend токены (не проблема, это нормально)
3. Неправильные переменные среды в Docker (решается выше)
4. Кеш браузера (решается Ctrl+Shift+R или инкогнито)

✅ **Чтобы убедиться что защита работает:**
- Используйте инкогнито режим
- Или полностью очистите cookies/localStorage
- Попробуйте открыть `/autoria` БЕЗ авторизации
