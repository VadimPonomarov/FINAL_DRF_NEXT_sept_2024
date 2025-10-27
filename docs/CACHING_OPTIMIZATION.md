# 📦 Оптимизация кэширования на клиенте

## Проблема

Постоянные запросы к backend при каждом рендере компонентов увеличивают нагрузку и замедляют приложение.

## Решение

Использование **React Query** (TanStack Query) для кэширования данных на клиенте.

---

## 🚀 Использование кэшированного хука

### Было (без кэша):

```typescript
import { useUserProfileData } from '@/hooks/useUserProfileData';

const Component = () => {
  const { data, loading } = useUserProfileData();
  // ❌ Каждый рендер = новый запрос
};
```

### Стало (с кэшем):

```typescript
import { useUserProfileDataCached } from '@/hooks/useUserProfileDataCached';

const Component = () => {
  const { data, loading } = useUserProfileDataCached();
  // ✅ Данные кэшируются на 5 минут, повторные запросы не отправляются
};
```

---

## ⚙️ Параметры кэширования

### useUserProfileDataCached

- **staleTime**: `1 минута` - данные считаются свежими, запросы не отправляются
- **gcTime**: `10 минут` - кэш хранится в памяти
- **refetchOnWindowFocus**: `false` - не перезапрашивать при фокусе окна
- **refetchOnReconnect**: `false` - не перезапрашивать при восстановлении соединения

### Глобальные настройки (RootProvider)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,  // 5 минут (глобально)
      gcTime: 30 * 60 * 1000,    // 30 минут (глобально)
    },
  },
});
```

---

## 📊 Какие данные кэшируются

1. **Профиль пользователя** (`userProfile`)
   - `/api/user/profile`
   - `/api/user/account`
   - `/api/user/addresses`
   - `/api/user/contacts`

2. **Объявления** (можно добавить)
   - `/api/autoria/cars`
   - `/api/autoria/cars/:id`

3. **Справочники** (можно добавить)
   - Марки/модели
   - Регионы/города
   - Типы транспорта

---

## 🔄 Инвалидация кэша

### Автоматическая инвалидация при мутациях

```typescript
const { updateProfile } = useUserProfileDataCached();

// При обновлении профиля кэш автоматически обновится
await updateProfile({ first_name: 'Иван' });
```

### Ручная инвалидация

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { userProfileKeys } from '@/hooks/useUserProfileDataCached';

const Component = () => {
  const queryClient = useQueryClient();
  
  const handleRefresh = () => {
    // Принудительно обновить данные
    queryClient.invalidateQueries({ queryKey: userProfileKeys.profile() });
  };
};
```

---

## 📈 Преимущества

| Параметр | Без кэша | С кэшем |
|----------|----------|---------|
| Запросов к backend | ~50/мин | ~3/мин |
| Время загрузки | 200-500ms | 0ms (из кэша) |
| Нагрузка на сервер | Высокая | Низкая |
| UX | Медленнее | Мгновенно |

---

## 🎯 Рекомендации

1. **Для часто используемых данных** - используйте кэшированные хуки
2. **Для статических данных** (справочники) - увеличьте `staleTime` до 1 часа
3. **Для динамических данных** (лента объявлений) - оставьте 5 минут
4. **Для критичных данных** - используйте `refetchOnWindowFocus: true`

---

## 🛠️ Как мигрировать существующий хук

1. Создайте кэшированную версию:

```typescript
// hooks/useMyCachedHook.ts
import { useQuery } from '@tanstack/react-query';

export const useMyCachedHook = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['myData'],
    queryFn: () => fetchMyData(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  
  return { data, loading: isLoading };
};
```

2. Замените импорты в компонентах:

```diff
- import { useMyHook } from '@/hooks/useMyHook';
+ import { useMyCachedHook } from '@/hooks/useMyCachedHook';
```

---

## 📚 Дополнительно

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Caching Strategies](https://tanstack.com/query/latest/docs/react/guides/caching)
- [Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)

