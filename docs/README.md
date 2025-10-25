# 📚 AutoRia - Документація Проекту

## 🎯 Огляд

Повна документація для AutoRia - сучасної платформи продажу автомобілів з AI/LLM інтеграцією.

---

## 📁 Структура Документації

### 🚀 Швидкий старт

| Документ | Опис | Для кого |
|----------|------|----------|
| [Setup Guide](./SETUP_GUIDE.md) | Повне налаштування проекту | Нові розробники |
| [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md) | Docker, Redis, Nginx, PostgreSQL | DevOps, Backend |
| [Troubleshooting](./TROUBLESHOOTING.md) | Вирішення типових проблем | Всі |

### 🔧 Backend Документація

| Документ | Опис | Ключові теми |
|----------|------|--------------|
| [Backend API Guide](./BACKEND_API_GUIDE.md) | Повний API гайд | REST API, фільтрація, пагінація, суперюзер ендпоінти |
| [Backend Services](./BACKEND_SERVICES.md) | Фонові сервіси | Модерація (58ms), Celery задачі, мокові дані |
| [Postman Testing](../backend/POSTMAN_TESTING_GUIDE.md) | Тестування API | Newman, колекції, автотести |

---

## 🎓 Навчальні Шляхи

### 🆕 Для нових розробників

**День 1: Базове налаштування**
1. Прочитати [Setup Guide](./SETUP_GUIDE.md)
2. Налаштувати Docker: [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md)
3. Запустити проект: `docker-compose up`
4. Створити тестові дані: `python manage.py create_mock_system --quick`

**День 2: API та тестування**
1. Вивчити [Backend API Guide](./BACKEND_API_GUIDE.md)
2. Імпортувати Postman колекції
3. Запустити тести: [Postman Testing](../backend/POSTMAN_TESTING_GUIDE.md)
4. Протестувати ключові ендпоінти

**День 3: Розуміння сервісів**
1. Прочитати [Backend Services](./BACKEND_SERVICES.md)
2. Вивчити систему модерації (LLM)
3. Налаштувати Celery та Flower
4. Експериментувати з моковими даними

### 🔧 Для Backend розробників

**Ключові розділи:**
1. [Backend API Guide](./BACKEND_API_GUIDE.md) - REST API, permissions, фільтрація
2. [Backend Services](./BACKEND_SERVICES.md) - Модерація, Celery, мок система
3. [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md) - Docker, PostgreSQL, Redis

**Корисні команди:**
```bash
# Міграції
python manage.py makemigrations
python manage.py migrate

# Тестування
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json

# Celery
celery -A config worker -l info
celery -A config beat -l info
celery -A config flower  # Monitoring
```

### 🎨 Для Frontend розробників

**Ключові розділи:**
1. [Setup Guide](./SETUP_GUIDE.md#i18n-система) - i18n налаштування
2. [Troubleshooting](./TROUBLESHOOTING.md#frontend-problems) - Frontend помилки
3. [Backend API Guide](./BACKEND_API_GUIDE.md) - API endpoints для інтеграції

**Корисні команди:**
```bash
# Development
npm run dev

# Build
npm run build
npm run start

# Очистити cache
rm -rf .next
```

### 🚀 Для DevOps

**Ключові розділи:**
1. [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md) - Docker, Nginx, PostgreSQL
2. [Setup Guide](./SETUP_GUIDE.md#шифрування-api-ключів) - Environment variables
3. [Troubleshooting](./TROUBLESHOOTING.md#docker-та-infrastructure) - Docker проблеми

**Production checklist:**
- [ ] DEBUG=False
- [ ] SECRET_KEY безпечний
- [ ] HTTPS налаштовано
- [ ] Gunicorn workers налаштовані
- [ ] Nginx reverse proxy
- [ ] PostgreSQL backups
- [ ] Redis persistence
- [ ] Logs rotation
- [ ] Monitoring (Flower, health checks)

---

## 🔥 Ключові Особливості Проекту

### 🤖 AI/LLM Модерація
- **Швидкість**: 58ms (hard-block), ~15s (topic analysis)
- **Точність**: 100% для профанності
- **Словник**: 161 слово (🇺🇦🇷🇺🇬🇧🔤)
- **Provider**: g4f + PollinationsAI (безкоштовно)
- **Документація**: [Backend Services](./BACKEND_SERVICES.md#система-модерації-контенту)

### 💱 Валютна Система
- **Джерела**: NBU API + PrivatBank API
- **Кеш**: Redis 24h, DB fallback
- **Підтримка**: UAH, USD, EUR + кросс-конверсія
- **Документація**: [Backend API Guide](./BACKEND_API_GUIDE.md#зовнішні-api-інтеграції)

### 🗺️ Geocoding
- **Provider**: Google Maps API
- **Функції**: Автоматичне визначення координат, валідація адрес
- **Документація**: [Setup Guide](./SETUP_GUIDE.md#google-maps-api)

### 🎭 Mock Data System
- **Автоматичне створення**: При `docker-compose up`
- **Команди**: `create_test_users`, `create_mock_system`
- **LLM генерація**: `populate_test_system --full`
- **Документація**: [Backend Services](./BACKEND_SERVICES.md#система-генерації-мокових-даних)

---

## 📊 Швидкі Посилання

### API Документація
- **Swagger UI**: http://localhost:8000/api/doc/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Postman**: [Testing Guide](../backend/POSTMAN_TESTING_GUIDE.md)

### Моніторинг
- **Flower (Celery)**: http://localhost:5555
- **Django Admin**: http://localhost:8000/admin/
- **Frontend Dev**: http://localhost:3000

### GitHub
- **Repository**: https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024
- **Branch**: swagger-improvements

---

## 🛠️ Технологічний Стек

### Backend
- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Task Queue**: Celery + Redis
- **AI/LLM**: g4f + PollinationsAI
- **API Docs**: drf-spectacular (OpenAPI 3.0)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth.js
- **State**: React Context API
- **Styling**: Tailwind CSS
- **i18n**: Custom i18n system (uk/ru/en)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Process Manager**: Gunicorn
- **Monitoring**: Flower (Celery)

---

## 📖 Додаткові Ресурси

### Зовнішня Документація
- [Django Docs](https://docs.djangoproject.com/)
- [DRF Docs](https://www.django-rest-framework.org/)
- [Next.js Docs](https://nextjs.org/docs)
- [Docker Docs](https://docs.docker.com/)
- [Redis Docs](https://redis.io/docs/)

### Внутрішня Документація
- Backend: `backend/docs/` (застаріла, див. нові тематичні файли)
- API: Swagger UI (live)
- Tests: [Postman Guide](../backend/POSTMAN_TESTING_GUIDE.md)

---

## 🤝 Контрибуція

### Додавання нової документації
1. Створити файл в `docs/`
2. Додати посилання в цей README
3. Дотримуватися структури:
   - Українська мова
   - Markdown формат
   - Приклади коду
   - Секція "Пов'язані документи"

### Оновлення існуючої документації
1. Відредагувати відповідний файл
2. Оновити версію та дату
3. Додати запис в "Історія змін" (якщо є)

---

## 📝 Історія Змін Документації

- **v2.0** (2025-01-25): Повна реорганізація в тематичні файли
  - Створено 6 нових тематичних файлів
  - Об'єднано backend/docs та docs/
  - Видалено застарілі файли
  - Переклад на українську

- **v1.0** (2024): Початкова структура документації

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25  
**Мова**: Українська 🇺🇦
