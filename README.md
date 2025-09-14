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

## 📁 Структура проекта

```
DRF_NEXT_FULLSTACK_FINAL/
├── backend/                 # Django REST API
│   ├── apps/               # Django приложения
│   ├── config/             # Настройки Django
│   ├── core/               # Общие утилиты
│   └── requirements.txt    # Python зависимости
├── frontend/               # Next.js приложение
│   ├── src/               # Исходный код
│   ├── public/            # Статические файлы
│   └── package.json       # Node.js зависимости
├── env-config/            # Конфигурации окружения
├── docs/                  # Документация
├── docker-compose.yml     # Docker конфигурация
└── deploy.py             # Скрипт развертывания
```

## 🎓 Образовательная ценность

Этот проект демонстрирует:

### Архитектурные паттерны
- **Микросервисная архитектура** с Docker
- **API-first подход** к разработке
- **Разделение ответственности** между frontend и backend
- **Масштабируемая структура** проекта

### Лучшие практики
- **Типобезопасность** с TypeScript
- **Автоматическое тестирование** (готово к расширению)
- **Документирование API** с Swagger
- **Контейнеризация** для консистентного развертывания
- **Управление состоянием** в React приложениях

### Современные технологии
- **Server-Side Rendering** с Next.js
- **Асинхронная обработка** с Celery
- **Реактивный UI** с современными компонентами
- **Автоматизация развертывания**

## 🔧 Дополнительные команды

### Управление проектом
```bash
# Остановка всех сервисов
docker-compose down

# Перезапуск с пересборкой
docker-compose down && docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Статус сервисов
docker-compose ps
```

### Работа с данными
```bash
# Принудительный пересид данных
FORCE_RESEED=true docker-compose up -d

# Создание суперпользователя
docker-compose exec app python manage.py createsuperuser

# Доступ к Django shell
docker-compose exec app python manage.py shell
```

### Разработка
```bash
# Запуск тестов backend
docker-compose exec app python manage.py test

# Запуск тестов frontend
cd frontend && npm test

# Линтинг кода
cd frontend && npm run lint
```

## 📚 Документация

- [Процесс сидинга данных](docs/SEEDING_PROCESS_UA.md)
- [API документация](http://localhost:3000/docs)
- [Swagger UI](http://localhost:8000/api/doc/)

## 🤝 Вклад в проект

Этот проект создан в образовательных целях. Вы можете:

1. **Форкнуть** репозиторий
2. **Создать** feature branch
3. **Внести** изменения
4. **Создать** Pull Request

## 📄 Лицензия

Этот проект создан в образовательных целях и распространяется под лицензией MIT.

## 🆘 Поддержка

### Частые проблемы

**Порты заняты:**
```bash
# Проверить занятые порты
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000
```

**Проблемы с Docker:**
```bash
# Очистка Docker
docker system prune -a
docker-compose down -v
```

**Проблемы с данными:**
```bash
# Пересоздание данных
FORCE_RESEED=true docker-compose up -d
```

### Логи для диагностики
```bash
# Все сервисы
docker-compose logs

# Конкретный сервис
docker-compose logs app
docker-compose logs pg
docker-compose logs redis
```

---

**Создано с ❤️ для изучения современной веб-разработки**

🎓 **Учебный проект** | 🚀 **Готов к запуску** | 📚 **Полная документация**
