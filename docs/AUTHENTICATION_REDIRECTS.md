# Багаторівнева система авторизації та редиректів

## Огляд

AutoRia використовує двоступеневу модель авторизації, яка гарантує безпеку доступу до закритих розділів та коректні редиректи у всіх сценаріях.

### Рівні перевірки

1. **Рівень 1 — Middleware**  
   Перевіряє наявність валідної сесії NextAuth (HTTP-only cookies).  
   Файл: `frontend/src/middleware.ts`

2. **Рівень 2 — BackendTokenPresenceGate**  
   Перевіряє наявність backend токенів у Redis та оновлює їх при потребі.  
   Файл: `frontend/src/components/AutoRia/Auth/BackendTokenPresenceGate.tsx`

3. **Утиліта redirectToAuth**  
   Керує редиректами з урахуванням поточного стану і запобігає циклам.  
   Файл: `frontend/src/shared/utils/auth/redirectToAuth.ts`

## Деталі рiвня 1 (Middleware)

- Захищає маршрути `/autoria`, `/profile`, `/settings` тощо.  
- Використовує `getToken` з `next-auth/jwt` і `NEXTAUTH_SECRET`.  
- При відсутності сесії — редирект на `/api/auth/signin` з callbackUrl.

```typescript
if (!token || !token.email) {
  const signinUrl = new URL('/api/auth/signin', req.url);
  signinUrl.searchParams.set('callbackUrl', req.url);
  return NextResponse.redirect(signinUrl);
}
```

## Деталі рівня 2 (BackendTokenPresenceGate)

- Компонент у Layout AutoRia.  
- Перевіряє наявність/валидність токенів через `validateAndRefreshToken`.  
- При відсутності токенів → редирект на `/login` через `redirectToAuth`.

```typescript
const result = await validateAndRefreshToken();
if (!result.isValid) {
  await redirectToAuth(pathname + search, 'tokens_not_found');
}
```

## Утиліта redirectToAuth

- Визначає, куди редиректити користувача, залежно від наявності сесії NextAuth.  
- Уникає циклів редиректів (throttling + перевірка поточного URL).  
- Розраховує повідомлення та передає їх у параметрах.

```typescript
const hasSession = await checkNextAuthSession();
if (hasSession) {
  window.location.replace(`/login?callbackUrl=${path}&error=${reason}`);
} else {
  window.location.replace(`/api/auth/signin?callbackUrl=${path}`);
}
```

## Потік редиректів

```mermaid
graph TD
    A[User → /autoria] --> B{Middleware: NextAuth сесія?}
    B -->|Ні| C[/api/auth/signin?callbackUrl=/autoria]
    B -->|Так| D{Layout: backend токени?}
    D -->|Ні| E[/login?callbackUrl=/autoria]
    E --> F[Backend login → Redis tokens]
    F --> A
    D -->|Так| G[Доступ дозволено]
```

## Важливі файли

| Файл | Призначення |
|------|-------------|
| `frontend/src/middleware.ts` | Рівень 1. Перевірка сесії NextAuth |
| `frontend/src/components/AutoRia/Auth/BackendTokenPresenceGate.tsx` | Рівень 2. Перевірка backend токенів |
| `frontend/src/shared/utils/auth/redirectToAuth.ts` | Утиліта редиректів |
| `frontend/src/shared/utils/auth/validateAndRefreshToken.ts` | Актуалізація токенів |

## Ключові правила

- Middleware **не перевіряє** backend токени.  
- BackendTokenPresenceGate **не перевіряє** NextAuth сесію — покладається на middleware.  
- Усі редиректи повинні проходити через `redirectToAuth`, щоб запобігти нескінченним циклам.  
- `/login` не захищається middleware, щоб уникнути циклів.

## Типові сценарії

1. **Сесії немає** → Middleware → `/api/auth/signin` → користувач логіниться через NextAuth.  
2. **Сесія є, токенів немає** → Gate → `/login` → користувач отримує backend токени.  
3. **Токени прострочені** → Gate → автоматичний refresh → при невдачі `/login`.  
4. **Усі умови виконані** → доступ до контенту AutoRia.

---

**Остання актуалізація**: Листопад 2024
