# 🔐 Универсальная валидация Bearer токенов

## Проблема

Множество запросов с Bearer токенами выполняются даже когда токены невалидны, что приводит к:
- Куче ошибок 401/403 в консоли
- Бесполезным запросам к бекенду
- Плохому UX (долгая загрузка с ошибками)

## Решение

### 1. Универсальный wrapper `withBearerToken`

```typescript
import { withBearerToken } from '@/utils/auth/bearerTokenWrapper';

// Для обычных запросов
const result = await withBearerToken(async () => {
  return fetch('/api/autoria/ads', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
});

// Для React Query
import { createBearerTokenQuery } from '@/utils/auth/bearerTokenWrapper';

const { data, error } = useQuery({
  queryKey: ['autoria-ads'],
  queryFn: createBearerTokenQuery(async () => {
    const response = await fetch('/api/autoria/ads');
    return response.json();
  }),
  retry: false, // Важно отключить повторы
});
```

### 2. Как это работает

1. **Перед запросом**: Проверяет валидность токена через `/api/auth/me`
2. **Если токен невалид**: Возвращает ошибку БЕЗ выполнения запроса к бекенду
3. **Если токен валиден**: Выполняет запрос
4. **Fallback опция**: Можно вернуть данные по умолчанию вместо ошибки

### 3. Обновление существующих запросов

#### Было:
```typescript
const { data } = useQuery({
  queryKey: ['backend-users'],
  queryFn: async () => {
    const response = await fetch('/api/autoria/users');
    return response.json();
  },
  retry: 1,
});
```

#### Стало:
```typescript
const { data } = useQuery({
  queryKey: ['backend-users'],
  queryFn: createBearerTokenQuery(async () => {
    const response = await fetch('/api/autoria/users');
    return response.json();
  }),
  retry: false, // Отключаем повторы
});
```

### 4. Для API Routes (Server-side)

```typescript
import { validateServerToken } from '@/utils/auth/validateBearerToken';

export async function GET() {
  // Проверяем токен перед выполнением логики
  const isValidToken = await validateServerToken();
  if (!isValidToken) {
    return NextResponse.json(
      { error: 'Invalid or missing backend token' },
      { status: 401 }
    );
  }

  // Токен валиден - выполняем запрос
  const data = await fetchBackendData();
  return NextResponse.json(data);
}
```

### 5. Фолбек для UI компонентов

```typescript
const { data, error } = useQuery({
  queryKey: ['user-stats'],
  queryFn: createBearerTokenQuery(
    async () => fetchUserStats(),
    {
      fallbackError: { stats: [], count: 0 } // Данные по умолчанию
    }
  ),
});

// В UI:
{error ? (
  <div className="text-orange-500">
    🔒 Требуется авторизация для просмотра статистики
  </div>
) : (
  <StatsDisplay data={data} />
)}
```

## Где применять

### ✅ Нужна валидация:
- Все запросы к `/api/(backend)/autoria/*`
- Все запросы к `/api/(backend)/user/*`
- Все запросы к `/api/(backend)/ads/*`
- Любые запросы использующие `Authorization: Bearer` заголовок

### ❌ НЕ нужна валидация:
- Публичные эндпоинты: `/api/autoria/users`
- Статические данные: `/api/reference/*`
- Health check: `/api/health`

## Миграция

1. **Найти все useQuery с Bearer токенами**:
   ```bash
   grep -r "useQuery" frontend/src --include="*.tsx" --include="*.ts"
   ```

2. **Обернуть queryFn в createBearerTokenQuery**

3. **Добавить retry: false**

4. **Обновить обработку ошибок** для показа UI фолбека

## Результат

- ✅ Нет ошибок 401/403 при невалидных токенах
- ✅ Быстрый фолбек UI вместо долгих запросов с ошибками
- ✅ Уменьшенная нагрузка на бекенд
- ✅ Лучший UX для неавторизованных пользователей
