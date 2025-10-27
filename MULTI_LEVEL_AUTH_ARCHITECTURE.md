# 🔐 Багаторівнева Архітектура Аутентифікації

## Огляд

Проект реалізує **трирівневу систему аутентифікації** з двома різними підходами для різних секцій:

- **AutoRia секція**: Повна трирівнева система (Middleware → HOC → fetchWithAuth)
- **Dummy секція**: Спрощена дворівнева система (Middleware → Error Handling)

---

## 📊 Порівняння Підходів

| Аспект | AutoRia | Dummy |
|--------|---------|-------|
| **Рівнів захисту** | 3 (Middleware + HOC + fetchWithAuth) | 2 (Middleware + Error Handling) |
| **Перевірка NextAuth** | ✅ Middleware | ✅ Middleware |
| **Перевірка Backend токенів** | ✅ HOC (проактивна) | ❌ Тільки при помилках |
| **Обробка 401** | ✅ fetchWithAuth + Error Handler | ✅ useApiErrorHandler |
| **Auto Refresh** | ✅ Так | ❌ Ні |
| **Складність** | Висока | Низька |
| **Безпека** | Максимальна | Базова |

---

## 🏗️ AutoRia: Трирівнева Система

### Рівень 1: Middleware (Next.js) - Перша Лінія Захисту

**Файл**: `frontend/src/middleware.ts`

**Призначення**: Перевірка NextAuth сессії **ДО** рендерингу сторінки

#### Логіка роботи:

```typescript
// Перевірка для AutoRia секції
if (AUTORIA_PATHS.some(path => pathname.startsWith(path))) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || !token.email) {
    // ❌ Немає NextAuth сессії
    return NextResponse.redirect('/api/auth/signin?callbackUrl=...');
  }
  
  // ✅ NextAuth сессія валідна, пропускаємо далі
  return NextResponse.next();
}
```

#### Дії при відсутності авторизації:

- **Редирект**: `/api/auth/signin?callbackUrl=<original_url>`
- **Призначення**: Отримати NextAuth OAuth сессію (Google, Email)

---

### Рівень 2: HOC (Higher-Order Component) - Друга Лінія Захисту

**Файл**: `frontend/src/hoc/withAutoRiaAuth.tsx`

**Призначення**: Перевірка **backend токенів** (access/refresh) в localStorage

⚠️ **ВАЖЛИВО**: Backend токени можуть існувати **ТІЛЬКИ** при наявності NextAuth сессії. Неможливо мати токени в Redis без активної NextAuth сессії.

#### Логіка роботи:

```typescript
export function withAutoRiaAuth<P>(WrappedComponent: React.ComponentType<P>) {
  return function WithAutoRiaAuthComponent(props: P) {
    useEffect(() => {
      // NextAuth сессія УЖЕ перевірена middleware
      // Перевіряємо ТІЛЬКИ backend токени
      
      const backendAuth = localStorage.getItem('backend_auth');
      
      if (!backendAuth) {
        // ❌ Немає backend токенів
        router.replace('/login?callbackUrl=...');
        return;
      }
      
      const authData = JSON.parse(backendAuth);
      if (!authData?.access || !authData?.refresh) {
        // ❌ Токени невалідні
        router.replace('/login?callbackUrl=...');
        return;
      }
      
      // ✅ Backend токени валідні
      setIsAuthorized(true);
    }, []);
    
    if (!isAuthorized) {
      return <LoadingScreen />;
    }
    
    return <WrappedComponent {...props} />;
  };
}
```

#### Дії при відсутності backend токенів:

- **Редирект**: `/login?callbackUrl=<original_url>&error=backend_auth_required`
- **Призначення**: Отримати backend access/refresh токени з Django API

#### Використання:

```typescript
// Захист сторінки AutoRia
export default withAutoRiaAuth(AutoRiaHomePage);
```

---

