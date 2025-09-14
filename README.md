# 🚀 AutoRia Clone - Повнофункціональний навчальний проект

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.0+-green.svg)](https://djangoproject.com)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)

Повнофункціональний клон популярного українського сайту AutoRia, створений для освітніх цілей. Демонструє сучасні підходи до розробки full-stack веб-додатків.

## 🎯 Про проект

Цей проект являє собою повну реалізацію платформи для продажу автомобілів з використанням сучасного технологічного стеку. Включає в себе всі основні функції: автентифікацію, управління оголошеннями, пошук та фільтрацію, адміністративну панель та багато іншого.

### ✨ Ключові особливості

- 🔐 **Дворівнева автентифікація** (NextAuth + Django JWT)
- 🚗 **Управління оголошеннями** з повним CRUD функціоналом
- 🔍 **Розширений пошук** з фільтрами та сортуванням
- 📊 **Аналітика та статистика** в реальному часі
- 🎨 **Адаптивний дизайн** з темною/світлою темою
- 📱 **Мобільна оптимізація**
- 🌍 **Інтернаціоналізація** (UA/RU/EN)
- 📧 **Email сповіщення** через Celery
- 🗺️ **Інтеграція з Google Maps**
- 📚 **Автоматична API документація**

## 🏗️ Архітектура

### Backend (Django REST Framework)
- **API**: RESTful API з автодокументацією
- **База даних**: PostgreSQL з оптимізованими запитами
- **Кешування**: Redis для сесій та кешу
- **Черги**: RabbitMQ + Celery для асинхронних завдань
- **Автентифікація**: JWT токени + сесії

### Frontend (Next.js)
- **Framework**: Next.js 15 з App Router
- **Мова**: TypeScript для типобезпеки
- **Стилі**: Tailwind CSS + shadcn/ui компоненти
- **Стан**: React Context + локальний стан
- **Автентифікація**: NextAuth.js з кастомними провайдерами

### DevOps
- **Контейнеризація**: Docker + Docker Compose
- **Розгортання**: Автоматизований скрипт deploy.py
- **Моніторинг**: Health checks для всіх сервісів
- **Логування**: Структуровані логи

## 🚀 Швидкий старт

### Попередні вимоги
- Docker та Docker Compose
- Python 3.8+ (для скрипта розгортання)
- 8GB RAM (рекомендується)
- Вільні порти: 3000, 8000, 5432, 6379, 5672, 15672, 5555, 5540

### Встановлення та запуск

1. **Клонування репозиторію**
```bash
git clone https://github.com/YOUR_USERNAME/DRF_NEXT_FULLSTACK_FINAL.git
cd DRF_NEXT_FULLSTACK_FINAL
```

2. **Автоматичне розгортання**
```bash
python deploy.py
```

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
