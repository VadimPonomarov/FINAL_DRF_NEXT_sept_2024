# Швидке виправлення конфліктів React 18-19

## 🚨 Якщо при `npm install` виникають помилки про React:

### Рішення 1: Використовуйте правильний флаг

```bash
npm install --legacy-peer-deps
```

### Рішення 2: Повне очищення та переустановка

```bash
# Видаліть залежності та lock файл
rm -rf node_modules package-lock.json

# Очистіть кеш npm
npm cache clean --force

# Встановіть заново з правильним флагом
npm install --legacy-peer-deps
```

### Рішення 3: Для нових пакетів

Завжди встановлюйте нові пакети з флагом:

```bash
npm install <package-name> --legacy-peer-deps
```

## ✅ Перевірка налаштувань

### Переконайтеся, що файл `.npmrc` містить:

```
legacy-peer-deps=true
```

### Переконайтеся, що `package.json` містить:

```json
"overrides": {
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "@types/react": "^19.1.9",
  "@types/react-dom": "^19"
}
```

## 📝 Примітки

- **Не потрібно** міняти версію React на 18
- **Overrides** примусово використовують React 19 для всіх залежностей
- **legacy-peer-deps** дозволяє npm ігнорувати застарілі peer dependencies
- Всі ці налаштування вже додані в проект

## 🔍 Детальна документація

Для детальної інформації дивіться [REACT_COMPATIBILITY.md](./REACT_COMPATIBILITY.md)

