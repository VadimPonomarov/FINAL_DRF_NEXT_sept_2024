# Система тем (Theme System)

## Огляд (актуальна реалізація)

Поточна система тем побудована на:

- CSS-змінних у `frontend/src/app/globals.css` (`:root` + `.dark`);
- Tailwind-конфігурації, що читає ці токени (`frontend/tailwind.config.ts`);
- компонентах `ThemeToggle` (dark/light) та `ThemeSelector` (кольорові палітри);
- трьох шарах стилів (tokens → base UI → module), описаних у `DOCUMENTATION.md`.

### Основні елементи

- **Dark mode**: клас `.dark` на `<html>` керується `ThemeToggle`.
- **Кольорові палітри**: `ThemeSelector` зберігає набір тем (`monochrome`, `orange`, `blue`, ...), кожна з яких має `light` та `dark` HSL-значення.
- **Застосування теми**:
  - `ThemeSelector` обирає відповідний набір кольорів (`theme.light` або `theme.dark`);
  - для кожного ключа викликається `document.documentElement.style.setProperty("--${key}", value)`;
  - атрибут `data-theme` записується на `<body>`;
  - вибір зберігається у `localStorage` (`color-theme`).

Будь-який компонент, який використовує токени (`--primary`, `--background`, `--text` тощо), автоматично підлаштовується під вибрану тему й палітру.

Детальний гайд по зміні теми – у `THEME_CUSTOMIZATION.md`.

---

## Архівна інформація (старий SCSS-підхід – не використовується)

> Нижче описана попередня SCSS-система з `_global-overrides.scss`, `_local-overrides.scss`, `_module-overrides.scss` та міксінами `local-theme`, `module-theme`, `theme-palette`. Вона **не реалізована** у поточному фронтенді й залишена лише як історична довідка.

## Огляд (історичний SCSS-підхід)

Створено централізовану систему управління темами та стилями з трьома рівнями переопределення, яка повністю вирішує конфлікти з Tailwind.

## Структура файлів

```
design-system/
├── themes/
│   ├── _theme-manager.scss      # Централізована система управління
│   ├── _global-overrides.scss   # Глобальні переопределення
│   ├── _local-overrides.scss    # Локальні переопределення (секції/сторінки)
│   └── _module-overrides.scss   # Модульні переопределення (компоненти)
├── THEME_CUSTOMIZATION.md       # Детальна документація
└── main.scss                    # Імпорт всієї системи
```

## Три рівні переопределення

### 1. **Глобальний рівень** (`_global-overrides.scss`)

Зміни застосовуються до всього сайту.

```scss
// Змінити primary колір глобально
:root {
  --color-primary: 142 70% 45%;
  --color-primary-foreground: 0 0% 100%;
}
```

**Використання:** Базова палітра, радіуси, тіні, шрифти для всього проекту.

### 2. **Локальний рівень** (`_local-overrides.scss`)

Зміни для окремих сторінок або секцій.

```scss
// Особлива тема для admin-панелі
.admin-section {
  @include local-theme(
    $primary: 280 65% 60%,
    $accent: 330 85% 65%
  );
}
```

```tsx
// Використання
<div className="admin-section">
  <button data-component="button" data-variant="primary">
    Кнопка з локальною темою
  </button>
</div>
```

**Використання:** Унікальні палітри для dashboard, admin, landing pages.

### 3. **Модульний рівень** (`_module-overrides.scss`)

Зміни для конкретних компонентів.

```scss
// Особлива кнопка
.button-success {
  @include module-theme(primary, 142 70% 45%, 0 0% 100%);
  
  &[data-component="button"] {
    background-color: hsl(var(--color-primary));
    color: hsl(var(--color-primary-foreground));
  }
}
```

```tsx
// Використання
<button 
  data-component="button"
  className="button-success"
>
  Success
</button>
```

**Використання:** Унікальні стилі для CTA кнопок, спеціальних карток, бейджів.

## Порядок пріоритетів

```
1. Токени (_variables.scss)           ← Найнижчий
2. Tailwind @base
3. SCSS компоненти (components/)
4. Глобальні переопределення
5. Локальні переопределення
6. Модульні переопределення
7. Tailwind @utilities                ← Найвищий
```

## Вирішення конфліктів з Tailwind

### Проблема
SCSS та Tailwind генерували однакові класи (`.flex`, `.grid`, `.text-lg`).

### Рішення
SCSS utility класи тепер мають префікс `ds-`:

```scss
// SCSS utilities з префіксом
.ds-flex { display: flex !important; }
.ds-grid { display: grid !important; }
.ds-text-lg { font-size: 1.125rem !important; }
```

```tsx
// Використання
<div className="ds-flex ds-gap-4">      {/* SCSS */}
<div className="flex gap-4">            {/* Tailwind */}
```

### Рекомендації

1. **Layout (flex, grid, gap)** → Використовуйте **Tailwind**
2. **Компоненти (button, card)** → Використовуйте **SCSS data-атрибути**
3. **Теми та палітри** → Використовуйте **систему переопределення**

## Швидкий старт

### 1. Змінити primary колір глобально

```scss
// themes/_global-overrides.scss
:root {
  --color-primary: 142 70% 45%;  // Зелений
}
```

### 2. Створити локальну тему для секції

