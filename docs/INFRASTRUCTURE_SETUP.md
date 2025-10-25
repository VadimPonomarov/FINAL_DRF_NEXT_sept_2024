# 🐳 AutoRia - Infrastructure Setup

## 📋 Огляд

Docker, Redis, Nginx, PostgreSQL та інші infrastructure компоненти.

---

## 🐳 Docker Compose

### Базова структура

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: autoria
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Django Backend
  app:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: >
      sh -c "python manage.py migrate &&
             python manage.py create_test_users &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
      - media_files:/app/media
      - static_files:/app/staticfiles
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/autoria
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Celery Worker
  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A config worker -l info
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/autoria
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      - db
      - redis

  # Celery Beat (scheduler)
  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A config beat -l info
    volumes:
      - ./backend:/app
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  redis_data:
  media_files:
  static_files:
```

### Команди Docker

```bash
# Запуск всіх сервісів
docker-compose up -d

# Перегляд логів
docker-compose logs -f app

# Зупинити
docker-compose down

# Повне очищення (включно з volumes)
docker-compose down -v
```

---

## 📦 Redis Налаштування

### Backend конфігурація

```python
# backend/config/extra_config/cache_config.py

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 50,
        }
    }
}
```

### Frontend конфігурація

```typescript
// frontend/src/lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});
```

### Використання

```python
# Backend - Django cache
from django.core.cache import cache

cache.set('currency_usd', 41.5, 86400)  # 24h
rate = cache.get('currency_usd')
```

```typescript
// Frontend - Next.js API route
import redis from '@/lib/redis';

await redis.set('backend_auth', JSON.stringify(authData), 'EX', 86400);
const auth = await redis.get('backend_auth');
```

---

## 🌐 Nginx Reverse Proxy

### Базова конфігурація

```nginx
# nginx/nginx.conf

upstream backend {
    server app:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name localhost;

    client_max_body_size 10M;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Static Files
    location /static/ {
        alias /app/staticfiles/;
    }

    # Media Files
    location /media/ {
        alias /app/media/;
    }

    # WebSocket (для chat)
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Додати до docker-compose.yml

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - static_files:/app/staticfiles:ro
      - media_files:/app/media:ro
    depends_on:
      - app
      - frontend
```

---

## 💾 PostgreSQL Налаштування

### Backup та Restore

```bash
# Backup
docker-compose exec db pg_dump -U postgres autoria > backup.sql

# Restore
cat backup.sql | docker-compose exec -T db psql -U postgres autoria
```

### Налаштування performance

```python
# backend/config/extra_config/db_config.py

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'autoria'),
        'USER': os.getenv('POSTGRES_USER', 'postgres'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'postgres'),
        'HOST': os.getenv('POSTGRES_HOST', 'db'),
        'PORT': os.getenv('POSTGRES_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # Connection pooling
        'OPTIONS': {
            'connect_timeout': 10,
        },
        'ATOMIC_REQUESTS': True,  # Транзакції для кожного request
    }
}
```

---

## 🔒 Environment Variables

### Структура

```
env-config/
├── .env.base          # Базові (не секретні)
├── .env.secrets       # API ключі (ЗАШИФРОВАНІ)
├── .env.local         # Локальні (gitignored)
└── .env.docker        # Docker specific
```

### .env.base (приклад)

```bash
# Django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
POSTGRES_DB=autoria
POSTGRES_USER=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### .env.secrets (зашифровані)

```bash
# ЗАШИФРОВАНО через Fernet
POSTGRES_PASSWORD=gAAAAABh...
SECRET_KEY=gAAAAABh...
GOOGLE_MAPS_API_KEY=gAAAAABh...
EMAIL_HOST_PASSWORD=gAAAAABh...
```

---

## 📊 Моніторинг та Логування

### Docker logs

```bash
# Всі сервіси
docker-compose logs -f

# Конкретний сервіс
docker-compose logs -f app
docker-compose logs -f redis

# Останні 100 рядків
docker-compose logs --tail=100 app
```

### Application logs

```python
# backend/config/extra_config/logger_config.py

LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

### Flower (Celery monitoring)

```bash
# Запустити Flower
docker-compose exec celery celery -A config flower

# Відкрити http://localhost:5555
```

---

## 🚀 Production Deployment

### Dockerfile оптимізації

```dockerfile
# backend/Dockerfile

FROM python:3.11-slim

# Multi-stage build
WORKDIR /app

# Install dependencies
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-dev --no-interaction --no-ansi

# Copy application
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run as non-root user
RUN useradd -m appuser
USER appuser

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Gunicorn налаштування

```python
# backend/gunicorn.conf.py

bind = "0.0.0.0:8000"
workers = 4  # CPU cores * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "logs/gunicorn.access.log"
errorlog = "logs/gunicorn.error.log"
loglevel = "info"
```

---

## 📋 Чек-лист Production

### Security:
- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` згенерований та безпечний
- [ ] `ALLOWED_HOSTS` налаштовані
- [ ] HTTPS увімкнено
- [ ] Firewall rules налаштовані
- [ ] Database пароль змінений
- [ ] Redis password встановлений

### Performance:
- [ ] Gunicorn з workers
- [ ] Nginx reverse proxy
- [ ] PostgreSQL connection pooling
- [ ] Redis caching active
- [ ] Static files served through Nginx
- [ ] Media files optimized

### Monitoring:
- [ ] Logs rotation налаштовано
- [ ] Flower для Celery
- [ ] Health checks працюють
- [ ] Backups налаштовані

---

## 🔗 Пов'язані документи

- [Setup Guide](./SETUP_GUIDE.md) - Початкове налаштування
- [Troubleshooting](./TROUBLESHOOTING.md) - Вирішення проблем
- [Backend API](./BACKEND_API_GUIDE.md) - API документація

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25

