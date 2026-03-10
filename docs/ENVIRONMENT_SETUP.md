# Налаштування змінних середовища

## Огляд

Проект використовує модульну систему змінних середовища для підтримки різних конфігурацій розгортання. Для рантайм-завантаження значень використовується модуль [`env-loader.ts`](./design-system/ENV_LOADER.ts), що читає файли з `env-config/` і підставляє дефолтні значення за потреби.

## Структура конфігурації

```
env-config/
├── .env.base       # Базові змінні (спільні для всіх середовищ)
├── .env.local      # Локальна розробка
├── .env.docker     # Docker контейнери
├── .env.secrets    # Секретні ключі та токени
└── load-env.py     # Скрипт завантаження змінних
```

## Середовища розгортання

### 1. Локальна розробка

**Файл**: `.env.local`

**Використання**:
```bash
# Backend
cd backend
python manage.py runserver

# Frontend
cd frontend
npm run dev
```

**Ключові змінні**:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Backend
DJANGO_SETTINGS_MODULE=config.settings
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Аутентифікація
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Docker розгортання

**Файл**: `.env.docker`

**Використання**:
```bash
docker-compose up
```

**Ключові змінні**:
```bash
# Database (використовує service names)
DATABASE_URL=postgresql://user:password@postgres:5432/dbname

# Backend (внутрішні Docker адреси)
DJANGO_SETTINGS_MODULE=config.settings
ALLOWED_HOSTS=app,localhost,127.0.0.1

# Frontend (використовує service names)
NEXT_PUBLIC_BACKEND_URL=http://app:8000
NEXTAUTH_URL=http://frontend:3000

# RabbitMQ
CELERY_BROKER_URL=amqp://guest:guest@rabbitmq:5672//

# Аутентифікація
NEXTAUTH_SECRET=your-secret-key
```

### 3. Production розгортання

**Базується на**: `.env.base` + `.env.secrets`

**Vercel (Frontend)**:
```bash
# Backend URL
NEXT_PUBLIC_BACKEND_URL=https://autoria-web-production.up.railway.app

# NextAuth
NEXTAUTH_URL=https://autoria-clone.vercel.app
NEXTAUTH_SECRET=your-production-secret

# Google OAuth
GOOGLE_CLIENT_ID=453957836335-o91t8rugmejjl1f7thorm4mt4v3rc2tq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Railway (Backend)**:
```bash
# Database
DATABASE_URL=postgresql://user:password@prod-db:5432/dbname

# Security
DEBUG=False
ALLOWED_HOSTS=autoria-web-production.up.railway.app

# Аутентифікація
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS
CORS_ALLOWED_ORIGINS=https://autoria-clone.vercel.app
```

## HttpOnly Cookies Configuration

### Production Settings
```bash
# Безпечні cookies в production
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
```

### Local Development Settings
```bash
# Небезпечні cookies для локальної розробки
NODE_ENV=development
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
```

## Environment Variables Priority

1. **`.env.secrets`** - найвищий пріоритет (секрети)
2. **`.env.local`** - локальні налаштування
3. **`.env.docker`** - Docker конфігурація
4. **`.env.base`** - базові значення (найнижчий пріоритет)

## Critical Variables

### Required for All Environments
```bash
# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # або production URL

# NextAuth
NEXTAUTH_URL=http://localhost:3000             # або production URL
NEXTAUTH_SECRET=your-secret-key               # унікальний рядок

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Optional Variables
```bash
# Debug
DEBUG=True                                      # development
DEBUG=False                                     # production

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000     # development
CORS_ALLOWED_ORIGINS=https://yourdomain.com   # production
```

## Production Deployment Checklist

### Vercel Environment Variables
- [ ] `NEXT_PUBLIC_BACKEND_URL` - Railway backend URL
- [ ] `NEXTAUTH_URL` - Vercel frontend URL
- [ ] `NEXTAUTH_SECRET` - унікальний секретний ключ
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Railway Environment Variables
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `DEBUG=False` - production mode
- [ ] `ALLOWED_HOSTS` - Railway domain
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- [ ] `CORS_ALLOWED_ORIGINS` - Vercel frontend URL

