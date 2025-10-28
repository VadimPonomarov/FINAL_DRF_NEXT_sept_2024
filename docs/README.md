# 📚 Документація проекту

Детальна технічна документація для Full-Stack Навчальної Платформи.

---

## 📋 Зміст

### 🔐 Автентифікація та Безпека

- **[MULTI_LEVEL_AUTH_ARCHITECTURE.md](MULTI_LEVEL_AUTH_ARCHITECTURE.md)**  
  Повна документація трирівневої системи автентифікації (Middleware + HOC + fetchWithAuth)
  
- **[OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md)**  
  Налаштування OAuth провайдерів та криптозахист ключів через Fernet

### ⚙️ Конфігурація

- **[ENV_ARCHITECTURE.md](ENV_ARCHITECTURE.md)**  
  Архітектура змінних оточення, централізована система, конфігурація для різних середовищ

### 🐘 Troubleshooting

- **[POSTGRESQL_TROUBLESHOOTING.md](POSTGRESQL_TROUBLESHOOTING.md)**  
  Вирішення проблем з PostgreSQL (unhealthy container, порти, volumes)

### 📸 Ресурси

- **[screenshots/](screenshots/)**  
  Скріншоти для документації та UI компонентів

---

## 🎯 Структура документації

```
docs/
├── README.md (цей файл)           # Індекс документації
│
├── 🔐 Автентифікація
│   ├── MULTI_LEVEL_AUTH_ARCHITECTURE.md
│   └── OAUTH_SETUP_GUIDE.md
│
├── ⚙️ Конфігурація
│   └── ENV_ARCHITECTURE.md
│
├── 🆘 Troubleshooting
│   └── POSTGRESQL_TROUBLESHOOTING.md
│
└── 📸 Ресурси
    └── screenshots/
```

---

## 🔍 Швидкий пошук

### Шукаєте як налаштувати...

- **OAuth (Google)?** → [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md)
- **Змінні оточення?** → [ENV_ARCHITECTURE.md](ENV_ARCHITECTURE.md)
- **Автентифікацію?** → [MULTI_LEVEL_AUTH_ARCHITECTURE.md](MULTI_LEVEL_AUTH_ARCHITECTURE.md)

### Проблеми з...

- **PostgreSQL не запускається?** → [POSTGRESQL_TROUBLESHOOTING.md](POSTGRESQL_TROUBLESHOOTING.md)
- **React 18/19 конфлікти?** → [Головний README - Troubleshooting](../README.md#-troubleshooting-вирішення-проблем)
- **Docker помилки?** → [Головний README - Troubleshooting](../README.md#-docker-проблеми)

---

## 📖 Основна документація

Для загальної інформації про проект, встановлення та швидкий старт:

👉 **[Головний README.md](../README.md)**

Там ви знайдете:
- 🚀 Швидкий старт (клонування + запуск)
- 🏗️ Архітектуру проекту
- ⚙️ Змінні оточення (практичні сценарії)
- 📊 Автоматичне наповнення БД
- 🆘 Повний Troubleshooting guide
- 🛠️ Розробка та корисні команди

---

## 🤝 Внесок у документацію

Знайшли помилку або хочете покращити документацію?

1. Створіть Issue на GitHub
2. Опишіть проблему або пропозицію
3. Або створіть Pull Request з виправленнями

**Принципи документації:**
- ✅ **DRY** - без дублювання
- ✅ **Українська мова** - для доступності
- ✅ **Актуальність** - відповідність поточному коду
- ✅ **Практичність** - реальні приклади, не теорія
- ✅ **Структурованість** - логічна організація

---

## 📝 Changelog документації

### 2024-10 - Велике оновлення
- ♻️ Видалено дублікати автентифікації (ARCHITECTURE_AUTH.md, AUTORIA_AUTH_ARCHITECTURE.md)
- ♻️ Видалено технічні імплементації (AI_IMAGE_*, ASYNC_IMAGE_*, CACHING_*, CELERY_*)
- ♻️ Видалено застарілі документи (DOCUMENTATION_ARCHITECTURE.md, PG_DIRECTORY_EXPLANATION.md)
- 🇺🇦 Перекладено OAUTH_SETUP_GUIDE.md на українську
- ➕ Додано інформацію про Fernet криптозахист
- ➕ Створено індексний README.md в docs/
- 📝 Розширено головний README.md (змінні оточення, troubleshooting)
- 🎯 Змінено фокус з "AutoRia Clone" на "Full-Stack Навчальна Платформа"

---

**Назад до:** [Головний README](../README.md)

