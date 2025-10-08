# 🚀 Повне розгортання AutoRia Clone

> УВАГА: Єдиним канонічним гайдом тепер є `SETUP.md`. Цей файл збережено для сумісності і може містити застарілий або дубльований контент. Будь ласка, користуйтесь `SETUP.md` для актуальних інструкцій.

## 📋 Процес розгортання всього проекту

### 🎯 Два варіанти розгортання:

1. **Локальний фронтенд** (рекомендується) - Backend в Docker + оптимізований локальний фронтенд
2. **Повний Docker** - Всі сервіси включаючи фронтенд в Docker

---

## ⚡ АВТОМАТИЧНІ СКРИПТИ РОЗГОРТАННЯ

### 🐍 Python скрипт (рекомендується):

```bash
# 1. Клонування проекту
git clone <repository-url>
cd FINAL_DRF_NEXT_sept_2024

# 2. Автоматичний повний деплой з прогрес-барами
python deploy.py

# 🚀 ЕМУЛЯЦІЯ РОЗГОРТАННЯ З НУЛЯ (як після git clone)
# 📋 План розгортання:
#    1️⃣  Перевірка системних вимог
#    1️⃣.5️⃣ Перевірка файлів проекту
#    2️⃣  Повна збірка та запуск Docker сервісів
#    3️⃣  Збірка фронтенду в production режимі
#    4️⃣  Запуск локального оптимізованого фронтенду

# 3. Перевірка сервісів
docker-compose ps
# Перегляд логів (за потреби)
docker-compose logs -f
```

### 🐍 Вибір інтерпретатора Python (важливо для deploy.py)

Перед запуском `deploy.py` оберіть коректний інтерпретатор (Python 3.11+):

- **PyCharm**: File → Settings → Project → Python Interpreter → Add Interpreter (System/Virtualenv) → Run `deploy.py`.
- **VS Code**: Ctrl+Shift+P → "Python: Select Interpreter" → далі `python deploy.py` у терміналі.
- **IntelliJ IDEA (з Python Plugin)**: File → Settings → Project → Python Interpreter → створіть Run Configuration для `deploy.py`.
- **Термінал**: Windows `py -3.11 deploy.py` або `python deploy.py`; macOS/Linux `python3 deploy.py`.

### 🔢 Вибір опцій у майстрі `deploy.py`

Оберіть режим розгортання:
- `0` — Backend у Docker + Frontend локально (рекомендовано)
- `00` — Усі сервіси у Docker (включно з Frontend)

При виборі `0` піднімуться PostgreSQL, Redis, RabbitMQ, Backend, Celery у Docker, а фронтенд ви запустите локально (`npm run build` → `npm run start`).

<!-- Вилучено: deploy.sh та monitor_services.py відсутні у репозиторії -->

 

## 🧭 Варіант 1: Локальний Frontend (рекомендовано)

1) Підніміть backend-сервіси:
```bash
docker-compose up -d --build
```

2) Запустіть локальний фронтенд (порт 3000):
```bash
cd frontend
npm install
npm run build
npm run start
```

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
npm install
npm run build
npm run start
```

### Повний Docker
```bash
