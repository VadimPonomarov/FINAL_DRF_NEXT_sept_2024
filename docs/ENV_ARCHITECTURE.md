# 🏗️ Архітектура Environment Variables

## 📋 Огляд

Централізована система управління змінними середовища для навчального проекту AutoRia.

> **🎓 ВАЖЛИВО**: Це навчальний проект! Усі .env файли включені в Git для швидкого розгортання.
> У production НІКОЛИ не зберігайте секрети в Git!

---

## 🎯 Принципи Централізації

### 1. Єдине джерело правди (`env-config/`)

Усі Docker-сервіси використовують централізовані конфігурації:

```
env-config/
├── .env.base       # Базові налаштування (порти, хости, імена БД)
├── .env.secrets    # API ключі, паролі (навчальні значення)
└── .env.docker     # Docker-specific перевизначення (хости контейнерів)
```

**Порядок завантаження** (кожен наступний перевизначає попередній):
```
.env.base → .env.secrets → .env.docker
```

**✅ Немає .env.local в env-config/** - це усуває дублювання!

### 2. Service-specific конфігурації

#### Backend (Django/DRF)
- **Docker**: Використовує `env-config/` через docker-compose.yml
- **Локально**: Можна використовувати `.env` в корені (symlink або копія)

#### Frontend (Next.js)
- **Локально**: `frontend/.env.local` (Next.js convention - очікує .env файли у директорії проекту)
- **Docker** (закоментовано): Використовував би `env-config/`

**Чому frontend/.env.local не порушує централізацію?**
- Next.js вимагає `.env` файли безпосередньо у директорії проекту
- Містить тільки frontend-specific змінні (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_*`)
- Не дублює backend змінні з `env-config/`
- Це service-specific файл, не конфліктує з централізованою схемою для Docker

#### Redis
- **Docker**: Використовує `env-config/` + `redis/redis.conf`
- Спеціалізована конфігурація: `redis/.env` (для специфічних налаштувань Redis)

#### PostgreSQL, Celery, RabbitMQ, Nginx
- **Docker**: Використовують `env-config/`

---

## 🔄 Як працює централізація

### Docker Compose Integration

```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - ./env-config/.env.base       # База
      - ./env-config/.env.secrets    # Секрети
      - ./env-config/.env.docker     # Docker overrides
```

**Переваги**:
- ✅ Єдине місце для змін
- ✅ Узгодженість між сервісами
- ✅ Легке перемикання між оточеннями
- ✅ Відсутність дублювання

### Local Development

#### Backend
```bash
# Варіант 1: Використання .env в корені
cp env-config/.env.base .env
cat env-config/.env.secrets >> .env
cat env-config/.env.local >> .env

# Варіант 2: Docker (рекомендовано)
docker-compose up
```

#### Frontend
```bash
# Використовує frontend/.env.local
cd frontend
npm run dev
```

---

## 📦 Що знаходиться в кожному файлі

### env-config/.env.base (Базові налаштування)

```bash
# Django
DEBUG=True
SECRET_KEY=...
ALLOWED_HOSTS=...

# PostgreSQL
POSTGRES_DB=autoria
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### env-config/.env.secrets (API ключі)

```bash
# Google Maps
GOOGLE_MAPS_API_KEY=...

# Email
EMAIL_HOST_PASSWORD=...

# Social Auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### env-config/.env.docker (Docker overrides)

```bash
# Docker-specific хости
POSTGRES_HOST=pg
REDIS_HOST=redis
RABBITMQ_HOST=rabbitmq

# Docker URLs
BACKEND_URL=http://app:8000
```

### frontend/.env.local (Frontend-specific)

```bash
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_API_URL=http://localhost:8000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# Redis
REDIS_URL=redis://localhost:6379
```

### redis/.env (Redis-specific)

```bash
# Memory
REDIS_MAXMEMORY=256mb
REDIS_MAXMEMORY_POLICY=allkeys-lru

# Persistence
REDIS_SAVE_ENABLED=yes
REDIS_APPENDONLY=yes

# Logging
REDIS_LOGLEVEL=notice
```

---

## 🚫 Що НЕ робити (Анти-патерни)

### ❌ Дублювання змінних

**Погано:**
```
backend/.env         → REDIS_HOST=localhost
env-config/.env.base → REDIS_HOST=localhost
frontend/.env.local  → REDIS_HOST=localhost
```

**Добре:**
```
env-config/.env.base → REDIS_HOST=localhost  (єдине джерело)
backend/             → використовує env-config через Docker
frontend/.env.local  → REDIS_URL=redis://localhost:6379 (для Next.js)
```

### ❌ Хардкод в коді

**Погано:**
```python
REDIS_HOST = "localhost"  # Хардкод
```

**Добре:**
```python
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")  # З .env
```

### ❌ Різні значення в різних файлах

Якщо `POSTGRES_PORT` визначено в декількох місцях, вони ПОВИННІ мати однакове значення або бути перевизначенням для конкретного оточення.

---

## ✅ Best Practices

### 1. Використання Defaults

```python
# settings.py
DEBUG = os.getenv("DEBUG", "False") == "True"
SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-only")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
```

### 2. Валідація критичних змінних

```python
# settings.py
if not SECRET_KEY or SECRET_KEY == "dev-key-only":
    if not DEBUG:
        raise ValueError("SECRET_KEY must be set in production!")
```

### 3. Документування змінних

Кожна змінна повинна мати коментар у .env файлі:

```bash
# Port для PostgreSQL (default: 5432)
POSTGRES_PORT=5432

# Google Maps API ключ (отримати на console.cloud.google.com)
GOOGLE_MAPS_API_KEY=your_key_here
```

### 4. Типізація булевих значень

```bash
# ❌ Погано
DEBUG=1
DEBUG=true
DEBUG=yes

# ✅ Добре
DEBUG=True   # або False (капіталізовано для Python)
```

---

## 🔍 Перевірка конфігурації

### Швидка перевірка всіх .env файлів

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Filter ".env*" -File | 
  Where-Object { $_.FullName -notmatch "node_modules" } | 
  Select-Object FullName

# Linux/Mac
find . -name ".env*" -not -path "*/node_modules/*" | sort
```

### Перевірка дублювання змінних

```python
# check_env_duplicates.py
import os
from pathlib import Path

files = [
    "env-config/.env.base",
    "env-config/.env.secrets",
    "env-config/.env.docker",
    "frontend/.env.local",
]

vars_by_file = {}
for file in files:
    if Path(file).exists():
        with open(file) as f:
            vars_by_file[file] = {
                line.split("=")[0] 
                for line in f 
                if "=" in line and not line.startswith("#")
            }

# Знайти дублікати
for file1, vars1 in vars_by_file.items():
    for file2, vars2 in vars_by_file.items():
        if file1 < file2:
            duplicates = vars1 & vars2
            if duplicates:
                print(f"⚠️ Дублікати між {file1} та {file2}:")
                print(f"   {duplicates}")
```

---

## 📚 Додаткові ресурси

- [ENV_SETUP.md](../ENV_SETUP.md) - Детальне налаштування кожної змінної
- [SETUP.md](../SETUP.md) - Покрокова інструкція запуску проекту
- [docker-compose.yml](../docker-compose.yml) - Конфігурація Docker сервісів

---

**Версія:** 1.0  
**Останнє оновлення:** 2025-01-25