```scss
// themes/_local-overrides.scss
.pricing-section {
  @include local-theme(
    $primary: 280 65% 60%,
    $background: 240 10% 8%,
    $foreground: 0 0% 95%
  );
}
```

```tsx
<section className="pricing-section">
  <h2>Pricing</h2>
  <button data-component="button" data-variant="primary">
    Subscribe
  </button>
</section>
```

### 3. Створити особливу кнопку

```scss
// themes/_module-overrides.scss
.cta-button {
  @include module-theme(primary, 15 100% 55%, 0 0% 100%);
  
  &[data-component="button"] {
    background-color: hsl(var(--color-primary));
    font-size: 1.125rem;
    padding: spacing(6) spacing(12);
  }
}
```

```tsx
<button 
  data-component="button"
  className="cta-button"
>
  Get Started
</button>
```

## Готові кольорові схеми

В `_global-overrides.scss` доступні 5 готових схем:

1. **Tech** (Синьо-зелена)
2. **Creative** (Фіолетово-рожева)
3. **Energy** (Помаранчево-червона)
4. **Minimal** (Нейтральна)
5. **Dark** (Темна за замовчуванням)

Розкоментуйте потрібну схему для швидкого застосування.

## Міксіни

### `local-theme()`
Створення локальної теми для секції/сторінки.

```scss
@include local-theme(
  $primary: 200 100% 50%,
  $accent: 142 70% 45%,
  $background: 0 0% 98%
);
```

### `module-theme()`
Створення модульної теми для компонента.

```scss
@include module-theme(primary, 350 100% 50%, 0 0% 100%);
```

### `theme-palette()`
Швидка зміна всієї палітри.

```scss
@include theme-palette((
  'primary': 200 100% 50%,
  'accent': 142 70% 45%,
  'background': 0 0% 98%
));
```

## Utility класи для теми

```scss
// Фони
.bg-theme-primary
.bg-theme-secondary
.bg-theme-accent
.bg-theme-success

// Текст
.text-theme-primary
.text-theme-foreground
.text-theme-muted

// Бордери
.border-theme-primary
.border-theme
```

## Формат кольорів HSL

```
H S L
220 100% 50%
│   │    │
│   │    └─ Яскравість (0-100%)
│   └────── Насиченість (0-100%)
└────────── Відтінок (0-360°)
```

### Популярні кольори:
- Червоний: `0 84% 60%`
- Помаранчевий: `15 100% 55%`
- Жовтий: `45 93% 47%`
- Зелений: `142 70% 45%`
- Синій: `221 83% 53%`
- Фіолетовий: `280 65% 60%`
- Рожевий: `330 85% 65%`

## Приклади використання

### Приклад 1: Маркетингова landing page

```scss
// themes/_local-overrides.scss
.landing-page {
  @include theme-palette((
    'primary': 15 100% 55%,
    'accent': 45 100% 55%,
    'background': 0 0% 100%,
    'foreground': 0 0% 10%
  ));
}
```

```tsx
<div className="landing-page">
  <section className="hero">
    <h1>Welcome</h1>
    <button data-component="button" data-variant="primary" className="cta-button">
      Get Started
    </button>
  </section>
</div>
```

### Приклад 2: Темна секція

```scss
// themes/_local-overrides.scss
.dark-section {
  @include theme-palette((
    'background': 240 10% 8%,
    'foreground': 0 0% 95%,
    'card': 240 10% 12%,
    'primary': 221 83% 63%
  ));
}
```

### Приклад 3: Градієнтна кнопка

```scss
// themes/_module-overrides.scss
.btn-gradient {
  @include module-theme(primary, 280 65% 60%);
  @include module-theme(secondary, 330 85% 65%);
  
  &[data-component="button"] {
    background: linear-gradient(
      135deg,
      hsl(var(--color-primary)),
      hsl(var(--color-secondary))
    );
    color: white;
  }
}
```

## Підтримка темної теми

Всі переопределення автоматично працюють з темною темою:

```scss
:root {
  --color-primary: 142 70% 45%;
}

.dark {
  --color-primary: 142 70% 55%;  // Світліше для темної теми
}
```

## Інструменти

- **HSL Color Picker**: https://hslpicker.com/
- **Coolors**: https://coolors.co/
- **Adobe Color**: https://color.adobe.com/

## Детальна документація

Див. `THEME_CUSTOMIZATION.md` для повної документації з прикладами.

## Ключові переваги

✅ **Три рівні переопределення** - гнучкість для будь-яких потреб
✅ **Нема конфліктів з Tailwind** - префікс `ds-` для SCSS utilities
✅ **Готові схеми** - 5 палітр "з коробки"
✅ **Міксіни** - легке створення тем
✅ **HSL формат** - інтуїтивна робота з кольорами
✅ **Utility класи** - швидкий доступ до кольорів теми
✅ **Підтримка темної теми** - автоматична
✅ **Data-атрибути** - динамічна зміна тем

## Troubleshooting

### Зміни не застосовуються
1. Перевірте порядок імпорту в `main.scss`
2. Перезапустіть dev сервер: `npm run dev`
3. Очистіть cache: `rm -rf .next`

### Конфлікт з Tailwind
Використовуйте префікс `ds-` для SCSS класів або Tailwind класи без префіксу.

### Колір не змінюється
Перевірте формат HSL: `220 100% 50%` (без ком, з пробілами).
