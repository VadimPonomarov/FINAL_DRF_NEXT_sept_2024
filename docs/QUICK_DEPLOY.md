# 🚀 Быстрый деплой - в двух словах

## Один шаг для запуска:

```bash
python deploy.py
```

**Скрипт автоматически:**
1. ✅ Запустит backend в Docker (PostgreSQL, Redis, RabbitMQ, Celery)
2. ✅ Соберет frontend с правильными переменными из `env-config/.env.local`
3. ✅ Запустит frontend локально
4. ✅ Настроит Nginx для проксирования

**Доступ после деплоя:**
- 🌐 http://localhost - через Nginx
- 🔗 http://localhost:3000 - frontend напрямую
- 🔧 http://localhost:8000 - backend API

---

## Альтернативные способы:

### Полный Docker:
```bash
# Раскомментировать frontend в docker-compose.yml
docker-compose up --build
```

### Быстрый перезапуск:
```bash
python deploy.py --mode restart
```

---

**Переменные:** Все в `env-config/.env.local` (уже настроено)

