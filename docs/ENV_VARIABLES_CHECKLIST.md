# 📋 Перелік Змінних Середовища - Checklist

## ⚠️ КРИТИЧНО: Місця використання змінних

### 1. `frontend/.env.local` (ОБОВ'ЯЗКОВИЙ для локального запуску)

```env
# REDIS (обидва варіанти потрібні!)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://localhost:6379/0
NEXT_PUBLIC_REDIS_HOST=localhost       # ✅ Для client-side
NEXT_PUBLIC_REDIS_PORT=6379            # ✅ Для client-side
NEXT_PUBLIC_REDIS_URL=redis://localhost:6379/0  # ✅ Для client-side

# BACKEND
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000   # ✅ Для client-side

# FRONTEND
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# NEXTAUTH
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# ENVIRONMENT FLAGS
IS_DOCKER=false
NEXT_PUBLIC_IS_DOCKER=false            # ✅ Для client-side

# NODE
NODE_ENV=development
```

---

## 📁 Файли, де використовуються змінні

### Server-Side (process.env.*)

1. **`frontend/next.config.js`** (рядки 29-52)
   - ✅ Завантажує з `env-config/.env.base`, `.env.secrets`
   - ❌ **НЕ** завантажує `env-config/.env.local` (видалено)
   - ℹ️ Next.js автоматично завантажує `frontend/.env.local`

2. **`frontend/src/configs/auth.ts`** (рядки 10-11)
   - `process.env.NEXTAUTH_URL`
   - Використовує `AUTH_CONFIG` з `constants.ts`

3. **`frontend/src/common/constants/constants.ts`** (рядки 13-88)
   - `process.env.NEXT_PUBLIC_BACKEND_URL` (рядок 15)
   - `process.env.BACKEND_URL` (рядок 76)
   - `process.env.NEXTAUTH_URL` (рядок 84)

4. **`frontend/src/utils/api/getBaseUrl.ts`** (рядки 3-8)
   - `process.env.NEXT_PUBLIC_BACKEND_URL` (client-side)
   - `process.env.BACKEND_URL` (server-side)

5. **`frontend/src/utils/api/env.ts`** (рядки 19-69)
   - `process.env.IS_DOCKER` (server-side)
   - `process.env.NEXT_PUBLIC_IS_DOCKER` (client-side)
   - `process.env.REDIS_HOST`, `REDIS_PORT`, `REDIS_URL`
   - `process.env.NEXT_PUBLIC_REDIS_HOST`, `NEXT_PUBLIC_REDIS_PORT`, `NEXT_PUBLIC_REDIS_URL`

6. **`frontend/src/app/api/redis/route.ts`** (рядки 12-28)
   - `process.env.NEXT_PUBLIC_IS_DOCKER`
   - `process.env.NEXT_PUBLIC_REDIS_HOST`
   - `process.env.NEXT_PUBLIC_REDIS_PORT`
   - `process.env.NEXT_PUBLIC_REDIS_URL`

---

## 🔍 Як перевірити чи всі змінні встановлені

### 1. Перевірка наявності файлу

```bash
# PowerShell
Test-Path frontend\.env.local
# Має повернути: True

Get-Content frontend\.env.local
```

### 2. Перевірка під час запуску

При запуску `npm run dev` в консолі мають з'явитися:

```
🔧 Loaded environment variables from env-config/
📁 NEXTAUTH_SECRET: SET
📁 GOOGLE_CLIENT_ID: SET
📁 GOOGLE_CLIENT_SECRET: SET
📁 NEXT_PUBLIC_BACKEND_URL: http://localhost:8000
📁 REDIS_HOST: localhost
📁 REDIS_URL: redis://localhost:6379/0
📁 IS_DOCKER: false
📁 NEXT_PUBLIC_IS_DOCKER: false
```

### 3. Перевірка в браузері (DevTools Console)

Відкрийте DevTools → Console, має з'явитися:

```
[Constants] Raw environment variables:
  NEXTAUTH_SECRET: [EMPTY] або [DECRYPTED]
  GOOGLE_CLIENT_ID: [EMPTY] або [DECRYPTED]
  GOOGLE_CLIENT_SECRET: [EMPTY] або [DECRYPTED]
```

---

## ❌ Часті помилки

### Помилка 1: API повертає 500 (Internal Server Error)

**Причина**: `BACKEND_URL` або `NEXT_PUBLIC_BACKEND_URL` не встановлені або порожні

**Рішення**:
1. Перевірте `frontend/.env.local`
2. Перезапустіть `npm run dev`

---

### Помилка 2: Redis connection refused

**Причина**: `REDIS_HOST`, `REDIS_PORT` або `NEXT_PUBLIC_REDIS_*` не встановлені

**Рішення**:
1. Додайте **ВСІ** Redis змінні в `frontend/.env.local`
2. Особливо важливі: `NEXT_PUBLIC_REDIS_HOST`, `NEXT_PUBLIC_REDIS_PORT`, `NEXT_PUBLIC_REDIS_URL`

---

### Помилка 3: NextAuth не працює

**Причина**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET` не встановлені

**Рішення**:
1. Встановіть `NEXTAUTH_URL=http://localhost:3000`
2. Встановіть `NEXTAUTH_SECRET` (мінімум 32 символи)

---

## 📝 Checklist перед запуском

- [ ] `frontend/.env.local` існує і не порожній
- [ ] Містить **ВСІ** `NEXT_PUBLIC_*` змінні (для client-side)
- [ ] Містить **ВСІ** server-side змінні (без префіксу)
- [ ] `next.config.js` **НЕ** намагається завантажити `env-config/.env.local`
- [ ] `npm run dev` показує "🔧 Loaded environment variables"
- [ ] В консолі браузера немає помилок про missing env vars
- [ ] Backend API доступний: `curl http://localhost:8000/health`
- [ ] Redis доступний: `redis-cli ping` → `PONG`

---

## 🔧 Швидке виправлення

Якщо щось не працює:

```bash
# 1. Видаліть старий файл
Remove-Item frontend\.env.local -Force

# 2. Створіть новий з template
Copy-Item docs\ENV_TEMPLATE.local frontend\.env.local

# 3. Перезапустіть frontend
cd frontend
npm run dev
```

---

## 📞 Підтримка

Якщо після виконання всіх кроків проблема залишається:

1. Перевірте логи: `docker-compose logs app`
2. Перевірте Next.js логи в терміналі
3. Перевірте DevTools Console в браузері
4. Звірте файл `frontend/.env.local` з цим документом