## Security Notes

1. **Never commit secrets** - `.env.secrets` в `.gitignore`
2. **Use different secrets** - для production та development
3. **Rotate secrets regularly** - оновлюйте секретні ключі
4. **Use HTTPS** - в production обов'язково
5. **Secure cookies** - httpOnly cookies автоматично secure в production

## Змінні за категоріями

### Backend (Django)

#### База даних
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/dbname
DB_NAME=autoria_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost  # або postgres для Docker
DB_PORT=5432
```

#### Redis
```bash
REDIS_URL=redis://localhost:6379  # або redis://redis:6379 для Docker
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

#### Celery
```bash
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

#### Django налаштування
```bash
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_SETTINGS_MODULE=config.settings
DEBUG=True  # False для production
ALLOWED_HOSTS=localhost,127.0.0.1
```

#### CORS
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

### Frontend (Next.js)

#### API З'єднання
```bash
# Public (доступні в браузері)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Server-side only
API_URL=http://localhost:8000
```

#### NextAuth
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# OAuth провайдери (якщо використовуються)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Redis (для Next.js)
```bash
REDIS_URL=redis://localhost:6379
```

### Зовнішні сервіси

#### Email (опціонально)
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

#### AutoRia API
```bash
AUTORIA_API_KEY=your-autoria-api-key
AUTORIA_API_URL=https://developers.ria.com/auto
```

## Налаштування для різних сценаріїв

### Сценарій 1: Локальна розробка (без Docker)

1. Скопіювати базову конфігурацію:
```bash
cp env-config/.env.local .env
```

2. Відредагувати `.env`:
```bash
# Використовувати localhost для всіх сервісів
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autoria_db
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
```

3. Запустити сервіси локально:
```bash
# PostgreSQL, Redis, RabbitMQ мають бути запущені окремо
```

### Сценарій 2: Docker розробка

1. Використовувати Docker конфігурацію:
```bash
cp env-config/.env.docker .env
```

2. Запустити через docker-compose:
```bash
docker-compose up
```

3. Docker автоматично використовує service names:
```bash
# Service names замість localhost
postgres, redis, rabbitmq, app, frontend
```

### Сценарій 3: Production

1. Створити production .env:
```bash
# Об'єднати базові змінні та секрети
cat env-config/.env.base env-config/.env.secrets > .env
```

2. Додати production специфічні змінні:
```bash
DEBUG=False
ALLOWED_HOSTS=yourdomain.com
SECURE_SSL_REDIRECT=True
```

3. Використати production docker-compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Сценарій 4: Тестування

```bash
# Використовувати окрему тестову БД
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autoria_test_db
DEBUG=True
TESTING=True
```

## Безпека змінних

### Секретні змінні (.env.secrets)

**Ніколи не комітити** `.env.secrets` в git!

```bash
# Приклад секретних змінних
DJANGO_SECRET_KEY=super-secret-django-key-min-50-chars
NEXTAUTH_SECRET=super-secret-nextauth-key-min-32-chars
DATABASE_PASSWORD=strong-database-password
REDIS_PASSWORD=redis-password
JWT_SECRET=jwt-signing-secret

# OAuth secrets
GOOGLE_CLIENT_SECRET=google-oauth-secret
GITHUB_CLIENT_SECRET=github-oauth-secret

# External API keys
AUTORIA_API_KEY=autoria-api-secret-key
SENDGRID_API_KEY=sendgrid-api-key
```

### Генерація секретів

```bash
# Django SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Random secret (32 bytes)
openssl rand -hex 32

