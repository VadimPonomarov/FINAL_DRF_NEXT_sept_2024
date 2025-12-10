# Logging Guide

## Overview

Проект использует централизованную систему логирования для контроля вывода в консоль браузера в зависимости от окружения.

## Как это работает

### Development Mode
- **Все логи видны**: debug, info, warn, error
- Полная информация для отладки
- Помогает разработчикам находить проблемы

### Production Mode
- **Только ошибки**: error
- Технические детали скрыты от пользователей
- Дружелюбные сообщения об ошибках
- `console.log` автоматически удаляются при сборке

## Использование

### Импорт логгера

```typescript
import { logger } from '@/shared/utils/logger';
```

### Методы логирования

```typescript
// Debug информация (видна только в development)
logger.debug('Debug message', data);

// Информационные сообщения (видны только в development)
logger.info('Info message', data);

// Предупреждения (видны в обоих режимах)
logger.warn('Warning message', data);

// Ошибки (видны в обоих режимах)
logger.error('Error message', error);
```

## Примеры

### API запросы

```typescript
import { logger } from '@/shared/utils/logger';

async function fetchData() {
  try {
    logger.debug('Fetching data from API...');
    const response = await fetch('/api/data');
    
    if (!response.ok) {
      logger.error('API error:', response.status);
      throw new Error('Failed to fetch');
    }
    
    logger.debug('Data fetched successfully');
    return await response.json();
  } catch (error) {
    logger.error('Fetch failed:', error);
    throw error;
  }
}
```

### React компоненты

```typescript
import { useEffect } from 'react';
import { logger } from '@/shared/utils/logger';

export function MyComponent() {
  useEffect(() => {
    logger.debug('Component mounted');
    
    return () => {
      logger.debug('Component unmounted');
    };
  }, []);
  
  return <div>Component</div>;
}
```

## Автоматическое удаление console.log в production

В `next.config.js` настроена автоматическая очистка:

```javascript
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
}
```

Это означает, что все `console.log()` будут удалены при сборке для production, но `console.error()` и `console.warn()` останутся.

## Error Boundary

Компонент `ErrorBoundary` автоматически ловит React ошибки и логирует их:

```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Глобальные обработчики ошибок

В `ClientLayout.tsx` настроены обработчики для:
- Необработанных ошибок JavaScript
- Необработанных promise rejections

Все ошибки логируются через `logger.error()`.

## Миграция старого кода

Если вы видите старый код с `console.log`:

### Было:
```typescript
console.log('Debug info');
console.error('Error occurred');
```

### Стало:
```typescript
import { logger } from '@/shared/utils/logger';

logger.debug('Debug info');
logger.error('Error occurred');
```

## Проверка в разных режимах

### Development
```bash
npm run dev
# Все логи видны в консоли браузера
```

### Production build
```bash
npm run build
npm run start
# Только ошибки видны в консоли браузера
```

## Лучшие практики

1. **Используйте правильный уровень логирования**
   - `debug` для информации, полезной только разработчикам
   - `info` для информационных сообщений
   - `warn` для предупреждений
   - `error` для ошибок

2. **Не логируйте чувствительные данные**
   - Пароли
   - Токены
   - Личная информация пользователей

3. **Логируйте достаточно информации для отладки**
   - Функция, где произошла ошибка
   - Параметры запроса
   - Статус ответа

4. **Используйте структурированное логирование**
   ```typescript
   logger.error('API request failed', {
     url: '/api/data',
     status: 500,
     message: error.message
   });
   ```

## Troubleshooting

### Логи не видны в production
- Это нормально! В production видны только ошибки
- Используйте внешний сервис мониторинга (Sentry, LogRocket) для отслеживания ошибок

### Нужно добавить сервис мониторинга
- Можно интегрировать Sentry для отправки ошибок на сервер
- Обновите `logger.ts` для отправки ошибок в Sentry

### Нужно логировать в файл
- Используйте backend логирование
- Отправляйте ошибки на сервер через API
