# 🔐 Environment Setup - Повне керівництво

## 📋 Огляд

Детальна інструкція налаштування всіх environment variables та конфігураційних файлів для AutoRia платформи.

> **🎓 НАВЧАЛЬНИЙ ПРОЕКТ** - Усі .env файли включені в репозиторій для швидкого розгортання "out of the box"
>
> ⚠️ **У production НІКОЛИ не додавайте .env файли з секретами в Git!**

---

## 📁 Структура Environment Files

### Централізована схема (Єдиний центр відповідальності)

```
env-config/               # 🎯 Централізовані конфігурації для Docker
├── .env.base            # Базові налаштування ✅ В Git
├── .env.secrets         # API ключі та паролі ✅ В Git (навчальні)
└── .env.docker          # Docker-specific overrides ✅ В Git

frontend/
└── .env.local           # Frontend-specific (Next.js) ✅ В Git (навчальні)

redis/
└── redis.conf           # Redis конфігурація ✅ В Git
```

**Принцип роботи:**
- **Docker-сервіси** (backend, postgres, redis, celery, nginx): Використовують ТІЛЬКИ файли з `env-config/`
- **Frontend** (Next.js): Використовує власний `frontend/.env.local` (це Next.js convention)
- **Порядок завантаження Docker**: `.env.base` → `.env.secrets` → `.env.docker`
- **Немає дублювання**: Кожна змінна має одне джерело правди

---

## 🔧 Backend Environment (.env.base)

### Django Core

```bash
# Режим відладки (ОБОВ'ЯЗКОВО False в production!)
DEBUG=True

# Секретний ключ Django (змінити в production!)
SECRET_KEY=django-insecure-change-me-in-production

# Дозволені хости
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,*

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**⚠️ ВАЖЛИВО**: 
- `SECRET_KEY` має бути мінімум 50 символів
- В production використовуйте `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`

### Database (PostgreSQL)

```bash
# PostgreSQL налаштування
POSTGRES_DB=autoria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost  # або 'db' для Docker
POSTGRES_PORT=5432

# Або використовуйте DATABASE_URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autoria
```

**Для Docker Compose**:
```bash
POSTGRES_HOST=db
DATABASE_URL=postgresql://postgres:postgres@db:5432/autoria
```

### Redis

```bash
# Redis налаштування
REDIS_HOST=localhost  # або 'redis' для Docker
REDIS_PORT=6379
REDIS_DB=1
REDIS_PASSWORD=  # Залишити порожнім або встановити пароль

# Або використовуйте REDIS_URL
REDIS_URL=redis://localhost:6379/1
# Для Docker: redis://redis:6379/1
```

### CORS (Cross-Origin Resource Sharing)

```bash
# Frontend URLs для CORS
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# В production додайте ваші домени
# CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### URLs

```bash
# Backend URL
BACKEND_URL=http://localhost:8000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 🔑 API Keys та Секрети (.env.secrets)

### Google Maps API

```bash
# Google Cloud Console: https://console.cloud.google.com/
GOOGLE_MAPS_API_KEY=AIzaSyC...your_key_here
```

**Як отримати**:
1. Перейти на https://console.cloud.google.com/
2. Створити проект або вибрати існуючий
3. Enable APIs:
   - Geocoding API ✅
   - Maps JavaScript API ✅
   - Places API (опціонально)
4. Credentials → Create credentials → API key
5. Обмежити ключ (Application restrictions → HTTP referrers)
6. Додати домени: `localhost:3000`, `yourdomain.com`

### Email (SMTP)

```bash
# Gmail SMTP
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_specific_password

# Sender email
DEFAULT_FROM_EMAIL=noreply@autoria.com
```

**Gmail App Password** (рекомендовано):
1. Google Account → Security
2. Enable 2-Step Verification
3. App passwords → Generate
4. Використати згенерований 16-символьний пароль

### NBU API (Курси валют)

```bash
# Національний банк України - безкоштовно, без ключа!
NBU_API_URL=https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange
```

**Особливості**:
- ❌ Реєстрація не потрібна
- ❌ API ключ не потрібен
- ✅ Ліміт: ~100 запитів/день (достатньо з кешем)

### PrivatBank API

```bash
# PrivatBank - безкоштовно, без ключа!
PRIVATBANK_API_URL=https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5
```

**Особливості**:
- ❌ Реєстрація не потрібна
- ❌ API ключ не потрібен
- ✅ Public API

### DummyJSON (для тестування)

```bash
# Тестовий API для frontend
NEXT_PUBLIC_DUMMY_API_BASE_URL=https://dummyjson.com
```

**Тестові дані**:
- Username: `emilys`
- Password: `emilyspass`

---

## 🔐 Шифрування Секретів

### Автоматичне шифрування

```bash
# Запустити скрипт шифрування
cd backend
python scripts/encrypt_keys_for_backend.py

# Введіть паролі та ключі коли буде запрошено
# Скрипт зашифрує та збереже в env-config/.env.secrets
```

### Ручне шифрування (якщо потрібно)

```python
from cryptography.fernet import Fernet

# Згенерувати ключ шифрування
key = Fernet.generate_key()
cipher = Fernet(key)

