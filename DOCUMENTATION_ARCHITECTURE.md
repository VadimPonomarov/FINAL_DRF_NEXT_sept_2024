# 📐 Архітектура Документації AutoRia

## 🎯 Огляд

Цей документ описує організацію та структуру всієї документації проекту AutoRia, принципи її побудови та навігаційні шляхи для різних типів користувачів.

---

## 📊 Принципи Організації

### 1. **Три Рівні Документації**

```
┌─────────────────────────────────────────────────────────────┐
│                    РІВЕНЬ 1: КОРІНЬ ПРОЕКТУ                  │
│  Базова інформація для швидкого старту та огляду            │
├─────────────────────────────────────────────────────────────┤
│  • README.md           - Огляд проекту                       │
│  • SETUP.md            - Покрокове встановлення              │
│  • ENV_SETUP.md        - Environment налаштування            │
│  • DOCUMENTATION_ARCHITECTURE.md - Цей документ              │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│              РІВЕНЬ 2: ТЕМАТИЧНІ ГАЙДИ (docs/)               │
│  Детальна документація по темах                              │
├─────────────────────────────────────────────────────────────┤
│  • docs/README.md                - Індекс документації       │
│  • docs/BACKEND_API_GUIDE.md     - REST API                  │
│  • docs/BACKEND_SERVICES.md      - Сервіси                   │
│  • docs/SETUP_GUIDE.md           - API Keys                  │
│  • docs/INFRASTRUCTURE_SETUP.md  - Docker/Redis/Nginx        │
│  • docs/TROUBLESHOOTING.md       - Вирішення проблем         │
└─────────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│         РІВЕНЬ 3: СПЕЦИФІЧНА ДОКУМЕНТАЦІЯ СЕРВІСІВ           │
│  Технічна документація компонентів                           │
├─────────────────────────────────────────────────────────────┤
│  • backend/README.md             - Django REST API           │
│  • frontend/README.md            - Next.js додаток           │
│  • backend/POSTMAN_TESTING_GUIDE.md - API тестування         │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Відсутність Дублювання**

- **Корінь** → Загальна інформація, quick start
- **docs/** → Детальні тематичні гайди
- **Сервіси** → Технічні деталі конкретного компонента

Кожен рівень посилається на інші, але не дублює контент.

### 3. **Мова: Українська 🇺🇦**

Вся документація написана українською мовою для кращої доступності.

---

## 📁 Структура Документації

### Рівень 1: Корінь Проекту (Quick Start)

```
/
├── README.md                           # 🏠 Головна точка входу
│   ├── Що це за проект?
│   ├── Ключові особливості (AI модерація, валюти, геокодинг)
│   ├── Технологічний стек
│   ├── Швидкий старт (Docker/Manual)
│   ├── API endpoints (короткий список)
│   ├── Тестування (quick overview)
│   └── Посилання на детальну документацію
│
├── SETUP.md                            # ⚙️ Покрокове встановлення
│   ├── Передумови (Python, Node, Docker)
│   ├── Варіанти встановлення:
│   │   ├── Docker Compose (рекомендовано)
│   │   └── Локальне (manual)
│   ├── Ініціалізація БД (міграції, тестові дані)
│   ├── API Keys (короткий огляд)
│   ├── Перевірка встановлення
│   ├── Швидкі команди
│   ├── Типові проблеми
│   └── Чек-лист встановлення
│
├── ENV_SETUP.md                        # 🔐 Environment Variables
│   ├── Структура env файлів
│   ├── Backend environment (.env.base, .env.secrets)
│   ├── Frontend environment (.env.local)
│   ├── Docker environment (.env.docker)
│   ├── API Keys та секрети:
│   │   ├── Google Maps API
│   │   ├── Email SMTP
│   │   ├── NBU/PrivatBank API
│   │   └── DummyJSON
│   ├── Шифрування секретів
│   ├── Приклади конфігурацій (dev/prod)
│   ├── Чек-лист налаштування
│   └── Troubleshooting env проблем
│
└── DOCUMENTATION_ARCHITECTURE.md       # 📐 Цей документ
    └── Опис організації документації
