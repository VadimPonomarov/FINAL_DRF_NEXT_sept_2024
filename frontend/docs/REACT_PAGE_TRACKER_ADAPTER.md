# React Page Tracker Adapter - Safe App Router Compatibility

## Проблема

Пакет `react-page-tracker` несовместим с Next.js 15 App Router и React 19, так как внутри использует `next/document`, что вызывает ошибку:
```
Error: <Html> should not be imported outside of pages/_document.
```

## Радикальное решение

Создан безопасный адаптер, который:

1. **Полностью заменяет `react-page-tracker`** без зависимости от `next/document`
2. **Автоматически перехватывает все импорты** через webpack alias в `next.config.js`
3. **Совместим с App Router** и не вызывает ошибок сборки
4. **Сохраняет тот же API**, что позволяет использовать существующий код без изменений

## Архитектура решения

### 1. Безопасный адаптер (`src/lib/react-page-tracker-adapter.ts`)

- Реализует тот же API, что и `react-page-tracker`
- Использует только клиентские API (window, history)
- Не использует `next/document` или Pages Router
- Совместим с React 19 и Next.js 15

### 2. Webpack Alias (в `next.config.js`)

```javascript
config.resolve.alias = {
  ...config.resolve.alias,
  'react-page-tracker': path.resolve(__dirname, 'src/lib/react-page-tracker-adapter.ts'),
};
```

**Это ключевая часть решения** - все импорты из `react-page-tracker` автоматически перенаправляются на безопасный адаптер, даже если:
- Кто-то случайно импортирует `react-page-tracker`
- Код содержит старые импорты
- В будущем добавятся новые импорты

### 3. Типы (`src/lib/react-page-tracker-adapter.d.ts`)

Обеспечивает типобезопасность и автодополнение в IDE.

## Использование

Код работает точно так же, как с оригинальным `react-page-tracker`:

```typescript
import { usePageTrackerStore } from 'react-page-tracker'; // Автоматически → адаптер
import { PageTracker } from 'react-page-tracker'; // Автоматически → адаптер

// Или явно из адаптера:
import { usePageTrackerStore, PageTracker } from '@/lib/react-page-tracker-adapter';
```

## Преимущества

✅ **Радикальное решение** - работает на уровне сборки, невозможно обойти  
✅ **Устойчиво к ошибкам** - даже случайные импорты будут безопасными  
✅ **Не требует изменений кода** - существующий код работает без изменений  
✅ **Безопасно для деплоя** - нет риска ошибок сборки  
✅ **Совместимо с React 19** - полностью поддерживает новые версии  

## Технические детали

### Отличия от оригинального пакета

1. **Не использует `next/document`** - работает только через клиентские API
2. **Отслеживание навигации** - использует `history.pushState` и `popstate` события
3. **Проверка первой страницы** - через `window.history.length`
4. **Безопасность** - все проверки на наличие `window` объекта

### Производительность

- Легковесная реализация
- Минимальное влияние на сборку
- Эффективное отслеживание без лишних ре-рендеров

## Поддержка

Если вы столкнулись с проблемами:

1. Убедитесь, что webpack alias настроен в `next.config.js`
2. Очистите кеш: `rm -rf .next node_modules/.cache`
3. Пересоберите проект: `npm run build`

## Важно

⚠️ **НЕ устанавливайте `react-page-tracker` из npm** - он несовместим с App Router.  
✅ **Используйте адаптер** - он полностью заменяет функциональность без проблем совместимости.

