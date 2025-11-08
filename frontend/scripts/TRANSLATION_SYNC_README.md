# Translation Synchronization Guide

## Проблема
- Отсутствуют переводы для форм логина и регистрации (включая placeholders)
- Есть дубликаты ключей в файлах переводов
- Файлы переводов не синхронизированы
- Ключи не отсортированы

## Решение

### 1. Добавлены переводы для форм логина/регистрации ✅

Добавлены следующие ключи в `en.ts`, `ru.ts`, `uk.ts`:
- `auth.login`, `auth.register`
- `auth.email`, `auth.emailPlaceholder`
- `auth.password`, `auth.passwordPlaceholder`
- `auth.confirmPassword`, `auth.confirmPasswordPlaceholder`
- `auth.username`, `auth.usernamePlaceholder`
- `auth.reset`, `auth.submit`
- `auth.loginSuccess`, `auth.loginFailed`
- `auth.passwordsDoNotMatch`
- `auth.validationError`, `auth.validationErrorDescription`
- `auth.selectAuthType`
- `auth.sessionDuration`, `auth.minutes`

### 2. Обновлены формы для использования переводов ✅

- `LoginForm.tsx` - использует `useI18n()` для всех текстов
- `RegistrationForm.tsx` - использует `useI18n()` для всех текстов
- `FormFieldsRenderer.tsx` - автоматически переводит labels и placeholders
- `formFields.config.ts` - оба файла используют ключи переводов

### 3. Удаление дубликатов и сортировка

Для полной синхронизации (удаление дубликатов, сортировка) рекомендуется:

#### Вариант 1: Использовать IDE
1. Открыть файлы `en.ts`, `ru.ts`, `uk.ts`
2. Использовать функцию "Sort lines" или "Format Document"
3. Вручную проверить и удалить дубликаты

#### Вариант 2: Использовать скрипт (требует доработки)

Скрипт `sync-translations-full.mjs` создан, но требует:
- Установки TypeScript парсера (например, `@typescript-eslint/parser`)
- Или использования более безопасного метода парсинга

#### Вариант 3: Ручная синхронизация

1. Открыть все три файла переводов
2. Найти все дубликаты ключей (использовать поиск в IDE)
3. Удалить дубликаты, оставив только один экземпляр
4. Отсортировать ключи в каждом объекте по алфавиту
5. Убедиться, что все три файла имеют одинаковые ключи

### 4. Проверка синхронизации

После синхронизации проверить:
- Все три файла имеют одинаковый набор ключей
- Нет дубликатов ключей
- Ключи отсортированы по алфавиту
- Все переводы заполнены (нет пустых значений)

## Структура ключей auth

```typescript
auth: {
  login: "...",
  register: "...",
  email: "...",
  emailPlaceholder: "...",
  password: "...",
  passwordPlaceholder: "...",
  confirmPassword: "...",
  confirmPasswordPlaceholder: "...",
  username: "...",
  usernamePlaceholder: "...",
  reset: "...",
  submit: "...",
  loginSuccess: "...",
  loginFailed: "...",
  passwordsDoNotMatch: "...",
  validationError: "...",
  validationErrorDescription: "...",
  selectAuthType: "...",
  sessionDuration: "...",
  minutes: "...",
  // ... остальные ключи
}
```

## Примечания

- Файлы переводов очень большие (3000+ строк)
- Полная автоматизация требует TypeScript парсера
- Рекомендуется использовать IDE для сортировки и поиска дубликатов
- После синхронизации протестировать формы в всех трех языках

