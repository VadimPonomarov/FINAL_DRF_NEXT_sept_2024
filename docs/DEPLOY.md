# План развертывания - AutoRia Clone

## Окружения

### Local Development
**URL:** http://localhost:3000 (frontend), http://localhost:8000 (backend)
**Назначение:** Разработка и тестирование
**Доступ:** Локальная машина разработчика
**Правила доступа:** Все порты открыты локально

### Staging
**URL:** https://autoria-staging.vercel.app (frontend), https://autoria-staging.up.railway.app (backend)
**Назначение:** Предварительное тестирование перед продакшн
**Доступ:** Ограниченный доступ для команды разработки
**Правила доступа:** Базовая аутентификация или whitelist IP

### Production
**URL:** https://autoria-clone.vercel.app (frontend), https://autoria-web-production.up.railway.app (backend)
**Назначение:** Продуктивное использование пользователями
**Доступ:** Публичный доступ
**Правила доступа:** Полная безопасность, HTTPS only

## Стек развертывания

### Frontend Hosting
- **Провайдер:** Vercel
- **Технология:** Next.js 15 (App Router)
- **CDN:** Vercel Edge Network
- **SSL:** Автоматический от Vercel
- **Build:** Static Generation + ISR

### Backend Hosting  
- **Провайдер:** Railway
- **Технология:** Django 5 + Gunicorn
- **База данных:** PostgreSQL (managed Railway)
- **Кэш:** Redis (managed Railway)
- **SSL:** Автоматический от Railway

### Дополнительные сервисы
- **Email:** Railway (mailing сервис)
- **Фоновые задачи:** Railway (Celery)
- **Файловое хранилище:** Railway Media Storage
- **Мониторинг:** Railway Logs + Vercel Analytics

## CI/CD Pipeline

### Шаг 1: Линтинг и форматирование
```bash
# Frontend
npx prettier --write .
npx eslint --fix --max-warnings 0 .
npx tsc --noEmit

# Backend  
ruff format .
ruff check --fix .
mypy .
```

### Шаг 2: Тестирование
```bash
# Unit тесты
npm run test  # Frontend
python manage.py test  # Backend

# Интеграционные тесты
npm run test:integration
python manage.py test integration
```

### Шаг 3: Сборка
```bash
# Frontend
npm run build

# Backend (Docker)
docker build -t autoria-backend .
```

### Шаг 4: Развертывание
```bash
# Frontend (автоматически Vercel)
vercel --prod

# Backend (автоматически Railway)
git push origin master  # Trigger Railway deploy
```

### Шаг 5: Пост-развертывание
```bash
# Миграции БД
docker exec railway-app python manage.py migrate

# Сбор статики
docker exec railway-app python manage.py collectstatic --noinput

# Health проверка
curl https://autoria-web-production.up.railway.app/health/
```

## Переменные окружения

### Frontend (.env.production)
```bash
# API URLs
NEXT_PUBLIC_BACKEND_URL=https://autoria-web-production.up.railway.app

# NextAuth
NEXTAUTH_URL=https://autoria-clone.vercel.app
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Google OAuth
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# Analytics
NEXT_PUBLIC_GA_ID=${GA_ID}
```

### Backend (Railway)
```bash
# Django
SECRET_KEY=${SECRET_KEY}
DEBUG=false
ALLOWED_HOSTS=autoria-web-production.up.railway.app

# Database
DATABASE_URL=${DATABASE_URL}

# Redis
REDIS_URL=${REDIS_URL}

# CORS
CORS_ALLOWED_ORIGINS=https://autoria-clone.vercel.app

# Email
EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=${EMAIL_PORT}
EMAIL_HOST_USER=${EMAIL_HOST_USER}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD}

# Celery
CELERY_BROKER_URL=${CELERY_BROKER_URL}
```

### Общие переменные
```bash
# API Keys
OPENAI_API_KEY=${OPENAI_API_KEY}
GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}

# External Services
AUTORIA_API_KEY=${AUTORIA_API_KEY}
AUTORIA_API_URL=https://auto.ria.com/api
```

## Команды развертывания

### Local Development
```bash
# Полная настройка
python deploy.py --mode local

# Только backend
docker-compose up -d --build

# Только frontend
cd frontend
npm install
npm run dev
```

### Staging
```bash
# Frontend
vercel --scope team --prod

# Backend
git checkout staging
git push origin staging
```

### Production
```bash
# Frontend
vercel --prod

# Backend
git checkout master
git push origin master

# Мониторинг развертывания
railway logs
```

### Откат развертывания
```bash
# Frontend
vercel rollback [deployment-url]

# Backend
git revert HEAD
git push origin master

# Database откат
docker exec railway-app python manage.py migrate app 0001
```

## Проверка работоспособности

### Health Checks
```bash
# Frontend
curl https://autoria-clone.vercel.app/health

# Backend
curl https://autoria-web-production.up.railway.app/health/

# Database
curl https://autoria-web-production.up.railway.app/api/health/db/

# Redis
curl https://autoria-web-production.up.railway.app/api/health/redis/
```

