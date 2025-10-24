# Отчет: Мемоизация и исправления

## 🎯 Цель
Правильно применить мемоизацию во всем проекте для оптимизации производительности, избегая ненужных перерисовок компонентов.

## ✅ Выполненные задачи

### 1. Оптимизация Context Providers

#### **I18nContext** (`frontend/src/contexts/I18nContext.tsx`)
**Проблема:** Контекст вызывал перерисовку всех потребителей при каждом изменении

**Решение:**
```typescript
// Мемоизация всех функций
const setLocale = useCallback((newLocale: Locale) => { ... }, []);
const t = useCallback((key: string, paramsOrFallback?: any) => { ... }, [locale]);
const localizedFormatNumber = useCallback(..., [locale]);
const localizedFormatDate = useCallback(..., [locale]);
const localizedFormatCurrency = useCallback(..., [locale]);

// Мемоизация конфигурации
const localeConfig = useMemo(() => getLocaleConfig(locale), [locale]);
const availableLocales = useMemo(() => LOCALES.map(...), []); // Один раз

// Мемоизация context value
const contextValue = useMemo(() => ({
  locale, localeConfig, setLocale, t, ...
}), [locale, localeConfig, setLocale, t, ...]);
```

**Критическое исправление:**
- **Проблема:** `useMemo` для `contextValue` был ПОСЛЕ условного `return`, что нарушало правила хуков
- **Ошибка:** "Rendered more hooks than during the previous render"
- **Решение:** Переместил `useMemo` ПЕРЕД любыми условными `return`

#### **RedisAuthContext** (`frontend/src/contexts/RedisAuthContext.tsx`)
```typescript
// Мемоизация функции загрузки
const fetchRedisAuth = useCallback(async () => { ... }, [provider]);

// Мемоизация context value
const contextValue = useMemo(() => ({
  redisAuth, isLoading, refreshRedisAuth: fetchRedisAuth
}), [redisAuth, isLoading, fetchRedisAuth]);
```

#### **AuthProviderContext** (`frontend/src/contexts/AuthProviderContext.tsx`)
```typescript
// setProvider уже был в useCallback - добавили provider в dependencies
const setProvider = useCallback(async (newProvider: AuthProviderEnum) => { ... }, [provider]);

// Мемоизация context values
const contextValue = useMemo(() => ({ provider, setProvider }), [provider, setProvider]);
const loadingContextValue = useMemo(() => ({ provider: AuthProviderEnum.MyBackendDocs, setProvider: () => {} }), []);
```

### 2. Мемоизация компонентов с React.memo

#### **CarAdCard** (`frontend/src/components/AutoRia/Components/CarAdCard.tsx`)
**Проблема:** Карточки перерисовывались при любом изменении в списке

**Решение:**
```typescript
const CarAdCard: React.FC<CarAdCardProps> = React.memo(({ ad, onCountersUpdate }) => {
  // Мемоизация вычисляемых значений
  const priceInCurrency = React.useMemo(() => { ... }, [currency, ad.price_usd, ...]);
  const imageUrl = React.useMemo(() => { ... }, [ad.images, ad.main_image]);
  
  // Мемоизация функций
  const refreshCountersFromServer = React.useCallback(async () => { ... }, [ad.id, isFavorite, onCountersUpdate]);
  const handleFavoriteToggle = React.useCallback(async (e) => { ... }, [ad.id, isFavorite, ...]);
  const handlePhoneClick = React.useCallback(async (e) => { ... }, [ad.id, ad.seller?.phone, ...]);
  const handleCardClick = React.useCallback((e) => { ... }, [ad.id, router]);
  
  // ...
}, (prevProps, nextProps) => {
  // Кастомный компаратор - перерисовка только при изменении ключевых данных
  return (
    prevProps.ad.id === nextProps.ad.id &&
    prevProps.ad.title === nextProps.ad.title &&
    prevProps.ad.price === nextProps.ad.price &&
    prevProps.ad.is_favorite === nextProps.ad.is_favorite &&
    // ... другие критические поля
  );
});

CarAdCard.displayName = 'CarAdCard';
```

**Результат:** Карточка перерисовывается только при изменении своих данных, а не всего списка

#### **ModerationAdCard** (`frontend/src/components/AutoRia/Pages/ModerationAdCard.tsx`)
Аналогичная оптимизация с мемоизацией:
- Форматирование цены
- Бейдж статуса
- Действия модерации

**Дополнительные исправления:**
1. **Переводы:** Добавлены fallback-тексты на украинском языке
2. **Форматирование:** Исправлено выравнивание badge с помощью `flex-shrink-0` и `self-start`
3. **Layout:** Добавлен `min-w-0` для предотвращения переполнения

