# 🐳 Полное развертывание в Docker

Эта документация описывает альтернативный способ развертывания всех сервисов проекта в Docker контейнерах, включая frontend.

## 📁 Файлы для Docker развертывания

- **`docker-compose.deploy.yml`** - Docker Compose файл с раскомментированным frontend сервисом
- **`nginx/nginx.deploy.conf`** - Конфигурация Nginx для работы с frontend в Docker контейнере
- **`deploy-docker.py`** - Скрипт автоматического развертывания всех сервисов в Docker

## 🚀 Быстрый старт

### Полное развертывание в Docker

```bash
# Автоматическое развертывание всех сервисов (включая frontend в Docker)
python deploy-docker.py
```

### С дополнительными опциями

```bash
# Пропустить docker-compose up --build (если контейнеры уже запущены)
python deploy-docker.py --skip-docker

# Пересобрать все образы
python deploy-docker.py --rebuild
```

## 📊 Сравнение подходов

### `deploy.py` (оригинальный)
- ✅ Backend в Docker
- ✅ Frontend локально (требует Node.js/npm)
- ✅ Быстрая разработка frontend
- ⚠️ Требует установки Node.js на хосте

### `deploy-docker.py` (новый)
- ✅ Backend в Docker
- ✅ Frontend в Docker
- ✅ Не требует Node.js на хосте
- ✅ Полная изоляция всех сервисов
- ⚠️ Более долгая первая сборка

## 🔧 Использование вручную

### Запуск через docker-compose

```bash
# Запуск всех сервисов (включая frontend)
docker-compose -f docker-compose.deploy.yml up --build -d

# Просмотр логов
docker-compose -f docker-compose.deploy.yml logs -f

# Просмотр логов конкретного сервиса
docker-compose -f docker-compose.deploy.yml logs -f frontend
docker-compose -f docker-compose.deploy.yml logs -f app

# Остановка
docker-compose -f docker-compose.deploy.yml down

# Перезапуск сервиса
docker-compose -f docker-compose.deploy.yml restart frontend
```

## 🌐 Доступные сервисы

После успешного развертывания доступны:

- **Главная страница**: http://localhost (через Nginx)
- **Frontend**: http://localhost:3000 (напрямую)
- **Backend API**: http://localhost:8000/api/
- **API Docs**: http://localhost:8000/api/docs/
- **RabbitMQ**: http://localhost:15672
- **Celery Flower**: http://localhost:5555
- **Redis Insight**: http://localhost:5540
- **Mailing Service**: http://localhost:8001

## 📝 Конфигурация

### Переменные окружения

Все переменные окружения загружаются из:
- `env-config/.env.base`
- `env-config/.env.secrets`
- `env-config/.env.docker`

### Frontend конфигурация в Docker

Frontend автоматически получает следующие переменные:
- `IS_DOCKER=true`
- `NEXT_PUBLIC_IS_DOCKER=true`
- `REDIS_HOST=redis`
- `REDIS_URL=redis://redis:6379/0`
- `BACKEND_URL=http://app:8000` (для SSR)
- `NEXT_PUBLIC_BACKEND_URL=/api` (для браузера)
- `NEXTAUTH_URL=http://localhost`

## 🐛 Устранение неполадок

### Frontend не запускается

```bash
# Проверить логи
docker-compose -f docker-compose.deploy.yml logs frontend

# Пересобрать образ
docker-compose -f docker-compose.deploy.yml build --no-cache frontend

# Перезапустить
docker-compose -f docker-compose.deploy.yml up -d frontend
```

### Проблемы с Nginx

```bash
# Проверить конфигурацию
docker-compose -f docker-compose.deploy.yml exec nginx nginx -t

# Просмотр логов
docker-compose -f docker-compose.deploy.yml logs nginx
```

### Проверка статуса всех контейнеров

```bash
# Статус контейнеров
docker-compose -f docker-compose.deploy.yml ps

# Health check статус
docker inspect --format='{{.State.Health.Status}}' frontend
docker inspect --format='{{.State.Health.Status}}' app
```

## 🔄 Переключение между режимами

### С Docker на локальный frontend

```bash
# Остановить Docker развертывание
docker-compose -f docker-compose.deploy.yml down

# Использовать обычный deploy.py
python deploy.py
```

### С локального на Docker

```bash
# Остановить локальный frontend (если запущен)
# Ctrl+C или kill процесс на порту 3000

# Запустить Docker развертывание
python deploy-docker.py
```

## 📚 Дополнительная информация

- Основной README: `README.md`
- Документация быстрого развертывания: `docs/QUICK_DEPLOY.md`
- Конфигурация окружения: `docs/ENV_ARCHITECTURE.md`

