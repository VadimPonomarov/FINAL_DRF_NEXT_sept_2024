# Отчет по оптимизации производительности AutoRia

## Текущие показатели (Performance Trace)

### Core Web Vitals
- **LCP** (Largest Contentful Paint): **2,680 ms** ⚠️ (цель: < 2,500 ms)
  - TTFB (Time to First Byte): 1,345 ms
  - Render delay: 1,336 ms
- **CLS** (Cumulative Layout Shift): **0.00** ✅ (отлично!)
- **FCP** (First Contentful Paint): не указан, но зависит от TTFB

### Критический путь загрузки
Максимальная длина критического пути: **2,155 ms**

```
localhost:3000/autoria/search (1,642 ms)
  ├─ /__nextjs_font/geist-latin.woff2 (2,155 ms) [longest chain]
  └─ /_next/static/chunks/[root-of-the-server].css (1,641 ms) [render-blocking]
```

---

## Выявленные проблемы

### 🔴 Критические проблемы

#### 1. Медленный серверный ответ (TTFB)
**Проблема:** TTFB составляет 1,345 ms вместо целевых < 600 ms  
**Влияние:** Задерживает LCP на **~1,234 ms**

**Причины:**
- Серверный SSR (Server-Side Rendering) требует времени на генерацию HTML
- Множественные проверки авторизации на сервере
- Загрузка справочников и данных до рендеринга

**Решение:**
1. **Оптимизировать SSR:**
   ```typescript
   // Использовать streaming SSR для постепенной отправки HTML
   // В layout.tsx или page.tsx
   export const dynamic = 'force-dynamic';
   export const revalidate = 60; // кэш на 60 секунд
   ```

2. **Кэшировать справочники на сервере:**
   ```typescript
   // Добавить in-memory кэш для vehicle-types, regions и т.д.
   import { cache } from 'react';
   
   export const getVehicleTypes = cache(async () => {
     // Кэшируется на время request/render
     return await fetch('/api/public/reference/vehicle-types');
   });
   ```

3. **Переместить не критичные запросы на клиент:**
   - Справочники могут загружаться после first paint
   - Использовать React Query с staleTime для кэширования

#### 2. Блокирующая загрузка шрифта
**Проблема:** Шрифт `geist-latin.woff2` блокирует критический путь (2,155 ms)  
**Влияние:** Задерживает рендеринг текста

**Решение:**
1. **Добавить font-display: swap:**
   ```css
   @font-face {
     font-family: 'Geist';
     src: url('/__nextjs_font/geist-latin.woff2') format('woff2');
     font-display: swap; /* Показать fallback шрифт сразу */
   }
   ```

2. **Preload critical fonts:**
   ```tsx
   // В app/layout.tsx
   <link
     rel="preload"
     href="/__nextjs_font/geist-latin.woff2"
     as="font"
     type="font/woff2"
     crossOrigin="anonymous"
   />
   ```

3. **Использовать Next.js Font Optimization:**
   ```typescript
   // next.config.js
   module.exports = {
     experimental: {
       optimizeFonts: true
     }
   };
   ```

### 🟡 Важные проблемы

#### 3. Отсутствие preconnect
**Проблема:** Нет preconnect для внешних источников  
**Влияние:** Медленное установление соединений

**Решение:**
```tsx
// В app/layout.tsx
<link rel="preconnect" href="http://localhost:8000" />
<link rel="dns-prefetch" href="http://localhost:8000" />
```

#### 4. Render-blocking CSS
**Проблема:** CSS блокирует рендеринг (хотя и быстро - 9 ms)  
**Влияние:** Минимальное, но можно улучшить

**Решение:**
1. **Критический CSS inline:**
   ```tsx
   // Встроить критический CSS в <head>
   <style>{criticalCSS}</style>
   ```

2. **Загружать остальной CSS асинхронно:**
   ```tsx
   <link
     rel="preload"
     href="/styles.css"
     as="style"
     onLoad="this.onload=null;this.rel='stylesheet'"
   />
   ```

---

## Рекомендации по оптимизации кода

### React Performance

#### 1. Добавить useMemo/useCallback где нужно
```typescript
// ❌ Плохо - создается новый объект при каждом рендере
const filters = { type: vehicleType, brand: brand };

// ✅ Хорошо - мемоизация
const filters = useMemo(
  () => ({ type: vehicleType, brand: brand }),
  [vehicleType, brand]
);
```

