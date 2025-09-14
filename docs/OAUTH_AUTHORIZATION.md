# OAuth Authorization Technology Guide
# ====================================

Полное руководство по технологии OAuth авторизации в проекте FINAL_DRF_NEXT_sept_2024.

## 🏗️ Архитектура OAuth системы

### 📋 Компоненты системы:
- **Frontend (Next.js)**: NextAuth.js для OAuth провайдеров
- **Backend (Django)**: DRF + JWT для API аутентификации  
- **Redis**: Хранение токенов и сессий
- **Google OAuth**: Внешний провайдер аутентификации

### 🔄 Поток авторизации:
```
1. User → Frontend → Google OAuth
2. Google → Frontend (callback) → NextAuth.js
3. NextAuth.js → Redis (save tokens)
4. Frontend → Backend API (with JWT tokens)
```

## 🔧 Конфигурация переменных среды

### 📁 Централизованная архитектура (`env-config/`)

#### `.env.base` - Публичные переменные
```bash
# Google OAuth (публичные)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# NextAuth базовые настройки
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
```

#### `.env.secrets` - Секретные ключи
```bash
# NextAuth секрет
NEXTAUTH_SECRET=your_nextauth_secret_here

# Google OAuth секреты (незашифрованные для разработки)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_API_KEY=test_google_api_key_for_development

# Google OAuth секреты (зашифрованные для продакшена)
ENCRYPTED_GOOGLE_CLIENT_SECRET=Z0FBQUFBQm9uZWxMTV80aDdfWDZsZ0hXMXNZdXFGaU1raVh4V0lEd29pNmlNd3BtcUtRVFJacHRZbkdkWmpkWVFveE5BZ1ZiTUEzSjRCWmRsdmluWlVNZWxETzFUODBZZMzdSbEVFNm5CY3JKdEdHcXpRMUFLQlZLTzhQellZSXRkSkJYSzJMOFlVRWI=
ENCRYPTED_GOOGLE_API_KEY=Z0FBQUFBQm9uZW1DdldXM3BlQjFYU0FCaXQxUkU2cHo5enlqak5OSndZSnFTUUJ0Vjc0MmRZN2YxakxDM2dSdUFtdXdsME1vM2JrM0ZIRzhfdml3a0RFQXRaSFpSRzNodkV3dS1LsT2IwZmYwRndQZzhfR3VyRFBUOWlVd0RsODZsRWF0N0dWaFlJM0E=
```

#### `.env.local` - Локальные переопределения
```bash
# Redis для локальной разработки
REDIS_HOST=localhost

# URLs для локальной разработки
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

## 🔧 Простая конфигурация без шифрования

### 🎯 Принцип работы:
Используются оригинальные незашифрованные ключи напрямую из переменных окружения.

### 💻 Реализация в коде:

#### `frontend/src/config/constants.ts`
```typescript
export const AUTH_CONFIG = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
} as const;
```

## 🚀 Загрузка переменных в Next.js

### `frontend/next.config.js`
```javascript
// Программная загрузка из централизованной env-config/
import path from 'path';
import fs from 'fs';

// Загружаем переменные из env-config/ в правильном порядке
const envConfigDir = path.resolve(__dirname, '../env-config');
const baseEnv = loadEnvFile(path.join(envConfigDir, '.env.base'));
const secretsEnv = loadEnvFile(path.join(envConfigDir, '.env.secrets'));
const localEnv = loadEnvFile(path.join(envConfigDir, '.env.local'));

// Объединяем переменные (поздние перезаписывают ранние)
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

// Устанавливаем переменные в process.env
Object.entries(allEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});
```

## 🔑 NextAuth.js конфигурация

### `frontend/src/configs/auth.ts`
```typescript
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { AUTH_CONFIG } from "@/config/constants";

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: AUTH_CONFIG.GOOGLE_CLIENT_ID,
      clientSecret: AUTH_CONFIG.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline", 
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email", required: true }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        return { id: credentials.email, email: credentials.email };
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Логирование для диагностики
      console.log('[NextAuth signIn] User:', user?.email);
      console.log('[NextAuth signIn] Provider:', account?.provider);
      
      // Разрешаем вход всем пользователям
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      return {
        email: session.user.email,
        accessToken: token.accessToken,
        expiresOn: new Date(session.expires).toLocaleString(),
      };
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24 hours
  },
  
  // Отладка для разработки
  debug: process.env.NODE_ENV === 'development',
};
```

## 🌐 Google Cloud Console настройки

### 📋 Обязательные настройки:

1. **Перейти в**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Выбрать проект** или создать новый
3. **Включить APIs**: Google+ API, Google OAuth2 API
4. **Создать OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Name: **Your App Name**
   
5. **Authorized redirect URIs** (КРИТИЧНО!):
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3001/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```

6. **Получить ключи**:
   - **Client ID**: `your_google_client_id_here`
   - **Client Secret**: `your_google_client_secret_here`

### ⚠️ Частые ошибки:

- **`invalid_client (Unauthorized)`**: Неправильный Client Secret или redirect URI
- **`redirect_uri_mismatch`**: Redirect URI не настроен в Google Cloud Console
- **`access_denied`**: Пользователь отклонил авторизацию или есть ограничения

## 🔄 Поток OAuth авторизации

### 1. Инициация авторизации
```
User clicks "Sign in with Google"
↓
Frontend → Google OAuth URL
↓
Google показывает форму авторизации
```

### 2. Callback обработка
```
User авторизуется в Google
↓
Google → http://localhost:3000/api/auth/callback/google?code=...
↓
NextAuth.js обрабатывает callback
↓
NextAuth.js получает токены от Google
↓
NextAuth.js сохраняет сессию
```

### 3. Сохранение в Redis
```
NextAuth.js → Redis (save session)
↓
Frontend получает JWT токен
↓
Frontend использует токен для API запросов
```

## 🧪 Диагностика проблем

### 📊 Логирование
Включено детальное логирование в `auth.ts`:
```typescript
debug: process.env.NODE_ENV === 'development',
logger: {
  error(code, metadata) { console.error('[NextAuth Error]', code, metadata); },
  warn(code) { console.warn('[NextAuth Warn]', code); },
  debug(code, metadata) { console.log('[NextAuth Debug]', code, metadata); }
}
```

### 🔍 Проверка переменных
В `next.config.js` логируются все ключевые переменные:
```
🔧 Loaded environment variables from env-config/
📁 NEXTAUTH_SECRET: SET
📁 GOOGLE_CLIENT_ID: SET  
📁 GOOGLE_CLIENT_SECRET: SET
📁 REDIS_HOST: localhost
```

### 🛠️ Отладочные команды
```bash
# Проверить Redis подключение
docker-compose up redis -d

# Проверить переменные среды
cd env-config && python load-env.py

# Проверить Google OAuth URL
# Должен содержать правильный redirect_uri
```

## ✅ Успешная настройка

При правильной настройке в логах должно быть:
```
[NextAuth Debug] GET_AUTHORIZATION_URL {
  url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=your_client_id...&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgoogle...',
  provider: {
    clientId: 'your_google_client_id_here',
    clientSecret: 'your_google_client_secret_here',
    callbackUrl: 'http://localhost:3000/api/auth/callback/google'
  }
}
```

## 🔒 Безопасность

### 🎯 Принципы:
- **Client ID**: Публичный (можно в `NEXT_PUBLIC_*`)
- **Client Secret**: Приватный (только server-side)
- **Оригинальные ключи**: Используются напрямую без шифрования

### 📝 Конфигурация:
1. `GOOGLE_CLIENT_ID` - публичный идентификатор клиента
2. `GOOGLE_CLIENT_SECRET` - приватный секрет клиента
3. Все ключи хранятся в `env-config/.env.secrets`

Простая и надежная система без дополнительных слоев шифрования.
