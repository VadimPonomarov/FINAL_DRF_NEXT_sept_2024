# Архітектура проекту

## Загальний огляд

Повнофункціональний автомобільний маркетплейс з інтеграцією зовнішніх API, багатомовною підтримкою та real-time функціональністю.

## Технологічний стек

### Frontend

**Core**:
- Next.js 15 (App Router) - React framework з SSR
- React 19 - UI library
- TypeScript 5.8 - типізація

**Стилізація**:
- CSS-змінні (HSL токени) у `frontend/src/app/globals.css`
- Tailwind CSS 3.4 - utility-first CSS на основі токенів
- React UI-компоненти у `frontend/src/components/ui/*` (Button, Card, Input тощо)
- `*.module.scss`/`*.module.css` - локальні модульні стилі для окремих фіч

**State Management**:
- Redux Toolkit - глобальний стейт
- React Query (TanStack Query) - server state
- Redux Persist - збереження стейту

**Форми та валідація**:
- React Hook Form - управління формами
- Zod - схеми валідації
- Joi - додаткова валідація

**Інтернаціоналізація**:
- next-intl - багатомовність
- Автоматизована система перекладів

**UI Компоненти**:
- Radix UI - headless components
- Lucide React - іконки
- Framer Motion - анімації

### Backend

**Core**:
- Django 5 - web framework
- Django REST Framework - API
- Python 3.11+ - мова програмування

**База даних**:
- PostgreSQL - реляційна БД
- Redis - кешування та сесії

**Асинхронність**:
- Celery - задачі в фоні
- RabbitMQ - message broker
- Django Channels - WebSocket

**Аутентифікація**:
- Django Simple JWT - JWT токени
- Custom refresh logic - ротація токенів

### Інфраструктура

**Контейнеризація**:
- Docker - контейнери
- Docker Compose - оркестрація

**Веб-сервер**:
- Nginx - reverse proxy
- Статичні файли та медіа

**CI/CD**:
- Git hooks (Husky) - pre-commit валідація
- GitHub Actions - автоматизація

## Архітектурні патерни

### Монорепозиторій

Структура проекту:
```
FINAL_DRF_NEXT_sept_2024/
├── frontend/          # Next.js додаток
├── backend/           # Django API
├── celery-service/    # Celery workers
├── mailing/           # Email сервіс
├── nginx/             # Nginx конфігурація
├── docs/              # Документація
└── docker-compose.yml # Оркестрація
```

### Мікросервісна архітектура

Кожен сервіс має власну відповідальність:

**Frontend Service** (`frontend/`):
- Server-side rendering
- Client-side routing
- State management
- API споживання

**Backend Service** (`backend/`):
- REST API
- Бізнес-логіка
- Авторизація
- Інтеграції

**Celery Service** (`celery-service/`):
- Асинхронні задачі
- Періодичні завдання
- Background jobs

**Mailing Service** (`mailing/`):
- Email розсилка
- Template rendering
- Email валідація

### API-First підхід

Backend надає RESTful API, frontend споживає через HTTP:

**Переваги**:
- Розділення concerns
- Можливість використання різних клієнтів
- Легке масштабування
- Незалежне тестування

### Типізація

**Frontend**:
- TypeScript для всіх компонентів
- Типи для API відповідей
- Зod схеми для валідації

**Backend**:
- Python type hints
- Django model typing
- Pydantic для складних структур

## Структура Frontend

### App Router (Next.js 15)

```
frontend/src/app/
├── [locale]/                    # Інтернаціоналізація
│   ├── (auth)/                 # Auth layout group
│   │   ├── signin/
│   │   ├── login/
│   │   └── register/
│   ├── (main)/                 # Main layout group
│   │   ├── profile/
│   │   ├── autoria/
│   │   └── dashboard/
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── api/                        # API routes
│   ├── auth/
│   ├── redis/
│   └── ...
└── globals.css                 # Global styles
```

### Компоненти

```
frontend/src/components/
├── ui/                         # Базові UI компоненти
│   ├── button/
│   ├── input/
│   └── ...
├── Forms/                      # Форми
│   ├── LoginForm/
│   ├── ProfileForm/
│   └── ...
├── Features/                   # Feature компоненти
│   ├── AdsList/
│   ├── UserProfile/
│   └── ...
└── Layout/                     # Layout компоненти
    ├── Header/
    ├── Footer/
    └── Sidebar/
```

### State Management

**Redux Store**:
```typescript
store/
├── slices/
│   ├── authSlice.ts           # Аутентифікація
│   ├── userSlice.ts           # Користувач
│   └── adsSlice.ts            # Оголошення
├── api/
│   ├── authApi.ts             # RTK Query API
│   └── adsApi.ts
└── store.ts                    # Конфігурація store
```

**React Query**:
- Кешування API запитів
- Автоматичне оновлення
- Оптимістичні оновлення

### Стилізація

> **Примітка:** нижче описано стару SCSS дизайн-систему, яка зараз не використовується у фронтенді. Актуальна система стилів базується на CSS-змінних + Tailwind + React UI-компонентах і докладно описана в `docs/design-system/README.md`.

