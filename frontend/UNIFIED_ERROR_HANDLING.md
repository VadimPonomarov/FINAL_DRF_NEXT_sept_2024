# 🔧 Централизованная обработка ошибок

## Архитектура

### 1. **UnifiedAuthErrorHandler** (`utils/auth/unifiedAuthErrorHandler.ts`)
Специализированный обработчик для ошибок авторизации 401/4001.

**Алгоритм работы:**
```
1. Получили 401/4001
   ↓
2. Проверяем refresh токен в Redis
   ↓
3. Если есть → делаем refresh (новые токены сохраняются в Redis)
   ↓
4. Retry оригинального запроса
   ↓
5. Если снова 401 или refresh вернул 403 → редирект на логин с toast
```

**Использование:**
```typescript
import { unifiedAuthErrorHandler } from '@/utils/auth/unifiedAuthErrorHandler';

// Для HTTP
await unifiedAuthErrorHandler.handleAuthError({
  retryRequest: () => fetch(...),
  source: 'MyComponent',
  currentPath: window.location.pathname,
  showToast: true
});

// Для WebSocket
const canReconnect = await unifiedAuthErrorHandler.handleWebSocketAuthError({
  source: 'WebSocket',
  showToast: true
});
```

---

### 2. **UnifiedErrorHandler** (`utils/errors/unifiedErrorHandler.ts`)
Универсальный обработчик для **ВСЕХ** типов ошибок.

**Поддерживаемые типы ошибок:**

| Тип | HTTP коды | WebSocket коды | Описание |
|-----|-----------|----------------|----------|
| `UNAUTHORIZED` | 401 | 4001, 1008 | Требуется авторизация |
| `FORBIDDEN` | 403 | 4003 | Доступ запрещен |
| `NOT_FOUND` | 404 | - | Ресурс не найден |
| `BAD_REQUEST` | 400 | - | Некорректный запрос |
| `VALIDATION_ERROR` | 422 | - | Ошибка валидации |
| `SERVER_ERROR` | 500-599 | - | Ошибка сервера |
| `NETWORK_ERROR` | - | 1006 | Проблемы с сетью |
| `TIMEOUT` | 408 | - | Превышено время ожидания |

**Функции обработки:**

#### HTTP ошибки
```typescript
import { unifiedErrorHandler } from '@/utils/errors/unifiedErrorHandler';

const result = await unifiedErrorHandler.handleHttpError(response, {
  retryCallback: makeRequest,
  source: 'MyComponent',
  showToast: true,
  maxRetries: 2
});

if (result.retryResult) {
  // Retry успешен
  return result.retryResult;
}
```

#### WebSocket ошибки
```typescript
import { handleWebSocketClose } from '@/utils/errors/unifiedErrorHandler';

socket.onclose = async (event) => {
  const canReconnect = await handleWebSocketClose(event, {
    source: 'ChatBot',
    showToast: true
  });
  
  if (canReconnect) {
    // Переподключаемся
  }
};
```

#### Сетевые ошибки
```typescript
import { handleNetworkError } from '@/utils/errors/unifiedErrorHandler';

try {
  await fetch(...);
} catch (error) {
  await handleNetworkError(error, {
    source: 'MyComponent',
    showToast: true
  });
}
```

---

## Интеграция в проект

### 1. **fetchWithAuth** (`utils/fetchWithAuth.ts`)
Автоматически обрабатывает ВСЕ ошибки:
- 401 → refresh токенов + retry
- 403 → toast "Доступ запрещен"
- 404 → toast "Не найдено"
- 500/502/503 → toast "Ошибка сервера" + retry (до 2 раз)
- Network errors → toast "Проблемы с сетью"

```typescript
import { fetchWithAuth } from '@/utils/fetchWithAuth';

const response = await fetchWithAuth('/api/autoria/favorites/toggle', {
  method: 'POST',
  body: JSON.stringify({ car_ad_id })
});
// Все ошибки автоматически обрабатываются!
```

### 2. **ApiClient** (`services/api/apiClient.ts`)
Использует универсальный обработчик для всех запросов:

```typescript
import { apiClient } from '@/services/api/apiClient';

try {
  const data = await apiClient.get('/api/ads/cars');
  // Все ошибки автоматически обрабатываются
} catch (error) {
  // Ошибка уже показана пользователю через toast
  console.error(error);
}
```

### 3. **useChatWebSocket** (`components/ChatBot/hooks/useChatWebSocket.ts`)
Обрабатывает ВСЕ коды закрытия WebSocket:

```typescript
socket.onclose = async (event) => {
  const canReconnect = await handleWebSocketClose(event, {
    source: 'ChatBot WebSocket',
    showToast: true
  });
  
  if (canReconnect) {
    // Автоматически переподключаемся
    setTimeout(() => connect(), 1000);
  }
};
```

---

## Преимущества

### ✅ Единая точка обработки
Все ошибки обрабатываются единообразно через `unifiedErrorHandler`.

