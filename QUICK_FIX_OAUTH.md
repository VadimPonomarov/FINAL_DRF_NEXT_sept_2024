# 🚨 БЫСТРОЕ ИСПРАВЛЕНИЕ Google OAuth

## Проблема
OAuth клиент `317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr` был удален в Google Cloud Console.

Ошибка: **404 - Не удалось найти запрошенный URL**

## ✅ Решение (2 варианта)

### Вариант 1: Создать новый OAuth клиент (РЕКОМЕНДУЕТСЯ)

#### 1. Откройте Google Cloud Console
🔗 https://console.cloud.google.com/apis/credentials

#### 2. Создайте OAuth Client ID
1. Нажмите **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Тип: **Web application**
3. Имя: `AutoRia NextAuth`
4. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Нажмите **CREATE**

#### 3. Скопируйте новые credentials
После создания вы получите:
- Client ID: `xxxxx-yyy.apps.googleusercontent.com`
- Client Secret: `GOCSPX-zzz`

#### 4. Обновите ключи

Запустите:
```bash
node update-oauth-keys.cjs
```

Введите новые Client ID и Client Secret. Скрипт автоматически:
- Зашифрует их
- Обновит `env-config/.env.secrets`

#### 5. Перезапустите сервер
```bash
cd frontend
npm run dev
```

---

### Вариант 2: Временно отключить Google OAuth

Если сейчас нет времени настраивать, можно использовать только email/password:

#### 1. Отключите GoogleProvider

В файле `frontend/src/configs/auth.ts` закомментируйте:

```typescript
providers: [
  // GoogleProvider({
  //   clientId: AUTH_CONFIG.GOOGLE_CLIENT_ID,
  //   clientSecret: AUTH_CONFIG.GOOGLE_CLIENT_SECRET,
  // }),
  CredentialsProvider({
    // ... оставить как есть
  })
]
```

#### 2. Перезапустите
```bash
cd frontend
npm run dev
```

Теперь будет работать только вход по email/password.

---

## 📋 Что работает СЕЙЧАС

✅ Шифрование/дешифрование ключей - **РАБОТАЕТ**  
✅ NextAuth конфигурация - **ПРАВИЛЬНАЯ**  
❌ Google OAuth клиент - **УДАЛЕН** (нужен новый)

---

## 🔍 Проверка после исправления

1. Откройте http://localhost:3000
2. Нажмите "Sign in with Google"
3. Должна открыться страница входа Google (не 404!)

---

## ❓ Нужна помощь?

- NextAuth docs: https://next-auth.js.org/providers/google
- Google Console: https://console.cloud.google.com/

