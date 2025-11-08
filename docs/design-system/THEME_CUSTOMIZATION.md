# Керівництво з налаштування тем

## Огляд системи

Система підтримує **три рівні переопределення стилів**:

1. **Global** - глобальні зміни для всього сайту
2. **Local** - зміни для окремих сторінок/секцій  
3. **Module** - зміни для конкретних компонентів

## Порядок пріоритетів (від найнижчого до найвищого)

```
1. Токени (_variables.scss)
2. Tailwind base стилі
3. SCSS компоненти (components/)
4. Глобальні переопределення (_global-overrides.scss)
5. Локальні переопределення (_local-overrides.scss)
6. Модульні переопределення (_module-overrides.scss)
7. Tailwind utilities (має найвищий пріоритет)
```

## Рівень 1: Глобальне переопределення

### Файл: `themes/_global-overrides.scss`

Змініть кольори для всього сайту:

```scss
// themes/_global-overrides.scss
:root {
  // Змінити primary колір на зелений
  --color-primary: 142 70% 45%;
  --color-primary-foreground: 0 0% 100%;
  
  // Змінити accent колір
  --color-accent: 280 65% 60%;
  --color-accent-foreground: 0 0% 100%;
}
```

### Готові палітри

Розкоментуйте одну зі схем:

```scss
// Схема 1: Синьо-зелена (Tech)
:root {
  --color-primary: 200 100% 50%;
  --color-accent: 142 70% 45%;
  --color-success: 142 70% 45%;
}

// Схема 2: Фіолетово-рожева (Creative)
:root {
  --color-primary: 280 65% 60%;
  --color-accent: 330 85% 65%;
  --color-success: 142 70% 45%;
}

// Схема 3: Помаранчево-червона (Energy)
:root {
  --color-primary: 15 100% 55%;
  --color-accent: 45 100% 55%;
  --color-success: 142 70% 45%;
}
```

### Зміна радіусів

```scss
:root {
  // Для повністю квадратних компонентів
  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
  
  // Для дуже округлих компонентів
  --radius-sm: 0.75rem;
  --radius-md: 1rem;
  --radius-lg: 1.5rem;
}
```

### Зміна тіней

```scss
:root {
  // М'які тіні
  --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.05);
  --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.1);
  
  // Контрастні тіні
  --shadow-sm: 0 2px 4px 0 hsl(0 0% 0% / 0.15);
  --shadow-md: 0 6px 12px -2px hsl(0 0% 0% / 0.25);
}
```

## Рівень 2: Локальне переопределення

### Файл: `themes/_local-overrides.scss`

Створіть унікальну тему для секції або сторінки:

```scss
// themes/_local-overrides.scss

// Приклад 1: Адмін-панель
.admin-section {
  @include local-theme(
    $primary: 280 65% 60%,
    $accent: 330 85% 65%,
    $background: 240 10% 10%,
    $foreground: 0 0% 95%
  );
}

// Приклад 2: Маркетингова сторінка
.marketing-page {
  @include local-theme(
    $primary: 15 100% 55%,
    $accent: 45 100% 55%,
    $background: 0 0% 100%
  );
}
```

### Використання в HTML

```tsx
<div className="admin-section">
  <button data-component="button" data-variant="primary">
    Кнопка з локальною темою
  </button>
</div>
```

### Теми через data-атрибути

```scss
// themes/_local-overrides.scss

[data-theme="brand"] {
  @include local-theme(
    $primary: 350 100% 50%,
    $accent: 200 100% 45%
  );
}

[data-theme="premium"] {
  @include local-theme(
    $primary: 280 100% 40%,
    $accent: 45 100% 50%
  );
}
```

```tsx
// Використання
<section data-theme="brand">
  <h1>Брендова секція</h1>
  <button data-component="button" data-variant="primary">
    Кнопка
  </button>
</section>
```

### Тематичні секції

```scss
// Секція з акцентним кольором
.hero-section {
  @include theme-palette((
    'background': 221 83% 53%,
    'foreground': 0 0% 100%,
    'primary': 0 0% 100%,
    'primary-foreground': 221 83% 53%
  ));
}

// Секція з темним фоном
.dark-section {
  @include theme-palette((
    'background': 240 10% 8%,
    'foreground': 0 0% 95%,
    'card': 240 10% 12%
  ));
}
```

## Рівень 3: Модульне переопределення

### Файл: `themes/_module-overrides.scss`

Створіть унікальні стилі для конкретного компонента:

```scss
// themes/_module-overrides.scss

// Кнопка з особливим кольором
.button-success {
  @include module-theme(primary, 142 70% 45%, 0 0% 100%);
  
  &[data-component="button"] {
    background-color: hsl(var(--color-primary));
    color: hsl(var(--color-primary-foreground));
    
    @include hover {
      background-color: hsl(142 70% 40%);
    }
  }
}

// Градієнтна кнопка
.button-gradient {
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

### Використання

```tsx
<button 
  data-component="button"
  data-variant="primary"
  className="button-success"
>
  Success Button
</button>

<button 
  data-component="button"
  className="button-gradient"
>
  Gradient Button
</button>
```

### Картки з особливими стилями

```scss
.card-accent {
  @include module-theme(card, 221 83% 98%, 221 83% 15%);
  
  &[data-component="card"] {
    background-color: hsl(var(--color-card));
    color: hsl(var(--color-card-foreground));
    border-color: hsl(221 83% 90%);
  }
}
```

## Формат кольорів HSL

Всі кольори використовують формат **HSL** (Hue Saturation Lightness):

```
H S L
220 100% 50%
│   │    │
│   │    └─ Яскравість (0-100%)
│   └────── Насиченість (0-100%)
└────────── Відтінок (0-360°)
```

### Приклади кольорів:

```scss
// Червоний
0 84% 60%

