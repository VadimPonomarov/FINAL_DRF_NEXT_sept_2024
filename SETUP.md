# 🚀 Повне розгортання AutoRia Clone

## 📋 Процес розгортання всього проекту

### 🎯 Варіанти розгортання
- Backend у Docker + Frontend локально (рекомендовано)
- Повний Docker (усі сервіси, включно з Frontend)

---

## ⚡ Автоматичне розгортання через deploy.py

```bash
python deploy.py
```

### Вибір інтерпретатора Python (важливо для deploy.py)

Оберіть коректний інтерпретатор (Python 3.11+): PyCharm / VS Code / IntelliJ або у терміналі: Windows `py -3.11 deploy.py`, macOS/Linux `python3 deploy.py`.

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

## 📞 Підтримка
- Перевірте стан і логи: `docker-compose ps`, `docker-compose logs -f`
- Перезапуск проєкту: `python deploy.py` (рекомендовано режим `0`)
- Контакти: pvs.versia@gmail.com
