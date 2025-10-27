# 🔧 Исправления: Бейджи пользователей и статус "Черновик"

## ✅ Исправление 1: Два бейджа в правом верхнем углу

### Проблема
На страницах AutoRia не отображались два бейджа:
1. Email из сессии (NextAuth)
2. Информация о залогиненном пользователе AutoRia (из контекста)

### Решение

#### 1. Создан новый компонент `AutoRiaUserBadge`
**Файл**: `frontend/src/components/AutoRia/Layout/AutoRiaUserBadge.tsx`

**Функционал**:
- Отображает имя/email залогиненного пользователя AutoRia
- Показывает иконку Crown для Premium/VIP пользователей, User для обычных
- Имеет тултип с подробной информацией:
  - Имя пользователя
  - Email
  - Тип аккаунта (для Premium/VIP)
- Стилизован в зависимости от типа аккаунта:
  - Premium/VIP: градиент от amber-400 до yellow-500, золотой текст, иконка короны
  - Обычный: серый фон, иконка пользователя
- Интерактивный - при клике ведет на `/autoria/profile`
- Адаптивный дизайн с hover-эффектами

**Пример кода**:
```typescript
const AutoRiaUserBadge: React.FC = () => {
  const { user, isAuthenticated } = useAutoRiaAuth();
  const { data: userProfileData } = useUserProfileData();

  if (!isAuthenticated || !user) {
    return null;
  }

  const accountType = userProfileData?.account?.account_type?.toUpperCase() || 'BASIC';
  const isPremium = ['PREMIUM', 'VIP'].includes(accountType);
  const displayName = user.username || user.email || 'User';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={isPremium ? "default" : "secondary"} className={...}>
            <Link href="/autoria/profile" className="flex items-center gap-1.5 px-2 py-1">
              {isPremium ? <Crown /> : <User />}
              <span>{displayName}</span>
            </Link>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {isPremium && (
              <p className="text-xs font-bold text-amber-500">★ {accountType} аккаунт</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

#### 2. Обновлен компонент `TopRightControls`
**Файл**: `frontend/src/components/All/TopRightControls/TopRightControls.tsx`

**Изменения**:
- Импортирован `AutoRiaUserBadge`
- На страницах `/autoria` теперь отображаются ОБА бейджа рядом (с gap-2)
- Первый бейдж: `AuthBadge` - email из NextAuth сессии
- Второй бейдж: `AutoRiaUserBadge` - информация о залогиненном пользователе AutoRia

**Было**:
```typescript
if (pathname?.startsWith('/autoria')) {
  return (
    <>
      <div className="fixed top-[60px] right-2 z-[99998]">
        <AuthBadge />
      </div>
      <FixedLanguageSwitch />
    </>
  );
}
```

**Стало**:
```typescript
if (pathname?.startsWith('/autoria')) {
  return (
    <>
      {/* Первый бейдж: Email из сессии */}
      <div className="fixed top-[60px] right-2 z-[99998] flex items-center gap-2">
        <AuthBadge />
        {/* Второй бейдж: Залогиненный пользователь AutoRia */}
        <AutoRiaUserBadge />
      </div>
      <FixedLanguageSwitch />
    </>
  );
}
```

---

## ✅ Исправление 2: Добавлен статус "Черновик" в фильтры модерации

### Проблема
На странице модерации отсутствовала возможность фильтровать объявления по статусу "Черновик" (Draft), хотя в БД такие объявления существуют.

### Решение

#### 1. Добавлен фильтр "Черновик" в ModerationPage
**Файл**: `frontend/src/components/AutoRia/Pages/ModerationPage.tsx`

**Изменения**:
- Добавлен новый пункт в выпадающий список статусов
- Порядок изменен для логичной группировки:
  1. Все статусы
  2. Активные ✅
  3. На модерации ⏳
  4. **Черновик 📝** (новый)
  5. Требует проверки 🔍
  6. Отклонено ❌
  7. Заблокировано 🚫

**Было**:
```typescript
<SelectContent>
  <SelectItem value="all">📋 {t('autoria.moderation.allStatuses')}</SelectItem>
  <SelectItem value="pending">⏳ {t('autoria.moderation.pendingModeration')}</SelectItem>
  <SelectItem value="needs_review">🔍 {t('autoria.moderation.needsReview')}</SelectItem>
  <SelectItem value="rejected">❌ {t('autoria.moderation.rejected')}</SelectItem>
  <SelectItem value="blocked">🚫 {t('autoria.moderation.block')}</SelectItem>
  <SelectItem value="active">✅ {t('autoria.moderation.active')}</SelectItem>