# Random secret (base64)
openssl rand -base64 32
```

## Перевірка конфігурації

### Скрипт load-env.py

Автоматична перевірка та завантаження змінних:

```bash
python env-config/load-env.py
```

**Що перевіряє**:
- Наявність обов'язкових змінних
- Валідність значень (URL, port, boolean)
- Конфлікти між середовищами
- Відсутні секретні ключі

### Ручна перевірка

```bash
# Backend
cd backend
python manage.py check

# Перевірка DB з'єднання
python manage.py dbshell

# Frontend
cd frontend
npm run build
```

## Troubleshooting

### Проблема: "Connection refused" до PostgreSQL

**В Docker**:
```bash
# Використовувати service name
DATABASE_URL=postgresql://user:password@postgres:5432/dbname
```

**Локально**:
```bash
# Використовувати localhost
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Проблема: CORS помилки

Перевірити що frontend URL додано в CORS:
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Проблема: Redis connection failed

**В Docker**:
```bash
REDIS_URL=redis://redis:6379
```

**Локально**:
```bash
REDIS_URL=redis://localhost:6379
```

### Проблема: Celery не з'єднується з RabbitMQ

**В Docker**:
```bash
CELERY_BROKER_URL=amqp://guest:guest@rabbitmq:5672//
```

**Локально**:
```bash
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
```

## Docker Commands

### Полный ребилд всех сервисов
```bash
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d --build
```

### Ребилд только frontend
```bash
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d --build frontend
```

### Ребилд только backend
```bash
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d --build app
```

### Перезапуск сервисов (без ребилда)
```bash
# Перезапустить все сервисы
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml restart

# Перезапустить только frontend
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml restart frontend

# Перезапустить только backend
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml restart app
```

### Просмотр логов
```bash
# Логи всех сервисов
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml logs -f

# Логи конкретного сервиса
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml logs -f frontend
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml logs -f app

# Последние 50 строк лога
docker logs final_drf_next_sept_2024-frontend-1 --tail 50
docker logs final_drf_next_sept_2024-app-1 --tail 50
```

### Удаление и пересборка (полная очистка)
```bash
# Остановка и удаление контейнеров
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml down

# Удаление образов (для полной пересборки)
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml down --rmi all

# Пересборка с нуля
docker compose -f docker-compose.yml -f docker-compose.with_frontend.yml up -d --build --force-recreate
```

## Best Practices

1. **Використовувати .env.example**
   ```bash
   # Створити template без секретів
   cp .env .env.example
   # Замінити секретні значення на плейсхолдери
   ```

2. **Розділяти за середовищами**
   - Development: `.env.local`
   - Docker: `.env.docker`
   - Production: `.env.prod`

3. **Не комітити секрети**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.secrets
   *.env
   ```

4. **Документувати змінні**
   - Додавати коментарі в .env файлах
   - Вказувати формат та приклади
   - Позначати обов'язкові змінні

5. **Використовувати валідацію**
   - Перевіряти формат при старті
   - Встановлювати дефолтні значення
   - Логувати відсутні змінні

## Міграція між середовищами

### З локального на Docker

```bash
# 1. Скопіювати .env.docker
cp env-config/.env.docker .env

# 2. Змінити хости на service names
sed -i 's/localhost/postgres/g' .env
sed -i 's/localhost/redis/g' .env
sed -i 's/localhost/rabbitmq/g' .env

# 3. Запустити
docker-compose up
```

### З Docker на production

```bash
# 1. Використати базу + секрети
cat env-config/.env.base env-config/.env.secrets > .env

# 2. Додати production змінні
echo "DEBUG=False" >> .env
echo "ALLOWED_HOSTS=yourdomain.com" >> .env

# 3. Деплой
docker-compose -f docker-compose.prod.yml up -d
```

## Шаблони конфігурацій

Детальні шаблони доступні в `env-config/`:
- `.env.base` - базова конфігурація
- `.env.local` - локальна розробка
- `.env.docker` - Docker середовище
- `.env.secrets` - секретні ключі (не в git)

---

**Остання актуалізація**: Листопад 2024  
**Статус**: Актуально для всіх середовищ