```typescript
<div className="flex items-start justify-between gap-3">
  <div className="flex-1 min-w-0">
    <CardTitle>{ad.title}</CardTitle>
    {/* ... */}
  </div>
  <div className="flex-shrink-0 self-start">
    {statusBadge}
  </div>
</div>
```

#### **EnhancedChatMessage** (`frontend/src/components/ChatBot/ChatMessage/EnhancedChatMessage.tsx`)
```typescript
export const EnhancedChatMessage = React.memo(({ message, ... }) => {
  // ...
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.message === nextProps.message.message &&
    prevProps.message.imageUrl === nextProps.message.imageUrl &&
    // ... другие поля
  );
});
```

### 3. Hover Accessibility

**Проблема:** При наведении на кнопки с светлым фоном белый текст становился невидимым

**Решение:**
Создан скрипт `check-hover-accessibility.cjs` для автоматической проверки

**Исправления:**
```typescript
// До:
className="hover:bg-gray-100"

// После:
className="hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
```

**Исправленные компоненты:**
- `FixedLanguageSwitch.tsx`
- `ModerationAdCard.tsx` (кнопка "Просмотр")
- `GlobalProviderToggle.tsx`

### 4. Исправление правил хуков (Hooks Rules)

**Критическая ошибка:**
```
Runtime Error: Rendered more hooks than during the previous render.
```

**Причина:** `useMemo` для `contextValue` был размещен ПОСЛЕ условного `return` в `I18nContext`

**Решение:**
```typescript
// ❌ НЕПРАВИЛЬНО:
const availableLocales = useMemo(...);

if (!isInitialized) {
  return <Loading />; // Ранний return
}

const contextValue = useMemo(...); // Этот хук не вызывается при !isInitialized

// ✅ ПРАВИЛЬНО:
const availableLocales = useMemo(...);
const contextValue = useMemo(...); // Все хуки ПЕРЕД условными return

if (!isInitialized) {
  return <Loading />;
}
```

## 📊 Результаты

### Производительность
- **Context providers:** Теперь не вызывают ненужных ререндеров потребителей
- **Списки:** Карточки в списках перерисовываются индивидуально, а не все сразу
- **Функции:** Мемоизированные коллбэки не создаются заново при каждом рендере

### Доступность (Accessibility)
- ✅ Все hover эффекты теперь имеют правильные цвета текста
- ✅ Поддержка темной темы (dark mode)
- ✅ Контрастные цвета для лучшей читаемости

### UX
- ✅ Исправлено выравнивание бейджей статусов
- ✅ Добавлены украинские fallback-тексты для переводов
- ✅ Правильное форматирование карточек

## 🔧 Инструменты

### Скрипт проверки hover accessibility
`frontend/check-hover-accessibility.cjs`

**Использование:**
```bash
cd frontend
node check-hover-accessibility.cjs > hover-issues.txt
```

**Что проверяет:**
- Светлые `hover:bg-*` без `hover:text-*`
- Темные `hover:bg-*` с темным базовым текстом
- Dark mode поддержка

## 📝 Правила мемоизации

### 1. React.memo
Используйте для компонентов, которые:
- Часто рендерятся (в списках)
- Имеют сложную логику
- Получают стабильные пропсы

### 2. useCallback
Мемоизируйте функции, которые:
- Передаются как пропсы в дочерние компоненты
- Используются как зависимости в других хуках
- Выполняют API-запросы

### 3. useMemo
Мемоизируйте значения, которые:
- Требуют вычислений
- Используются как зависимости
- Создают новые объекты/массивы

### 4. Правила хуков
❌ **НЕ ДЕЛАЙТЕ:**
- Вызов хуков ПОСЛЕ условных return
- Вызов хуков внутри условий/циклов
- Разное количество хуков между рендерами

✅ **ДЕЛАЙТЕ:**
- Все хуки в начале компонента
- В одном и том же порядке всегда
- Условная логика ВНУТРИ хуков, не вокруг них

## 🎓 Выводы

1. **Мемоизация Context Providers критична** - они влияют на все приложение
2. **React.memo с кастомным компаратором** - лучший способ оптимизации списков
3. **Правила хуков священны** - их нарушение ломает React
4. **Hover accessibility важна** - невидимый текст = плохой UX
5. **Автоматизация проверок** - скрипты находят проблемы до пользователей

## 🚀 Следующие шаги

1. Применить мемоизацию к остальным Context providers:
   - `CurrencyContext`
   - `AuthContext`
   - `ChatContext`

2. Оптимизировать другие списки:
   - Список чатов
   - Таблица модерации
   - История действий

3. Добавить React DevTools Profiler для измерения улучшений

4. Настроить ESLint правила для предотвращения нарушений правил хуков

