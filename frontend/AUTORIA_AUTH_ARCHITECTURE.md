# Трехуровневая система валидации AutoRia

## Архитектура защиты страниц AutoRia

```
┌─────────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ                              │
│                  заходит на /autoria/*                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 1: MIDDLEWARE (серверная сторона)                  │
│  ─────────────────────────────────────────────────────      │
│  Файл: frontend/src/middleware.ts                           │
│                                                              │
│  Проверяет: NextAuth сессию (getToken)                      │
│                                                              │
│  ✅ Сессия есть    → пропускает дальше                      │
│  ❌ Сессии нет     → redirect /api/auth/signin              │
│                                                              │
│  Цель: Гарантировать, что пользователь аутентифицирован    │
│        в нашей системе (Google/Credentials)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 2: HOC withAutoRiaAuth (клиентская сторона)       │
│  ─────────────────────────────────────────────────────────  │
│  Файл: frontend/src/hoc/withAutoRiaAuth.tsx                │
│                                                              │
│  Проверяет: Backend токены в localStorage                   │
│                                                              │
│  ✅ Токены валидны → рендерит компонент                     │
│  ❌ Токенов нет    → redirect /login                        │
│                                                              │
│  Цель: Гарантировать наличие токенов для внешнего API      │
│        (backend Django) для доступа к данным AutoRia        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            КОМПОНЕНТ РЕНДЕРИТСЯ                             │
│         Делает API запросы через smartFetch                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 3: ОБРАБОТЧИКИ ОШИБОК (runtime)                   │
│  ─────────────────────────────────────────────────────────  │
│  Файл: frontend/src/utils/fetchWithAuth.ts                 │
│                                                              │
│  Перехватывает: HTTP ошибки 401/403 от backend API         │
│                                                              │
│  401 Unauthorized:                                          │
│    1. Попытка refresh токена через /api/auth/refresh        │
│    2. Если успех → повторяет запрос                         │
│    3. Если провал → redirect /login                         │
│                                                              │
│  403 Forbidden:                                             │
│    → Сразу redirect /login                                  │
│                                                              │
│  Цель: Обрабатывать протухшие/невалидные токены во время   │
│        работы приложения (токен истек во время сессии)      │
└─────────────────────────────────────────────────────────────┘
```

## Сценарии работы

### Сценарий 1: Пользователь НЕ залогинен в NextAuth

```
GET /autoria/search
  ↓
Middleware: проверяет NextAuth сессию
  ↓ НЕТ СЕССИИ
Redirect → /api/auth/signin?callbackUrl=/autoria/search
  ↓
Пользователь логинится через Google/Credentials
  ↓
Redirect → /autoria/search (снова проходит через middleware)
  ↓
Middleware: ✅ сессия есть, пропускает
  ↓
HOC: проверяет backend токены
  ↓ НЕТ ТОКЕНОВ
Redirect → /login?callbackUrl=/autoria/search
```

### Сценарий 2: Пользователь залогинен в NextAuth, но НЕТ backend токенов

```
GET /autoria/search
  ↓
Middleware: проверяет NextAuth сессию
  ↓ ✅ СЕССИЯ ЕСТЬ
Пропускает дальше
  ↓
HOC: проверяет backend токены в localStorage
  ↓ НЕТ ТОКЕНОВ
Redirect → /login?callbackUrl=/autoria/search
  ↓
Пользователь вводит логин/пароль backend
  ↓
LoginForm: сохраняет токены в localStorage
  ↓
Redirect → /autoria/search (callbackUrl)
  ↓
Middleware: ✅ сессия есть
  ↓
HOC: ✅ токены есть
  ↓
Компонент рендерится
```

### Сценарий 3: Все есть, но токен протух во время работы

```
Пользователь работает в /autoria/search
  ↓
Делает запрос: smartFetch('/api/autoria/favorites/toggle')
  ↓
Backend возвращает: 401 Unauthorized (токен истек)
  ↓
fetchWithAuth: перехватывает 401
  ↓
Пытается refresh: POST /api/auth/refresh
  ↓
ВАРИАНТ A: Refresh успешен
  ├─ Обновляет токен в localStorage
  ├─ Повторяет оригинальный запрос
  └─ Возвращает результат (пользователь не заметил)
  
ВАРИАНТ B: Refresh провалился (refresh токен тоже истек)
  ├─ localStorage.removeItem('backend_auth')
  └─ Redirect → /login?callbackUrl=/autoria/search
```

## Разделение ответственности

| Уровень | Что проверяет | Где выполняется | Когда срабатывает |
|---------|---------------|-----------------|-------------------|
| **1. Middleware** | NextAuth сессия | Сервер (Edge Runtime) | На каждом запросе к `/autoria/*` |
| **2. HOC** | Backend токены | Клиент (Browser) | При рендере компонента |
| **3. Обработчики** | HTTP 401/403 | Клиент (Browser) | При каждом API запросе |

## Ключевые файлы

### 1. Middleware - Уровень 1
```typescript
// frontend/src/middleware.ts
export default async function middleware(req: NextRequest) {
  if (AUTORIA_PATHS.some(path => pathname.startsWith(path))) {
    return await checkBackendAuth(req); // Проверяет NextAuth сессию
  }
}
```

### 2. HOC - Уровень 2
```typescript
// frontend/src/hoc/withAutoRiaAuth.tsx
export function withAutoRiaAuth<P>(WrappedComponent: ComponentType<P>) {
  return function WithAutoRiaAuthComponent(props: P) {
    // Проверяет backend токены в localStorage
    const backendAuth = localStorage.getItem('backend_auth');
    if (!backendAuth) {
      router.replace('/login?...');
    }
  };
}
```

### 3. Обработчики ошибок - Уровень 3
```typescript
// frontend/src/utils/fetchWithAuth.ts
export async function fetchWithAuth(input, init) {
  const resp = await fetch(input, init);
  
  // Перехватываем 401/403
  if (resp.status === 401) {
    // Пробуем refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetch(input, init); // Повторяем запрос
    }
    router.push('/login?...');
  }
}
```

## Применение HOC

```typescript
// frontend/src/app/(main)/(backend)/autoria/layout.tsx
export default withAutoRiaAuth(AutoRiaLayoutContent, { 
  requireBackendAuth: true 
});
```

Все страницы внутри `/autoria/*` автоматически защищены HOC.

## Преимущества трехуровневой системы

1. **Безопасность**: Три независимых уровня проверки
2. **Производительность**: Middleware отсекает неавторизованных ДО рендера
3. **UX**: Токены обновляются прозрачно (уровень 3)
4. **Централизация**: HOC = единая точка управления авторизацией
5. **Разделение**: Сессия ≠ Токены внешнего API

## Потоки редиректов

```
Нет NextAuth сессии
  └─> /api/auth/signin → Google/Credentials → /login → /autoria

Есть сессия, нет backend токенов
  └─> /login → ввод логина/пароля → /autoria

Есть все, токен протух
  └─> Auto-refresh → продолжение работы
  └─> Refresh провалился → /login → /autoria
```

## Итог

**Трехуровневая защита обеспечивает:**
- ✅ Middleware проверяет право доступа (сессия)
- ✅ HOC проверяет готовность к работе (токены)
- ✅ Обработчики поддерживают работоспособность (refresh)

**Каждый уровень решает свою задачу и не дублирует другие.**

