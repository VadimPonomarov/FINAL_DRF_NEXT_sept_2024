# 🚀 Инструкция по деплою AutoRia Clone

## Рекомендуемый способ: через deploy.py (БЫСТРЫЙ И УМНЫЙ)

```bash
python deploy.py
```

### Что делает deploy.py:
- ✅ Проверяет системные требования (Node.js, npm, Docker)
- ✅ Автоматически выбирает режим (restart/full_rebuild)
- ✅ Запускает Backend в Docker
- ✅ Предлагает выбор режима Frontend:
  - **Local mode**: Frontend на хосте, оптимизированная production сборка
  - **Docker mode**: Frontend в контейнере, как все остальные сервисы
- ✅ Настраивает Nginx как reverse proxy
- ✅ Автоматически управляет docker-compose.yml

### Интерактивный выбор:
При запуске **вы можете выбрать режим** (10 секунд на выбор):
1. 🏠 **Backend в Docker + Frontend локально** (РЕКОМЕНДОВАНО) - Оптимальная производительность
2. 🐳 **Все в Docker** - Полная контейнеризация

Если не выберете за 10 секунд, используется вариант 1 (локальный frontend).

**Почему локальный frontend рекомендуется?**
- 🚀 Быстрее разработка (hot reload)
- 💾 Меньше нагрузка на Docker
- ⚡ Оптимизированная production сборка
- 🔧 Проще дебагить

---

## Полный Docker: через docker-compose напрямую

Если хотите ВСЁ в Docker (включая frontend):

```bash
# 1. Раскомментируйте секцию frontend в docker-compose.yml
# Найдите строку "#   frontend:" и раскомментируйте все строки под ней до следующего сервиса

# 2. Запустите всё
docker-compose up -d --build

# Все сервисы будут в Docker, включая frontend
```

### Доступ после docker-compose:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Через Nginx: http://localhost

---

## Backend в Docker + Frontend локально (РЕКОМЕНДОВАНО)

```bash
# 1. Запустить только backend в Docker
docker-compose up -d app pg redis rabbitmq celery-worker celery-beat flower mailing nginx

# 2. Собрать frontend локально в production mode
cd frontend
npm install
npm run build

# 3. Запустить frontend (production mode)
npm run start

# Frontend будет доступен на http://localhost:3000
# Backend будет доступен через Nginx на http://localhost
```

⚠️ **Важно**: В docker-compose.yml frontend закомментирован, т.к. deploy.py запускает его локально для лучшей производительности.

---

## 🔧 Переменные окружения

### Для локального запуска (production mode):
Файл `frontend/.env.production.local`:
```env
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
BACKEND_URL=http://localhost:8000
REDIS_HOST=localhost
REDIS_URL=redis://localhost:6379/0
```

### Для Docker:
В `docker-compose.yml` frontend использует:
```env
IS_DOCKER=true
NEXT_PUBLIC_IS_DOCKER=true
REDIS_HOST=redis
BACKEND_URL=http://app:8000
```

---

## 🚦 Доступ к сервисам

После деплоя доступны:

### Frontend:
- http://localhost:3000 (прямой доступ)
- http://localhost (через Nginx)

### Backend API:
- http://localhost:8000/api/
- http://localhost/api/ (через Nginx)

### Админ-панель:
- http://localhost/admin/

### Другие сервисы:
- http://localhost:5555 - Celery Flower
- http://localhost:15672 - RabbitMQ Management
- http://localhost:5540 - Redis Insight

---

## 🔍 Проверка статуса

```bash
# Docker сервисы
docker-compose ps

# Логи frontend (если запущен локально)
# Логи будут видны в терминале где запущен npm run start
```

---

## 🛠️ Режимы деплоя

### 1. Restart (быстрый - ~2 минуты)
```bash
python deploy.py --mode restart
```
Перезапускает существующие контейнеры

### 2. Full Rebuild (полный - ~5 минут)
```bash
python deploy.py --mode full_rebuild
```
Полная пересборка всех образов

---

## ❓ Решение проблем

### Frontend не запускается:
```bash
# Очистить сборку
cd frontend
rm -rf .next
npm run build
```

### Ошибки API (404):
Проверьте что:
1. Backend запущен: `docker-compose ps app`
2. Переменные окружения установлены в `frontend/.env.production.local`
3. Nginx перезапущен: `docker-compose restart nginx`

### Ошибки подключения к Backend:
```bash
# Проверить логи
docker-compose logs app
docker-compose logs nginx
```

