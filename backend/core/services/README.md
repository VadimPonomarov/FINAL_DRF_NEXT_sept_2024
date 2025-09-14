# 🔧 Основные сервисы проекта

Этот каталог содержит основные сервисы для работы с различными компонентами системы.

## 📋 Сервисы в этом каталоге

### 📧 `send_email.py` - Сервис отправки email
**Назначение:** Отправка email сообщений через RabbitMQ очередь

**Что делает:**
- Отправляет email сообщения в RabbitMQ очередь
- Использует шаблоны для форматирования писем
- Поддерживает различные типы уведомлений
- Логирует все операции отправки

**Основные функции:**
```python
send_email_service(
    to_email="user@example.com",
    title="Заголовок письма", 
    message="Текст сообщения",
    queue_name="email_queue",
    connection_parameters="rabbitmq"
)
```

**Использование:**
```python
from core.services.send_email import send_email_service

# Отправка активационного письма
send_email_service(
    to_email=user.email,
    title="Активация аккаунта",
    message="Перейдите по ссылке для активации..."
)
```

---

### 🔑 `jwt.py` - Сервис JWT токенов
**Назначение:** Управление JWT токенами для различных действий

**Что делает:**
- Создает специализированные токены (активация, смена пароля, WebSocket)
- Верифицирует токены и извлекает пользователей
- Управляет blacklist токенов
- Поддерживает различные типы токенов

**Типы токенов:**
- `ActivateToken` - для активации аккаунта
- `ChangePasswordToken` - для смены пароля
- `SocketToken` - для WebSocket соединений

**Основные методы:**
```python
from core.services.jwt import JwtService, ActivateToken

# Создание токена
token = JwtService.create_token(user, ActivateToken)

# Верификация токена
user = JwtService.verify_token(token_string, ActivateToken)

# Валидация любого токена
user = JwtService.validate_any_token(token_string)
```

---

### 🐰 `pika_helper.py` - Сервис RabbitMQ
**Назначение:** Работа с RabbitMQ для обмена сообщениями

**Что делает:**
- Устанавливает соединения с RabbitMQ
- Публикует сообщения в очереди
- Потребляет сообщения из очередей
- Управляет exchange и routing

**Основные компоненты:**
```python
from core.services.pika_helper import ConnectionFactory

# Создание фабрики соединений
factory = ConnectionFactory(
    parameters=ConnectionParameters("rabbitmq"),
    queue_name="email_queue"
)

# Публикация сообщения
factory.publish(email_params)

# Потребление сообщений
factory.consume()
```

---

## 🚀 Инструкции по использованию

### Email сервис:
```python
# В Django view или сервисе
from core.services.send_email import send_email_service

def send_welcome_email(user):
    send_email_service(
        to_email=user.email,
        title="Добро пожаловать!",
        message=f"Привет, {user.first_name}! Добро пожаловать в наш сервис."
    )
```

### JWT сервис:
```python
# Создание токена активации
from core.services.jwt import JwtService, ActivateToken

def create_activation_link(user):
    token = JwtService.create_token(user, ActivateToken)
    return f"https://example.com/activate/{token}"

# Верификация в view
def activate_user(request, token):
    try:
        user = JwtService.verify_token(token, ActivateToken)
        user.is_active = True
        user.save()
        return Response({"message": "Аккаунт активирован"})
    except JwtException as e:
        return Response({"error": str(e)}, status=400)
```

### RabbitMQ сервис:
```python
# Отправка задачи в очередь
from core.services.pika_helper import ConnectionFactory
from core.schemas.email import SendEmailParams

factory = ConnectionFactory(
    parameters=ConnectionParameters("rabbitmq"),
    queue_name="task_queue"
)

params = SendEmailParams(
    to_email="user@example.com",
    subject="Тема",
    template_data={"message": "Текст"}
)

factory.publish(params)
```

---

## 🔍 Диагностика проблем

### Email не отправляется:
```bash
# Проверить RabbitMQ
docker-compose ps rabbitmq

# Проверить очереди
docker-compose exec rabbitmq rabbitmqctl list_queues

# Проверить логи
docker-compose logs mailing
```

### JWT токены не работают:
```bash
# Проверить настройки Django
docker-compose exec app python manage.py shell
>>> from django.conf import settings
>>> print(settings.SECRET_KEY)

# Проверить blacklist токенов
>>> from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
>>> print(BlacklistedToken.objects.count())
```

### RabbitMQ недоступен:
```bash
# Проверить соединение
docker-compose exec app python -c "
import pika
connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq'))
print('RabbitMQ доступен')
connection.close()
"

# Перезапустить RabbitMQ
docker-compose restart rabbitmq
```

---

## ⚙️ Конфигурация

### Переменные окружения:
```yaml
# В docker-compose.yml
environment:
  - RABBITMQ_HOST=rabbitmq
  - RABBITMQ_PORT=5672
  - RABBITMQ_USER=guest
  - RABBITMQ_PASSWORD=guest
  - JWT_SECRET_KEY=${SECRET_KEY}
  - EMAIL_QUEUE_NAME=email_queue
```

### Настройки Django:
```python
# В settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'BLACKLIST_AFTER_ROTATION': True,
}

# RabbitMQ настройки
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.environ.get('RABBITMQ_PORT', 5672))
```

---

## 🔄 Интеграция с другими сервисами

### С приложениями:
- **apps.users** - использует JWT и email сервисы для регистрации
- **apps.chat** - использует JWT для WebSocket авторизации
- **apps.auth** - использует все сервисы для аутентификации

### С внешними сервисами:
- **RabbitMQ** - для асинхронной обработки email
- **Redis** - для кэширования токенов
- **PostgreSQL** - для хранения blacklist токенов

---

## 📝 Логирование

Все сервисы используют Django логирование:
```python
from config.extra_config.logger_config import logger

logger.info("Email successfully sent to the queue")
logger.error(f"Failed to send email: {str(e)}")
logger.warning("Token verification failed")
```

Логи доступны в:
- **Консоль** - при разработке
- **Файлы** - `backend/logs/app.log`
- **Docker logs** - `docker-compose logs app`

---

## 🛡️ Безопасность

### Рекомендации:
- Используйте сильные SECRET_KEY для JWT
- Регулярно очищайте blacklist токенов
- Мониторьте очереди RabbitMQ
- Логируйте все операции с токенами

### Безопасные практики:
- Токены автоматически добавляются в blacklist после использования
- Email отправляется через защищенную очередь
- Все соединения с RabbitMQ аутентифицированы

---

**💡 Совет:** Эти сервисы - основа архитектуры проекта. Изучите их API перед разработкой новых функций!