### ✅ Автоматический retry
- 401 → refresh токенов + retry
- 500/502/503 → retry до 2 раз
- 408 (timeout) → показать toast

### ✅ Умные toast уведомления
Каждый тип ошибки имеет свой:
- Иконку (🔒, ⛔, 🔍, ❌, ⚠️, 🔥, 📡, ⏱️)
- Заголовок
- Описание
- Variant (default/destructive)

### ✅ Безопасность
- 401 → проверка refresh токена в Redis
- 403 (refresh failed) → редирект на логин
- Защита от бесконечной рекурсии через `skipRetry`

### ✅ Логирование
Все ошибки логируются с указанием источника (`source`).

---

## Примеры использования

### Пример 1: Обработка 401 в fetch
```typescript
const response = await fetchWithAuth('/api/protected-resource');
// 1. Если 401 → автоматически refresh токенов
// 2. Retry запроса с новым токеном
// 3. Если снова 401 → редирект на логин с toast
```

### Пример 2: Обработка 500 в ApiClient
```typescript
const data = await apiClient.post('/api/ads/create', adData);
// 1. Если 500 → toast "Ошибка сервера"
// 2. Автоматический retry (до 2 раз)
// 3. Если все retry неуспешны → выброс ошибки
```

### Пример 3: Обработка 4001 в WebSocket
```typescript
socket.onclose = async (event) => {
  if (event.code === 4001) {
    // 1. Проверка refresh токена в Redis
    // 2. Refresh токенов
    // 3. Переподключение с новым токеном
  }
};
```

### Пример 4: Обработка network error
```typescript
try {
  await fetch(...);
} catch (error) {
  // Автоматически показывается toast "Проблемы с сетью"
  await handleNetworkError(error);
}
```

---

## Таблица маршрутизации ошибок

| Код ошибки | Обработчик | Действие | Toast | Retry | Redirect |
|------------|------------|----------|-------|-------|----------|
| 401 | `unifiedAuthErrorHandler` | Refresh + retry | ✅ | ✅ | Если failed |
| 403 | `unifiedErrorHandler` | Toast | ✅ | ❌ | ❌ |
| 404 | `unifiedErrorHandler` | Toast | ✅ | ❌ | ❌ |
| 400 | `unifiedErrorHandler` | Toast | ✅ | ❌ | ❌ |
| 422 | `unifiedErrorHandler` | Toast | ✅ | ❌ | ❌ |
| 408 | `unifiedErrorHandler` | Toast | ✅ | ✅ | ❌ |
| 500-599 | `unifiedErrorHandler` | Toast + retry | ✅ | ✅ (2x) | ❌ |
| Network | `unifiedErrorHandler` | Toast | ✅ | ❌ | ❌ |
| 4001 (WS) | `unifiedAuthErrorHandler` | Refresh + reconnect | ✅ | ✅ | Если failed |
| 1006 (WS) | `unifiedErrorHandler` | Toast | ✅ | ✅ | ❌ |

---

## Конфигурация

### Максимальное количество retry
```typescript
// В fetchWithAuth
maxRetries: resp.status >= 500 ? 2 : 1

// В ApiClient
maxRetries: response.status >= 500 ? 2 : 1
```

### Задержка перед retry
```typescript
// В unifiedErrorHandler.handleHttpError
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда
```

### Timeout для запросов
```typescript
// В ApiClient
this.timeout = options.timeout || 15000; // 15 секунд
```

---

## Тестирование

### Тест 1: 401 обработка
1. Открыть страницу модерации
2. Истечь access токен (удалить из Redis)
3. Сделать запрос → должен автоматически refresh → retry → успех

### Тест 2: 500 обработка
1. Выключить backend
2. Сделать запрос → должен показать toast "Ошибка сервера"
3. Retry 2 раза → если неуспешно, выброс ошибки

### Тест 3: 4001 WebSocket
1. Открыть чат-бот
2. Истечь access токен
3. WebSocket закрывается с кодом 4001
4. Автоматически refresh → переподключение

### Тест 4: Network error
1. Отключить интернет
2. Сделать запрос → должен показать toast "Проблемы с сетью"

---

## Миграция существующего кода

### До:
```typescript
const response = await fetch(...);
if (response.status === 401) {
  // Ручная обработка 401
  await refreshTokens();
  const retry = await fetch(...);
}
```

### После:
```typescript
const response = await fetchWithAuth(...);
// Всё автоматически!
```

---

## Заключение

Централизованная обработка ошибок обеспечивает:
- **Консистентность**: все ошибки обрабатываются одинаково
- **Удобство**: не нужно писать обработчики в каждом компоненте
- **Безопасность**: автоматический refresh токенов при 401
- **UX**: понятные toast уведомления для пользователя
- **Надежность**: автоматический retry для временных ошибок

Все компоненты проекта теперь используют единый механизм обработки ошибок! 🎉

