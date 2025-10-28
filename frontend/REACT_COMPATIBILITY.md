# Запобігання конфліктам сумісності React 18-19

## Проблема

Деякі бібліотеки в проекті можуть мати peer dependencies на React 18, але проект використовує React 19. Це може призвести до конфліктів при встановленні залежностей.

## Рішення

### 1. Налаштування в `package.json`

Додано розділ `overrides` для примусового використання React 19:

```json
"overrides": {
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "@types/react": "^19.1.9",
  "@types/react-dom": "^19"
}
```

Це гарантує, що всі пакети, які залежать від React, будуть використовувати саме React 19.

### 2. Налаштування в `.npmrc`

Файл `.npmrc` містить:

```
legacy-peer-deps=true
```

Це дозволяє npm ігнорувати конфлікти peer dependencies і встановлювати пакети навіть якщо їх peer dependencies не повністю задоволені.

### 3. Використання в командах

При встановленні залежностей завжди використовуємо флаг `--legacy-peer-deps`:

```bash
npm install --legacy-peer-deps
```

### 4. Dockerfile

У Dockerfile використовується:

```dockerfile
RUN npm ci --legacy-peer-deps
```

### 5. Deploy скрипт

Скрипт `deploy.py` автоматично використовує правильні флаги при встановленні залежностей.

## Перевірка

Після внесення змін виконайте:

```bash
# Видаліть існуючі залежності
rm -rf node_modules package-lock.json

# Встановіть заново
npm install --legacy-peer-deps

# Перевірте на попередження
npm ls react react-dom
```

## Що робити при помилках

Якщо ви отримуєте помилки про конфлікти peer dependencies:

1. **Переконайтеся**, що `.npmrc` містить `legacy-peer-deps=true`
2. **Використовуйте** `--legacy-peer-deps` при встановленні нових пакетів
3. **Очистіть** кеш npm: `npm cache clean --force`
4. **Видаліть** `node_modules` та `package-lock.json`
5. **Встановіть** залежності заново: `npm install --legacy-peer-deps`

## Сумісність бібліотек

Більшість сучасних бібліотек сумісні з React 19. Якщо ви стикаєтеся з проблемами:

- Перевірте, чи є оновлена версія бібліотеки
- Шукайте альтернативні бібліотеки, які підтримують React 19
- Використовуйте `overrides` для примусового використання React 19

## Додаткова інформація

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [npm overrides documentation](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
- [legacy-peer-deps flag](https://docs.npmjs.com/cli/v8/using-npm/config#legacy-peer-deps)

