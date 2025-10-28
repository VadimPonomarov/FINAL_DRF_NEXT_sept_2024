# 🚀 Автономний Celery Мікросервіс

Незалежний сервіс управління чергами для обробки фонових завдань.

## 📋 Огляд

Це повністю автономний Celery мікросервіс, який обробляє:
- ✉️ Відправка email та масові email операції
- 📱 Push сповіщення та SMS
- 🔄 Обробка даних та генерація звітів
- 🧹 Очищення системи та завдання обслуговування

## 🏗️ Архітектура

```
celery-service/
├── config/
│   ├── __init__.py
│   └── celery_app.py          # Конфігурація Celery додатку
├── tasks/
│   ├── __init__.py
│   ├── email_tasks.py         # Завдання пов'язані з email
│   ├── notification_tasks.py  # Push сповіщення, SMS
│   ├── data_processing_tasks.py # Обробка даних, звіти
│   └── cleanup_tasks.py       # Обслуговування системи
├── core/                      # Спільні утиліти (за потреби)
├── logs/                      # Файли логів
├── Dockerfile                 # Визначення контейнера
├── docker-compose.yml         # Оркестрація сервісів
├── pyproject.toml            # Залежності
├── .env.example              # Шаблон оточення
├── main.py                   # Точка входу
└── README.md                 # Цей файл
```

## 🚀 Швидкий старт

### 1. Налаштування оточення

```bash
# Копіювати шаблон оточення
cp .env.example .env

# Редагувати змінні оточення
nano .env
```

### 2. Запуск сервісів

```bash
# Start all services (Redis, RabbitMQ, Celery workers, Flower)
docker-compose up -d

# View logs
docker-compose logs -f celery-worker

# Check status
docker-compose ps
```

### 3. Monitor with Flower

Open http://localhost:5555 to access Flower monitoring interface.

## 📡 Available Tasks

### Email Tasks
- `send_email_task` - Send individual email
- `send_bulk_email_task` - Send bulk emails
- `send_notification_to_backend` - Notify main backend

### Notification Tasks
- `send_push_notification_task` - Send push notifications
- `send_sms_task` - Send SMS messages
- `process_notification_queue_task` - Process notification batches

### Data Processing Tasks
- `process_user_data_task` - Process user data
- `generate_report_task` - Generate reports
- `batch_data_import_task` - Import data files

### Cleanup Tasks
- `cleanup_temp_files_task` - Clean temporary files
- `cleanup_old_logs_task` - Clean old log files
- `system_health_check_task` - System health monitoring
- `daily_maintenance_task` - Daily maintenance routine

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RABBITMQ_HOST` | RabbitMQ hostname | `rabbitmq` |
| `RABBITMQ_PORT` | RabbitMQ port | `5672` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `BACKEND_API_URL` | Main backend URL | `http://app:8000` |
| `SMTP_HOST` | SMTP server | `localhost` |
| `FCM_SERVER_KEY` | Firebase key | - |

### Queue Configuration

- `email` - Email sending tasks
- `notifications` - Push notifications, SMS
- `data_processing` - Data processing, reports
- `cleanup` - System maintenance

## 🔗 Integration with Main Backend

### Using Celery Client

```python
from core.celery_client import celery_client

# Send email
task_id = celery_client.send_email(
    to_email="user@example.com",
    subject="Welcome!",
    body="Welcome to our service!"
)

# Send push notification
task_id = celery_client.send_push_notification(
    user_tokens=["fcm_token_1", "fcm_token_2"],
    title="New Message",
    body="You have a new message"
)

# Process user data
task_id = celery_client.process_user_data(
    user_id=123,
    data_type="profile_update",
    data={"name": "John Doe"}
)

# Check task status
status = celery_client.get_task_status(task_id)
result = celery_client.get_task_result(task_id)
```

### API Endpoints (if needed)

The microservice can expose REST API endpoints for task management:

```bash
# Queue email task
POST /api/tasks/email/
{
    "to_email": "user@example.com",
    "subject": "Test",
    "body": "Test message"
}

# Get task status
GET /api/tasks/{task_id}/status/

# Get task result
GET /api/tasks/{task_id}/result/
```

## 📊 Monitoring

### Flower Dashboard
- URL: http://localhost:5555
- Monitor active tasks, workers, queues
- View task history and results

### Health Checks
- Worker health: `celery -A config.celery_app inspect ping`
- Queue status: `celery -A config.celery_app inspect active_queues`
- System health: Automatic health check tasks

### Logs
- Application logs: `./logs/celery-microservice.log`
- Worker logs: `docker-compose logs celery-worker`
- Beat logs: `docker-compose logs celery-beat`

## 🔄 Scaling

### Horizontal Scaling

```bash
# Scale workers
docker-compose up -d --scale celery-worker=3

# Scale specific queue workers
docker-compose run -d celery-worker celery -A config.celery_app worker --queues=email --concurrency=4
```

### Queue-Specific Workers

```bash
# Email-only worker
celery -A config.celery_app worker --queues=email --concurrency=2

# Data processing worker
celery -A config.celery_app worker --queues=data_processing --concurrency=1

# Cleanup worker
celery -A config.celery_app worker --queues=cleanup --concurrency=1
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
poetry install

# Start Redis and RabbitMQ
docker-compose up -d redis rabbitmq

# Start worker locally
celery -A config.celery_app worker --loglevel=info

# Start beat scheduler
celery -A config.celery_app beat --loglevel=info

# Start flower monitoring
celery -A config.celery_app flower
```

