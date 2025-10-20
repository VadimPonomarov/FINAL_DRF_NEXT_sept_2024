# 🚀 Повне розгортання AutoRia Clone

## ✅ Виправлено проблему з завантаженням даних (2025-10-20)

**Проблема:** Оптимізована збірка Next.js з `output: 'standalone'` не забезпечувала завантаження даних при старті проекту.

**Рішення:** Використовується стандартна збірка Next.js (`npm run build` + `npm run start`) замість standalone output. Детальна інформація: `docs/FRONTEND_BUILD_FIX.md`

---

## 📋 Процес розгортання всього проекту

### 🎯 Варіанти розгортання
- Backend у Docker + Frontend локально (рекомендовано)
- Повний Docker (усі сервіси, включно з Frontend)

---

## ⬇️ Швидкий старт (для нових користувачів)

### 1. Клонування репозиторію
```bash
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
cd FINAL_DRF_NEXT_sept_2024
```

### 2. Автоматичне розгортання (РЕКОМЕНДОВАНО)

**Варіант A: Через deploy.py (найпростіший)**

```bash
# Windows
python deploy.py

# macOS/Linux
python3 deploy.py
```

**Що робить скрипт автоматично:**
1. ✅ Перевіряє системні вимоги (Python, Node.js, Docker)
2. ✅ Пропонує вибрати режим розгортання (локальний frontend або повний Docker)
3. ✅ Збирає всі Docker сервіси (backend, PostgreSQL, Redis, RabbitMQ, Celery, Nginx)
4. ✅ Збирає frontend в production режимі (якщо обрано локальний режим)
5. ✅ Запускає всі сервіси
6. ✅ Перевіряє готовність системи
7. ✅ Надає посилання для доступу

**Режими розгортання:**
- **Опція 0** (РЕКОМЕНДОВАНО): Backend в Docker + Frontend локально
  - Швидша розробка та debugging
  - Frontend на http://localhost:3000
  - Backend API на http://localhost/api/

- **Опція 00**: Всі сервіси в Docker
  - Повна ізоляція
  - Frontend на http://localhost або http://localhost:3000
  - Backend API на http://localhost/api/

---

**Варіант B: Ручне розгортання через Docker Compose**

Якщо ви хочете більше контролю над процесом:

```bash
# 1. Запуск всіх Docker сервісів (backend, PostgreSQL, Redis, RabbitMQ, Celery, Nginx)
docker-compose up --build -d

# 2. Збірка та запуск frontend локально
cd frontend
npm install --legacy-peer-deps
npm run build
npm run start
```

**Переваги ручного розгортання:**
- ✅ Повний контроль над кожним кроком
- ✅ Можливість налаштування перед запуском
- ✅ Легше діагностувати проблеми
- ✅ Не потрібен Python для розгортання

**Доступ до сервісів:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 або http://localhost/api/
- Django Admin: http://localhost:8000/admin
- API Docs (Swagger): http://localhost:8000/api/schema/swagger/
- RabbitMQ Management: http://localhost:15672
- Celery Flower: http://localhost:5555
- Redis Insight: http://localhost:5540

### Вибір інтерпретатора Python (для deploy.py)

**Важливо:** Використовуйте Python 3.11+

```bash
# Windows
python deploy.py
# або
py -3.11 deploy.py

# macOS/Linux
python3 deploy.py
```

### 🔢 Опції майстра `deploy.py`
- `0` — Backend у Docker + Frontend локально (рекомендовано)
- `00` — Усі сервіси у Docker (включно з Frontend)

1) Підніміть backend-сервіси:
```bash
docker-compose up -d --build
```

2) Запустіть локальний фронтенд (порт 3000):
```bash
cd frontend
npm install --legacy-peer-deps
npm run build
npm run start
```

**Важливо:** Використовуйте `npm install --legacy-peer-deps` для уникнення конфліктів залежностей.

---

## 🐳 Варіант 2: Повний Docker

1) Розкоментуйте сервіс `frontend` у `docker-compose.yml` (секція `services:`).
2) Запустіть усі сервіси:
```bash
docker-compose up -d --build
```

---

<!-- Вилучено: декоративний розділ про прогрес-бари не відповідає реальності -->



### 🧹 Повне очищення та пересбірка (ручні команди):
```bash
docker-compose down -v
docker image prune -f
docker volume prune -f
docker-compose up -d --build --force-recreate
```

<!-- Вилучено: опис перевірок неактуальних файлів -->

<!-- Вилучено: декоративні блоки очікування -->

---

## 🌐 Доступні URL після деплою

### Локальний фронтенд (рекомендовано):
- **http://localhost** — UI через Nginx-проксі (проксі на локальний фронтенд 3000)
- **http://localhost:3000** — локальний Frontend (Next.js `npm run start`)
- **http://localhost/api/** — Backend API (проксі на `app:8000`)
- **http://localhost/admin/** — Django Admin
- **http://localhost/rabbitmq/** — RabbitMQ Management (через Nginx)
- **http://localhost:15672** — RabbitMQ Management (напряму)
- **http://localhost:5555** — Flower
- **http://localhost:5540** — Redis Insight

### Повний Docker:
- **http://localhost** — UI через Nginx-проксі (Frontend у контейнері)
- **http://localhost/api/** — Backend API
- інші URL аналогічні наведеним вище

---

## 🔧 Ручні сценарії

### Локальний фронтенд
```bash
docker-compose up -d --build
cd frontend
npm install --legacy-peer-deps
npm run build
npm run start
```

### Повний Docker
```bash
# Розкоментуйте сервіс `frontend` у docker-compose.yml
docker-compose up -d --build
```

---

## 🔍 Моніторинг і діагностика
```bash
docker-compose ps
docker-compose logs -f
```

## 🔧 Системні вимоги
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- 8GB RAM (рекомендовано 16GB)
- SSD

## 🔍 Troubleshooting

### Frontend не завантажує дані
**Проблема:** Сторінки відображаються порожніми, API запити не працюють.

**Рішення:**
1. Перевірте, що використовується стандартна збірка (не standalone)
2. Пересоберіть frontend:
   ```bash
   cd frontend
   rm -rf .next node_modules
   npm install --legacy-peer-deps
   npm run build
   npm run start
   ```

### Порт 3000 зайнятий
```bash
# Windows
npx kill-port 3000

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Backend не доступний
1. Перевірте статус: `docker-compose ps app`
2. Перевірте логи: `docker-compose logs -f app`
3. Перевірте environment variables у `frontend/.env.local`

## 📚 Додаткова документація
- **Frontend Build Fix**: `docs/FRONTEND_BUILD_FIX.md` - виправлення проблеми з завантаженням даних
- **Image Generation Fix**: `docs/IMAGE_GENERATION_FIX.md` - виправлення проблем з генерацією зображень
- **Authentication**: `docs/NEXTAUTH_SESSION_FIX.md` - налаштування NextAuth
- **CORS Errors**: `docs/CORS_ERRORS_FIX.md` - виправлення CORS помилок

## 📞 Підтримка
- Перевірте стан і логи: `docker-compose ps`, `docker-compose logs -f`
- Перезапуск проєкту: `python deploy.py` (рекомендовано режим `0`)
- Повна пересборка: `python deploy.py --mode full_rebuild`
- Контакти: pvs.versia@gmail.com
