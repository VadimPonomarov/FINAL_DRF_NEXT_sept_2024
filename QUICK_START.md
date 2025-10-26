# 🚀 Быстрый старт после клонирования

## ✅ Все уже настроено!

После клонирования репозитория **все файлы уже есть**, включая зашифрованные переменные окружения (с префиксом `ENC_`). Расшифровка происходит автоматически через `simple-crypto.ts`.

### 📁 Файлы окружения в репозитории:

```
env-config/
├── .env.base         # Базовые настройки (порты, имена БД)
├── .env.secrets      # Зашифрованные секреты (ENC_ префикс)
├── .env.docker       # Переопределения для Docker
├── .env.local        # Переопределения для локального запуска
└── .env.development  # ✨ Зашифрованные значения для локальной разработки
```

**🔐 Безопасность:** Все секреты зашифрованы с префиксом `ENC_` и автоматически расшифровываются во frontend через `simple-crypto.ts`.

## 🎯 Быстрый старт

### 1. Клонируйте репозиторий

```bash
# Перейдите в папку env-config
cd env-config

# Создайте файл .env.development (для Windows PowerShell)
New-Item -Path .env.development -ItemType File

# Для Linux/Mac
# touch .env.development
```

2. **Добавьте в файл `env-config/.env.development` незашифрованные значения:**

```bash
# =============================================================================
# DEVELOPMENT ENVIRONMENT - UNENCRYPTED VALUES
# =============================================================================

# NextAuth Configuration
NEXTAUTH_SECRET=ENC_=0TR2cDOoZjUiZzRBZTas9GRVtGN31ERpdncE5Wd3cDNYZUOup3Lwc3KMhlY

# Google OAuth (значения зашифрованы с префиксом ENC_)
GOOGLE_CLIENT_ID=ENC_t92YuQnblRnbvNmclNXdlx2Zv92ZuMHcwFmLyZHMpJma21mbxgjZyMnc0R3Z1hWauNHcwJDdxdTcoxWLxIDMxUzM3ADM3EzM
GOOGLE_CLIENT_SECRET=ENC_=k3VxhkZjZnV2lXOxMleaNHUGJTdvFnTrl1bnlWLYB1UD90R
NEXT_PUBLIC_GOOGLE_CLIENT_ID=ENC_t92YuQnblRnbvNmclNXdlx2Zv92ZuMHcwFmLyZHMpJma21mbxgjZyMnc0R3Z1hWauNHcwJDdxdTcoxWLxIDMxUzM3ADM3EzM

# Backend URLs
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/0
NEXT_PUBLIC_REDIS_URL=redis://localhost:6379/0
```

3. **Обновите `frontend/next.config.js`** чтобы загружать `.env.development`:

Добавьте после строки 32:

```javascript
const localEnv = loadEnvFile(path.join(envConfigDir, '.env.local'));
const developmentEnv = loadEnvFile(path.join(envConfigDir, '.env.development')); // Добавить эту строку
```

И измените строку 35:

```javascript
// Было:
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

// Должно быть:
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv, ...developmentEnv };
```

### Вариант 2: Использовать собственные Google OAuth ключи

1. **Создайте Google OAuth приложение:**
   - Перейдите на https://console.cloud.google.com/
   - Создайте новый проект или выберите существующий
   - Перейдите в "APIs & Services" → "Credentials"
   - Создайте "OAuth 2.0 Client ID"
   - Добавьте Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`

2. **Обновите `.env.development`** с вашими ключами:

```bash
GOOGLE_CLIENT_ID=ваш-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ваш-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=ваш-client-id.apps.googleusercontent.com
```

### Вариант 3: Запуск полностью в Docker (переменные работают автоматически)

```bash
# Запустите весь стек в Docker
docker-compose up --build

# Frontend будет доступен на http://localhost:3000
# Backend на http://localhost:8000
```

## 📝 Порядок запуска для локальной разработки

### 1. Backend (в Docker или локально)

**Docker (рекомендуется):**
```bash
docker-compose up app pg redis rabbitmq
```

**Локально:**
```bash
cd backend
python manage.py runserver
```

### 2. Frontend (локально)

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

### 3. Проверка

Откройте http://localhost:3000 и проверьте в консоли браузера:

```
🔧 Loaded environment variables from env-config/
📁 NEXTAUTH_SECRET: SET
📁 GOOGLE_CLIENT_ID: SET
📁 GOOGLE_CLIENT_SECRET: SET
```

Если видите `NOT_SET` - значит файл `.env.development` не создан или не загружен.

## 🔍 Отладка

### Проверка переменных в `next.config.js`:

```bash
# В корне проекта
cd frontend
npm run dev

# Смотрите в консоль - должны быть логи:
# 🔧 Loaded environment variables from env-config/
# 📁 NEXTAUTH_SECRET: SET
```

### Проверка в браузере:

Откройте DevTools → Console и найдите:
```
[Constants] Raw environment variables:
  NEXTAUTH_SECRET: [DECRYPTED]
  GOOGLE_CLIENT_ID: [DECRYPTED]
  GOOGLE_CLIENT_SECRET: [DECRYPTED]
```

Если видите `[EMPTY]` - переменные не загружены.

## ⚠️ Известные проблемы

### Проблема 1: "GOOGLE_CLIENT_ID: [EMPTY]"

**Причина:** Зашифрованные значения не расшифровываются корректно при локальном запуске.

**Решение:** Создайте `.env.development` с незашифрованными значениями (см. Вариант 1).

### Проблема 2: "Failed to load resource: 404 (Not Found) api/redis"

**Причина:** Frontend пытается подключиться к Redis через API, но маршрут не существует.

**Решение:** Это нормально для локальной разработки. Redis используется для кеширования, но не критичен для базовой функциональности.

### Проблема 3: NextAuth сессия не сохраняется

**Причина:** `NEXTAUTH_SECRET` не установлен или неверный.

**Решение:** Убедитесь, что `NEXTAUTH_SECRET` установлен в `.env.development`.

## 📚 Дополнительные ресурсы

- [ENV_SETUP.md](./ENV_SETUP.md) - Подробное описание архитектуры переменных окружения
- [docs/ENV_ARCHITECTURE.md](./docs/ENV_ARCHITECTURE.md) - Архитектура конфигурации
- [SETUP.md](./SETUP.md) - Полная инструкция по настройке проекта

## 🎯 TL;DR (Самое быстрое решение)

```bash
# Файл .env.development уже создан в репозитории!
# Он содержит:
# - NEXTAUTH_SECRET (открытый)
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (зашифрованы с ENC_)
# Дешифровка происходит автоматически через simple-crypto.ts

# 2. Обновите next.config.js (см. Вариант 1, шаг 3)

# 3. Запустите backend
cd ..
docker-compose up app pg redis

# 4. Запустите frontend
cd frontend
npm install
npm run dev
```

Готово! 🎉

