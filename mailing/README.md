# Сервіс розсилки

Простий, чистий email сервіс побудований на FastAPI, Celery та RabbitMQ.

## 🚀 Функції

- **Обробка Email**: Celery з RabbitMQ для надійної черги повідомлень
- **Підтримка шаблонів**: Jinja2 HTML email шаблони
- **Безпека**: Зашифроване зберігання облікових даних
- **Моніторинг здоров'я**: Вбудовані перевірки здоров'я
- **Підтримка Docker**: Повна контейнеризація
- **Чиста архітектура**: Мінімальна, сфокусована кодова база

## 📁 Структура проекту

```
mailing/
├── .env                    # Всі змінні оточення
├── Dockerfile             # Конфігурація контейнера
├── pyproject.toml         # Залежності та конфігурація проекту
└── src/
    ├── app.py             # FastAPI додаток
    ├── config.py          # Уніфікована конфігурація
    ├── services/
    │   ├── mail_services.py    # Логіка відправки email
    │   ├── rabbitmq.py         # RabbitMQ помічник
    │   └── encription_service/ # Шифрування облікових даних
    ├── templates/
    │   └── email_template.html # Email шаблон
    └── media/             # Статичні файли (логотипи, тощо)
```

## 🛠️ Встановлення

### Локальна розробка
```bash
# Встановити залежності
poetry install

# Запустити додаток
poetry run python src/app.py
```

### Docker
```bash
# Збірка та запуск
docker build -t mailing .
docker run -p 8000:8000 mailing
```

## ⚙️ Configuration

Configuration automatically adapts based on `IS_DOCKER` environment variable:

```bash
# Application Settings (auto-detected)
LOG_LEVEL=INFO
HOST=localhost
PORT=8000

# RabbitMQ (auto-configured)
# Local: localhost, Docker: rabbitmq service name
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Gmail SMTP (encrypted)
GMAIL_HOST=smtp.gmail.com
GMAIL_PORT=587
GMAIL_USER=<encrypted_email>
GMAIL_PASSWORD=<encrypted_password>
```

### Environment Detection & Fallback

- **Local Development**: `IS_DOCKER` not set → `rabbitmq_host=localhost`
- **Docker Environment**: `IS_DOCKER=true` → `rabbitmq_host=rabbitmq`
- **Automatic Fallback**: If connection fails, automatically tries alternative host
  - `localhost` → `rabbitmq` (and vice versa)
  - Applies to both RabbitMQ connections and Celery broker

## 🚀 Usage

### Health Check
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","service":"mailing","environment":"dev"}
```

### Send Email (via RabbitMQ with Fallback)
```python
import pika
import json

# Connect to RabbitMQ with automatic fallback
def connect_rabbitmq():
    hosts = ['localhost', 'rabbitmq']  # Try both hosts

    for host in hosts:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host))
            print(f"✅ Connected to RabbitMQ at {host}")
            return connection
        except Exception as e:
            print(f"❌ Failed to connect to {host}: {e}")

    raise Exception("Could not connect to any RabbitMQ host")

# Use the connection
connection = connect_rabbitmq()
channel = connection.channel()

# Send email message
email_data = {
    "from_email": "sender@example.com",
    "to_email": "recipient@example.com",
    "subject": "Test Email",
    "template_data": {
        "recipient_name": "John Doe",
        "message": "Hello from mailing service!",
        "company_name": "Your Company"
    }
}

channel.basic_publish(
    exchange='',
    routing_key='email_queue',
    body=json.dumps(email_data)
)
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t mailing-service .

# Run with IS_DOCKER (auto-configures RabbitMQ host)
docker run -d \
  -p 8000:8000 \
  -e IS_DOCKER=true \
  mailing-service
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  mailing:
    build: .
    ports:
      - "8000:8000"
    environment:
      - IS_DOCKER=true
    depends_on:
      - rabbitmq

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
```

## 📊 Monitoring

- **Health**: `GET /health`
- **Status**: `GET /`
- **Logs**: Application logs to stdout

## 🔧 Development

```bash
# Install dependencies
poetry install

# Run in development mode
poetry run python src/app.py

# The service will start on http://localhost:8000
```

---

**Simple. Clean. Functional.** ✨
