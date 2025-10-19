# 🌐 Moderation System API Documentation

## 📋 Overview

The moderation system API uses Django REST Framework generics instead of ViewSets for more explicit and flexible endpoint handling.

## 🔐 Authentication

All endpoints require authentication. Use `Authorization: Bearer <token>` header.

## 📊 Manager Notification Settings

### List Settings
```http
GET /api/moderation/settings/
```

**Permissions:** 
- Superuser: See all settings
- Staff: See only own settings
- Regular users: No access

**Response:**
```json
[
  {
    "id": 1,
    "manager": 2,
    "manager_name": "John Manager",
    "manager_email": "manager@example.com",
    "email_enabled": true,
    "info_table_enabled": true,
    "email_address": "",
    "notify_for_actions": ["ad_max_attempts"],
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### Create Settings
```http
POST /api/moderation/settings/
Content-Type: application/json

{
  "manager": 2,
  "email_enabled": true,
  "info_table_enabled": true,
  "notify_for_actions": ["ad_max_attempts", "ad_flagged"]
}
```

### Get Specific Settings
```http
GET /api/moderation/settings/1/
```

### Update Settings
```http
PUT /api/moderation/settings/1/
PATCH /api/moderation/settings/1/
Content-Type: application/json

{
  "email_enabled": false,
  "notify_for_actions": ["ad_max_attempts"]
}
```

### Delete Settings
```http
DELETE /api/moderation/settings/1/
```

### My Settings (Current User)
```http
GET /api/moderation/settings/my/
POST /api/moderation/settings/my/
```

**GET Response:**
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

**POST Request:**
```json
{
  "email_enabled": true,
  "info_table_enabled": false,
  "email_address": "custom@example.com",
  "notify_for_actions": ["ad_max_attempts", "ad_flagged"]
}
```

## 📨 Moderation Notifications

### List Notifications
```http
GET /api/moderation/notifications/
GET /api/moderation/notifications/?status=pending
GET /api/moderation/notifications/?action=ad_max_attempts
GET /api/moderation/notifications/?unread_only=true
```

**Query Parameters:**
- `status`: Filter by status (`pending`, `read`)
- `action`: Filter by action type
- `unread_only`: Show only unread notifications (`true`/`false`)

**Response:**
```json
{
  "count": 25,
  "next": "http://api/moderation/notifications/?page=2",
  "previous": null,
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
      "data": {
        "attempts_count": 3,
        "reason": "Inappropriate content"
      },
      "status": "pending",
      "status_display": "Pending",
      "priority": 8,
      "is_read": false,
      "created_at": "2024-01-15T10:30:00Z",
      "read_at": null,
      "admin_url": "/admin/ads/caradmodel/123/change/"
    }
  ]
}
```

### Create Notification
```http
POST /api/moderation/notifications/
Content-Type: application/json

{
  "manager": 2,
  "action": "ad_max_attempts",
  "title": "Ad #123 requires review",
  "message": "Ad reached maximum attempts",
  "ad_id": 123,
  "user_id": 456,
  "priority": 8
}
```

### Get Specific Notification
```http
GET /api/moderation/notifications/1/
```

### Update Notification
```http
PUT /api/moderation/notifications/1/
PATCH /api/moderation/notifications/1/
Content-Type: application/json

{
  "status": "read",
  "priority": 5
}
```

### Delete Notification
```http
DELETE /api/moderation/notifications/1/
```

### Mark Notification as Read
```http
POST /api/moderation/notifications/1/mark-read/
```

**Response:**
```json
{
  "id": 1,
  "status": "read",
  "read_at": "2024-01-15T11:00:00Z",
  ...
}
```

### Mark Multiple as Read
```http
POST /api/moderation/notifications/mark-multiple-read/
Content-Type: application/json

{
  "notification_ids": [1, 2, 3, 4]
}
```

**Response:**
```json
{
  "message": "Marked 4 notifications as read",
  "updated_count": 4
}
```

### Bulk Actions
```http
POST /api/moderation/notifications/bulk-action/
Content-Type: application/json

{
  "notification_ids": [1, 2, 3],
  "action": "mark_read"
}
```

**Actions:**
- `mark_read`: Mark notifications as read
- `delete`: Delete notifications

**Response:**
```json
{
  "message": "Marked 3 notifications as read",
  "updated_count": 3
}
```

### Get Statistics
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
  "recent_notifications": [
    {
      "id": 1,
      "title": "Recent notification",
      "created_at": "2024-01-15T10:30:00Z",
      ...
    }
  ]
}
```

## 📧 Notification Templates

### List Templates
```http
GET /api/moderation/templates/
```

**Permissions:**
- Superuser: See all templates
- Others: See only active templates

### Create Template
```http
POST /api/moderation/templates/
Content-Type: application/json

{
  "action": "ad_max_attempts",
  "subject_template": "🚨 Ad #{{ ad_id }} needs review",
  "html_template": "<html>...</html>",
  "text_template": "Plain text version",
  "available_variables": ["ad_id", "user_id", "reason"],
  "is_active": true
}
```

### Get Specific Template
```http
GET /api/moderation/templates/1/
```

### Update Template
```http
PUT /api/moderation/templates/1/
PATCH /api/moderation/templates/1/
Content-Type: application/json

{
  "subject_template": "Updated subject",
  "html_template": "<html>Updated content</html>"
}
```

### Delete Template
```http
DELETE /api/moderation/templates/1/
```

## 📊 Notification Logs

### List Logs
```http
GET /api/moderation/logs/
```

**Permissions:**
- Superuser: See all logs
- Staff: See logs for own notifications only

**Response:**
```json
{
  "count": 100,
  "results": [
    {
      "id": 1,
      "notification": 1,
      "notification_title": "Ad #123 needs review",
      "method": "email",
      "method_display": "Email",
      "recipient": "manager@example.com",
      "status": "sent",
      "status_display": "Sent",
      "error_message": "",
      "sent_at": "2024-01-15T10:30:00Z",
      "delivered_at": "2024-01-15T10:30:05Z",
      "external_id": "msg_123456"
    }
  ]
}
```

### Get Specific Log
```http
GET /api/moderation/logs/1/
```

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "field_name": ["This field is required."],
  "another_field": ["Invalid value."]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "error": "Only managers can access notification settings"
}
```

### 404 Not Found
```json
{
  "error": "Notification not found"
}
```

## 📝 Usage Examples

### JavaScript/Frontend Integration
```javascript
// Get my notification settings
const getMySettings = async () => {
  const response = await fetch('/api/moderation/settings/my/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Update settings
const updateSettings = async (settings) => {
  const response = await fetch('/api/moderation/settings/my/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  return response.json();
};

// Get unread notifications
const getUnreadNotifications = async () => {
  const response = await fetch('/api/moderation/notifications/?unread_only=true', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Mark notification as read
const markAsRead = async (notificationId) => {
  const response = await fetch(`/api/moderation/notifications/${notificationId}/mark-read/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Get statistics
const getStats = async () => {
  const response = await fetch('/api/moderation/notifications/stats/', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

This API provides comprehensive access to the moderation notification system with clear, RESTful endpoints using Django REST Framework generics.
