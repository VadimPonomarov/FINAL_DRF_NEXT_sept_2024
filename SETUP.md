# 🚀 AutoRia Clone - Full Stack DRF + Next.js

## 🎓 Учебный проект

Полнофункциональный клон AutoRia с использованием Django REST Framework и Next.js.

## 📋 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/YOUR_USERNAME/DRF_NEXT_FULLSTACK_FINAL.git
cd DRF_NEXT_FULLSTACK_FINAL
```

### 2. Автоматическое развертывание
```bash
# Одна команда для полного развертывания
python deploy.py
```

**Всё готово!** Проект полностью настроен и готов к работе.

### 3. Доступ к приложению
После успешного развертывания:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Документация**: http://localhost:3000/docs
- **Admin панель**: http://localhost:8000/admin
- **RabbitMQ Management**: http://localhost:15672
- **Celery Flower**: http://localhost:5555
- **Redis Insight**: http://localhost:5540

## 🎯 Особенности проекта

### ✅ Полностью автономный
- Не требует дополнительных настроек
- Все переменные окружения включены
- Автоматический сидинг тестовых данных

### 🏗️ Архитектура
- **Backend**: Django REST Framework + PostgreSQL
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Кеширование**: Redis
- **Очереди**: RabbitMQ + Celery
- **Контейнеризация**: Docker + Docker Compose

### 📊 Включенные данные
- 1,250+ справочных записей (марки, модели, регионы)
- 24 тестовых пользователя (20 BASIC + 4 PREMIUM)
- Тестовые объявления автомобилей
- Полнофункциональная аутентификация

## 🛠️ Дополнительные команды

### Управление проектом
```bash
# Остановка всех сервисов
docker-compose down

# Перезапуск с пересборкой
docker-compose down && docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Статус сервисов
docker-compose ps
```

### Работа с данными
```bash
# Принудительный пересид данных
FORCE_RESEED=true docker-compose up -d

# Создание суперпользователя
docker-compose exec app python manage.py createsuperuser
```

## 📚 Документация

- [Процесс сидинга данных](docs/SEEDING_PROCESS_UA.md)
- [API документация](http://localhost:3000/docs)
- [Swagger UI](http://localhost:8000/api/doc/)

## 🎓 Учебные цели

Этот проект демонстрирует:
- Современную архитектуру full-stack приложений
- Интеграцию Django REST Framework с Next.js
- Работу с микросервисами в Docker
- Автоматизацию развертывания
- Лучшие практики веб-разработки

## 🆘 Устранение неполадок

### Проблемы с запуском:
1. Убедитесь, что Docker запущен
2. Проверьте свободные порты: 3000, 8000, 5432, 6379, 5672
3. Проверьте логи: `docker-compose logs`

### Проблемы с данными:
1. Перезапустите сидинг: `FORCE_RESEED=true docker-compose up -d`
2. Проверьте статус БД: `docker-compose exec app python manage.py dbshell`

**Проект готов к изучению и модификации!** 🚀
