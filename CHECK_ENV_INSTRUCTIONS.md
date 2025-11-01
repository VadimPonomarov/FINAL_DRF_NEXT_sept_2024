# 🔍 Инструкция по проверке переменных окружения

## Проблема
Google OAuth не работает, потому что переменные окружения могут быть не установлены или неправильно зашифрованы.

## Быстрая проверка

Запустите скрипт проверки:
```bash
cd frontend
node scripts/check-env.js
```

## Ручная проверка

Проверьте следующие файлы в папке `env-config/`:

### 1. `.env.secrets` (ОСНОВНОЙ - должен содержать секреты)
Должны быть установлены:
- `NEXTAUTH_SECRET=ENC_...` или `NEXTAUTH_SECRET=ваш_секрет`
- `GOOGLE_CLIENT_ID=ENC_...` или `GOOGLE_CLIENT_ID=ваш_client_id`
- `GOOGLE_CLIENT_SECRET=ENC_...` или `GOOGLE_CLIENT_SECRET=ваш_client_secret`

### 2. `.env.local` (может переопределить)
Может содержать те же переменные для локальной разработки

### 3. `.env.development` (для разработки)
Может содержать те же переменные

## Формат значений

**Зашифрованные значения** начинаются с `ENC_`:
```
GOOGLE_CLIENT_ID=ENC_t92YuQnblRnbvNmclNXdlx2Zv92ZuMHcwFm...
```

**Незашифрованные значения** - обычные строки:
```
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

## Что делать, если переменные отсутствуют?

1. **Получите Google OAuth credentials:**
   - Идите на https://console.cloud.google.com/
   - Создайте OAuth 2.0 Client ID
   - Скопируйте Client ID и Client Secret

2. **Добавьте в `.env.secrets`:**
   ```
   GOOGLE_CLIENT_ID=ENC_... (зашифруйте) или просто значение
   GOOGLE_CLIENT_SECRET=ENC_... (зашифруйте) или просто значение
   NEXTAUTH_SECRET=ENC_... (зашифруйте) или просто значение
   ```

3. **Перезапустите dev-сервер:**
   ```bash
   npm run dev
   ```

## Проверка в логах

После запуска `npm run dev` проверьте консоль. Должны быть сообщения:

✅ **Хорошо:**
```
[Constants] ✅ Google OAuth credentials are configured
```

❌ **Плохо:**
```
[Constants] ❌ CRITICAL: Google OAuth credentials are MISSING!
```

