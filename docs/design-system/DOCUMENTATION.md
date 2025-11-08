# Design System - Документація

## Огляд

Система стилізації на SCSS з принципами DRY (Don't Repeat Yourself) та модульною архітектурою.

## Основні принципи

### Централізація визначень
Кожен компонент, колір, розмір визначається один раз в централізованому місці.

### Динамічна стилізація через data-атрибути
Замість створення окремих класів для кожного варіанта використовуються data-атрибути:

```html
<!-- Старий підхід -->
<button class="btn btn-primary btn-lg">Click me</button>

<!-- Рекомендований підхід -->
<button data-component="button" data-variant="primary" data-size="lg">
  Click me
</button>
```

### Відсутність інлайн стилів
Інлайн стили (`style="..."`) виключені з проекту. Замість них використовуються класи та data-атрибути.

## Структура проекту

```
design-system/
├── tokens/                 # Змінні та функції
│   ├── _variables.scss     # Всі змінні проекту
│   └── _functions.scss     # SCSS функції для обчислень
├── mixins/                 # Міксіни для переіспользування
│   ├── _core.scss          # Основні міксіни
│   └── _variants.scss      # Міксіни для варіантів
├── base/                   # Базові стилі
│   ├── _reset.scss         # CSS reset
│   ├── _typography.scss    # Типографія
│   └── _animations.scss    # Анімації
├── components/             # Компоненти
│   ├── _button.scss
│   ├── _input.scss
│   ├── _card.scss
│   └── ...
├── utilities/              # Утиліти
│   ├── _layout.scss
│   ├── _typography.scss
│   └── ...
└── main.scss              # Головна точка входу
```

## Використання

### Імпорт в проект

```scss
// В globals.scss або main.scss
@use './design-system/main.scss';
```

### Компоненти

#### Кнопки

```html
<!-- Варіанти -->
<button data-component="button" data-variant="primary">Primary</button>
<button data-component="button" data-variant="secondary">Secondary</button>
<button data-component="button" data-variant="destructive">Delete</button>
<button data-component="button" data-variant="outline">Outline</button>
<button data-component="button" data-variant="ghost">Ghost</button>

<!-- Розміри -->
<button data-component="button" data-size="sm">Small</button>
<button data-component="button" data-size="md">Medium</button>
<button data-component="button" data-size="lg">Large</button>

<!-- Модифікатори -->
<button data-component="button" data-full-width="true">Full Width</button>
<button data-component="button" data-icon-only="true">
  <svg>...</svg>
</button>

<!-- Стани -->
<button data-component="button" disabled>Disabled</button>
<button data-component="button" data-loading="true">Loading...</button>
```

#### Інпути

```html
<!-- Варіанти -->
<input data-component="input" data-variant="outlined" />
<input data-component="input" data-variant="filled" />
<input data-component="input" data-variant="flushed" />

<!-- Розміри -->
<input data-component="input" data-size="sm" />
<input data-component="input" data-size="md" />
<input data-component="input" data-size="lg" />

<!-- Стани -->
<input data-component="input" data-state="error" />
<input data-component="input" data-state="success" />
```

#### Картки

```html
<div data-component="card" data-variant="elevated">
  <div class="card-header">
    <h3 class="card-title">Заголовок картки</h3>
    <p class="card-description">Опис картки</p>
  </div>
  <div class="card-content">
    <!-- Контент -->
  </div>
  <div class="card-footer">
    <button data-component="button">Дія</button>
  </div>
</div>
```

#### Бейджі

```html
<span data-component="badge" data-variant="primary">New</span>
<span data-component="badge" data-variant="success">Active</span>
<span data-component="badge" data-variant="destructive">Error</span>
<span data-component="badge" data-size="sm">Small</span>
<span data-component="badge" data-dot="true"></span>
```

### Утиліти

#### Layout

```html
<!-- Flexbox -->
<div class="flex gap-4 justify-center items-center">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Grid -->
<div class="grid grid-cols-3 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

<!-- Spacing -->
<div class="p-6 mx-auto">
  <p class="mb-4">Paragraph with margin bottom</p>
</div>
```

#### Typography

```html
<!-- Font sizes -->
<p class="text-sm">Small text</p>
<p class="text-base">Base text</p>
<p class="text-lg">Large text</p>

<!-- Font weights -->
<p class="font-normal">Normal weight</p>
<p class="font-medium">Medium weight</p>
<p class="font-bold">Bold weight</p>

<!-- Presets -->
<h1 class="heading-1">Display heading</h1>
<p class="body">Body text</p>
<p class="caption">Caption text</p>
```

## SCSS функції

### Використання функцій для отримання значень

```scss
@use './design-system/tokens/functions' as *;

.my-component {
  // Відступи
  padding: spacing(4);              // 16px
  margin: spacing(6);               // 24px
  
  // Типографія
  font-size: font-size(lg);         // 18px
  font-weight: font-weight(bold);   // 700
  
  // Кольори
  color: hsl(color(primary));
  background: hsl(color(background));
  
  // Радіуси
  border-radius: radius(md);        // 8px
  
  // Тіні
  box-shadow: shadow(lg);
  
  // Розміри компонентів
  height: component-size(button, md); // 40px
}
```

## SCSS міксіни

### Використання міксінів

```scss
@use './design-system/mixins/core' as *;
@use './design-system/mixins/variants' as *;

.my-component {
  // Flexbox
  @include flex(row, center, center, 4);
  
  // Typography
  @include text(lg, medium, relaxed);
  
  // Transitions
  @include transition-colors;
  
  // Responsive
  @include media(md) {
    padding: spacing(8);
  }
  
  // Hover (тільки для пристроїв з мишею)
  @include hover {
    background-color: hsl(color(accent));
  }
  
  // Touch (для сенсорних пристроїв)
  @include touch {
    background-color: hsl(color(accent));
  }
  
  // Disabled state
  @include disabled;
  
  // Loading state
  @include loading;
}
```

### Створення власних варіантів

```scss
.my-custom-button {
  @include button-reset;
  @include button-variant(color(success), color(success-foreground));
  @include component-size(button, lg, 6, lg);
}
```

## Переваги системи

### DRY принцип
- Всі значення визначені один раз в `_variables.scss`
- Міксіни виключають дублювання коду
- Функції автоматизують обчислення

### Читабельність
- Зрозумілі імена змінних та функцій
- Вкладеність SCSS відображає структуру HTML
- Коментарі українською мовою

### Підтримка
- Зміна кольору в одному місці змінює його скрізь
- Легко додавати нові варіанти компонентів
- Адаптивність через міксіни

### Продуктивність
- Компілюється в оптимізований CSS
- Немає runtime обчислень (все на етапі збірки)
- Невеликий розмір bundle

## Приклад створення нового компонента

```scss
@use '../tokens/variables' as *;
@use '../tokens/functions' as *;
@use '../mixins/core' as *;
@use '../mixins/variants' as *;

// Базовий клас (для наслідування)
%my-component-base {
  @include flex(row, flex-start, center, 3);
  @include text(base, normal, normal);
  @include rounded(md);
  @include transition-colors;
  
  padding: spacing(4);
}

// Основний компонент
.my-component {
  @extend %my-component-base;
  
  // Варіанти
  &[data-variant="primary"] {
    background-color: hsl(color(primary));
    color: hsl(color(primary-foreground));
  }
  
  &[data-variant="secondary"] {
    background-color: hsl(color(secondary));
    color: hsl(color(secondary-foreground));
  }
  
  // Розміри
  &[data-size="sm"] {
    padding: spacing(2);
    @include text(sm, normal, normal);
  }
  
  &[data-size="lg"] {
    padding: spacing(6);
    @include text(lg, medium, normal);
  }
  
  // Hover
  @include hover {
    opacity: opacity(hover);
  }
  
  // Responsive
  @include media(md) {
    padding: spacing(6);
  }
}
```

## Міграція з інлайн стилів

### Було (інлайн стилі)

```tsx
<div style={{ 
  display: 'flex', 
  gap: '16px', 
  padding: '24px',
  backgroundColor: '#fff'
}}>
  <button style={{ 
    backgroundColor: '#0070f3',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px'
  }}>
    Click me
  </button>
</div>
```

### Стало (data-атрибути та класи)

```tsx
<div className="flex gap-4 p-6">
  <button data-component="button" data-variant="primary">
    Click me
  </button>
</div>
```