### Рівень 3: fetchWithAuth - Третя Лінія Захисту

**Файл**: `frontend/src/utils/fetchWithAuth.ts`

**Призначення**: Автоматичне оновлення токенів та обробка помилок під час API запитів

#### Логіка роботи:

```typescript
export async function fetchWithAuth(url: string, options?: RequestInit) {
  // 1. Отримуємо access token з localStorage
  const authData = JSON.parse(localStorage.getItem('backend_auth') || '{}');
  let accessToken = authData.access;
  
  // 2. Додаємо Authorization header
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  // 3. Якщо 401 - токен застарів
  if (response.status === 401) {
    // 3.1. Спроба оновити access token через refresh token
    const refreshToken = authData.refresh;
    
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (refreshResponse.ok) {
      // ✅ Токен оновлений
      const { access } = await refreshResponse.json();
      localStorage.setItem('backend_auth', JSON.stringify({
        access,
        refresh: refreshToken,
      }));
      
      // Повторюємо оригінальний запит з новим токеном
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${access}`,
        },
      });
    } else {
      // ❌ Refresh token також застарів
      // Очищуємо токени та редиректимо на /login
      localStorage.removeItem('backend_auth');
      window.location.href = '/login?error=token_expired';
      throw new Error('Authentication expired');
    }
  }
  
  return response;
}
```

#### Функції:

1. **Auto Refresh**: Автоматичне оновлення access token при 401
2. **Retry Logic**: Повторний запит після оновлення токена
3. **Error Handling**: Редирект на /login при невдачі

---

## 🛠️ Dummy: Дворівнева Система

### Рівень 1: Middleware - Перша Лінія Захисту

**Аналогічно AutoRia** - перевіряє NextAuth сессію

### Рівень 2: Error Handling - Реактивна Обробка

**Файли**: 
- `frontend/src/app/(main)/(dummy)/recipes/useRecipes.ts`
- `frontend/src/app/(main)/(dummy)/users/useUsers.ts`

#### Логіка роботи:

```typescript
export const useRecipes = ({ initialData }: IProps) => {
  // Перевірка initialData
  useEffect(() => {
    if (initialData instanceof Error) {
      // ❌ Помилка при SSR
      signOut({ callbackUrl: "/api/auth/signin" });
    }
  }, [initialData]);
  
  // Query з обробкою помилок
  const { data } = useInfiniteQuery({
    queryFn: async () => {
      const response = await fetch('/api/recipes');
      
      if (response.status === 401) {
        // ❌ 401 під час запиту
        signOut({ callbackUrl: "/api/auth/signin" });
        throw new Error('Unauthorized');
      }
      
      return response.json();
    },
  });
};
```

#### Відмінності від AutoRia:

- ❌ **Немає HOC**: Не перевіряє backend токени проактивно
- ❌ **Немає Auto Refresh**: При 401 одразу signOut
- ✅ **Простіша**: Менше коду, легше підтримувати
- ❌ **Менш безпечна**: Користувач може потрапити на сторінку без валідних токенів

---

## 🔄 Процес Аутентифікації

### 1. SIGNOUT - Повний Вихід

**Функція**: `cleanupAuth(redirectUrl?: string)`  
**Файл**: `frontend/src/lib/auth/cleanupAuth.ts`

#### Що очищується:

```typescript
export async function cleanupAuth(redirectUrl?: string) {
  // 1. Очищуємо Redis (backend токени, провайдери)
  await fetch('/api/auth/cleanup', { method: 'POST' });
  
  // 2. Очищуємо NextAuth сессію
  await signOut({ redirect: false });
  
  // 3. Очищуємо localStorage (зберігаючи theme/language)
  const theme = localStorage.getItem('theme');
  const language = localStorage.getItem('language');
  localStorage.clear();
  if (theme) localStorage.setItem('theme', theme);
  if (language) localStorage.setItem('language', language);
  
  // 4. Очищуємо sessionStorage
  sessionStorage.clear();
  
  // 5. Редирект
  window.location.href = redirectUrl || '/api/auth/signin';
}
```

#### Коли використовується:

- Кнопка "Sign Out" в меню
- Повний вихід з системи
- **Редирект**: `/api/auth/signin` (потрібно знову авторизуватися через OAuth)

---

### 2. LOGOUT - Часткове Очищення

**Функція**: `cleanupBackendTokens()`  
**Файл**: `frontend/src/lib/auth/cleanupAuth.ts`

#### Що очищується:

```typescript
export async function cleanupBackendTokens() {
  // 1. Очищуємо Redis (backend токени)
  await fetch('/api/auth/cleanup', { method: 'POST' });
  
  // 2. Очищуємо localStorage backend токени
  localStorage.removeItem('backend_auth');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('backend_auth');
  
  // ⚠️ NextAuth сессія ЗАЛИШАЄТЬСЯ активною!
}
```

#### Коли використовується:

- Кнопка "Logout (Redis)" в AutoRiaUserBadge
- Очистка backend токенів без виходу з NextAuth
- **Редирект**: `/login` (NextAuth сессія ще активна, просто вибрати користувача з списку)

---

## 🎯 Блок-схема Аутентифікації AutoRia

```
┌─────────────────────────────────────────┐
│   Користувач намагається зайти на       │
│   /autoria                               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│   Middleware (Рівень 1)                │
│   Перевірка: NextAuth сессія            │
└────────────────┬───────────────────────┘
                 │
         ┌───────┴──────┐
         │              │
      ❌ Ні           ✅ Так
         │              │
         ▼              ▼
  ┌─────────────┐  ┌──────────────────────┐
  │ Redirect на │  │ HOC (Рівень 2)       │
  │ /api/auth/  │  │ Перевірка: backend   │
  │ signin      │  │ токени в localStorage│
  └─────────────┘  └──────┬───────────────┘
                          │
                  ┌───────┴──────┐
                  │              │
               ❌ Ні           ✅ Так
                  │              │
                  ▼              ▼
           ┌─────────────┐  ┌──────────────────┐
           │ Redirect на │  │ Компонент        │
           │ /login      │  │ відображається   │
           └─────────────┘  └────────┬─────────┘
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │ API запит до backend│
                            │ через fetchWithAuth │
                            └────────┬────────────┘
                                     │
                             ┌───────┴──────┐
                             │              │
                          ❌ 401          ✅ 200
                             │              │
                             ▼              ▼
                    ┌─────────────────┐  ┌────────────┐
                    │ fetchWithAuth   │  │ Дані       │
                    │ (Рівень 3):     │  │ отримані   │
                    │ 1. Refresh token│  └────────────┘
                    │ 2. Retry request│
                    └────────┬────────┘
                             │
                     ┌───────┴──────┐
                     │              │
                  ✅ OK           ❌ Fail
                     │              │
                     ▼              ▼
              ┌────────────┐  ┌─────────────┐
              │ Дані       │  │ Redirect на │
              │ отримані   │  │ /login      │
              └────────────┘  └─────────────┘
