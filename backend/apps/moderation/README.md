# 📋 Moderation System Documentation

## 🎯 Overview

The moderation system provides comprehensive notification management for content moderation events. It integrates with RabbitMQ for message queuing and supports multiple notification methods including email and information table storage.

## 🏗️ Architecture

```
RabbitMQ Consumer → Celery Tasks → Email/Info Table → Manager Notifications
```

### Key Components:
- **Models**: Data storage for notifications, settings, templates, and logs
- **Consumer**: RabbitMQ message processor
- **Tasks**: Celery background tasks for async processing
- **API**: REST endpoints for notification management
- **Templates**: Email templates for different notification types

## 📊 Models

### `ManagerNotificationSettings`
Stores notification preferences for each manager.

```python
class ManagerNotificationSettings(models.Model):
    manager = models.OneToOneField(User, ...)  # Staff user
    email_enabled = models.BooleanField(default=True)
    info_table_enabled = models.BooleanField(default=True)
    email_address = models.EmailField(blank=True)  # Override email
    notify_for_actions = models.JSONField(default=list)  # Action filter
    is_active = models.BooleanField(default=True)
```

**Usage:**
```python
# Create settings for a manager
settings = ManagerNotificationSettings.objects.create(
    manager=manager_user,
    email_enabled=True,
    info_table_enabled=True,
    notify_for_actions=['ad_max_attempts', 'ad_flagged']
)
```

### `ModerationNotification`
Information table storing notifications for API retrieval.

```python
class ModerationNotification(models.Model):
    manager = models.ForeignKey(User, ...)
    action = models.CharField(max_length=50, choices=ModerationAction.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    ad_id = models.PositiveIntegerField(null=True, blank=True)
    user_id = models.PositiveIntegerField(null=True, blank=True)
    data = models.JSONField(default=dict)
    status = models.CharField(choices=NotificationStatus.choices)
    priority = models.PositiveSmallIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
```

**Usage:**
```python
# Create notification
notification = ModerationNotification.objects.create(
    manager=manager,
    action='ad_max_attempts',
    title='Ad #123 requires manual review',
    message='Ad reached maximum edit attempts',
    ad_id=123,
    user_id=456,
    priority=8
)

# Mark as read
notification.mark_as_read()
```

### `NotificationTemplate`
Email templates for different notification types.

```python
class NotificationTemplate(models.Model):
    action = models.CharField(choices=ModerationAction.choices, unique=True)
    subject_template = models.CharField(max_length=200)
    html_template = models.TextField()
    text_template = models.TextField()
    available_variables = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
```

**Template Variables:**
- `{{ ad_id }}` - Advertisement ID
- `{{ user_id }}` - User ID
- `{{ reason }}` - Moderation reason
- `{{ attempts_count }}` - Number of attempts
- `{{ site_name }}` - Site name
- `{{ site_url }}` - Site URL
- `{{ admin_url }}` - Admin panel URL
- `{{ timestamp }}` - Current timestamp

### `NotificationLog`
Tracks sent notifications for monitoring and debugging.

```python
class NotificationLog(models.Model):
    notification = models.ForeignKey(ModerationNotification, ...)
    method = models.CharField(choices=NotificationMethod.choices)
    recipient = models.EmailField(blank=True)
    status = models.CharField(choices=NotificationStatus.choices)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    external_id = models.CharField(max_length=100, blank=True)
```

## 🐰 RabbitMQ Consumer

### `ModerationNotificationConsumer`
Processes moderation notifications from RabbitMQ.

**Configuration:**
- **Exchange**: `manager_notifications`
- **Queue**: `moderation_notifications`
- **Routing Key**: `manager.ad.*`

**Message Format:**
```json
{
  "notification_type": "manager_moderation",
  "data": {
    "ad_id": 123,
    "user_id": 456,
    "action": "max_attempts_reached",
    "reason": "Reached maximum edit attempts",
    "attempts_count": 3,
    "priority": 8
  }
}
```

**Usage:**
```python
# Start consumer
consumer = ModerationNotificationConsumer()
consumer.start_consuming()  # Blocks and listens continuously

# Stop consumer
consumer.stop_consuming()
```

