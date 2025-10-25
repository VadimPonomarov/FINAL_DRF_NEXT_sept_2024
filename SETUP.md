# 🚀 AutoRia - Покрокова Інструкція Встановлення

## 📋 Передумови

Перед початком переконайтеся, що встановлено:

- **Docker Desktop** 20.10+ (рекомендовано) АБО
- **Python** 3.11+
- **Node.js** 18.0+ (LTS)
- **PostgreSQL** 15+
- **Redis** 7+

---

## 🎯 Варіанти Встановлення

### Варіант 1: Docker Compose (Рекомендовано) 🐳

**Найпростіший спосіб для швидкого старту**

```bash
# 1. Клонувати репозиторій
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
cd FINAL_DRF_NEXT_sept_2024

# 2. Налаштувати environment (див. ENV_SETUP.md)
cp env-config/.env.base.example env-config/.env.base
# Відредагувати .env.base з вашими налаштуваннями

# 3. Запустити всі сервіси
docker-compose up -d

# 4. Перевірити статус
docker-compose ps

# 5. Переглянути логи (опціонально)
docker-compose logs -f app
```

**Що запуститься автоматично:**
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Django backend (міграції, тестові користувачі)
- ✅ Celery worker
- ✅ Celery beat (scheduler)

**Доступ:**
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/doc/
- Frontend: http://localhost:3000 (якщо налаштовано)

### Варіант 2: Локальне Встановлення (Manual) 💻

**Для розробки з повним контролем**

#### Крок 1: Backend Setup

```bash
# 1.1. Перейти в backend директорію
cd backend

# 1.2. Створити virtual environment
python -m venv venv

# Активувати venv:
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 1.3. Встановити залежності
pip install -r requirements.txt
# АБО через Poetry (якщо встановлений):
poetry install

# 1.4. Налаштувати environment variables
# Створити .env файл або використовувати ../env-config/

# 1.5. Запустити PostgreSQL (якщо не через Docker)
# Встановити: https://www.postgresql.org/download/
# Створити БД:
createdb autoria

# 1.6. Запустити Redis (якщо не через Docker)
# Встановити: https://redis.io/download
redis-server

# 1.7. Застосувати міграції
python manage.py migrate

# 1.8. Створити суперюзера
python manage.py createsuperuser

# 1.9. Заповнити тестові дані (опціонально)
python manage.py create_test_users
python manage.py create_mock_system --quick

# 1.10. Запустити development server
python manage.py runserver
```

**Backend тепер доступний на http://localhost:8000**

#### Крок 2: Frontend Setup

```bash
# 2.1. Відкрити новий термінал і перейти в frontend
cd frontend

# 2.2. Встановити залежності
npm install
# АБО
yarn install
# АБО
pnpm install

# 2.3. Створити .env.local (див. ENV_SETUP.md)
cp .env.local.example .env.local
# Відредагувати з вашими налаштуваннями

# 2.4. Запустити development server
npm run dev
```

**Frontend тепер доступний на http://localhost:3000**

#### Крок 3: Celery (Фонові задачі)

```bash
# 3.1. Відкрити ще один термінал в backend/
cd backend
source venv/bin/activate  # Або venv\Scripts\activate на Windows

# 3.2. Запустити Celery worker
celery -A config worker -l info

# 3.3. Відкрити ще один термінал для Celery Beat
celery -A config beat -l info

# 3.4. (Опціонально) Flower для моніторингу
celery -A config flower
# Доступ: http://localhost:5555
```

---

## 🗄️ Ініціалізація Бази Даних

### Міграції

```bash
cd backend

# Створити міграції (якщо змінювали моделі)
python manage.py makemigrations

# Застосувати міграції
python manage.py migrate

# Перевірити статус міграцій
python manage.py showmigrations
```

### Тестові Дані

```bash
# 1. Довідники (марки, моделі, регіони, міста)
python manage.py populate_references

# 2. Тестові користувачі
python manage.py create_test_users
# Створює:
# - admin@autoria.com (суперюзер)
# - manager@autoria.com (менеджер)
# - seller1@gmail.com (продавець)
# - buyer1@gmail.com (покупець)
# Пароль для всіх: 12345678

# 3. Мокові оголошення (швидко - 5 продавців, 20 оголошень)
python manage.py create_mock_system --quick

# АБО повна система (15 продавців, 50 оголошень)
python manage.py create_mock_system

# АБО з LLM генерацією (50 користувачів, 100 оголошень)
python manage.py populate_test_system --full
```

### Статичні Файли (Production)

```bash
# Зібрати статичні файли
python manage.py collectstatic --noinput
```

---

## 🔑 API Keys Налаштування

### Google Maps API (Обов'язково)

1. **Отримати ключ**:
   - Перейти на https://console.cloud.google.com/
   - Створити проект
   - Enable APIs: Geocoding API, Maps JavaScript API
   - Створити API key

2. **Додати в env**:
   ```bash
   # Backend: env-config/.env.secrets
   GOOGLE_MAPS_API_KEY=AIzaSyC...your_key

   # Frontend: frontend/.env.local
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC...your_key
   ```

### Email SMTP (Опціонально)

```bash
# Gmail (найпростіший варіант)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password  # Не звичайний пароль!
```

**Отримати App Password**:
1. Google Account → Security
2. Enable 2-Step Verification
3. App passwords → Generate
4. Використати згенерований пароль

### NBU + PrivatBank API (Автоматично)

**Не потрібна реєстрація!** Ці API публічні та безкоштовні.

---

## 🧪 Перевірка Встановлення

### Backend Health Check

