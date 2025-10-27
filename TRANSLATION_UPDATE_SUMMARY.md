# 🌐 Обновление переводов

## Добавлены переводы

### EN (English)
- `"autoria.perPage": "Per page"`
- `"autoria.view": "View"`

### RU (Russian)
- `"autoria.perPage": "На странице"`
- `"autoria.view": "Вид"`

### UK (Ukrainian)
- `"autoria.perPage": "На сторінці"`
- `"autoria.view": "Вигляд"`

## Где используется

### autoria.perPage
Используется для выбора количества элементов на странице:
```tsx
<Select>
  <SelectTrigger>
    <SelectValue>{t('autoria.perPage')}: 20</SelectValue>
  </SelectTrigger>
</Select>
```

### autoria.view
Используется для переключения режима отображения (grid/list):
```tsx
<Button>
  {t('autoria.view')}
</Button>
```

## Файлы изменены

1. ✅ `frontend/src/locales/en.ts` - строки 1386-1387
2. ✅ `frontend/src/locales/ru.ts` - строки 2545-2546
3. ✅ `frontend/src/locales/uk.ts` - строки 2963-2964

## Результат

Теперь все элементы интерфейса на странице поиска переведены на все три языка.