## ⚡ Celery Tasks

### `send_moderation_email_task`
Sends email notifications via mailing service.

```python
@shared_task(bind=True, max_retries=3)
def send_moderation_email_task(
    self,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None,
    notification_id: int = None,
    priority: int = 5
):
```

**Usage:**
```python
# Send email notification
send_moderation_email_task.delay(
    to_email='manager@example.com',
    subject='Ad requires review',
    html_content='<html>...</html>',
    text_content='Plain text version',
    priority=8
)
```

### `create_moderation_notification_task`
Creates notifications in information table.

```python
@shared_task(bind=True, max_retries=3)
def create_moderation_notification_task(
    self,
    manager_id: int,
    action: str,
    title: str,
    message: str,
    ad_id: int = None,
    user_id: int = None,
    data: Dict[str, Any] = None,
    priority: int = 5
):
```

### `process_moderation_notification_task`
Main task that processes notifications based on manager settings.

```python
@shared_task(bind=True, max_retries=3)
def process_moderation_notification_task(
    self,
    manager_settings_id: int,
    notification_data: Dict[str, Any]
):
```

## 🌐 API Endpoints

### Manager Notification Settings

#### Get My Settings
```http
GET /api/moderation/settings/my_settings/
```

**Response:**
```json
{
  "id": 1,
  "manager": 2,
  "manager_name": "John Manager",
  "manager_email": "manager@example.com",
  "email_enabled": true,
  "info_table_enabled": true,
  "email_address": "",
  "notify_for_actions": ["ad_max_attempts"],
  "is_active": true
}
```

#### Update My Settings
```http
POST /api/moderation/settings/update_my_settings/
Content-Type: application/json

{
  "email_enabled": true,
  "info_table_enabled": false,
  "notify_for_actions": ["ad_max_attempts", "ad_flagged"]
}
```

### Moderation Notifications

#### List Notifications
```http
GET /api/moderation/notifications/
GET /api/moderation/notifications/?status=pending
GET /api/moderation/notifications/?unread_only=true
GET /api/moderation/notifications/?action=ad_max_attempts
```

**Response:**
```json
{
  "count": 25,
  "results": [
    {
      "id": 1,
      "manager": 2,
      "manager_name": "John Manager",
      "action": "ad_max_attempts",
      "action_display": "Ad Max Attempts",
      "title": "Ad #123 requires manual review",
      "message": "Ad reached maximum edit attempts (3)",
      "ad_id": 123,
      "user_id": 456,
      "status": "pending",
      "priority": 8,
      "is_read": false,
      "created_at": "2024-01-15T10:30:00Z",
      "admin_url": "/admin/ads/caradmodel/123/change/"
    }
  ]
}
```

#### Mark Notification as Read
```http
POST /api/moderation/notifications/1/mark_read/
```

#### Mark Multiple as Read
```http
POST /api/moderation/notifications/mark_multiple_read/
Content-Type: application/json

{
  "notification_ids": [1, 2, 3]
}
```

#### Bulk Actions
```http
POST /api/moderation/notifications/bulk_action/
Content-Type: application/json

{
  "notification_ids": [1, 2, 3],
  "action": "mark_read"  // or "delete"
}
```

#### Get Statistics
```http
GET /api/moderation/notifications/stats/
```

**Response:**
```json
{
  "manager_id": 2,
  "manager_name": "John Manager",
  "manager_email": "manager@example.com",
  "total_notifications": 45,
  "unread_notifications": 12,
  "read_notifications": 33,
  "notifications_by_action": {
    "ad_max_attempts": 15,
    "ad_flagged": 20,
    "ad_needs_review": 10
  },
  "recent_notifications": [...]
}
```

### Notification Templates (Admin Only)

#### List Templates
```http
GET /api/moderation/templates/
```

#### Update Template
```http
PUT /api/moderation/templates/1/
Content-Type: application/json

{
  "subject_template": "🚨 Ad #{{ ad_id }} needs review",
  "html_template": "<html>...</html>",
  "text_template": "Plain text version"
}
```

