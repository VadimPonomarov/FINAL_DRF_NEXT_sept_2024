# Швидкий старт

## Актуальний швидкий старт (CSS-змінні + Tailwind + React)

Цей розділ описує **реальну** дизайн-систему, яка використовується у фронтенді:

- глобальні токени (`--primary`, `--background`, `--text` тощо) – у `frontend/src/app/globals.css`;
- Tailwind мапиться на ці токени у `frontend/tailwind.config.ts`;
- базові UI-компоненти (наприклад, `Button`) – у `frontend/src/components/ui/*`;
- локальні стилі для фіч – у `*.module.(s)css`;
- теми та палітри – через `ThemeToggle` і `ThemeSelector`.

### 1. Використати готову кнопку

```tsx
import { Button } from "@/components/ui/button";

export function Example() {
  return (
    <div className="flex gap-4">
      <Button variant="default" size="lg">
        Зберегти
      </Button>
      <Button variant="outline" size="sm">
        Скасувати
      </Button>
    </div>
  );
}
```

Компонент `Button` сам використовує дизайн-токени – вам не потрібно прописувати кольори чи тіні вручну.

### 2. Змінити бренд-колір

1. Відкрити `frontend/src/app/globals.css`.
2. Оновити HSL-значення токенів:

```css
:root {
  --primary: 142 70% 45%;
  --primary-foreground: 0 0% 100%;
}
```

Усі `Button` з `variant="default"` та інші елементи, що використовують `primary`, автоматично змінять колір.

### 3. Додати локальний стиль (module layer)

```scss
/* CarAdCard.module.scss */

.root {
  /* layout та відступи для картки */
}

.cta {
  --primary: 45 93% 47%;
  --primary-foreground: 0 0% 10%;
}
```

```tsx
import styles from "./CarAdCard.module.scss";
import { Button } from "@/components/ui/button";

export function CarAdCard() {
  return (
    <article className={styles.root}>
      {/* ...контент... */}
      <Button variant="default" className={styles.cta}>
        Купити зараз
      </Button>
    </article>
  );
}
```

### 4. Міграція з inline-стилів

Було (погано):

```tsx
<div style={{ display: "flex", gap: "16px", padding: "24px" }}>
  <button
    style={{
      backgroundColor: "#0070f3",
      color: "white",
      padding: "12px 24px",
      borderRadius: "8px",
      border: "none",
    }}
  >
    Click
  </button>
</div>
```

Стало (правильно):

```tsx
import { Button } from "@/components/ui/button";

<div className="flex gap-4 p-6">
  <Button variant="default" size="lg">
    Click
  </Button>
</div>
```

Layout робимо через Tailwind, вигляд кнопки – через дизайн-токени всередині `Button`.

Деталі архітектури – у `DOCUMENTATION.md`. Налаштування тем – у `README_THEME_SYSTEM.md` і `THEME_CUSTOMIZATION.md`.

---

## Архівний SCSS Quick Start (історія, не використовувати в новому коді)

### Впровадження

### Налаштування

```bash
# Встановлення SCSS
npm install -D sass
```

### Імпорт в проект

У головному файлі стилів (наприклад, `app/globals.scss`):

```scss
// Імпорт design system
@use './design-system/main.scss';

// Або часткове імпортування
@use './design-system/tokens/variables' as *;
@use './design-system/mixins/core' as *;
```

### Використання в компонентах

#### React/Next.js приклад

```tsx
// Button.tsx
import type { ButtonProps, BaseComponentProps } from '@/design-system/types/component-props';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonProps {}

export function Button({ children, ...props }: Props) {
  return (
    <button
      data-component="button"
      data-variant={props['data-variant'] || 'primary'}
      data-size={props['data-size'] || 'md'}
      {...props}
    >
      {children}
    </button>
  );
}

// Використання:
<Button data-variant="primary" data-size="lg">
  Натисни мене
</Button>
```

#### Прямий HTML

```html
<!-- Просто додайте data-атрибути -->
<button data-component="button" data-variant="primary">
  Натисни мене
</button>

<input 
  data-component="input" 
  data-variant="outlined" 
  data-size="md" 
  placeholder="Введіть текст"
/>
```

## Найчастіші випадки використання

### Кнопки з різними варіантами

