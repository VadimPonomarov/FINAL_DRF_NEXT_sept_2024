# 🚀 AutoRia Clone - Full Stack DRF + Next.js

## 🎓 Навчальний проект

Повнофункціональний клон AutoRia з використанням Django REST Framework та Next.js.

## 📋 Швидкий старт

### 1. Клонування репозиторію
```bash
git clone https://github.com/YOUR_USERNAME/DRF_NEXT_FULLSTACK_FINAL.git
cd DRF_NEXT_FULLSTACK_FINAL
```

### 2. Автоматичне розгортання
```bash
# Одна команда для повного розгортання
python deploy.py
```

**Все готово!** Проект повністю налаштований і готовий до роботи.

### 3. Доступ до додатку
Після успішного розгортання:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Документація**: http://localhost:3000/docs
- **Admin панель**: http://localhost:8000/admin
- **RabbitMQ Management**: http://localhost:15672
- **Celery Flower**: http://localhost:5555
- **Redis Insight**: http://localhost:5540

## 🎯 Особливості проекту

### ✅ Повністю автономний
- Не потребує додаткових налаштувань
- Всі змінні оточення включені
- Автоматичний сідинг тестових даних

### 🏗️ Архітектура
- **Backend**: Django REST Framework + PostgreSQL
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Кешування**: Redis
- **Черги**: RabbitMQ + Celery
- **Контейнеризація**: Docker + Docker Compose

### 📊 Включені дані
- 1,250+ довідкових записів (марки, моделі, регіони)
- 24 тестових користувача (20 BASIC + 4 PREMIUM)
- Тестові оголошення автомобілів
- Повнофункціональна автентифікація

## 🛠️ Додаткові команди

### Управління проектом
```bash
# Зупинка всіх сервісів
docker-compose down

# Перезапуск з пересборкою
docker-compose down && docker-compose up -d --build

# Перегляд логів
docker-compose logs -f

# Статус сервісів
docker-compose ps
```

### Робота з даними
```bash
# Примусовий пересід даних
FORCE_RESEED=true docker-compose up -d

# Створення суперкористувача
docker-compose exec app python manage.py createsuperuser
```

## 📚 Документація

- [Процес сідингу даних](docs/SEEDING_PROCESS_UA.md)
- [API документація](http://localhost:3000/docs)
- [Swagger UI](http://localhost:8000/api/doc/)

## 🎓 Навчальні цілі

Цей проект демонструє:
- Сучасну архітектуру full-stack додатків
- Інтеграцію Django REST Framework з Next.js
- Роботу з мікросервісами в Docker
- Автоматизацію розгортання
- Найкращі практики веб-розробки

## 🆘 Усунення неполадок

### Проблеми з запуском:
1. Переконайтеся, що Docker запущений
2. Перевірте вільні порти: 3000, 8000, 5432, 6379, 5672
3. Перевірте логи: `docker-compose logs`

### Проблеми з даними:
1. Перезапустіть сідинг: `FORCE_RESEED=true docker-compose up -d`
2. Перевірте статус БД: `docker-compose exec app python manage.py dbshell`

**Проект готовий до вивчення та модифікації!** 🚀
