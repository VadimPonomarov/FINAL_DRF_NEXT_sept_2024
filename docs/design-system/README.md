# Design System

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