### API Тестирование
```bash
# Основные endpoints
curl https://autoria-web-production.up.railway.app/api/users/public/list/
curl https://autoria-web-production.up.railway.app/api/ads/public/list/
curl https://autoria-web-production.up.railway.app/api/chat/generate-image/

# Аутентификация
curl -X POST https://autoria-clone.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autoria.com","password":"password"}'
```

### Функциональные тесты
```bash
# Генерация объявлений
curl -X POST https://autoria-clone.vercel.app/api/autoria/test-ads/generate \
  -H "Content-Type: application/json" \
  -d '{"count":1,"includeImages":true}'

# Поиск объявлений
curl "https://autoria-web-production.up.railway.app/api/ads/public/search/?brand=BMW"
```

## Управление секретами

### Менеджмент секретов
- **Vercel:** Environment Variables в dashboard
- **Railway:** Environment Variables в dashboard
- **Local:** .env.local (не в git)
- **Production:** Injection через CI/CD

### Правила безопасности
- ❌ Никогда не коммитить .env файлы с секретами
- ❌ Не использовать hardcoded секреты в коде
- ✅ Использовать переменные окружения для всех секретов
- ✅ Регулярно ротировать ключи и токены
- ✅ Использовать разные ключи для разных окружений

### Резервное копирование секретов
```bash
# Экспорт секретов (только для backup)
vercel env pull .env.backup
railway variables get > railway-secrets.backup

# Хранить в безопасном месте (1Password, HashiCorp Vault)
```

## Мониторинг и логирование

### Логирование
```python
# Backend структурированные логи
import structlog
logger = structlog.get_logger()

logger.info("User action", user_id=user.id, action="create_ad")
```

```javascript
// Frontend логирование
console.log('API call:', { endpoint, status, duration });
```

### Мониторинг
- **Vercel Analytics:** Производительность frontend
- **Railway Logs:** Логи backend и ошибок
- **Uptime monitoring:** External ping сервисы
- **Error tracking:** Sentry или аналоги

### Алерты
- **Downtime:** Сразу при недоступности
- **High error rate:** > 5% ошибок в час
- **Performance degradation:** > 2s время ответа
- **Database issues:** Connection failures

## Масштабирование

### Автоматическое масштабирование
- **Frontend:** Vercel Serverless Functions
- **Backend:** Railway automatic scaling
- **Database:** Railway connection pooling
- **Redis:** Railway managed scaling

### Ручное масштабирование
```bash
# Railway scaling
railway scale

# Database upgrade
railway variables set POSTGRES_PLAN=standard-2

# Add more dynos
railway add
```

### Load balancing
- **Frontend:** Vercel Edge Network
- **Backend:** Railway load balancer
- **Static assets:** Vercel CDN

## Оптимизация производительности

### Frontend оптимизация
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react']
  },
  images: {
    domains: ['autoria-web-production.up.railway.app'],
    formats: ['image/webp', 'image/avif']
  }
}
```

### Backend оптимизация
```python
# Django settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'MAX_CONNS': 20
        }
    }
}

# Redis кэширование
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50
            }
        }
    }
}
```

### CDN и кэширование
- **Static assets:** Vercel Edge CDN
- **API responses:** Redis кэширование
- **Images:** Оптимизированные форматы
- **Database:** Query кэширование

## Безопасность развертывания

### SSL/TLS
- ✅ HTTPS enforced на всех доменах
- ✅ HSTS headers
- ✅ Secure cookies
- ✅ CSP headers

### Firewall и доступ
- ✅ Ограничение доступа к admin панели
- ✅ Rate limiting на API endpoints
- ✅ IP whitelist для критических операций
- ✅ DDoS защита (Vercel + Railway)

### Аудит безопасности
```bash
# Security headers
curl -I https://autoria-clone.vercel.app

# SSL проверка
openssl s_client -connect autoria-clone.vercel.app:443

# Dependency vulnerabilities
npm audit
pip-audit
```

## Процедура отката

### Emergency rollback
```bash
# 1. Откат frontend
vercel rollback [previous-deployment]

# 2. Откат backend
git revert HEAD
git push origin master

# 3. Откат database (если нужно)
docker exec railway-app python manage.py migrate app 0002

# 4. Проверка
curl https://autoria-web-production.up.railway.app/health/
```

### Data recovery
```bash
# Database backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql

# Media backup
rsync -av media/ backup/media/
```

## Документация для команды

### Onboarding
1. Настройка локального окружения
2. Доступ к staging окружению
3. Правила работы с секретами
4. Процедура развертывания

### Runbook
- **Развертывание:** Пошаговая инструкция
- **Откат:** Emergency процедуры
- **Мониторинг:** Что проверять и как
- **Траблшутинг:** Частые проблемы и решения

### Контактная информация
- **DevOps:** Ответственный за инфраструктуру
- **Lead Developer:** Архитектурные вопросы
- **Product Owner:** Бизнес вопросы
- **Support:** Пользовательские проблемы
