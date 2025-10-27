# 🔐 Google OAuth Setup Guide

## Проблема
Google OAuth клиент был удален (ошибка 404). Нужно создать новые credentials.

## Решение: Создать новый OAuth Client

### Шаг 1: Перейдите в Google Cloud Console
🔗 https://console.cloud.google.com/

### Шаг 2: Создайте/выберите проект
1. Нажмите на выбор проекта вверху
2. Создайте новый проект или выберите существующий
3. Название: `AutoRia Clone` (или любое)

### Шаг 3: Включите Google+ API
1. Перейдите в **APIs & Services** → **Library**
2. Найдите "Google+ API"
3. Нажмите **Enable**

### Шаг 4: Настройте OAuth Consent Screen
1. **APIs & Services** → **OAuth consent screen**
2. Выберите **External**
3. Заполните:
   - App name: `AutoRia Clone`
   - User support email: ваш email
   - Developer contact: ваш email
4. Нажмите **Save and Continue**
5. Scopes: пропустите (Save and Continue)
6. Test users: добавьте свой email для тестирования
7. Нажмите **Save and Continue**

### Шаг 5: Создайте OAuth Client ID
1. **APIs & Services** → **Credentials**
2. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `AutoRia NextAuth`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   http://127.0.0.1:3000/api/auth/callback/google
   ```
7. Нажмите **CREATE**

### Шаг 6: Скопируйте credentials
После создания вы получите:
- **Client ID** (например: `123456789-abc...xyz.apps.googleusercontent.com`)
- **Client Secret** (например: `GOCSPX-...`)

**ВАЖНО:** Сохраните их!

### Шаг 7: Обновите ключи в проекте

Запустите команду для шифрования новых ключей:

```bash
node update-oauth-keys.cjs
```

Скрипт спросит у вас:
1. GOOGLE_CLIENT_ID
2. GOOGLE_CLIENT_SECRET

И автоматически обновит `env-config/.env.secrets`

---

## Альтернатива: Использовать Credentials Provider

Если не хотите настраивать Google OAuth, можно использовать только email/password авторизацию:

1. В файле `frontend/src/configs/auth.ts` закомментируйте GoogleProvider
2. Используйте только CredentialsProvider

---

## Проверка работы

После настройки:
1. Запустите `cd frontend && npm run dev`
2. Откройте http://localhost:3000
3. Нажмите на кнопку "Sign in with Google"
4. Должна открыться страница входа Google

---

## Полезные ссылки

- 📖 NextAuth.js Google Provider: https://next-auth.js.org/providers/google
- 🔗 Google Cloud Console: https://console.cloud.google.com/
- 📋 OAuth 2.0 Scopes: https://developers.google.com/identity/protocols/oauth2/scopes

