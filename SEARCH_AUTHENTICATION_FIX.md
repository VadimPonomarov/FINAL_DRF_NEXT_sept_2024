# Исправление аутентификации для Search страницы

## ✅ Проблема решена

**Проблема**: `/autoria/search` требовала полную авторизацию с backend токенами, что вызывало редиректы.

**Решение**: Search страница теперь требует только NextAuth сессию, без проверки backend токенов.

## 🔧 Изменения

### 1. Middleware (`middleware.ts`)
```typescript
// Для search страницы - только проверка NextAuth сессии
if (pathname.startsWith('/autoria/search')) {
  console.log(`[Middleware] Search page - checking NextAuth session only`);
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || AUTH_CONFIG.NEXTAUTH_SECRET 
  });
  
  if (!token) {
    console.log('[Middleware] No NextAuth session for search - redirecting to signin');
    const loginUrl = new URL('/api/auth/signin', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }
  
  console.log('[Middleware] ✅ Search page access allowed (NextAuth session only)');
  return NextResponse.next();
}
```

### 2. BackendTokenPresenceGate (`BackendTokenPresenceGate.tsx`)
```typescript
// ИСКЛЮЧЕНИЕ: Search страница не требует backend токенов
const isSearchPage = pathname?.startsWith('/autoria/search');

if (isSearchPage) {
  // Для search страницы сразу показываем контент - middleware уже проверил NextAuth сессию
  console.log('[BackendTokenPresenceGate] Search page - skipping backend token check');
  return <>{children}</>;
}
```

### 3. Отдельный Layout для Search (`/autoria/search/layout.tsx`)
```typescript
import AutoRiaLayout from "@/modules/autoria/layout";

/**
 * Layout для search страницы - БЕЗ backend token проверки
 * Только NextAuth сессия проверяется в middleware
 */
export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AutoRiaLayout>
      {children}
    </AutoRiaLayout>
  );
}
```

## 🎯 Результат

### Search страница (`/autoria/search`)
- ✅ **Требуется**: Только NextAuth сессия
- ✅ **Не требуется**: Backend токены
- ✅ **Поток**: Вход → NextAuth сессия → Доступ к search

### Остальные AutoRia страницы (`/autoria/*`)
- ✅ **Требуется**: NextAuth сессия + Backend токены
- ✅ **Поток**: Вход → NextAuth → Backend login → Полный доступ

## 🔄 Flow диаграмма

```
Search Page Flow:
User → /autoria/search
    ↓
Middleware (NextAuth Check Only)
    ↓ (no session)
/api/auth/signin → Google Login
    ↓ (session created)
/autoria/search → ✅ Content Access

Other AutoRia Pages Flow:
User → /autoria/profile
    ↓
Middleware (NextAuth Check)
    ↓ (no session)
/api/auth/signin → Google Login
    ↓ (session created)
BackendTokenPresenceGate (Backend Tokens Check)
    ↓ (no tokens)
/login → Backend Login
    ↓ (tokens saved)
/autoria/profile → ✅ Content Access
```

## 🎛️ Уровни доступа

| Страница | NextAuth Сессия | Backend Токены | Результат |
|----------|----------------|----------------|-----------|
| `/autoria/search` | ✅ Требуется | ❌ Не требуются | Доступ с сессией |
| `/autoria/profile` | ✅ Требуется | ✅ Требуются | Полная авторизация |
| `/autoria/my-ads` | ✅ Требуется | ✅ Требуются | Полная авторизация |
| `/autoria/create-ad` | ✅ Требуется | ✅ Требуются | Полная авторизация |

## 🚀 Преимущества

1. **Быстрый доступ** к search странице после Google/OAuth входа
2. **Прогрессивная авторизация** - базовый доступ сразу, полный доступ по необходимости
3. **Улучшенный UX** - меньше редиректов для базовых функций
4. **Гибкость** - разные уровни доступа для разных функций

---

**Статус**: ✅ Search страница теперь работает с только NextAuth сессией
