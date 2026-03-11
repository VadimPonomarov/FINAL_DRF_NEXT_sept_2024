# 🚗 AutoRia Clone - Автомобільний Маркетплейс

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.0+-green.svg)](https://djangoproject.com)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)

> Повнофункціональна платформа для купівлі-продажу автомобілів з інтеграцією зовнішніх API, багатомовною підтримкою та real-time функціоналом.

## 📖 Документація

- **⚡ [Швидкий старт](./QUICKSTART.md)** - розгортання за 5 хвилин
- **📚 [Повна інструкція](./DEPLOYMENT.md)** - детальне керівництво з розгортання
- **🔧 [Ручне налаштування](#ручне-розгортання)** - покрокова інструкція нижче

## Основні можливості

- 🔐 **Жорстка двохрівнева автентифікація** - NextAuth + Backend JWT з fail-secure принципом
- 🛡️ **API Interceptor** - автоматичний refresh токенів при 401/403
- 🌍 **Багатомовність** - українська, російська, англійська з повною синхронізацією
- 🎨 **Адаптивний UI** - сучасний дизайн з Tailwind CSS + shadcn/ui
- 🚗 **Інтеграція AutoRia API** - пошук та деталі автомобілів
- 💬 **Real-time чат** - WebSocket через Django Channels
- 📊 **Адмін панель** - управління оголошеннями та користувачами
- 🔄 **Асинхронні задачі** - Celery для важких операцій
- 📧 **Email сервіс** - автоматичні повідомлення

## Технологічний стек

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript 5.8
- **Стилі**: SCSS, Tailwind CSS
- **State**: Redux Toolkit, React Query
- **Форми**: React Hook Form + Zod

### Backend
- **Framework**: Django 5 + DRF
- **БД**: PostgreSQL
- **Кеш**: Redis
- **Async**: Celery + RabbitMQ
- **WebSocket**: Django Channels
- **Auth**: JWT (Simple JWT)

### Інфраструктура
- Docker + Docker Compose
- Nginx (reverse proxy)
- Git hooks (Husky)

## 🚀 Швидкий старт

### Крок 0: Перевірте середовище (опційно)

Після `git clone` ви можете **одразу запускати** `python deploy.py ...` —
скрипт автоматично виконає повну перевірку середовища
(`scripts/check_environment.py`) і зупинить деплой, якщо щось критично не так.

Якщо хочете окремо подивитися детальну інформацію про середовище або
використовуєте тільки ручний `docker-compose`, можна вручну виконати:

```bash
python scripts/check_environment.py
```

Скрипт перевірить наявність Python, Node.js, npm, Docker CLI та того,
що Docker Engine (daemon) реально запущений. Якщо все ОК – переходьте
до автоматичного розгортання.

### Автоматичне розгортання (рекомендовано)

Виберіть один із способів:

```bash
# Python скрипт
python deploy.py --mode local           # backend у Docker, frontend локально
python deploy.py --mode with_frontend   # повністю у Docker

# Bash скрипт (Linux/Mac)
./deploy.sh

# Node.js скрипт
node deploy.js
```

**📖 Детальна інструкція**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🔧 Ручне розгортання

### Крок 1: Встановіть необхідне ПЗ

**Завантажте та встановіть:**
1. **Docker Desktop** - [завантажити тут](https://www.docker.com/products/docker-desktop/)
   - Після встановлення запустіть Docker Desktop
   - Дочекайтеся зеленого індикатора "Engine running"

2. **Python 3.11+** - [завантажити тут](https://www.python.org/downloads/)
   - При встановленні обов'язково поставте галочку "Add Python to PATH"

3. **Node.js 20+** - [завантажити тут](https://nodejs.org/)
   - Завантажте LTS версію
   - При встановленні залиште всі налаштування за замовчуванням

### Крок 2: Завантажте проект

```bash
# Відкрийте командний рядок (cmd) або PowerShell
# Перейдіть в папку, де хочете зберегти проект (наприклад, C:\Projects)
cd C:\Projects

# Клонуйте репозиторій
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git

# Перейдіть в папку проекту
cd FINAL_DRF_NEXT_sept_2024
```

### Крок 3: Запустіть проект (НАЙПРОСТІШИЙ СПОСІБ)

```bash
# Просто запустіть цю команду та дочекайтеся завершення
python deploy.py --mode local
```

**Що станеться:**
- Автоматично встановляться всі залежності
- Запустяться всі сервіси
- Через 3-5 хвилин проект буде готовий

**Готово!** Відкрийте браузер та перейдіть на http://localhost:3000

### 🆘 Якщо щось пішло не так

**Проблема 1: "python не розпізнається"**
```bash
# Спробуйте замість python:
py deploy.py --mode local
```

**Проблема 2: "Docker не запущений"**
- Запустіть Docker Desktop з робочого столу
- Дочекайтеся зеленого індикатора

**Проблема 3: "Something went wrong" або "invariant expected app router"**
```bash
# Створіть .env.local
python scripts/setup-frontend-env.py

# ЗАВЖДИ очищайте .next перед новою збіркою!
cd frontend
rm -rf .next node_modules/.cache

# Пересоберіть
npm run build && npm run start
```

**Проблема 4: "Порт зайнятий"**
```bash
# Звільніть порт 3000
npx kill-port 3000
# Потім запустіть знову
python deploy.py --mode local
```

## 🔧 Додаткові способи запуску (для досвідчених)

<details>
<summary>Клікніть, щоб розгорнути додаткові варіанти</summary>

### Варіант A: Повністю у Docker
```bash
# Все працює в контейнерах
docker-compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d --build
```

### Варіант B: Backend у Docker, Frontend локально
```bash
# 1. Створити .env.local для frontend (КРИТИЧНО!)
python scripts/setup-frontend-env.py

# 2. Запустити backend
docker-compose up -d --build

# 3. Запустити frontend окремо
cd frontend
npm install --legacy-peer-deps
npm run build
npm run start
```

> ⚠️ **ВАЖЛИВО**: Без файлу `frontend/.env.local` з `NEXTAUTH_SECRET` frontend покаже помилку "Something went wrong"!

### Перезапуск після змін в коді
```bash
# Якщо змінили код backend
docker-compose restart app

# Якщо змінили код frontend (і він у Docker)
docker-compose restart frontend

# Повний перезапуск всього
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d --build
```

</details>

### Доступ

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/doc

## Структура проекту

```
.
├── backend/              # Django REST API
├── frontend/             # Next.js додаток
├── celery-service/       # Celery workers
├── mailing/              # Email сервіс
├── nginx/                # Nginx конфігурація
├── docs/                 # Документація
└── docker-compose.yml    # Docker оркестрація
```

## Документація

Детальна документація доступна в директорії [`docs/`](./docs/):

### Основні розділи

- [**Архітектура проекту**](./docs/ARCHITECTURE.md) - загальна архітектура та компоненти
- [**Система аутентифікації**](./docs/authentication/README.md) - JWT, Redis, middleware
- [**Система перекладів**](./docs/translations/README.md) - багатомовність, автоматизація
- [**Design System**](./docs/design-system/README.md) - SCSS стилізація

### Сервіси

- [**Backend**](./backend/README.md) - Django API документація
- [**Frontend**](./frontend/README.md) - Next.js додаток
- [**Celery**](./celery-service/README.md) - асинхронні задачі
- [**Mailing**](./mailing/README.md) - email сервіс
- [**Nginx**](./nginx/README.md) - веб-сервер

## Основні команди

### Frontend

```bash
npm run dev              # Development сервер
npm run build            # Production білд
npm run translation-check # Перевірка перекладів
```

### Backend

```bash
python manage.py runserver      # Development сервер
python manage.py migrate        # Міграції БД
python manage.py test          # Тести
```

### Docker

```bash
# Основні команди
docker-compose up -d --build                    # Запуск з пересборкою
docker-compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d  # З frontend
docker-compose down                              # Зупинка всіх сервісів
docker-compose down -v                           # Зупинка з видаленням volumes

# Моніторинг
docker-compose ps                                # Статус контейнерів
docker-compose logs -f                           # Всі логи
docker-compose logs -f app                       # Логи backend
docker-compose logs -f frontend                  # Логи frontend

# Керування сервісами
docker-compose restart app                       # Перезапуск backend
docker-compose stop frontend                     # Зупинка frontend
docker-compose start frontend                    # Запуск frontend

# Пересборка
docker-compose build --no-cache                  # Повна пересборка
docker-compose build --no-cache app              # Пересборка backend
.\scripts\rebuild-frontend.ps1                   # Пересборка frontend (Windows)
```

### Система перекладів

```bash
# Нормалізація та синхронізація перекладів
npm run translations:normalize    # Видалення дублікатів, сортування
npm run translations:validate     # Перевірка цілісності
npm run translations:sync         # Повна синхронізація (рекомендовано)
```

## Автентифікація

Проект використовує **жорстку двохрівневу систему захисту** з fail-secure принципом:

### Уровень 1: Middleware (Server-Side)
- Перевірка NextAuth session
- Моментальний redirect при відсутності
- Захист HOME + всіх /autoria сторінок

### Уровень 2: BackendTokenPresenceGate (Client-Side)  
- Перевірка backend токенів в Redis
- Автоматичний refresh при 401
- Жорсткий fail-secure (при помилках → блокування)

### API Interceptor
- Автоматичний перехват 401/403 від backend
- Спроба refresh токенів
- Retry оригінального запиту
- Redirect на /login при невдачі

**Принцип:** Реактивна валідація - токени перевіряються тільки при 401, не по таймауту.

Детальна інформація в [документації автентифікації](./docs/authentication/README.md) та [AUTH_SYSTEM_FINAL.md](./frontend/AUTH_SYSTEM_FINAL.md).

## Багатомовність

Підтримка трьох мов з повною синхронізацією та автоматизованою валідацією:

- **Українська (uk)** - основна для користувачів
- **Англійська (en)** - базова мова  
- **Російська (ru)** - додаткова

### Останні Виправлення
- ✅ Виправлена структура locale файлів (auth секція винесена на верхній рівень)
- ✅ Усунені дублікати translation ключів
- ✅ Синхронізовані всі мови (en, uk, ru)
- ✅ Виправлені конфлікти ключів (createAd → createAdToasts)
- ✅ Всі untranslated значення виправлені

Pre-commit hooks автоматично перевіряють консистентність перекладів.

Детальна інформація в [документації перекладів](./docs/translations/README.md).

## Design System

Централізована SCSS система стилізації з:

- Data-атрибути для варіантів компонентів
- Три рівні переопределення тем (Global, Local, Module)
- Готові компоненти (button, input, card, badge)
- Розв'язані конфлікти з Tailwind

Детальна інформація в [документації Design System](./docs/design-system/README.md).

## Безпека

### Жорстка Система Захисту (Fail-Secure)
- **Двохрівнева перевірка**: Middleware (NextAuth) + BackendTokenPresenceGate (Redis)
- **API Interceptor**: автоматичний refresh при 401/403
- **Реактивна валідація**: токени перевіряються при помилках, не по таймауту
- **Fail-secure принцип**: при будь-яких помилках → блокування доступу
- **JWT токени**: автоматичний refresh з захистом від циклів
- **Redis**: серверне зберігання токенів з перевіркою в middleware
- **HTTP-only cookies**: захист NextAuth session
- **CORS**: правильна конфігурація для безпеки

Детальна інформація:
- [Система безопасности](./frontend/SECURITY_IMPROVEMENTS.md)
- [Фінальна архітектура](./frontend/AUTH_SYSTEM_FINAL.md)
- [Аналіз змін](./frontend/BRANCH_DIFF_ANALYSIS.md)

## Продуктивність

- Server-Side Rendering (SSR)
- Redis кешування
- PostgreSQL індекси
- Code splitting
- Lazy loading компонентів
- Оптимізовані зображення

## Розробка

### Environment Variables

Створіть `.env` файли згідно з `.env.example`:

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

### Git Hooks

Pre-commit хуки автоматично:
- Перевіряють консистентність перекладів
- Валідують TypeScript типи
- Форматують код

## Тестування

```bash
# Frontend
npm run test

# Backend
python manage.py test

# E2E тести
npm run test:e2e
```

## Деплой

```bash
# Production білд
docker-compose -f docker-compose.prod.yml up -d

# Міграції
docker exec app python manage.py migrate

# Збір статики
docker exec app python manage.py collectstatic --noinput
```

## Troubleshooting

### Проблеми з Docker

```bash
# Перезбудувати контейнери
docker-compose up --build

# Очистити volumes
docker-compose down -v

# Перезапустити конкретний сервіс
docker-compose restart app
```

### Проблеми з БД

```bash
# Перевірити з'єднання
docker exec postgres-container psql -U postgres

# Скинути міграції (тільки development!)
python manage.py migrate --fake app zero
python manage.py migrate app
```

### Проблеми з Redis

```bash
# Перевірити з'єднання
docker exec redis-container redis-cli ping

# Очистити кеш
docker exec redis-container redis-cli FLUSHALL
```

## Ліцензія

MIT

## Підтримка

Для питань та підтримки:
- Створіть Issue в репозиторії
- Перегляньте [документацію](./docs/)
- Перевірте [Troubleshooting секцію](#troubleshooting)

---

**Остання актуалізація**: Листопад 2024 (v2.1 - Security Hardening)  
**Версія**: 2.1  
**Статус**: Production Ready  
**Гілка**: history-local (буде злита з master після тестування)

