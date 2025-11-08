# Документація проекту

## Огляд

Повна технічна документація системи автомобільного маркетплейсу з інтеграцією зовнішніх API та багатомовною підтримкою.

## Структура документації

### Основні системи

- [**Архітектура проекту**](./ARCHITECTURE.md) - загальна архітектура та компоненти системи
- [**Система аутентифікації**](./authentication/README.md) - JWT токени, Redis, middleware
- [**Система перекладів**](./translations/README.md) - багатомовність, валідація, автоматизація
- [**Design System**](./design-system/README.md) - SCSS система стилізації, теми, компоненти

### Backend

- [**Django REST API**](./backend/API.md) - ендпоінти, серіалізатори, авторизація
- [**База даних**](./backend/DATABASE.md) - моделі, міграції, оптимізація
- [**WebSocket**](./backend/WEBSOCKET.md) - real-time комунікація
- [**Celery**](./backend/CELERY.md) - асинхронні задачі

### Frontend

- [**Next.js архітектура**](./frontend/ARCHITECTURE.md) - App Router, SSR, компоненти
- [**State Management**](./frontend/STATE.md) - Redux, контекст, хуки
- [**Форми та валідація**](./frontend/FORMS.md) - react-hook-form, схеми

### Інтеграції

- [**AutoRia API**](./integrations/AUTORIA.md) - інтеграція з зовнішнім API
- [**Redis**](./integrations/REDIS.md) - кешування, сесії, токени
- [**Docker**](./integrations/DOCKER.md) - контейнеризація, оркестрація

### Розробка

- [**Налаштування середовища**](./development/SETUP.md) - встановлення, конфігурація
- [**Гайд по розробці**](./development/GUIDELINES.md) - стандарти коду, best practices
- [**Тестування**](./development/TESTING.md) - unit, integration, e2e тести
- [**Деплой**](./development/DEPLOYMENT.md) - CI/CD, продакшн

## Швидкий старт

### Запуск проекту локально

```bash
# Клонування репозиторію
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
cd FINAL_DRF_NEXT_sept_2024

# Встановлення залежностей
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# Запуск через Docker
docker-compose up
```

### Основні команди

```bash
# Frontend
npm run dev              # Development сервер
npm run build            # Production білд
npm run translation-check # Перевірка перекладів

# Backend
python manage.py runserver      # Development сервер
python manage.py migrate        # Міграції БД
python manage.py test          # Тести
```

## Технічний стек

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript
- **Стилі**: SCSS, Tailwind CSS
- **State**: Redux Toolkit, React Query
- **Форми**: React Hook Form, Zod
- **Інтернаціоналізація**: next-intl

### Backend
- **Framework**: Django 5, Django REST Framework
- **База даних**: PostgreSQL
- **Кешування**: Redis
- **Асинхронність**: Celery, RabbitMQ
- **WebSocket**: Django Channels
- **Аутентифікація**: JWT (Simple JWT)

### Інфраструктура
- **Контейнеризація**: Docker, Docker Compose
- **Веб-сервер**: Nginx
- **Reverse Proxy**: Nginx
- **Оркестрація**: Docker Compose

## Архітектурні принципи

### Монорепозиторій
Проект організований як монорепозиторій з окремими сервісами:
- `frontend/` - Next.js додаток
- `backend/` - Django API
- `celery-service/` - Celery worker
- `mailing/` - Email сервіс
- `nginx/` - Конфігурація веб-сервера

### Мікросервісна архітектура
Кожен сервіс має власну відповідальність та може масштабуватись незалежно.

### API-First підхід
Backend надає RESTful API, frontend споживає через fetch/axios.

### Типізація
Використання TypeScript на frontend та Python type hints на backend для типобезпеки.

## Безпека

- JWT токени з ротацією refresh токенів
- Redis для зберігання токенів та сесій
- CORS налаштування для production
- Middleware для захисту маршрутів
- Валідація на frontend та backend

## Продуктивність

- Server-Side Rendering (SSR) в Next.js
- Redis кешування API запитів
- PostgreSQL індекси та оптимізація запитів
- CDN для статичних файлів
- Lazy loading компонентів

## Підтримка

### Багатомовність
Підтримка трьох мов:
- Англійська (en) - базова
- Українська (uk) - основна для користувачів
- Російська (ru)

### Адаптивність
Responsive дизайн для всіх пристроїв:
- Desktop (1920px+)
- Laptop (1024px+)
- Tablet (768px+)
- Mobile (320px+)

## Контакти та підтримка

Для питань щодо документації створюйте Issue в репозиторії проекту.

---

**Останнє оновлення**: Листопад 2024  
**Версія документації**: 2.0  
**Статус**: Актуально