#### 2. Использовать React.memo для тяжелых компонентов
```typescript
// Для компонентов, которые рендерятся часто
const AdCard = React.memo(({ ad }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.ad.id === nextProps.ad.id;
});
```

#### 3. Lazy loading для больших компонентов
```typescript
import dynamic from 'next/dynamic';

const AdViewPage = dynamic(() => import('@/components/AutoRia/Pages/AdViewPage'), {
  loading: () => <Skeleton />,
  ssr: false // Если не нужен SSR
});
```

### Network Optimization

#### 1. Батчинг запросов
```typescript
// ❌ Плохо - 5 параллельных запросов
const types = await fetch('/api/public/reference/vehicle-types');
const brands = await fetch('/api/public/reference/brands');
const regions = await fetch('/api/public/reference/regions');
const colors = await fetch('/api/public/reference/colors');
const fuels = await fetch('/api/public/reference/fuel-types');

// ✅ Хорошо - один запрос для всех справочников
const references = await fetch('/api/public/reference/all');
```

#### 2. Кэширование на клиенте
```typescript
import { useQuery } from '@tanstack/react-query';

const { data: vehicleTypes } = useQuery({
  queryKey: ['vehicle-types'],
  queryFn: () => fetch('/api/public/reference/vehicle-types'),
  staleTime: 5 * 60 * 1000, // 5 минут
  cacheTime: 30 * 60 * 1000 // 30 минут
});
```

#### 3. Дедупликация запросов
```typescript
// Использовать React Query или SWR для автоматической дедупликации
// Если 10 компонентов запрашивают одни данные - будет 1 запрос
```

### Code Splitting

#### 1. Route-based splitting (уже есть в Next.js)
```typescript
// Автоматически - каждая страница = отдельный chunk
```

#### 2. Component-based splitting
```typescript
// Тяжелые компоненты загружать динамически
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />
});
```

---

## План внедрения оптимизаций

### Фаза 1: Быстрые победы (1-2 дня)
1. ✅ Добавить font-display: swap
2. ✅ Добавить preconnect для backend
3. ✅ Включить React Query для справочников
4. ✅ Добавить кэш revalidate для SSR страниц

**Ожидаемый результат:** LCP < 2,000 ms

### Фаза 2: Средние оптимизации (3-5 дней)
1. ⏳ Оптимизировать серверные API routes
2. ⏳ Добавить in-memory кэш для справочников
3. ⏳ Батчинг запросов справочников
4. ⏳ React.memo для тяжелых компонентов

**Ожидаемый результат:** LCP < 1,500 ms

### Фаза 3: Глубокие оптимизации (1-2 недели)
1. ⏳ Streaming SSR для больших страниц
2. ⏳ Edge caching с Redis
3. ⏳ Оптимизация bundle size
4. ⏳ Service Worker для offline support

**Ожидаемый результат:** LCP < 1,000 ms

---

## Мониторинг

### Метрики для отслеживания
1. **LCP** - цель < 2,500 ms (отлично < 1,200 ms)
2. **FID** - цель < 100 ms
3. **CLS** - цель < 0.1 ✅ (уже достигнуто)
4. **TTFB** - цель < 600 ms
5. **Bundle Size** - следить за ростом

### Инструменты
- Chrome DevTools Performance
- Lighthouse CI в CI/CD
- Web Vitals библиотека для real-user monitoring
- Next.js Analytics

---

## Выводы

### Текущее состояние
- ✅ **CLS отлично** (0.00)
- ⚠️ **LCP нужно улучшить** (2,680 ms)
- ⚠️ **TTFB медленный** (1,345 ms)

### Приоритеты
1. **Критично:** Ускорить серверный ответ (TTFB)
2. **Важно:** Оптимизировать загрузку шрифтов
3. **Желательно:** Добавить preconnect и кэширование

### Потенциальная экономия
- **TTFB:** -700 ms (с 1,345 ms до 600 ms)
- **Font loading:** -500 ms (с 2,155 ms до 1,500 ms через font-display)
- **Итого:** LCP может улучшиться с **2,680 ms до ~1,500 ms**

Это приведет к значительному улучшению пользовательского опыта! 🚀
