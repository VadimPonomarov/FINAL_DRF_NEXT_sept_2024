# 🚗 AutoRia - Платформа Продажу Автомобілів

[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Сучасна платформа для продажу автомобілів з AI/LLM модерацією контенту, інтеграцією зовнішніх API та повнофункціональним веб-інтерфейсом.

## 📋 Зміст

- [Особливості](#-особливості)
- [Технології](#-технології)
- [Швидкий старт](#-швидкий-старт)
- [Документація](#-документація)
- [Структура проекту](#-структура-проекту)
- [API](#-api)
- [Тестування](#-тестування)
- [Production Deployment](#-production-deployment)

## ✨ Особливості

### 🤖 AI/LLM Модерація
- **Швидкість**: 58ms для hard-block перевірки (1000x швидше)
- **Точність**: 100% для профанності
- **Словник**: 161 слово (українська, російська, англійська, транслітерація)
- **Provider**: g4f + PollinationsAI (безкоштовно)

### 💱 Валютна Система
- Автоматичне оновлення курсів (NBU + PrivatBank API)
- Кеш Redis 24h з DB fallback
- Кросс-конверсія валют (UAH/USD/EUR)
- Інверсія курсів для точної конвертації

### 🗺️ Geocoding
- Google Maps API інтеграція
- Автоматичне визначення координат
- Валідація адрес
- Регіон/місто resolution

### 👥 Система Ролей
- **Покупець**: Перегляд та пошук оголошень
- **Продавець (Basic)**: 1 активне оголошення
- **Продавець (Premium)**: Без обмежень + аналітика
- **Менеджер**: Модерація контенту
- **Суперюзер**: Повний доступ

### 🎯 Фільтрація та Пошук
- Складна система фільтрації (ціна, локація, характеристики)
- Пагінація (10-100 items per page)
- Сортування (ціна, дата, пробіг)
- Текстовий пошук (title, description)

### 🌍 Інтернаціоналізація (i18n)
- Підтримка 3 мов: українська, російська, англійська
- Backend та Frontend локалізація
- Динамічна зміна мови

## 🛠 Технології

### Backend
- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Task Queue**: Celery + Redis
- **AI/LLM**: g4f + PollinationsAI
- **API Docs**: drf-spectacular (OpenAPI 3.0)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth.js + JWT
- **State**: React Context API + Redis
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Google Maps React

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Process Manager**: Gunicorn
- **Monitoring**: Flower (Celery), Logs

## 🚀 Швидкий старт

### Вимоги

- Docker & Docker Compose
- Node.js 18+ (для frontend)
- Python 3.11+ (для backend)
- PostgreSQL 15+ (або через Docker)
- Redis 7+ (або через Docker)

### Встановлення

```bash
# 1. Клонувати репозиторій
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
cd FINAL_DRF_NEXT_sept_2024

# 2. Налаштувати environment variables
cp env-config/.env.base.example env-config/.env.base
cp env-config/.env.secrets.example env-config/.env.secrets
# Відредагувати файли з вашими ключами

# 3. Запустити через Docker Compose
docker-compose up -d

# 4. Застосувати міграції та створити тестові дані
docker-compose exec app python manage.py migrate
docker-compose exec app python manage.py create_test_users
docker-compose exec app python manage.py create_mock_system --quick
```

### Альтернативний запуск (без Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📚 Документація

Повна документація знаходиться в директорії [`docs/`](./docs/):

- [**Швидкий старт**](./docs/SETUP_GUIDE.md) - Повне налаштування проекту
- [**Backend API**](./docs/BACKEND_API_GUIDE.md) - REST API, фільтрація, permissions
- [**Backend Services**](./docs/BACKEND_SERVICES.md) - Модерація, Celery, мок дані
- [**Infrastructure**](./docs/INFRASTRUCTURE_SETUP.md) - Docker, Redis, Nginx, PostgreSQL
- [**Troubleshooting**](./docs/TROUBLESHOOTING.md) - Вирішення проблем
- [**Postman Testing**](./backend/POSTMAN_TESTING_GUIDE.md) - API тестування

## 📁 Структура проекту

```
FINAL_DRF_NEXT_sept_2024/
├── backend/                    # Django REST API
│   ├── apps/                   # Django додатки
│   │   ├── ads/               # Оголошення
│   │   ├── auth/              # Автентифікація
│   │   ├── currency/          # Валюти
│   │   ├── users/             # Користувачі
│   │   └── ...
│   ├── config/                 # Налаштування Django
│   ├── core/                   # Спільні утиліти
│   │   └── services/          # LLM модерація, email, etc.
│   ├── media/                  # Завантажені файли
│   ├── logs/                   # Логи
│   └── manage.py
├── frontend/                   # Next.js додаток
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React компоненти
│   │   ├── contexts/          # React Context API
│   │   ├── services/          # API клієнти
│   │   ├── utils/             # Утиліти
│   │   └── locales/           # i18n переклади
│   └── public/                 # Статичні файли
├── docs/                       # Документація
├── env-config/                 # Environment variables
├── docker-compose.yml          # Docker конфігурація
└── README.md                   # Цей файл
```

## 🔌 API

### Swagger Документація
- **Swagger UI**: http://localhost:8000/api/doc/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: http://localhost:8000/api/schema/

### Основні ендпоінти

```http
# Автентифікація
POST /api/auth/login/
POST /api/auth/register/
POST /api/auth/logout/
POST /api/auth/token/refresh/

# Оголошення
GET    /api/ads/cars/                    # Список оголошень
POST   /api/ads/cars/                    # Створити оголошення
GET    /api/ads/cars/{id}/               # Деталі оголошення
PATCH  /api/ads/cars/{id}/               # Оновити
DELETE /api/ads/cars/{id}/               # Видалити

# Модерація (Superuser)
GET    /api/ads/moderation/queue/        # Черга модерації
POST   /api/ads/moderation/{id}/approve/ # Схвалити
POST   /api/ads/moderation/{id}/reject/  # Відхилити

# Валюти
GET    /api/currency/rates/              # Курси валют
POST   /api/currency/convert/            # Конвертувати

# Користувачі
GET    /api/users/profile/               # Мій профіль
PATCH  /api/users/profile/               # Оновити профіль
```

Детальна документація: [Backend API Guide](./docs/BACKEND_API_GUIDE.md)

## 🧪 Тестування

### Postman тести

```bash
cd backend
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
  -e AutoRia_API_Complete_Test_Suite.postman_environment.json
```

**Результати**: 95%+ pass rate (критичні модулі 100%)

Детальний гайд: [Postman Testing Guide](./backend/POSTMAN_TESTING_GUIDE.md)

### Unit тести (Backend)

```bash
cd backend
python manage.py test
```

### E2E тести (Frontend)

```bash
cd frontend
npm run test
```

## 🚀 Production Deployment

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
services:
  app:
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_HOSTS=yourdomain.com
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
```

### Environment Variables (Production)

```bash
# .env.prod
DEBUG=False
SECRET_KEY=<secure-random-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:pass@db:5432/autoria_prod
REDIS_URL=redis://redis:6379/0

# API Keys (зашифровані)
GOOGLE_MAPS_API_KEY=<encrypted>
EMAIL_HOST_PASSWORD=<encrypted>
```

### Checklist

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` безпечний
- [ ] `ALLOWED_HOSTS` налаштовані
- [ ] HTTPS увімкнено (SSL сертифікати)
- [ ] Database backups налаштовані
- [ ] Redis persistence увімкнено
- [ ] Gunicorn workers оптимізовані
- [ ] Nginx reverse proxy налаштовано
- [ ] Logs rotation активовано
- [ ] Monitoring налаштовано (Flower, Sentry)

Детальна інструкція: [Infrastructure Setup](./docs/INFRASTRUCTURE_SETUP.md)

## 🤝 Contributing

1. Fork репозиторій
2. Створіть feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit зміни (`git commit -m 'Add some AmazingFeature'`)
4. Push до branch (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

## 📄 Ліцензія

Цей проект ліцензовано під MIT License - дивіться файл [LICENSE](LICENSE) для деталей.

## 👨‍💻 Автор

**Vadim Ponomarov**
- GitHub: [@VadimPonomarov](https://github.com/VadimPonomarov)
- Email: pvs.versia@gmail.com

## 🙏 Подяки

- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js](https://nextjs.org/)
- [g4f](https://github.com/xtekky/gpt4free) - Безкоштовний LLM доступ
- [NBU API](https://bank.gov.ua) - Курси валют
- [Google Maps API](https://developers.google.com/maps) - Geocoding

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦

⭐ Якщо цей проект був корисним, поставте зірку на GitHub!
