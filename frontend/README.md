# 🎨 AutoRia Frontend - Next.js Application

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8.svg)](https://tailwindcss.com/)

Сучасний веб-додаток для платформи продажу автомобілів на Next.js 14 з App Router, NextAuth та повною інтеграцією з Django REST API.

## 📋 Зміст

- [Особливості](#-особливості)
- [Вимоги](#-вимоги)
- [Встановлення](#-встановлення)
- [Налаштування](#-налаштування)
- [Запуск](#-запуск)
- [Структура](#-структура)
- [Компоненти](#-компоненти)
- [State Management](#-state-management)
- [API Integration](#-api-integration)
- [Styling](#-styling)

## ✨ Особливості

### 🔐 Автентифікація
- **NextAuth.js**: JWT tokens + Redis storage
- **Dual Provider**: Backend API + DummyJSON (для тестування)
- **Protected Routes**: Middleware для захищених сторінок
- **User Badges**: Відображення статусу користувача (session + redis)

### 🌍 Інтернаціоналізація (i18n)
- **3 мови**: Українська (за замовчуванням), Російська, Англійська
- **Dynamic Switching**: Зміна мови без перезавантаження
- **Context API**: `I18nContext` для всієї програми
- **Локалізовані дати**: Форматування дат/чисел/валют

### 🎨 UI/UX
- **Tailwind CSS**: Утиліти-first CSS
- **shadcn/ui**: Високоякісні компоненти
- **Dark Mode**: Підтримка світлої/темної теми
- **Responsive Design**: Адаптивний дизайн для всіх пристроїв
- **Accessible**: WCAG 2.1 AA compliant

### 🗺️ Google Maps
- **Interactive Maps**: Відображення локації оголошень
- **Geocoding**: Автоматичне визначення координат
- **Custom Markers**: Кастомні маркери для оголошень

### 💬 Real-time Chat
- **WebSocket**: Чат з підтримкою через WebSocket
- **AI Bot**: Інтеграція з AI для відповідей
- **Persistent**: Збереження історії чату

### 📱 Progressive Features
- **SWR/React Query**: Data fetching з кешем
- **Optimistic Updates**: Швидкі оновлення UI
- **Error Boundaries**: Graceful error handling
- **Loading States**: Skeleton loaders

## 📦 Вимоги

- **Node.js**: 18.0+ (LTS рекомендовано)
- **npm** або **yarn** або **pnpm**
- **Backend API**: Запущений на `http://localhost:8000`
- **Redis**: Для token storage

## 🚀 Встановлення

```bash
# Встановити залежності
npm install
# або
yarn install
# або
pnpm install
```

## ⚙️ Налаштування

### Environment Variables

Створіть `.env.local` файл в корені `frontend/`:

```bash
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_API_URL=http://localhost:8000  # Для server-side

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_secret_key_here_min_32_chars

# Google Maps (опціонально)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Redis (для token storage)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# DummyJSON (для тестування, опціонально)
NEXT_PUBLIC_DUMMY_API_BASE_URL=https://dummyjson.com
```

### Генерація NEXTAUTH_SECRET

```bash
# Через OpenSSL
openssl rand -base64 32

# Або через Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🎯 Запуск

### Development

```bash
# Запустити dev server
npm run dev

# Доступно на http://localhost:3000
```

### Production Build

```bash
# Build для production
npm run build

# Запустити production server
npm run start

# Доступно на http://localhost:3000
```

### Lint та Format

```bash
# ESLint перевірка
npm run lint

# Prettier форматування
npm run format

# TypeScript перевірка
npm run type-check
```

## 📁 Структура

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth group routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/                 # Main app routes
│   │   │   ├── autoria/            # AutoRia pages
│   │   │   │   ├── ads/
│   │   │   │   ├── moderation/
│   │   │   │   └── profile/
│   │   │   └── page.tsx
│   │   ├── api/                    # API routes (proxy to backend)
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── redis/
│   │   │   └── (backend)/          # Backend proxy routes
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page
│   ├── components/                 # React компоненти
│   │   ├── AutoRia/                # AutoRia specific
│   │   │   ├── Components/
│   │   │   │   ├── CarAdCard.tsx   # Картка оголошення
│   │   │   │   ├── CarAdForm.tsx   # Форма створення
│   │   │   │   └── ...
│   │   │   ├── Layout/
│   │   │   │   ├── AutoRiaHeader.tsx
│   │   │   │   └── AutoRiaFooter.tsx
│   │   │   └── Pages/
│   │   │       ├── HomePage.tsx
│   │   │       ├── AdDetailsPage.tsx
│   │   │       └── ModerationPage.tsx
│   │   ├── ChatBot/                # WebSocket chat
│   │   ├── Forms/                  # Форми
│   │   ├── Menus/                  # Навігація
│   │   └── All/                    # Спільні компоненти
│   │       ├── AuthBadge.tsx       # Session auth badge
│   │       ├── RedisUserBadge.tsx  # Redis user badge
│   │       └── ...
│   ├── contexts/                   # React Context API
│   │   ├── AuthContext.tsx         # Session auth
│   │   ├── RedisAuthContext.tsx    # Redis auth
│   │   ├── AuthProviderContext.tsx # Provider switcher
│   │   ├── I18nContext.tsx         # Інтернаціоналізація
│   │   └── ThemeContext.tsx        # Тема (dark/light)
│   ├── services/                   # API клієнти
│   │   └── api/
│   │       ├── apiClient.ts        # HTTP client
│   │       └── tokenManager.ts     # Token management
│   ├── utils/                      # Утиліти
│   │   ├── fetchWithAuth.ts        # Auth fetch wrapper
│   │   ├── auth/                   # Auth utils
│   │   └── errors/                 # Error handlers
│   ├── locales/                    # i18n переклади
│   │   ├── uk.ts                   # Українська
│   │   ├── ru.ts                   # Російська
│   │   └── en.ts                   # Англійська
│   ├── lib/                        # Бібліотеки та config
│   │   ├── redis.ts                # Redis client
│   │   └── utils.ts                # Tailwind utils (cn)
│   └── styles/
│       └── globals.css             # Global styles
├── public/                         # Статичні файли
│   ├── images/
│   └── icons/
├── .env.local                      # Environment variables (gitignored)
├── next.config.js                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

## 🧩 Ключові Компоненти

### `components/AutoRia/Components/CarAdCard.tsx`
**Картка оголошення**

```tsx
<CarAdCard 
  ad={carAd}
  onClick={(id) => router.push(`/autoria/ads/${id}`)}
  onFavorite={(id) => toggleFavorite(id)}
/>
```

**Особливості**:
- Memoized з `React.memo`
- Lazy loading зображень
- Відображення ціни в вибраній валюті
- Favorite toggle

### `components/AutoRia/Pages/ModerationPage.tsx`
**Сторінка модерації**

```tsx
<ModerationPage />
```

**Особливості**:
- Доступ тільки для Superuser/Staff
- Фільтрація за статусом
- Пакетна модерація
- Real-time updates після модерації

### `components/ChatBot/ChatBotIcon/ChatBotIconLogic.tsx`
**WebSocket чат**

```tsx
<ChatBot />
```

**Особливості**:
- WebSocket connection
- AI відповіді
- Persistent history
- Real-time messaging

## 🗃️ State Management

### Context API

**AuthContext** (`src/contexts/AuthContext.tsx`):
```tsx
const { session, status } = useAuth();
// session: NextAuth session object
// status: 'loading' | 'authenticated' | 'unauthenticated'
```

**RedisAuthContext** (`src/contexts/RedisAuthContext.tsx`):
```tsx
const { redisUser, authProvider, authLoading } = useRedisAuth();
// redisUser: User from Redis (backend_auth or dummy_auth)
// authProvider: 'backend' | 'dummy'
// authLoading: boolean
```

**I18nContext** (`src/contexts/I18nContext.tsx`):
```tsx
const { locale, setLocale, t } = useI18n();
// locale: 'uk' | 'ru' | 'en'
// setLocale: (locale) => void
// t: (key) => string  // Translation function
```

**ThemeContext** (`src/contexts/ThemeContext.tsx`):
```tsx
const { theme, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'system'
// setTheme: (theme) => void
```

## 🔌 API Integration

### fetchWithAuth

Центральна функція для API запитів з автоматичною аутентифікацією:

```typescript
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// GET request
const data = await fetchWithAuth('/api/ads/cars/');

// POST request
const newAd = await fetchWithAuth('/api/ads/cars/', {
  method: 'POST',
  body: JSON.stringify(adData)
});
```

**Особливості**:
- Автоматичне додавання токенів
- Token refresh при 401
- Retry logic
- Error handling через `unifiedErrorHandler`

### API Routes (Proxy)

Next.js API routes проксують запити до Backend:

```typescript
// app/api/(backend)/ads/cars/route.ts
export async function GET(request: Request) {
  const token = await getToken(request);
  
  const response = await fetch(`${BACKEND_URL}/api/ads/cars/`, {
    headers: {
      'Authorization': `Bearer ${token.access}`
    }
  });
  
  return response;
}
```

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework:

```tsx
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
    Заголовок
  </h2>
</div>
```

### shadcn/ui Components

Високоякісні компоненти:

```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

<Card>
  <Badge variant="success">Активно</Badge>
  <Button onClick={handleClick}>Зберегти</Button>
</Card>
```

### Adaptive Design

Responsive breakpoints:

```tsx
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4 
  gap-4
">
  {/* Cards */}
</div>
```

## 🧪 Testing

### Unit Tests (Jest + React Testing Library)

```bash
# Запустити тести
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Запустити E2E тести
npm run test:e2e

# UI mode
npm run test:e2e:ui
```

## 🚀 Performance Optimization

### Memoization

```tsx
// React.memo для компонентів
export const CarAdCard = React.memo(({ ad }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.ad.id === nextProps.ad.id;
});

// useCallback для функцій
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

// useMemo для обчислень
const filteredAds = useMemo(() => {
  return ads.filter(ad => ad.status === 'active');
}, [ads]);
```

### Image Optimization

```tsx
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Car"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
  loading="lazy"
/>
```

### Code Splitting

```tsx
import dynamic from 'next/dynamic';

const ChatBot = dynamic(() => import('@/components/ChatBot'), {
  loading: () => <ChatBotSkeleton />,
  ssr: false  // Не рендерити на сервері
});
```

## 📊 Build Analysis

```bash
# Аналіз розміру бандлу
npm run analyze

# Або через Next.js
ANALYZE=true npm run build
```

## 🔗 Пов'язані документи

- [Повна документація](../docs/README.md)
- [Backend API Guide](../docs/BACKEND_API_GUIDE.md)
- [Setup Guide](../docs/SETUP_GUIDE.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦
