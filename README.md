# 🚀 AutoRia Clone - Full Stack Educational Project

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.0+-green.svg)](https://djangoproject.com)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)

Полнофункциональный клон популярного украинского сайта AutoRia, созданный для образовательных целей. Демонстрирует современные подходы к разработке full-stack веб-приложений.

## 🎯 О проекте

Этот проект представляет собой полную реализацию платформы для продажи автомобилей с использованием современного технологического стека. Включает в себя все основные функции: аутентификацию, управление объявлениями, поиск и фильтрацию, административную панель и многое другое.

### ✨ Ключевые особенности

- 🔐 **Двухуровневая аутентификация** (NextAuth + Django JWT)
- 🚗 **Управление объявлениями** с полным CRUD функционалом
- 🔍 **Продвинутый поиск** с фильтрами и сортировкой
- 📊 **Аналитика и статистика** в реальном времени
- 🎨 **Адаптивный дизайн** с темной/светлой темой
- 📱 **Мобильная оптимизация**
- 🌍 **Интернационализация** (UA/RU/EN)
- 📧 **Email уведомления** через Celery
- 🗺️ **Интеграция с Google Maps**
- 📚 **Автоматическая API документация**

## 🏗️ Архитектура

### Backend (Django REST Framework)
- **API**: RESTful API с автодокументацией
- **База данных**: PostgreSQL с оптимизированными запросами
- **Кеширование**: Redis для сессий и кеша
- **Очереди**: RabbitMQ + Celery для асинхронных задач
- **Аутентификация**: JWT токены + сессии

### Frontend (Next.js)
- **Framework**: Next.js 15 с App Router
- **Язык**: TypeScript для типобезопасности
- **Стили**: Tailwind CSS + shadcn/ui компоненты
- **Состояние**: React Context + локальное состояние
- **Аутентификация**: NextAuth.js с кастомными провайдерами

### DevOps
- **Контейнеризация**: Docker + Docker Compose
- **Развертывание**: Автоматизированный скрипт deploy.py
- **Мониторинг**: Health checks для всех сервисов
- **Логирование**: Структурированные логи

## 🚀 Быстрый старт

### Предварительные требования
- Docker и Docker Compose
- Python 3.8+ (для скрипта развертывания)
- 8GB RAM (рекомендуется)
- Свободные порты: 3000, 8000, 5432, 6379, 5672, 15672, 5555, 5540

### Установка и запуск

1. **Клонирование репозитория**
```bash
git clone https://github.com/YOUR_USERNAME/DRF_NEXT_FULLSTACK_FINAL.git
cd DRF_NEXT_FULLSTACK_FINAL
```

2. **Автоматическое развертывание**
```bash
python deploy.py
```

3. **Готово!** 🎉

После успешного развертывания проект будет доступен по адресам:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:3000/docs
- **Admin**: http://localhost:8000/admin

## 📊 Включенные данные

Проект поставляется с полным набором тестовых данных:

- **1,250+ справочных записей**: марки, модели, регионы, города
- **24 тестовых пользователя**: различные типы аккаунтов
- **Тестовые объявления**: для демонстрации функционала
- **Административные данные**: для полноценного тестирования

## 🛠️ Технологический стек

### Backend
- **Django 5.0+** - веб-фреймворк
- **Django REST Framework** - API фреймворк
- **PostgreSQL** - основная база данных
- **Redis** - кеширование и сессии
- **RabbitMQ** - брокер сообщений
- **Celery** - асинхронные задачи
- **JWT** - аутентификация
- **Swagger/OpenAPI** - документация API

### Frontend
- **Next.js 15** - React фреймворк
- **TypeScript** - типизированный JavaScript
- **Tailwind CSS** - CSS фреймворк
- **shadcn/ui** - компонентная библиотека
- **NextAuth.js** - аутентификация
- **React Hook Form** - работа с формами
- **Lucide React** - иконки

### DevOps & Tools
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация
- **Nginx** - веб-сервер (опционально)
- **GitHub Actions** - CI/CD (готов к настройке)

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