</SelectContent>
```

**Стало**:
```typescript
<SelectContent>
  <SelectItem value="all">📋 {t('autoria.moderation.allStatuses')}</SelectItem>
  <SelectItem value="active">✅ {t('autoria.moderation.active')}</SelectItem>
  <SelectItem value="pending">⏳ {t('autoria.moderation.pendingModeration')}</SelectItem>
  <SelectItem value="draft">📝 {t('autoria.moderation.draft')}</SelectItem>
  <SelectItem value="needs_review">🔍 {t('autoria.moderation.needsReview')}</SelectItem>
  <SelectItem value="rejected">❌ {t('autoria.moderation.rejected')}</SelectItem>
  <SelectItem value="blocked">🚫 {t('autoria.moderation.block')}</SelectItem>
</SelectContent>
```

**Примечание**: Отображение бейджа для статуса "draft" уже было реализовано ранее в функции `getStatusBadge`:
```typescript
case 'draft':
  return <Badge className="bg-blue-100 text-blue-800 border-blue-300">📝 Черновик</Badge>;
```

#### 2. Добавлены переводы для "Черновик"

**Файл**: `frontend/src/locales/uk.ts`
```typescript
"autoria.moderation.draft": "Чернетка",
```

**Файл**: `frontend/src/locales/ru.ts`
```typescript
"autoria.moderation.draft": "Черновик",
```

**Файл**: `frontend/src/locales/en.ts`
```typescript
"autoria.moderation.draft": "Draft",
```

---

## 📊 Результаты

### Бейджи пользователей
- ✅ Два бейджа отображаются в правом верхнем углу на страницах `/autoria`
- ✅ Первый бейдж показывает email из NextAuth сессии
- ✅ Второй бейдж показывает информацию о залогиненном пользователе AutoRia
- ✅ Второй бейдж имеет:
  - Тултип с подробной информацией
  - Стилизацию в зависимости от типа аккаунта (Premium/VIP vs обычный)
  - Интерактивность (hover, ссылка на профиль)
  - Иконку Crown для Premium/VIP, User для обычных

### Фильтр "Черновик"
- ✅ В фильтре статусов на странице модерации добавлен пункт "Черновик"
- ✅ Добавлены переводы на украинский, русский и английский языки
- ✅ Статусы упорядочены логично: сначала активные, потом по степени готовности
- ✅ Отображение бейджа для статуса "draft" работает корректно

### Использованные технологии
- React hooks: `useAutoRiaAuth`, `useUserProfileData`, `usePathname`
- Компоненты UI: `Badge`, `Tooltip`, `TooltipProvider`, `TooltipContent`, `TooltipTrigger`
- Иконки: `Crown`, `User` из lucide-react
- Next.js: `Link` для навигации
- Tailwind CSS для стилизации

---

## 🔗 Связанные файлы

### Новые файлы
- `frontend/src/components/AutoRia/Layout/AutoRiaUserBadge.tsx`

### Измененные файлы
- `frontend/src/components/All/TopRightControls/TopRightControls.tsx`
- `frontend/src/components/AutoRia/Pages/ModerationPage.tsx`
- `frontend/src/locales/uk.ts`
- `frontend/src/locales/ru.ts`
- `frontend/src/locales/en.ts`

### Связанные компоненты
- `AuthBadge.tsx` - существующий компонент с email из сессии
- `FixedLanguageSwitch.tsx` - переключатель языков
- `useAutoRiaAuth.ts` - хук для работы с авторизацией AutoRia
- `useUserProfileData.ts` - хук для получения данных профиля пользователя

---

## 📝 Примечания

1. **Позиционирование бейджей**: Оба бейджа находятся в одном контейнере с `flex items-center gap-2` для обеспечения правильного выравнивания и отступов.

2. **Условный рендеринг**: `AutoRiaUserBadge` отображается только если пользователь авторизован (`isAuthenticated` и `user` не null).

3. **Тип аккаунта**: Определяется из `userProfileData?.account?.account_type`, возможные значения: BASIC, PREMIUM, VIP.

4. **z-index**: Бейджи имеют `z-[99998]` для отображения поверх других элементов, но под модальными окнами.

5. **Интернационализация**: Все тексты используют систему переводов через `t()` функцию из `useI18n`.

6. **Accessibility**: Используются тултипы для дополнительной информации, что улучшает UX.

7. **Responsive design**: Компонент адаптируется под различные размеры экрана благодаря Tailwind CSS классам.