**SCSS Design System (архівна):**
```
design-system/
├── tokens/                     # Змінні, функції
├── mixins/                     # Міксіни
├── components/                 # Компоненти
├── base/                       # Базові стилі
├── utilities/                  # Утиліти
└── themes/                     # Система тем
```

**Підхід**:
- Data-атрибути для варіантів компонентів
- SCSS змінні для консистентності
- Tailwind для швидкої розмітки
- CSS Modules для інкапсуляції

## Структура Backend

### Django Apps

```
backend/apps/
├── accounts/                   # Користувачі
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── ads/                        # Оголошення
├── auth/                       # Аутентифікація
└── ...
```

### API Structure

**RESTful ендпоінти**:
```
/api/
├── auth/
│   ├── login/                 # POST - логін
│   ├── refresh/               # POST - оновлення токену
│   └── logout/                # POST - вихід
├── accounts/
│   ├── profile/               # GET, PUT - профіль
│   └── users/                 # CRUD користувачі
├── ads/
│   ├── list/                  # GET - список
│   ├── detail/{id}/           # GET, PUT, DELETE
│   └── create/                # POST - створення
└── autoria/
    ├── search/                # POST - пошук
    └── details/               # GET - деталі авто
```

### Database Models

**Основні моделі**:
- `User` - користувачі (extended AbstractUser)
- `Profile` - профілі користувачів
- `Ad` - оголошення
- `Category` - категорії
- `Image` - зображення

**Relationships**:
- One-to-One: User ↔ Profile
- One-to-Many: User → Ads
- Many-to-Many: Ad ↔ Categories

## Система аутентифікації

### Архітектура Auth

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ Login Request
       ↓
┌─────────────┐    ┌──────────┐
│  Next.js    │───→│  Django  │
│  /api/auth  │←───│   API    │
└──────┬──────┘    └──────────┘
       │
       ↓
┌─────────────┐
│    Redis    │
│   Tokens    │
└─────────────┘
```

### Потік аутентифікації

1. Користувач надсилає credentials до `/api/auth/login`
2. Next.js API route проксує до Django
3. Django валідує та генерує JWT токени
4. Токени зберігаються в Redis
5. Frontend отримує підтвердження збереження
6. Middleware перевіряє наявність токенів для захищених роутів

### JWT Tokens

**Access Token**:
- Lifetime: 12 годин
- Використання: API запити
- Зберігання: Redis

**Refresh Token**:
- Lifetime: 30 днів
- Використання: оновлення access токена
- Одноразовий (після використання блокується)

## Інтеграції

### AutoRia API

**Функціонал**:
- Пошук автомобілів
- Отримання деталей авто
- Категорії та фільтри

**Архітектура**:
```
Frontend → Next.js API → Backend API → AutoRia API
```

### Redis Integration

**Використання**:
- Зберігання JWT токенів
- Кешування API відповідей
- Session storage
- Rate limiting

### WebSocket (Channels)

**Real-time функції**:
- Повідомлення в чат
- Сповіщення
- Онлайн статус

## Безпека

### Аутентифікація

- JWT з ротацією refresh токенів
- Blacklist для відкликаних токенів
- Redis для серверного зберігання

### Авторизація

- Permission classes в Django
- Middleware для Next.js роутів
- Role-based access control

### CORS

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://frontend:3000",
]
```

### Environment Variables

Чутливі дані в `.env` файлах:
- Database credentials
- API keys
- JWT secrets

## Продуктивність

### Frontend Optimization

**SSR (Server-Side Rendering)**:
- Швидший First Contentful Paint
- SEO оптимізація
- Кращий UX

**Code Splitting**:
- Динамічні imports
- Route-based splitting
- Component lazy loading

**Caching**:
- React Query кешування
- Redis для API
- Browser кеш для статики

### Backend Optimization

**Database**:
- Індекси на часті запити
- Select/prefetch related
- Connection pooling

**Caching**:
- Redis для часто запитуваних даних
- Query result caching
- Session кешування

**Async Tasks**:
- Celery для важких операцій
- Background processing
- Scheduled tasks

## Масштабування

### Horizontal Scaling

**Frontend**:
- Множинні Next.js інстанси
- Load balancing через Nginx
- CDN для статики

**Backend**:
- Множинні Django інстанси
- Gunicorn workers
- Database read replicas

**Celery**:
- Додаткові workers
- Queue розподіл
- Task routing

### Vertical Scaling

- Збільшення ресурсів контейнерів
- Database optimization
- Redis memory management

## Моніторинг

### Логування

**Frontend**:
- Console logging (development)
- Error tracking (production)
- User analytics

**Backend**:
- Django logging framework
- Request/response logging
- Error tracking

### Метрики

- API response times
- Database query performance
- Redis hit/miss ratio
- Celery task execution time

## Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Оптимізації**:
- Minified JavaScript
- Compiled CSS
- Optimized images
- Gzip compression

## Майбутні покращення

- GraphQL API
- Microservices extraction
- Kubernetes orchestration
- Advanced caching strategies
- Real-time notifications
- Progressive Web App (PWA)

---

**Остання актуалізація**: Листопад 2024  
**Версія**: 2.0  
**Статус**: Production Ready