# Зашифрувати значення
encrypted = cipher.encrypt(b"your_secret_value")
print(encrypted.decode())

# Зберегти ключ шифрування в безпечному місці!
```

### Розшифрування (автоматичне)

Django автоматично розшифровує при завантаженні:

```python
# backend/config/settings.py
from core.services.encryption_service import decrypt_env_value

GOOGLE_MAPS_API_KEY = decrypt_env_value(os.getenv('GOOGLE_MAPS_API_KEY'))
```

---

## 🎨 Frontend Environment (.env.local)

### Next.js Core

```bash
# URLs
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_API_URL=http://localhost:8000  # Для server-side

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_min_32_chars_random_string
```

**Генерація NEXTAUTH_SECRET**:
```bash
# OpenSSL
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### API Keys

```bash
# Google Maps (той самий ключ що і в backend)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC...your_key_here

# DummyJSON (для тестування)
NEXT_PUBLIC_DUMMY_API_BASE_URL=https://dummyjson.com
```

### Redis (для токенів)

```bash
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Якщо встановлений пароль
```

---

## 🐳 Docker Environment (.env.docker)

```bash
# Docker Compose specific
IS_DOCKER=true

# Database
POSTGRES_HOST=db
DATABASE_URL=postgresql://postgres:postgres@db:5432/autoria

# Redis
REDIS_HOST=redis
REDIS_URL=redis://redis:6379/1

# URLs
BACKEND_URL=http://app:8000
FRONTEND_URL=http://frontend:3000
```

---

## 📝 Приклади Конфігурацій

### Local Development (без Docker)

**env-config/.env.base**:
```bash
DEBUG=True
POSTGRES_HOST=localhost
REDIS_HOST=localhost
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

### Docker Development

**env-config/.env.docker**:
```bash
IS_DOCKER=true
POSTGRES_HOST=db
REDIS_HOST=redis
BACKEND_URL=http://app:8000
```

### Production

**env-config/.env.base** (production):
```bash
DEBUG=False
SECRET_KEY=<secure-50+-char-random-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com

POSTGRES_HOST=your-db-host.com
POSTGRES_DB=autoria_prod
POSTGRES_USER=autoria_user

REDIS_HOST=your-redis-host.com
REDIS_PASSWORD=<secure-redis-password>

BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# HTTPS/SSL
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

**frontend/.env.production**:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<secure-64+-char-random-key>
```

---

## ✅ Чек-лист Налаштування

### Backend:
- [ ] `env-config/.env.base` створено
- [ ] `env-config/.env.secrets` створено та зашифровано
- [ ] PostgreSQL credentials налаштовані
- [ ] Redis URL налаштований
- [ ] Google Maps API ключ додано
- [ ] Email SMTP налаштовано
- [ ] `DEBUG=False` в production
- [ ] `SECRET_KEY` згенерований та безпечний
- [ ] `ALLOWED_HOSTS` налаштовані правильно

### Frontend:
- [ ] `frontend/.env.local` створено
- [ ] `NEXTAUTH_SECRET` згенерований (min 32 chars)
- [ ] Backend URL налаштований
- [ ] Google Maps ключ додано
- [ ] Redis URL налаштований

### Security:
- [ ] Всі `.env*` файли в `.gitignore`
- [ ] Секретні ключі зашифровані
- [ ] Production credentials ≠ development
- [ ] HTTPS увімкнено в production
- [ ] CORS налаштовано правильно

---

## 🔍 Перевірка Налаштувань

### Backend

```bash
cd backend

# Перевірити що Django читає env
python manage.py shell
>>> import os
>>> os.getenv('DEBUG')
'True'
>>> os.getenv('DATABASE_URL')
'postgresql://...'

# Перевірити підключення до DB
python manage.py dbshell

# Перевірити Redis
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'works')
>>> cache.get('test')
'works'
```

### Frontend

```bash
cd frontend

# Перевірити env variables
npm run dev

# В браузері console:
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
```

---

## 🚨 Troubleshooting

### Проблема: Django не читає .env файли

**Рішення**:
```bash
# Перевірити що python-dotenv встановлений
pip install python-dotenv

# Перевірити порядок завантаження в settings.py
from dotenv import load_dotenv
load_dotenv()
```

### Проблема: Frontend не бачить NEXT_PUBLIC_* змінні

**Рішення**:
- Перезапустити dev server: `npm run dev`
- Перевірити що змінні починаються з `NEXT_PUBLIC_`
- Rebuild: `npm run build`

### Проблема: Redis connection refused

**Рішення**:
```bash
# Перевірити що Redis працює
redis-cli ping
# Має повернути: PONG

# Або через Docker
docker ps | grep redis
```

### Проблема: PostgreSQL connection error

**Рішення**:
```bash
# Перевірити підключення
psql -h localhost -U postgres -d autoria

# Перевірити що DB існує
psql -h localhost -U postgres -c "SELECT datname FROM pg_database;"
```

---

## 📚 Пов'язані документи

- [SETUP.md](./SETUP.md) - Повна інструкція встановлення
- [README.md](./README.md) - Огляд проекту
- [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) - Детальний гайд налаштування API

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦
