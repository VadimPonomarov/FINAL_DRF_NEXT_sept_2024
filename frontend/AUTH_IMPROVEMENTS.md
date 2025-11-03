# Улучшения системы авторизации

## Проблема
Массовые ошибки 401 в консоли браузера при входе до авторизации или когда токен истекает.

## Решение

### 1. Проактивная проверка токенов (`proactiveTokenCheck.ts`)
Создан новый модуль для проверки токенов **ДО** отправки запроса:

**Алгоритм:**
1. Получает токены из Redis
2. Проверяет истечение access token (с буфером 5 минут)
3. Если токен истёк - автоматически делает refresh
4. Возвращает true, если токены валидны

**Функции:**
- `ensureValidTokens()` - основная функция для проверки и обновления
- `checkTokenStatus()` - детальная информация о состоянии токенов
- `isTokenExpired()` - проверка истечения JWT

### 2. Обновление `fetchWithAuth.ts`
Добавлена проактивная проверка ПЕРЕД выполнением запроса:

```typescript
// Проверяем токены ПЕРЕД запросом
const tokensValid = await ensureValidTokens();
if (!tokensValid) {
  console.warn('[fetchWithAuth] Tokens are not valid, request may fail');
}

// Только после проверки выполняем запрос
const resp = await fetch(input, init);
```

**Результат:** Если токен истёк, он обновляется ДО отправки основного запроса. Это предотвращает появление 401 ошибок в консоли браузера.

### 3. Обновление `getAuthorizationHeaders` (`headers.ts`)
Добавлена проверка истечения токена при получении заголовков:

```typescript
// Если токен истёк - обновляем СРАЗУ
if (accessToken && isTokenExpired(accessToken)) {
  console.log('[getAuthorizationHeaders] Access token expired, refreshing proactively...');
  const refreshResp = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST' });
  if (refreshResp.ok) {
    const refreshData = await refreshResp.json();
    accessToken = refreshData?.access;
  }
}
```

## Преимущества

1. **Нет 401 ошибок в консоли** - токены проверяются и обновляются ДО отправки запроса
2. **Лучший UX** - пользователь не видит ошибки авторизации
3. **Превентивный подход** - проблемы предотвращаются, а не исправляются post-factum
4. **Буфер безопасности** - токены обновляются за 5 минут до истечения

## Архитектура

```
┌─────────────────────────────────────────┐
│  fetchWithAuth / API route              │
│                                         │
│  1. ensureValidTokens()                │
│     ├─ getTokensFromRedis()            │
│     ├─ isTokenExpired(token)           │
│     └─ refreshTokens() if needed       │
│                                         │
│  2. fetch(url) - только если токены OK │
│                                         │
│  3. Handle 401 as fallback             │
└─────────────────────────────────────────┘
```

## Использование

### В компонентах
```typescript
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// Автоматически проверит и обновит токены перед запросом
const response = await fetchWithAuth('/api/autoria/cars/123');
```

### В API routes (server-side)
```typescript
import { getAuthorizationHeaders } from '@/common/constants/headers';

// Автоматически проверит истечение и обновит токен
const headers = await getAuthorizationHeaders(request.nextUrl.origin);
const response = await fetch(backendUrl, { headers });
```

## Тестирование

### Сценарии для проверки
1. ✅ Вход с валидным токеном - нет 401
2. ✅ Вход с истёкшим access token - автоматический refresh
3. ✅ Вход без токенов - редирект на /login
4. ✅ Refresh token истёк - редирект на /login
5. ✅ Множественные параллельные запросы - один refresh на все

## Мониторинг

Логи в консоли для отладки:
- `[proactiveTokenCheck]` - проверка и обновление токенов
- `[fetchWithAuth]` - выполнение запросов
- `[getAuthorizationHeaders]` - получение заголовков

## Дальнейшие улучшения

1. Добавить retry механизм для refresh (с exponential backoff)
2. Кэшировать результаты проверки токенов (TTL 1 минута)
3. Добавить метрики времени выполнения проверок
4. Реализовать фоновое обновление токенов (за 10 минут до истечения)