// Помаранчевий
15 100% 55%

// Жовтий
45 93% 47%

// Зелений
142 70% 45%

// Синій
221 83% 53%

// Фіолетовий
280 65% 60%

// Рожевий
330 85% 65%

// Сірий
240 5% 64%

// Чорний
0 0% 10%

// Білий
0 0% 100%
```

## Розв'язання конфліктів з Tailwind

### Проблема

SCSS та Tailwind можуть генерувати однакові класи (`.flex`, `.grid`).

### Рішення

SCSS utility класи тепер мають префікс `ds-`:

```tsx
// Раніше (конфлікт):
<div className="flex gap-4">  {/* Конфлікт між SCSS та Tailwind */}

// Тепер (без конфлікту):
<div className="ds-flex ds-gap-4">  {/* SCSS */}
<div className="flex gap-4">        {/* Tailwind */}
```

### Рекомендації

1. **Для layout** - використовуйте Tailwind (`flex`, `grid`, `gap-4`)
2. **Для компонентів** - використовуйте SCSS (`data-component="button"`)
3. **Для теми** - використовуйте систему переопределення

## Практичні приклади

### Приклад 1: Змінити primary колір глобально

```scss
// themes/_global-overrides.scss
:root {
  --color-primary: 142 70% 45%;  // Зелений
  --color-primary-foreground: 0 0% 100%;
}
```

Результат: всі кнопки з `data-variant="primary"` стануть зеленими.

### Приклад 2: Особлива тема для dashboard

```scss
// themes/_local-overrides.scss
[data-page="dashboard"] {
  @include local-theme(
    $primary: 200 100% 50%,
    $accent: 142 70% 45%,
    $background: 240 10% 98%
  );
}
```

```tsx
// app/dashboard/page.tsx
<div data-page="dashboard">
  <h1>Dashboard</h1>
  <button data-component="button" data-variant="primary">
    Кнопка з локальною темою
  </button>
</div>
```

### Приклад 3: Особлива кнопка для CTA

```scss
// themes/_module-overrides.scss
.cta-button {
  @include module-theme(primary, 15 100% 55%, 0 0% 100%);
  
  &[data-component="button"] {
    background-color: hsl(var(--color-primary));
    color: hsl(var(--color-primary-foreground));
    font-size: 1.125rem;
    padding: spacing(6) spacing(12);
    
    @include hover {
      background-color: hsl(15 100% 50%);
      transform: translateY(-2px);
    }
  }
}
```

```tsx
<button 
  data-component="button"
  className="cta-button"
>
  Get Started Now
</button>
```

### Приклад 4: Секція з темним фоном

```scss
// themes/_local-overrides.scss
.pricing-section {
  @include theme-palette((
    'background': 240 10% 8%,
    'foreground': 0 0% 95%,
    'card': 240 10% 12%,
    'card-foreground': 0 0% 95%,
    'primary': 221 83% 63%,
    'border': 240 10% 20%
  ));
  
  padding: spacing(20) spacing(6);
}
```

```tsx
<section className="pricing-section">
  <h2>Pricing Plans</h2>
  <div data-component="card">
    <h3 className="card-title">Pro Plan</h3>
    <p className="card-description">$29/month</p>
    <button data-component="button" data-variant="primary">
      Subscribe
    </button>
  </div>
</section>
```

## Швидкий старт

### Крок 1: Вибрати рівень переопределення

- **Глобальні зміни** → `_global-overrides.scss`
- **Зміни для сторінки** → `_local-overrides.scss`
- **Зміни для компонента** → `_module-overrides.scss`

### Крок 2: Відкрити потрібний файл

```bash
# Глобальні зміни
frontend/src/design-system/themes/_global-overrides.scss

# Локальні зміни
frontend/src/design-system/themes/_local-overrides.scss

# Модульні зміни
frontend/src/design-system/themes/_module-overrides.scss
```

### Крок 3: Розкоментувати приклад або додати свій

```scss
// Розкоментувати готовий приклад
.admin-section {
  @include local-theme(
    $primary: 280 65% 60%
  );
}

// Або створити власний
.my-section {
  @include local-theme(
    $primary: 350 100% 50%,
    $accent: 45 100% 55%
  );
}
```

### Крок 4: Застосувати в HTML

```tsx
<div className="my-section">
  <button data-component="button" data-variant="primary">
    Кнопка з новою темою
  </button>
</div>
```

## Підтримка темної теми

Всі переопределення автоматично працюють з темною темою:

```scss
// Для світлої теми
:root {
  --color-primary: 142 70% 45%;
}

// Для темної теми
.dark {
  --color-primary: 142 70% 55%;  // Трохи світліше для темної теми
}
```

## Інструменти для підбору кольорів

- [HSL Color Picker](https://hslpicker.com/)
- [Coolors](https://coolors.co/) - генератор палітр
- [Adobe Color](https://color.adobe.com/) - колірні схеми
- DevTools → Вибір кольору в браузері

## Troubleshooting

### Зміни не застосовуються

1. Перевірте, чи файл імпортується в `main.scss`
2. Перевірте порядок імпорту (переопределення повинні бути після базових стилів)
3. Перезапустіть dev сервер: `npm run dev`

### Конфлікт з Tailwind

Використовуйте префікс `ds-` для SCSS utilities або Tailwind класи.

### Неправильний колір

Перевірте формат HSL: `H S L` (без коми, з пробілами)

```scss
// ✅ Правильно
--color-primary: 221 83% 53%;

// ❌ Неправильно
--color-primary: hsl(221, 83%, 53%);
--color-primary: 221, 83%, 53%;
```
