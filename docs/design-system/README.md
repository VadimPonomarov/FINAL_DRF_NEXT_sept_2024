# Design System

Актуальна дизайн-система фронтенду побудована на **CSS-змінних**, **Tailwind CSS** та **React-компонентах**.

Ключові принципи:

- **Єдині дизайн-токени** у `frontend/src/app/globals.css` (HSL-значення в `:root` та `.dark`).
- **Tailwind** читає тільки ці токени через `hsl(var(--...))` та `var(--radius)` у `frontend/tailwind.config.ts`.
- **Базові UI-компоненти** у `frontend/src/components/ui/*` (Button, Input, Card, Alert тощо) використовують лише токени, без жорстко зашитих кольорів.
- **Модульні стилі** (`*.module.(s)css`) для локальних правок зовнішнього вигляду конкретних сторінок/секцій.
- **Інлайн-стилі заборонені** – замість них використовуються класи, токени та data-атрибути.

Детальна архітектура описана в `DOCUMENTATION.md`. Швидкий практичний гайд – у `QUICK_START.md`. Система тем і палітр – у `README_THEME_SYSTEM.md` та `THEME_CUSTOMIZATION.md`.

---

## Архівна інформація (старий SCSS-підхід – не використовується)

Нижче описано початкову, суто SCSS-базовану дизайн-систему. Вона **більше не відповідає фактичному коду** й збережена лише як історична довідка.

Централізована система стилізації проекту з використанням SCSS. Всі стилі визначаються один раз і використовуються через data-атрибути.

## Структура

```
design-system/
├── tokens/              # Змінні та функції
│   ├── _variables.scss  # Змінні дизайн-системи
│   └── _functions.scss  # SCSS функції
├── mixins/              # Міксіни
│   ├── _core.scss       # Основні міксіни
│   └── _variants.scss   # Міксіни варіантів
├── base/                # Базові стилі
├── components/          # Компоненти
├── utilities/           # Утиліти
├── types/               # TypeScript типи
├── examples/            # Приклади використання
└── main.scss           # Головна точка входу
```

## Документація

- [QUICK_START.md](./QUICK_START.md) - Початок роботи
- [DOCUMENTATION.md](./DOCUMENTATION.md) - Повна документація
- [THEME_CUSTOMIZATION.md](./THEME_CUSTOMIZATION.md) - Налаштування тем

## Швидкий старт

```scss
// app/globals.scss
@use './design-system/main.scss';
```

```tsx
// Використання
<button data-component="button" data-variant="primary" data-size="lg">
  Натисни
</button>
```

## Основні принципи

### DRY (Don't Repeat Yourself)

```scss
// Визначення
$base-unit: 4px;
$spacing-4: $base-unit * 4; // 16px

// Використання
padding: spacing(4); // 16px
```

### Data-атрибути

```html
<!-- Старий підхід -->
<button class="btn btn-primary btn-lg">Click</button>

<!-- Рекомендований підхід -->
<button data-component="button" data-variant="primary" data-size="lg">
  Click
</button>
```

### Відсутність інлайн стилів

```tsx
// Не рекомендовано
<div style={{ padding: '24px', display: 'flex' }}>

// Рекомендовано
<div className="flex p-6">
```

## Можливості SCSS

### Змінні з математикою
```scss
$base-unit: 4px;
$spacing-6: $base-unit * 6; // 24px (автоматично)
```

### Вкладеність
```scss
.card {
  padding: spacing(6);
  
  .card-title {
    @include text(lg, semibold, tight);
  }
  
  &:hover {
    @include shadow(lg);
  }
}
```

### Міксіни
```scss
@mixin flex($direction, $justify, $align, $gap) {
  display: flex;
  flex-direction: $direction;
  justify-content: $justify;
  align-items: $align;
  gap: spacing($gap);
}

.container {
  @include flex(row, center, center, 4);
}
```

### Наслідування
```scss
%button-base {
  @include transition-colors;
  padding: spacing(4);
}

.btn {
  @extend %button-base;
}
```

### Функції
```scss
@function spacing($key) {
  @return map.get($spacing, $key);
}

// Використання
padding: spacing(6); // 24px
```

### Loops для генерації
```scss
@each $key, $value in $spacing {
  .p-#{$key} { padding: $value; }
}

// Генерує: .p-0, .p-1, .p-2, ...
```

## Домовленості проекту

### Приватні стилі компонентів
- Для кожного компонента створюйте `.module.scss` файл
- Інлайн-стилі не використовуються
- Приклад: `src/components/Feature/Widget/Widget.module.scss`

### Використання токенів
- Не перевизначаємо структурні токени (background/card/popover)
- Використовуємо семантичні токени (primary/secondary/foreground/success/warning/info)
- Використовуємо data-атрибути для компонентів

### Як змінювати
- Змінні дизайн-системи: `tokens/_variables.scss`
- Міксіни: `mixins/_core.scss`, `mixins/_variants.scss`
- Компоненти: `components/` директорія
- Утиліти: `utilities/` директорія