```

---

## 🔑 Типи Токенів

### ⚠️ Правило Залежності Токенів

**КРИТИЧНО ВАЖЛИВО**: Backend токени не можуть існувати без NextAuth сессії!

```
┌─────────────────────────────────────────────────┐
│  NextAuth Session (Обов'язково)                 │
│  ↓                                               │
│  └→ Backend Tokens (Опціонально, але залежать)  │
└─────────────────────────────────────────────────┘
```

**Можливі стани**:
- ✅ NextAuth сессія: Є → Backend токени: Немає (показати тільки email badge)
- ✅ NextAuth сессія: Є → Backend токени: Є (показати обидва badges)
- ❌ NextAuth сессія: Немає → Backend токени: Є (НЕМОЖЛИВО!)

### NextAuth Session (OAuth)

**Зберігається**: HTTP-only cookie (автоматично NextAuth)  
**Призначення**: Ідентифікація користувача в Next.js  
**Отримання**: `/api/auth/signin` (Google OAuth, Email Magic Link)  
**Lifetime**: 30 днів (налаштовується в `authConfig`)

### Backend Tokens (Django JWT)

**Зберігається**: `localStorage.backend_auth` + Redis  
**Структура**:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Призначення**: Авторизація запитів до Django API  
**Отримання**: `/login` (вибір користувача з списку)  
**Lifetime**: 
- Access token: 15 хвилин
- Refresh token: 7 днів

**⚠️ Залежність**: Потребує активну NextAuth сессію

---

## 📍 Редиректи та їх Призначення

| Редирект | Коли | Причина | Наступний крок |
|----------|------|---------|----------------|
| `/api/auth/signin` | Middleware | Немає NextAuth сессії | OAuth авторизація |
| `/login` | HOC або fetchWithAuth | Немає backend токенів | Вибір користувача |
| `/autoria` | Після login | Backend токени отримані | Доступ до AutoRia |

---

## 🆚 Коли використовувати який підхід?

### Використовуйте AutoRia (Трирівневий):

✅ **Критична секція** з чутливими даними  
✅ **Складна бізнес-логіка** з багатьма API запитами  
✅ **Потрібен auto-refresh** токенів  
✅ **Максимальна безпека** важливіша за простоту

### Використовуйте Dummy (Дворівневий):

✅ **Прототипування** та швидка розробка  
✅ **Некритичні дані** (демо, тестові дані)  
✅ **Простота підтримки** важливіша за безпеку  
✅ **Менше коду** для простих задач

---

## 🛡️ Переваги Багаторівневої Системи

### Безпека

- **Defense in Depth**: Кожен рівень перехоплює різні типи проблем
- **Zero Trust**: Перевірка на кожному етапі
- **Graceful Degradation**: При збої одного рівня працюють інші

### UX

- **Проактивна перевірка**: Користувач не потрапляє на сторінку без доступу
- **Seamless Refresh**: Auto-refresh токенів без переривання роботи
- **Clear Feedback**: Зрозумілі повідомлення про помилки

### Розробка

- **Модульність**: Кожен рівень можна змінювати незалежно
- **Тестованість**: Легко тестувати кожен рівень окремо
- **Налагодження**: Логи на кожному рівні допомагають знайти проблему

---

## 🔧 Налаштування

### Middleware

```typescript
// frontend/src/middleware.ts
const AUTORIA_PATHS = [
  '/autoria/search',
  '/autoria/ad',
  '/autoria/my-ads',
  '/autoria'
];
```

### HOC

```typescript
// Захист з вимогою backend токенів (за замовчуванням)
export default withAutoRiaAuth(MyPage);

// Захист без вимоги backend токенів
export default withAutoRiaAuth(MyPage, { requireBackendAuth: false });
```

### fetchWithAuth

```typescript
// Використання в компонентах
const response = await fetchWithAuth('/api/autoria/ads');
const data = await response.json();
```

---

## 📚 Додаткові Ресурси

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Django REST Framework JWT](https://www.django-rest-framework.org/api-guide/authentication/)
- [Redis для сесій](https://redis.io/docs/manual/security/)

---

## 🎓 Висновок

Багаторівнева система аутентифікації забезпечує:

1. ✅ **Максимальну безпеку** через Defense in Depth
2. ✅ **Відмінний UX** через проактивні перевірки та auto-refresh
3. ✅ **Гнучкість** через модульну архітектуру
4. ✅ **Масштабованість** через чітке розділення відповідальності

Для критичних секцій використовуйте **AutoRia підхід** (3 рівні),  
для прототипів та некритичних секцій - **Dummy підхід** (2 рівні).