```html
<!-- Primary дія -->
<button data-component="button" data-variant="primary">Зберегти</button>

<!-- Відміна -->
<button data-component="button" data-variant="ghost">Відміна</button>

<!-- Видалення -->
<button data-component="button" data-variant="destructive">Видалити</button>

<!-- З іконкою -->
<button data-component="button" data-variant="outline">
  <svg>...</svg>
  Завантажити
</button>
```

### Форми з валідацією

```html
<div data-component="form-field" data-state="error">
  <label class="form-label" data-required="true">Email</label>
  <input 
    data-component="input" 
    data-variant="outlined"
    data-state="error"
    type="email"
  />
  <span class="form-error">Некоректна email адреса</span>
</div>
```

### Картки контенту

```html
<div data-component="card" data-variant="elevated" data-interactive="true">
  <div class="card-header">
    <h3 class="card-title">Назва картки</h3>
    <p class="card-description">Короткий опис</p>
  </div>
  <div class="card-content">
    <p>Основний контент картки...</p>
  </div>
  <div class="card-footer">
    <button data-component="button" data-variant="primary">Дія</button>
  </div>
</div>
```

### Індикатори статусу (Badges)

```html
<span data-component="badge" data-variant="success">Активний</span>
<span data-component="badge" data-variant="warning">В очікуванні</span>
<span data-component="badge" data-variant="destructive">Помилка</span>
```

### Сітка з картками (Grid Layout)

```html
<div class="grid grid-cols-3 gap-6">
  <div data-component="card">Картка 1</div>
  <div data-component="card">Картка 2</div>
  <div data-component="card">Картка 3</div>
</div>
```

## Міграція інлайн стилів

### Старий код з інлайн стилями

```tsx
<div style={{ display: 'flex', gap: '16px', padding: '24px' }}>
  <button style={{
    backgroundColor: '#0070f3',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
  }}>
    Click
  </button>
</div>
```

### Новий код з data-атрибутами

```tsx
<div className="flex gap-4 p-6">
  <button data-component="button" data-variant="primary" data-size="lg">
    Click
  </button>
</div>
```

## Корисні утиліти

### Layout

```html
<!-- Flexbox -->
<div class="flex gap-4 justify-between items-center">
  <!-- ... -->
</div>

<!-- Grid -->
<div class="grid grid-cols-4 gap-6">
  <!-- ... -->
</div>

<!-- Spacing -->
<div class="p-6 mx-auto">
  <!-- ... -->
</div>
```

### Typography

```html
<!-- Заголовки -->
<h1 class="heading-1">Великий заголовок</h1>
<h2 class="heading-2">Середній заголовок</h2>

<!-- Текст -->
<p class="body">Основний текст</p>
<p class="caption">Підпис</p>
<p class="text-muted">Приглушений текст</p>
```

## Створення власних компонентів

### SCSS

```scss
@use './design-system/tokens/functions' as *;
@use './design-system/mixins/core' as *;

.my-custom-component {
  @include flex(row, center, center, 4);
  @include text(lg, medium, normal);
  @include rounded(lg);
  @include transition-colors;
  
  padding: spacing(6);
  background-color: hsl(color(card));
  
  @include hover {
    background-color: hsl(color(accent));
  }
  
  @include media(md) {
    padding: spacing(8);
  }
}
```

### React Component

```tsx
import type { BaseComponentProps } from '@/design-system/types/component-props';

interface MyComponentProps extends BaseComponentProps {
  title: string;
  description?: string;
}

export function MyComponent({ title, description }: MyComponentProps) {
  return (
    <div data-component="card" data-variant="elevated" className="my-custom-component">
      <h3 className="card-title">{title}</h3>
      {description && <p className="card-description">{description}</p>}
    </div>
  );
}
```

## Рекомендації

### Рекомендовано

- Використовуйте data-атрибути для варіантів компонентів
- Використовуйте utility класи для layout та spacing
- Використовуйте SCSS функції та міксіни для власних стилів
- Дотримуйтесь naming convention

### Не рекомендовано

- Inline стилі (`style="..."`)
- Дублювання значень (використовуйте SCSS змінні)
- Кастомні класи для простих задач (є утиліти)
- Ігнорування responsive дизайну

## Додаткова інформація

Детальна інформація у [DOCUMENTATION.md](./DOCUMENTATION.md).