### Testing

```bash
# Run tests
poetry run pytest

# Test specific task
python -c "
from config.celery_app import app
result = app.send_task('tasks.email_tasks.send_email_task', 
                      args=['test@example.com', 'Test', 'Test message'])
print(f'Task ID: {result.id}')
"
```

## 🔒 Security

- Non-root user in container
- Environment variable configuration
- API key authentication for backend communication
- Network isolation with Docker networks

## 📈 Performance

- Optimized for minimal resource usage
- Configurable worker concurrency
- Memory limits per worker
- Task result expiration
- Connection pooling

## 🚨 Troubleshooting

### Common Issues

1. **Connection refused to RabbitMQ/Redis**
   ```bash
   # Check service status
   docker-compose ps
   
   # Check logs
   docker-compose logs rabbitmq redis
   ```

2. **Tasks not executing**
   ```bash
   # Check worker status
   celery -A config.celery_app inspect active
   
   # Check queue status
   celery -A config.celery_app inspect active_queues
   ```

3. **Memory issues**
   ```bash
   # Monitor memory usage
   docker stats celery-worker
   
   # Adjust worker settings in .env
   CELERY_MAX_MEMORY_PER_CHILD=200000
   ```

## 📝 License

This microservice is part of the main application and follows the same license terms.

## ⏰ Періодичні задачі (celery-beat)

Celery Beat запускає задачі за розкладом (cron/інтервали) і ставить їх у чергу для воркерів.

### Як це працює в проекті

- Планувальник: `celery -A config.celery_app beat`
- Воркер(и): `celery -A config.celery_app worker -l info -Q email,notifications,data_processing,cleanup`
- Моніторинг: Flower `http://localhost:5555`

### Конфігурація розкладу

```python
# celery-service/config/celery_app.py
from celery.schedules import crontab
from celery import Celery

app = Celery("celery_service")
# ... інший конфіг ...

app.conf.beat_schedule = {
    # 1) Щоденний бекап БД о 02:00
    "daily-db-backup": {
        "task": "tasks.cleanup_tasks.daily_maintenance_task",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "cleanup"},
    },
    # 2) Оновлення курсів валют щогодини (для AutoRia)
    "update-exchange-rates-hourly": {
        "task": "tasks.data_processing_tasks.update_exchange_rates_task",
        "schedule": crontab(minute=0),
        "options": {"queue": "data_processing"},
    },
    # 3) Надсилання дайджесту email щоденно о 08:00
    "send-daily-email-digest": {
        "task": "tasks.email_tasks.send_daily_digest_task",
        "schedule": crontab(hour=8, minute=0),
        "options": {"queue": "email"},
    },
    # 4) Health-check сервісів кожні 5 хвилин
    "system-health-check": {
        "task": "tasks.cleanup_tasks.system_health_check_task",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "cleanup"},
    },
}
```

### Приклади задач

```python
# celery-service/tasks/email_tasks.py
from celery import shared_task
from core.http import http_post

@shared_task(name="tasks.email_tasks.send_daily_digest_task")
def send_daily_digest_task():
    # Збираємо дані з бекенду
    http_post("/internal/reports/daily-digest/trigger")
    return "daily digest triggered"
```

```python
# celery-service/tasks/data_processing_tasks.py
from celery import shared_task
from core.http import http_post

@shared_task(name="tasks.data_processing_tasks.update_exchange_rates_task")
def update_exchange_rates_task():
    # Викликаємо бекенд ендпоінт для оновлення курсів
    http_post("/internal/exchange-rates/update")
    return "exchange rates update scheduled"
```

```python
# celery-service/tasks/cleanup_tasks.py
from celery import shared_task
from core.http import http_get

@shared_task(name="tasks.cleanup_tasks.system_health_check_task")
def system_health_check_task():
    # Перевірка здоров'я пов'язаних сервісів
    services = [
        "/health/redis",
        "/health/rabbitmq",
        "/health/postgres",
        "/health/search-index",
    ]
    results = {path: http_get(path).status_code for path in services}
    return results
```

### Посилання на пов’язані сервіси

- Backend (Django API): `http://app:8000`
  - `/internal/reports/daily-digest/trigger` — генерація дайджесту
  - `/internal/exchange-rates/update` — оновлення курсів валют
  - `/health/*` — ендпоінти здоров'я сервісів (internal)
- RabbitMQ (брокер): `amqp://rabbitmq:5672`
- Redis (результати/брокер, якщо потрібно): `redis://redis:6379/0`
- Flower (моніторинг): `http://flower:5555`

### Запуск у Docker Compose

```yaml
# docker-compose.yml (фрагмент)
services:
  celery-worker:
    build: ./celery-service
    command: celery -A config.celery_app worker -l info -Q email,notifications,data_processing,cleanup
    depends_on: [rabbitmq, redis, app]

  celery-beat:
    build: ./celery-service
    command: celery -A config.celery_app beat -l info
    depends_on: [rabbitmq, redis, app]

  flower:
    image: mher/flower
    command: flower --broker=amqp://guest:guest@rabbitmq:5672//
    ports: ["5555:5555"]
    depends_on: [rabbitmq]
```

### Best Practices

- Використовуйте окремі черги для різних класів задач (`email`, `cleanup`, `data_processing`)
- Ставте ідempotent логіку у періодичні задачі
- Логування результатів у БД/ELK для аудиту
- Обмежуйте runtime (soft/hard time limits) для важких задач
- Перевіряйте доступність залежних сервісів перед викликом