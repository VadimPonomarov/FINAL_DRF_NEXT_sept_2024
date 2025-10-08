# 🚀 AutoRia Clone - Повнофункціональний навчальний проект

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.0+-green.svg)](https://djangoproject.com)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)

Повнофункціональний клон популярного українського сайту AutoRia, створений для освітніх цілей. Демонструє сучасні підходи до розробки full-stack веб-додатків.

## 📁 Структура проекту

```
FINAL_DRF_NEXT_sept_2024/
├── backend/                  # Django Backend (REST API)
│   ├── apps/                # Додатки Django
│   │   ├── accounts/        # Користувачі та автентифікація
│   │   ├── ads/             # Оголошення про авто
│   │   ├── analytics/       # Аналітика та звіти
│   │   ├── chat/            # Чат між користувачами
│   │   ├── core/            # Спільні компоненти
│   │   ├── notifications/   # Сповіщення
│   │   └── payments/        # Платіжна система
│   ├── config/              # Налаштування проекту
│   ├── scripts/             # Допоміжні скрипти
│   └── ...
│
├── frontend/                # Next.js Frontend
│   ├── app/                 # App Router
│   ├── components/          # UI компоненти
│   ├── lib/                 # Утиліти та хелпери
│   └── ...
│
├── celery-service/          # Celery Worker для асинхронних завдань
│   ├── tasks/              # Завдання Celery
│   └── ...
│
├── mailing/                 # Сервіс розсилки email
│   ├── templates/          # Шаблони листів
│   └── ...
│
├── nginx/                   # Конфігурація Nginx
├── rabbitmq/                # Конфігурація RabbitMQ
├── redis/                   # Конфігурація Redis
├── pg/                     # Дані PostgreSQL
│
├── scripts/                 # Корисні скрипти для розробки
├── docs/                   # Документація
└── docker-compose.yml      # Визначення всіх сервісів
```

## 🎯 Про проект

Цей проект являє собою повну реалізацію платформи для продажу автомобілів з використанням сучасного технологічного стеку. Включає в себе всі основні функції: автентифікацію, управління оголошеннями, пошук та фільтрацію, адміністративну панель та багато іншого.

### ✨ Ключові особливості

- 🔐 **Дворівнева автентифікація** (NextAuth + Django JWT)
- 🚗 **Управління оголошеннями** з повним CRUD функціоналом
- 🔍 **Розширений пошук** з фільтрами та сортуванням
- 📊 **Аналітика та статистика** в реальному часі
- 💬 **Чат між користувачами** у реальному часі
- 📧 **Email сповіщення** через асинхронні завдання
- 🏦 **Платіжна система** з підтримкою підписок
- 📱 **Повністю адаптивний** інтерфейс
- 🌍 **Інтернаціоналізація** (UA/RU/EN)
- 🗺️ **Інтеграція з Google Maps**
- 📚 **Автоматична документація API** (Swagger/OpenAPI)

## 🏗️ Архітектура

### Backend (Django REST Framework)
- **API**: RESTful API з автодокументацією (Swagger/OpenAPI)
- **База даних**: PostgreSQL з оптимізованими запитами
- **Кешування**: Redis для сесій, кешу та керування чергами
- **Асинхронні завдання**: Celery + RabbitMQ
- **Автентифікація**: JWT токени + сесії
- **Пошук**: Просунута фільтрація з підтримкою повнотекстового пошуку
- **Файли**: Зберігання медіа в S3-сумісному сховищі

### Frontend (Next.js 15)
- **Роутинг**: App Router з лейаутами та завантаженням
- **Мова**: TypeScript для типобезпеки
- **Стилі**: Tailwind CSS з кастомними темами
- **UI Бібліотека**: shadcn/ui компоненти
- **Управління станом**: React Query + Zustand
- **Форми**: React Hook Form з валідацією Zod
- **Автентифікація**: NextAuth.js з кастомними провайдерами
- **Міжнародна підтримка**: Next-Intl
- **Тестування**: Jest + React Testing Library

### Мікросервіси

1. **Сервіс аутентифікації**
   - Реєстрація/вхід через email/соціальні мережі
   - Двофакторна аутентифікація
   - Керування профілем та налаштуваннями

2. **Сервіс оголошень**
   - CRUD операції з оголошеннями
   - Розширений пошук з фільтрами
   - Збережені пошукові запити
   - Обробка зображень та медіа

3. **Чат-сервіс**
   - Обмін повідомленнями в реальному часі (WebSockets)
   - Сповіщення про нові повідомлення
   - Історія діалогів
   - Вкладення файлів

4. **Сервіс сповіщень**
   - Email-сповіщення через асинхронні завдання
   - Веб-сповіщення в реальному часі
   - Налаштування сповіщень
   - Шаблонізація листів

5. **Платіжний сервіс**
   - Підписки та послуги
   - Історія транзакцій
   - Інтеграція з платіжними системами
   - Відстеження статусів платежів

6. **Аналітичний сервіс**
   - Статистика переглядів та кліків
   - Аналітика ефективності оголошень
   - Кастомні звіти
   - Експорт даних

### Інфраструктура
- **Контейнеризація**: Docker + Docker Compose
- **Оркестрація**: Автоматизований деплой через `deploy.py`
- **Моніторинг**: Health checks, метрики та логи
- **CI/CD**: GitHub Actions для автоматичного тестування
- **Безпека**: Оновлення залежностей, сканування вразливостей
- **Масштабування**: Горизонтальне масштабування сервісів

## 🚀 Швидкий старт

### Попередні вимоги
- Docker та Docker Compose
- Python 3.11+ (для скрипта розгортання)
- Node.js 18+ (для розробки фронтенду)
- 8GB RAM (рекомендується 16GB)
- Вільні порти: 3000, 8000, 5432, 6379, 5672, 15672, 5555, 5540

### Встановлення та запуск

1. **Клонуйте репозиторій**:
   ```bash
   git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
   cd FINAL_DRF_NEXT_sept_2024
   ```

2. **Запустіть автоматичне розгортання**:
   ```bash
   # Запуск з інтерактивним майстром
   python deploy.py
   
   # Або для автоматичного вибору опцій
   python deploy.py --auto
   ```

3. **Дочекайтеся завершення розгортання** (5-10 хвилин)

4. **Відкрийте в браузері**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin: http://localhost:8000/admin
   - API Docs: http://localhost:8000/api/schema/swagger/
   - RabbitMQ: http://localhost:15672
   - Flower: http://localhost:5555
   - Redis Insight: http://localhost:5540

## 🛠 Розробка

### Налаштування середовища

1. **Backend (Python/Django)**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   .venv\Scripts\activate     # Windows
   pip install -e ".[dev]"
   ```

2. **Frontend (Next.js)**:
   ```bash
   cd frontend
   npm install
   ```

### Запуск для розробки

1. **Запустіть сервіси через Docker**:
   ```bash
   # У корені проекту
   docker-compose up -d postgres redis rabbitmq
   ```

2. **Запустіть бекенд**:
   ```bash
   cd backend
   python manage.py runserver
   ```

3. **Запустіть фронтенд**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Додаткові сервіси (за потреби)**:
   ```bash
   # Celery worker
   celery -A config worker -l info
   
   # Celery beat (періодичні завдання)
   celery -A config beat -l info
   ```

## 🛠 Корисні команди

### Робота з Docker
```bash
# Запуск всіх сервісів
make up

# Зупинка всіх сервісів
make down

# Перезапуск певного сервісу
docker-compose restart <service_name>

# Перегляд логів
docker-compose logs -f <service_name>
```

### Робота з базою даних
```bash
# Запуск міграцій
docker-compose exec app python manage.py migrate

# Створення міграцій
docker-compose exec app python manage.py makemigrations

# Створення суперкористувача
docker-compose exec app python manage.py createsuperuser

# Запуск shell з підключенням до БД
docker-compose exec db psql -U postgres
```

### Розробка Frontend
```bash
# Встановлення залежностей
cd frontend
npm install

# Запуск у режимі розробки
npm run dev

# Збірка для продакшену
npm run build
```

## 🤝 Внесення змін

1. Створіть нову гілку для вашої функціональності:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Зробіть коміт змін:
   ```bash
   git add .
   git commit -m "Додано нову функціональність"
   ```

3. Запушіть зміни у віддалений репозиторій:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Створіть Pull Request у гілку `main`.

## 📄 Ліцензія

Цей проект поширюється під ліцензією MIT. Детальніше дивіться файл [LICENSE](LICENSE).

---

<div align="center">
  <p>Розроблено для навчальних цілей</p>
  <p>© 2024 AutoRia Clone Team</p>
</div>


3. **Готово!** 🎉

Після успішного розгортання проект буде доступний за адресами:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:3000/docs
- **Admin**: http://localhost:8000/admin

## 📊 Включені дані

Проект постачається з повним набором тестових даних:

- **1,250+ довідкових записів**: марки, моделі, регіони, міста
- **24 тестових користувача**: різні типи акаунтів
- **Тестові оголошення**: для демонстрації функціоналу
- **Адміністративні дані**: для повноцінного тестування

## 🛠️ Технологічний стек

### Backend
- **Django 5.0+** - веб-фреймворк
- **Django REST Framework** - API фреймворк
- **PostgreSQL** - основна база даних
- **Redis** - кешування та сесії
- **RabbitMQ** - брокер повідомлень
- **Celery** - асинхронні завдання
- **JWT** - автентифікація
- **Swagger/OpenAPI** - документація API

### Frontend
- **Next.js 15** - React фреймворк
- **TypeScript** - типізований JavaScript
- **Tailwind CSS** - CSS фреймворк
- **shadcn/ui** - компонентна бібліотека
- **NextAuth.js** - автентифікація
- **React Hook Form** - робота з формами
- **Lucide React** - іконки

### DevOps & Tools
- **Docker** - контейнеризація
- **Docker Compose** - оркестрація
- **Nginx** - веб-сервер (опціонально)
- **GitHub Actions** - CI/CD (готовий до налаштування)

## 📁 Структура проекту

```
DRF_NEXT_FULLSTACK_FINAL/
├── backend/                 # Django REST API
│   ├── apps/               # Django додатки
│   ├── config/             # Налаштування Django
│   ├── core/               # Загальні утиліти
│   └── requirements.txt    # Python залежності
├── frontend/               # Next.js додаток
│   ├── src/               # Вихідний код
│   ├── public/            # Статичні файли
│   └── package.json       # Node.js залежності
├── env-config/            # Конфігурації оточення
├── docs/                  # Документація
├── docker-compose.yml     # Docker конфігурація
└── deploy.py             # Скрипт розгортання
```

## 🎓 Освітня цінність

Цей проект демонструє:

### Архітектурні патерни
- **Мікросервісна архітектура** з Docker
- **API-first підхід** до розробки
- **Розділення відповідальності** між frontend та backend
- **Масштабована структура** проекту

### Найкращі практики
- **Типобезпека** з TypeScript
- **Автоматичне тестування** (готове до розширення)
- **Документування API** з Swagger
- **Контейнеризація** для консистентного розгортання
- **Управління станом** в React додатках

### Сучасні технології
- **Server-Side Rendering** з Next.js
- **Асинхронна обробка** з Celery
- **Реактивний UI** з сучасними компонентами
- **Автоматизація розгортання**

## 🔧 Додаткові команди

### Управління проектом
```bash
# Зупинка всіх сервісів
docker-compose down

# Перезапуск з пересборкою
docker-compose down && docker-compose up -d --build

# Перегляд логів
docker-compose logs -f

# Статус сервісів
docker-compose ps
```

### Робота з даними
```bash
# Примусовий пересід даних
FORCE_RESEED=true docker-compose up -d

# Створення суперкористувача
docker-compose exec app python manage.py createsuperuser

# Доступ до Django shell
docker-compose exec app python manage.py shell
```

### Розробка
```bash
# Запуск тестів backend
docker-compose exec app python manage.py test

# Запуск тестів frontend
cd frontend && npm test

# Лінтинг коду
cd frontend && npm run lint
```

## 📚 Документація

- [Процес сідингу даних](docs/SEEDING_PROCESS_UA.md)
- [API документація](http://localhost:3000/docs)
- [Swagger UI](http://localhost:8000/api/doc/)

## 🤝 Внесок у проект

Цей проект створений в освітніх цілях. Ви можете:

1. **Форкнути** репозиторій
2. **Створити** feature branch
3. **Внести** зміни
4. **Створити** Pull Request

## 📄 Ліцензія

Цей проект створений в освітніх цілях та розповсюджується під ліцензією MIT.

## 🆘 Підтримка

### Часті проблеми

**Порти зайняті:**
```bash
# Перевірити зайняті порти
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000
```

**Проблеми з Docker:**
```bash
# Очищення Docker
docker system prune -a
docker-compose down -v
```

**Проблеми з даними:**
```bash
# Пересоздання даних
FORCE_RESEED=true docker-compose up -d
```

### Логи для діагностики
```bash
# Всі сервіси
docker-compose logs

# Конкретний сервіс
docker-compose logs app
docker-compose logs pg
docker-compose logs redis
```

---

**Створено з ❤️ для вивчення сучасної веб-розробки**

🎓 **Навчальний проект** | 🚀 **Готовий до запуску** | 📚 **Повна документація**