```bash
# 1. Перевірити що сервер працює
curl http://localhost:8000/health/

# Очікується:
# {"status": "healthy", "timestamp": "..."}

# 2. Перевірити Swagger
# Відкрити в браузері: http://localhost:8000/api/doc/

# 3. Перевірити Redis
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'works')
>>> cache.get('test')
'works'
>>> exit()

# 4. Перевірити Database
python manage.py dbshell
# Має підключитися до PostgreSQL
\dt  # Показати таблиці
\q   # Вийти
```

### Frontend Health Check

```bash
# 1. Відкрити http://localhost:3000
# Має завантажитися головна сторінка

# 2. Перевірити в браузері console (F12):
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
# Має показати: http://localhost:8000
```

### API Tests (Postman)

```bash
cd backend

# Встановити Newman (якщо ще не встановлено)
npm install -g newman

# Запустити повний набір тестів
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
  -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Очікується: 95%+ pass rate
```

---

## 🎯 Швидкі Команди

### Docker Compose

```bash
# Запустити всі сервіси
docker-compose up -d

# Зупинити
docker-compose down

# Перезапустити конкретний сервіс
docker-compose restart app

# Переглянути логи
docker-compose logs -f app

# Виконати команду в контейнері
docker-compose exec app python manage.py migrate

# Повне очищення (включно з volumes)
docker-compose down -v
```

### Backend

```bash
# Запустити dev server
python manage.py runserver

# Застосувати міграції
python manage.py migrate

# Створити суперюзера
python manage.py createsuperuser

# Django shell
python manage.py shell

# Запустити Celery
celery -A config worker -l info
celery -A config beat -l info
```

### Frontend

```bash
# Development
npm run dev

# Production build
npm run build
npm run start

# Lint
npm run lint

# Type check
npm run type-check
```

---

## 🚨 Типові Проблеми

### Проблема: Django не може підключитися до PostgreSQL

**Симптоми**:
```
django.db.utils.OperationalError: could not connect to server
```

**Рішення**:
```bash
# 1. Перевірити що PostgreSQL запущений
# Windows:
services.msc  # Знайти PostgreSQL

# Linux:
sudo systemctl status postgresql

# 2. Перевірити credentials в .env
POSTGRES_HOST=localhost  # Не 'db' для локального запуску
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

### Проблема: Redis connection refused

**Симптоми**:
```
ConnectionRefusedError: [Errno 111] Connection refused
```

**Рішення**:
```bash
# 1. Перевірити що Redis запущений
redis-cli ping
# Має повернути: PONG

# 2. Якщо не працює, запустити:
# Windows:
redis-server.exe

# Linux:
redis-server

# Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### Проблема: Frontend не може підключитися до Backend

**Симптоми**:
```
Failed to fetch
Network error
```

**Рішення**:
```bash
# 1. Перевірити що backend запущений
curl http://localhost:8000/health/

# 2. Перевірити CORS в backend
# env-config/.env.base:
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# 3. Перевірити frontend .env.local:
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Без trailing slash!
```

### Проблема: Postman тести падають з 401

**Симптоми**:
```
401 Unauthorized
```

**Рішення**:
```bash
# 1. Створити суперюзера
python manage.py create_test_users

# 2. Перевірити email в environment:
# AutoRia_API_Complete_Test_Suite.postman_environment.json
"admin_user_email": "pvs.versia@gmail.com"
"admin_user_password": "12345678"

# 3. Або використати свого суперюзера
```

---

## 📚 Наступні Кроки

Після успішного встановлення:

1. **Вивчити API документацію**:
   - Swagger UI: http://localhost:8000/api/doc/
   - ReDoc: http://localhost:8000/api/redoc/

2. **Прочитати документацію**:
   - [README.md](./README.md) - Огляд проекту
   - [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables
   - [docs/BACKEND_API_GUIDE.md](./docs/BACKEND_API_GUIDE.md) - Backend API
   - [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Вирішення проблем

3. **Запустити тести**:
   ```bash
   # Django tests
   python manage.py test

   # Postman tests
   newman run AutoRia_API_Complete_Test_Suite.postman_collection.json
   ```

4. **Почати розробку**:
   - Backend: Створити нові endpoints в `backend/apps/`
   - Frontend: Створити нові сторінки в `frontend/src/app/`

---

## 🎓 Навчальні Ресурси

### Офіційна Документація
- [Django Docs](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js Docs](https://nextjs.org/docs)
- [Docker Docs](https://docs.docker.com/)

### Внутрішня Документація
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Postman Testing Guide](./backend/POSTMAN_TESTING_GUIDE.md)

---

## ✅ Чек-лист Встановлення

### Перед запуском:
- [ ] Python 3.11+ встановлено
- [ ] Node.js 18+ встановлено
- [ ] Docker Desktop встановлено (для Docker варіанту)
- [ ] PostgreSQL запущений
- [ ] Redis запущений
- [ ] Git репозиторій клоновано

### Environment налаштування:
- [ ] `env-config/.env.base` створено
- [ ] `env-config/.env.secrets` створено
- [ ] `frontend/.env.local` створено
- [ ] Google Maps API ключ додано
- [ ] Email SMTP налаштовано (опціонально)

### Backend:
- [ ] Virtual environment створено
- [ ] Залежності встановлені
- [ ] Міграції застосовані
- [ ] Суперюзер створений
- [ ] Тестові дані завантажені
- [ ] Dev server запущений на :8000

### Frontend:
- [ ] Node modules встановлені
- [ ] .env.local налаштовано
- [ ] Dev server запущений на :3000

### Перевірка:
- [ ] Backend health check пройшов
- [ ] Swagger UI відкривається
- [ ] Frontend завантажується
- [ ] API тести пройшли (95%+)
- [ ] Celery worker працює

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦

💡 **Потрібна допомога?** Перегляньте [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