```

**Призначення**: Швидкий старт для нових користувачів. Мінімум інформації для запуску проекту.

---

### Рівень 2: Тематичні Гайди (docs/)

```
docs/
├── README.md                           # 📚 Індекс документації
│   ├── Структура документації
│   ├── Навчальні шляхи:
│   │   ├── Для нових розробників (3 дні)
│   │   ├── Для Backend розробників
│   │   ├── Для Frontend розробників
│   │   └── Для DevOps
│   ├── Ключові особливості (детально)
│   ├── Швидкі посилання (Swagger, Flower, GitHub)
│   └── Історія змін документації
│
├── BACKEND_API_GUIDE.md                # 🔌 REST API Documentation
│   ├── AI/LLM можливості (модерація 58ms)
│   ├── Зовнішні API (NBU, PrivatBank, Google Maps)
│   ├── Система ролей та permissions
│   ├── Суперюзерські endpoints (детально)
│   ├── Фільтрація, пагінація, сортування:
│   │   ├── Фільтри по ціні, локації, характеристиках
│   │   ├── Сортування (10+ полів)
│   │   ├── Пагінація (10-100 items)
│   │   └── Комбіновані запити (приклади)
│   ├── Код імплементації (CarAdFilter, ViewSet)
│   └── Best practices
│
├── BACKEND_SERVICES.md                 # 🔧 Фонові Сервіси
│   ├── Система модерації:
│   │   ├── Hard-block словник (161 слово, 4 мови)
│   │   ├── Виявлення транслітерації
│   │   ├── Виявлення маскування
│   │   ├── Контекстний аналіз (LLM)
│   │   └── Технічна реалізація (код)
│   ├── Celery періодичні задачі:
│   │   ├── Очистка медіа (щотижня)
│   │   ├── Очистка токенів (щодня)
│   │   ├── Ручний запуск
│   │   └── Моніторинг (Flower)
│   ├── Система генерації мокових даних:
│   │   ├── Автоматичне створення (Docker)
│   │   ├── Ручні команди
│   │   └── LLM-генератор
│   └── Логування та моніторинг
│
├── SETUP_GUIDE.md                      # ⚙️ Налаштування Сервісів
│   ├── Система шифрування та безпека
│   ├── Google Maps API (детально):
│   │   ├── Отримання ключа
│   │   ├── Backend налаштування
│   │   └── Frontend налаштування
│   ├── Валютні API (NBU + PrivatBank)
│   ├── OAuth 2.0 налаштування
│   ├── AI генерація зображень (g4f)
│   ├── Email налаштування (Gmail SMTP)
│   ├── i18n система (uk/ru/en)
│   ├── Початкове seeding (генерація даних)
│   └── Чек-лист налаштування
│
├── INFRASTRUCTURE_SETUP.md             # 🐳 Infrastructure
│   ├── Docker Compose:
│   │   ├── Базова структура
│   │   ├── Команди Docker
│   │   └── Multi-service setup
│   ├── Redis налаштування:
│   │   ├── Backend конфігурація
│   │   ├── Frontend конфігурація
│   │   └── Використання (приклади)
│   ├── Nginx reverse proxy:
│   │   ├── Базова конфігурація
│   │   ├── WebSocket підтримка
│   │   └── Static/Media files
│   ├── PostgreSQL:
│   │   ├── Backup та Restore
│   │   └── Performance налаштування
│   ├── Environment Variables (детально)
│   ├── Моніторинг та логування
│   ├── Production deployment:
│   │   ├── Dockerfile оптимізації
│   │   ├── Gunicorn налаштування
│   │   └── Production checklist
│   └── Security best practices
│
└── TROUBLESHOOTING.md                  # 🔧 Вирішення Проблем
    ├── Проблеми з автентифікацією (401, sessions)
    ├── CORS помилки
    ├── Проблеми з редіректами
    ├── Проблеми з зображеннями (AI generation, upload)
    ├── Docker та Infrastructure:
    │   ├── Redis connection refused
    │   ├── PostgreSQL connection errors
    │   └── Network issues
    ├── Frontend problems:
    │   ├── Build fails
    │   └── Cache issues
    └── Посилання на інші гайди
```

**Призначення**: Детальна тематична документація. Розділена по областях для легкого пошуку.

---

### Рівень 3: Специфічна Документація Сервісів

```
backend/
├── README.md                           # 🔧 Django Backend Guide
│   ├── Особливості (AI, валюти, геокодинг)
│   ├── Вимоги та встановлення
│   ├── Структура backend/
│   ├── Django Apps (детально):
│   │   ├── apps/ads/ - Оголошення
│   │   ├── apps/auth/ - Автентифікація
│   │   ├── apps/currency/ - Валюти
│   │   └── apps/users/ - Користувачі
│   ├── Services (приклади коду):
│   │   ├── llm_moderation.py
│   │   ├── currency services
│   │   └── geocoding service
│   ├── Management commands
│   ├── Testing (Django + Postman)
│   ├── Security
│   └── Performance
│
└── POSTMAN_TESTING_GUIDE.md            # 🧪 API Тестування
    ├── Швидкий старт
    ├── Доступні колекції (5 штук)
    ├── Автоматична ініціалізація
    ├── Запуск через Newman:
    │   ├── Базові команди
    │   ├── Параметри Newman
    │   └── Запуск конкретних груп
    ├── Структура колекцій (scripts)
    ├── Відладка та вирішення проблем
    ├── Інтерпретація результатів
    ├── Best practices
    └── Додавання нових тестів