## 🛠️ Management Commands

### Start Consumer
```bash
python manage.py start_moderation_consumer --verbose
```

### Create Templates
```bash
python manage.py create_notification_templates --force
```

### Check Consumer Status
```bash
python manage.py consumer_status --detailed
```

**Output:**
```
🐰 RabbitMQ Consumer Status
==================================================

🟢 moderation_notifications:
  Status: LISTENING
  Enabled: ✅
  Auto-restart: ✅
  Restart count: 0

📊 Summary:
  Total consumers: 1
  Running: 1
  Listening for events: 1

✅ 1 consumer(s) actively listening for events
🟢 All consumers are healthy
```

## 🔧 Configuration

### Settings
```python
# settings.py

# Enable/disable automatic startup of RabbitMQ consumers
ENABLE_RABBITMQ_CONSUMERS = True

# Consumer settings
RABBITMQ_CONSUMER_SETTINGS = {
    'moderation_notifications': {
        'enabled': True,
        'auto_restart': True,
        'restart_delay': 5,  # seconds
    }
}
```

### Environment Variables
```bash
# Enable consumers
ENABLE_RABBITMQ_CONSUMERS=true

# RabbitMQ connection
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672/
```

## 🚀 Deployment

### Docker Compose
```yaml
# docker-compose.yml
services:
  django:
    build: .
    environment:
      - ENABLE_RABBITMQ_CONSUMERS=true
    depends_on:
      - rabbitmq
      - redis
      - postgres

  celery:
    build: .
    command: celery -A config worker -l info -Q moderation,email
    environment:
      - ENABLE_RABBITMQ_CONSUMERS=false  # Don't start in worker
```

### Local Development
```bash
# Start with consumers
python start_with_consumers.py

# Or manually
python manage.py runserver  # Consumers auto-start via CoreConfig
```

## 📊 Monitoring

### Consumer Health Check
```python
from core.consumers.manager import consumer_manager

# Get status
status = consumer_manager.get_status()
print(status)

# Check if listening
for name, info in status.items():
    if info['listening']:
        print(f"✅ {name} is listening for events")
```

### Celery Monitoring
```bash
# Flower dashboard
celery -A config flower
# http://localhost:5555

# Task stats
celery -A config inspect stats
```

### RabbitMQ Monitoring
```bash
# Management UI
# http://localhost:15672 (guest/guest)

# CLI
rabbitmqctl list_queues
rabbitmqctl list_exchanges
```

## 🔍 Troubleshooting

### Consumer Not Starting
1. Check RabbitMQ connection
2. Verify settings: `ENABLE_RABBITMQ_CONSUMERS=True`
3. Check logs for errors
4. Ensure RabbitMQ is running

### No Notifications Received
1. Check manager settings are active
2. Verify action filters in settings
3. Check RabbitMQ message flow
4. Verify Celery workers are running

### Email Not Sending
1. Check email templates exist
2. Verify mailing service is running
3. Check Celery email queue
4. Verify SMTP configuration

## 📝 Examples

### Complete Workflow Example
```python
# 1. Setup manager settings
manager = User.objects.get(email='manager@example.com')
settings = ManagerNotificationSettings.objects.create(
    manager=manager,
    email_enabled=True,
    info_table_enabled=True,
    notify_for_actions=['ad_max_attempts']
)

# 2. Publish notification to RabbitMQ
message = {
    "notification_type": "manager_moderation",
    "data": {
        "ad_id": 123,
        "user_id": 456,
        "action": "max_attempts_reached",
        "reason": "Reached maximum edit attempts",
        "attempts_count": 3,
        "priority": 8
    }
}

# 3. Consumer processes message
# 4. Celery tasks handle email and info table
# 5. Manager receives notifications

# 6. Manager checks notifications via API
response = requests.get('/api/moderation/notifications/')
notifications = response.json()['results']

# 7. Manager marks as read
requests.post(f'/api/moderation/notifications/{notification_id}/mark_read/')
```

This documentation covers all aspects of the moderation system, from basic usage to advanced configuration and troubleshooting.
