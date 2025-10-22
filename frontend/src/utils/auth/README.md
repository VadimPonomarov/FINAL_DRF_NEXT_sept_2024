# Универсальная обработка 401 ошибок

## Проблема
Ранее система перенаправляла пользователей на `/login` при получении 401 ошибок вместо автоматического обновления токенов. Это создавало плохой пользовательский опыт.

## Решение
Создан универсальный обработчик аутентификации, который:

1. **Автоматически обновляет токены** при получении 401
2. **Повторяет запрос** с обновленными токенами
3. **Перенаправляет на логин** только при неудаче обновления токенов
4. **Работает универсально** для всех API endpoints

## Использование

### Для клиентской стороны

```typescript
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// Автоматически обрабатывает 401 с обновлением токенов
const response = await fetchWithAuth('/api/autoria/cars/123');
```

### Для API endpoints

```typescript
import { createAuthEndpoint, handleApiError, createSuccessResponse } from '@/utils/api/universalApiHandler';

export const POST = createAuthEndpoint(async (request: NextRequest) => {
  try {
    // Ваша логика API
    const result = await someOperation();
    
    return createSuccessResponse(result);
  } catch (error) {
    return handleApiError(error, 'Operation name');
  }
});
```

### Для серверной стороны

```typescript
import { handleServerAuth } from '@/utils/auth/universalAuthHandler';

const response = await handleServerAuth(request, url, options);
```

## Компоненты системы

### 1. `universalAuthHandler.ts`
- `handleClientAuth()` - для клиентской стороны
- `handleServerAuth()` - для серверной стороны
- `createAuthErrorResponse()` - создание 401 ответов
- `parseAuthError()` - парсинг ошибок аутентификации

### 2. `universalApiHandler.ts`
- `createAuthEndpoint()` - создание защищенных API endpoints
- `apiRequest()` - универсальный API клиент
- `handleApiError()` - обработка ошибок API
- `createSuccessResponse()` - создание успешных ответов

### 3. `fetchWithAuth.ts`
- Обновлен для использования универсального обработчика
- Автоматически обрабатывает 401 ошибки
- Показывает toast уведомления
- Перенаправляет на логин при неудаче

## Workflow

1. **Запрос** → API endpoint
2. **401 ошибка** → Автоматическое обновление токенов
3. **Успех обновления** → Повтор запроса с новыми токенами
4. **Неудача обновления** → Toast + перенаправление на логин

## Преимущества

✅ **Универсальность** - работает для всех API endpoints  
✅ **Автоматичность** - не требует ручной обработки 401  
✅ **UX** - пользователь не теряет контекст  
✅ **Надежность** - fallback на логин при неудаче  
✅ **Логирование** - подробные логи для отладки  

## Миграция существующих endpoints

### Было:
```typescript
export async function POST(request: NextRequest) {
  try {
    // логика
  } catch (error) {
    if (error.message.includes('No authentication tokens')) {
      return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 });
    }
    // обработка других ошибок
  }
}
```

### Стало:
```typescript
export const POST = createAuthEndpoint(async (request: NextRequest) => {
  try {
    // логика
    return createSuccessResponse(result);
  } catch (error) {
    return handleApiError(error, 'Operation name');
  }
});
```

## Тестирование

Все API endpoints теперь автоматически:
- Обновляют токены при 401
- Повторяют запросы с новыми токенами
- Перенаправляют на логин только при неудаче обновления
- Показывают понятные сообщения пользователю