frontend/
└── README.md                           # 🎨 Next.js Frontend Guide
    ├── Особливості (NextAuth, i18n, Dark mode, WebSocket)
    ├── Вимоги та встановлення
    ├── Налаштування (.env.local)
    ├── Структура frontend/
    ├── Ключові компоненти:
    │   ├── CarAdCard
    │   ├── ModerationPage
    │   └── ChatBot
    ├── State Management (Context API):
    │   ├── AuthContext
    │   ├── RedisAuthContext
    │   ├── I18nContext
    │   └── ThemeContext
    ├── API Integration (fetchWithAuth)
    ├── Styling (Tailwind + shadcn/ui)
    ├── Performance optimization (memoization)
    ├── Testing (Jest + Playwright)
    └── Build analysis
```

**Призначення**: Технічна документація для розробників, що працюють з конкретним сервісом.

---

## 🗺️ Навігаційні Шляхи

### Для Нових Користувачів (День 1)

```
START → README.md
  ↓
  Зацікавився проектом?
  ↓
SETUP.md → ENV_SETUP.md
  ↓
  Запустив проект!
  ↓
docs/README.md → Вибрати навчальний шлях
```

### Для Backend Розробників

```
backend/README.md → docs/BACKEND_API_GUIDE.md
  ↓
docs/BACKEND_SERVICES.md
  ↓
backend/POSTMAN_TESTING_GUIDE.md
  ↓
docs/TROUBLESHOOTING.md (при потребі)
```

### Для Frontend Розробників

```
frontend/README.md → docs/SETUP_GUIDE.md (i18n секція)
  ↓
docs/BACKEND_API_GUIDE.md (API endpoints)
  ↓
docs/TROUBLESHOOTING.md (Frontend секція)
```

### Для DevOps

```
docs/INFRASTRUCTURE_SETUP.md
  ↓
ENV_SETUP.md (Production конфіги)
  ↓
docs/TROUBLESHOOTING.md (Docker секція)
```

### При Проблемах

```
docs/TROUBLESHOOTING.md
  ↓
  Не знайшли рішення?
  ↓
Шукати в конкретному гайді:
  - SETUP.md (встановлення)
  - ENV_SETUP.md (environment)
  - docs/INFRASTRUCTURE_SETUP.md (Docker/Redis)
```

---

## 🎯 Тематична Організація

### Фізична Структура vs Тематична

**Фізична** (де файли):
```
/
├── README.md, SETUP.md, ENV_SETUP.md
├── docs/
│   └── 6 тематичних файлів
├── backend/
│   ├── README.md
│   └── POSTMAN_TESTING_GUIDE.md
└── frontend/
    └── README.md
```

**Тематична** (як шукати інформацію):

#### 1. **Встановлення та Налаштування**
- `SETUP.md` → Покрокова інструкція
- `ENV_SETUP.md` → Environment variables
- `docs/SETUP_GUIDE.md` → API keys та сервіси
- `docs/INFRASTRUCTURE_SETUP.md` → Docker/Redis/Nginx

#### 2. **Backend Development**
- `backend/README.md` → Огляд Django backend
- `docs/BACKEND_API_GUIDE.md` → REST API endpoints
- `docs/BACKEND_SERVICES.md` → LLM, Celery, мок дані
- `backend/POSTMAN_TESTING_GUIDE.md` → API тестування

#### 3. **Frontend Development**
- `frontend/README.md` → Огляд Next.js frontend
- `docs/BACKEND_API_GUIDE.md` → API для інтеграції
- `docs/TROUBLESHOOTING.md` → Frontend проблеми

#### 4. **Infrastructure та DevOps**
- `docs/INFRASTRUCTURE_SETUP.md` → Повне керівництво
- `ENV_SETUP.md` → Production конфіги
- `docs/TROUBLESHOOTING.md` → Docker проблеми

#### 5. **Вирішення Проблем**
- `docs/TROUBLESHOOTING.md` → Головний файл
- `SETUP.md` → Типові проблеми встановлення
- `ENV_SETUP.md` → Environment проблеми

---

## 📝 Конвенції Написання

### 1. **Структура Кожного Документа**

```markdown
# 🎯 Назва - Короткий Опис

## 📋 Зміст (якщо файл > 200 рядків)

## 🎯 Огляд
[Що це за документ, для кого він]

## [Основні Секції]
[Тематичний контент]

---

## 📚 Пов'язані документи
- [Інші гайди](./links.md)

---

**Версія**: X.X  
**Останнє оновлення**: YYYY-MM-DD  
**Мова**: Українська 🇺🇦
```

### 2. **Емодзі для Навігації**

- 📋 Зміст
- 🎯 Огляд/Мета
- ✨ Особливості
- 🚀 Швидкий старт
- ⚙️ Налаштування
- 🔧 Інструменти
- 📁 Структура
- 🧪 Тестування
- 🚨 Проблеми
- ✅ Чек-лист
- 📚 Посилання

### 3. **Код-блоки**

```markdown
# Завжди вказувати мову
```bash
docker-compose up
```

```python
def example():
    pass
```

```typescript
const example = () => {}
```
```

### 4. **Посилання**

```markdown
# Відносні посилання (для внутрішньої документації)
[Setup Guide](./SETUP.md)
[Backend Guide](./backend/README.md)
[Docs Index](./docs/README.md)

# Абсолютні посилання (для зовнішніх ресурсів)
[Django Docs](https://docs.djangoproject.com/)
```

---

## 🔄 Підтримка Документації

### Коли Оновлювати

1. **Зміни в коді** → Оновити відповідну документацію
2. **Нові features** → Додати в README.md + тематичний гайд
3. **Зміни в API** → Оновити BACKEND_API_GUIDE.md
4. **Нові environment variables** → Оновити ENV_SETUP.md
5. **Зміни в infrastructure** → Оновити INFRASTRUCTURE_SETUP.md

### Процес Оновлення

```bash
# 1. Відредагувати файл
vim docs/BACKEND_API_GUIDE.md

# 2. Оновити версію та дату
**Версія**: 2.1  # Інкремент версії
**Останнє оновлення**: 2025-01-26  # Нова дата

# 3. Перевірити посилання
# Переконатися що всі посилання працюють

# 4. Commit з описовим повідомленням
git commit -m "📚 Docs: Update BACKEND_API_GUIDE with new endpoints"
```

### Версіонування

- **Major (X.0)**: Повна реорганізація документації
- **Minor (2.X)**: Додавання нових розділів
- **Patch (2.1.X)**: Виправлення помилок, уточнення

---

## 🎓 Best Practices

### ✅ DO

- Використовувати емодзі для навігації
- Додавати приклади коду
- Посилатися на інші документи
- Тримати документацію актуальною
- Використовувати чек-листи
- Додавати troubleshooting секції

### ❌ DON'T

- Дублювати контент між файлами
- Писати занадто довгі параграфи
- Використовувати застарілі посилання
- Забувати оновлювати версію
- Ігнорувати структуру (заголовки, секції)

---

## 📊 Статистика Документації

### Розміри Файлів

| Файл | Рядків | Категорія |
|------|--------|-----------|
| **Корінь** | | |
| README.md | ~400 | Огляд |
| SETUP.md | ~500 | Встановлення |
| ENV_SETUP.md | ~600 | Конфігурація |
| **docs/** | | |
| BACKEND_API_GUIDE.md | ~350 | Backend |
| BACKEND_SERVICES.md | ~330 | Backend |
| SETUP_GUIDE.md | ~300 | Setup |
| INFRASTRUCTURE_SETUP.md | ~350 | DevOps |
| TROUBLESHOOTING.md | ~280 | Support |
| **Сервіси** | | |
| backend/README.md | ~450 | Backend |
| frontend/README.md | ~500 | Frontend |
| POSTMAN_TESTING_GUIDE.md | ~500 | Testing |

**Всього**: ~4500+ рядків якісної документації

---

## 🔗 Швидкі Посилання

### Початок Роботи
- [README.md](./README.md) - Старт тут!
- [SETUP.md](./SETUP.md) - Встановлення
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment

### Детальна Документація
- [docs/README.md](./docs/README.md) - Індекс
- [docs/BACKEND_API_GUIDE.md](./docs/BACKEND_API_GUIDE.md) - API
- [docs/BACKEND_SERVICES.md](./docs/BACKEND_SERVICES.md) - Сервіси

### Сервіси
- [backend/README.md](./backend/README.md) - Backend
- [frontend/README.md](./frontend/README.md) - Frontend

### Допомога
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Проблеми

---

**Версія**: 1.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦

💡 **Примітка**: Цей документ є мета-документацією. При змінах в структурі документації, оновіть цей файл першим!

