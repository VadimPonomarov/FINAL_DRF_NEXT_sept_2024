# 📚 Moderation API Swagger Documentation

## 🎯 Overview

The moderation system API is fully documented with Swagger/OpenAPI 3.0 using `drf-spectacular`. All endpoints include detailed descriptions, request/response schemas, examples, and error handling documentation.

## 🔧 Setup

### **1. Install drf-spectacular**
```bash
pip install drf-spectacular
```

### **2. Add to INSTALLED_APPS**
```python
# settings.py
INSTALLED_APPS = [
    # ...
    'drf_spectacular',
    'apps.moderation',
]
```

### **3. Configure drf-spectacular**
```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Car Sales Moderation API',
    'DESCRIPTION': 'API for managing moderation notifications and settings',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'Manager Settings', 'description': 'Manager notification settings management'},
        {'name': 'Notifications', 'description': 'Moderation notifications management'},
        {'name': 'Templates', 'description': 'Email template management'},
        {'name': 'Logs', 'description': 'Notification logs and tracking'},
    ],
}
```

### **4. Add URLs**
```python
# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Swagger URLs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Moderation API
    path('', include('apps.moderation.urls')),
]
```

## 📋 API Documentation Features

### **1. Organized by Tags**
- **Manager Settings**: Notification preferences management
- **Notifications**: Moderation notifications CRUD
- **Templates**: Email template management
- **Logs**: Notification delivery tracking

### **2. Detailed Endpoint Documentation**

#### **Manager Settings Endpoints:**
```yaml
GET /api/moderation/settings/
  summary: List manager notification settings
  description: Get a list of notification settings for managers
  parameters: []
  responses:
    200: Array of ManagerNotificationSettings
    401: Authentication required
    403: Permission denied

POST /api/moderation/settings/
  summary: Create manager notification settings
  description: Create new notification settings for a manager
  requestBody: ManagerNotificationSettingsSerializer
  responses:
    201: Created ManagerNotificationSettings
    400: Validation error
    401: Authentication required

GET /api/moderation/settings/my/
  summary: Get my notification settings
  description: Get notification settings for current authenticated manager
  responses:
    200: ManagerNotificationSettings
    401: Authentication required
    403: Only managers can access
```

#### **Notifications Endpoints:**
```yaml
GET /api/moderation/notifications/
  summary: List moderation notifications
  description: Get a list of moderation notifications with filtering
  parameters:
    - name: status
      in: query
      schema: {type: string, enum: [pending, read]}
    - name: action
      in: query
      schema: {type: string, enum: [ad_max_attempts, ad_flagged, ad_needs_review]}
    - name: unread_only
      in: query
      schema: {type: boolean}
  responses:
    200: Paginated list of notifications
    401: Authentication required

POST /api/moderation/notifications/{id}/mark-read/
  summary: Mark notification as read
  description: Mark a specific notification as read by its ID
  responses:
    200: Updated notification
    404: Notification not found
    403: Permission denied

POST /api/moderation/notifications/bulk-action/
  summary: Perform bulk actions on notifications
  description: Perform bulk actions (mark_read, delete) on multiple notifications
  requestBody: BulkNotificationActionSerializer
  responses:
    200: Action result with count
    400: Validation error
```

### **3. Request/Response Examples**

#### **Create Manager Settings:**
```json
// Request
{
  "manager": 2,
  "email_enabled": true,
  "info_table_enabled": true,
  "email_address": "custom@example.com",
  "notify_for_actions": ["ad_max_attempts", "ad_flagged"],
  "is_active": true
}

// Response
{
  "id": 1,
  "manager": 2,
  "manager_name": "John Manager",
  "manager_email": "manager@example.com",
  "email_enabled": true,
  "info_table_enabled": true,
  "email_address": "custom@example.com",
  "notify_for_actions": ["ad_max_attempts", "ad_flagged"],
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### **Bulk Action Request:**
```json
{
  "notification_ids": [1, 2, 3, 4, 5],
  "action": "mark_read"
}

// Response
{
  "message": "Marked 5 notifications as read",
  "updated_count": 5
}
```

#### **Notification Statistics:**
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

### **4. Error Response Documentation**

#### **Authentication Errors:**
```json
// 401 Unauthorized
{
  "detail": "Authentication credentials were not provided."
}

// 403 Forbidden
{
  "error": "Only managers can access notification settings"
}
```

#### **Validation Errors:**
```json
// 400 Bad Request
{
  "manager": ["This field is required."],
  "action": ["Invalid choice."],
  "notification_ids": ["This field may not be empty."]
}
```

#### **Not Found Errors:**
```json
// 404 Not Found
{
  "error": "Notification not found"
}
```

### **5. Schema Components**

#### **Serializer Schemas:**
- `ManagerNotificationSettings`
- `ModerationNotification`
- `ModerationNotificationCreate`
- `NotificationTemplate`
- `NotificationLog`
- `NotificationMarkRead`
- `BulkNotificationAction`
- `ManagerNotificationStats`

#### **Response Schemas:**
- `ErrorResponse`
- `ValidationErrorResponse`
- `BulkActionResponse`
- `PaginatedResponse`

## 🌐 Accessing Documentation

### **Swagger UI:**
```
http://localhost:8000/api/docs/
```
- Interactive API documentation
- Try-it-out functionality
- Request/response examples
- Authentication testing

### **ReDoc:**
```
http://localhost:8000/api/redoc/
```
- Clean, readable documentation
- Better for reading and sharing
- Print-friendly format

### **OpenAPI Schema:**
```
http://localhost:8000/api/schema/
```
- Raw OpenAPI 3.0 JSON schema
- For API client generation
- Integration with tools

## 🔧 Customization

### **Custom Examples in Serializers:**
```python
@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Mark notifications as read",
            summary="Bulk mark as read action",
            description="Mark multiple notifications as read",
            value={
                "notification_ids": [1, 2, 3],
                "action": "mark_read"
            },
            request_only=True,
        ),
    ]
)
class BulkNotificationActionSerializer(serializers.Serializer):
    # ...
```

### **Custom Responses in Views:**
```python
@extend_schema(
    summary="Mark notification as read",
    description="Mark a specific notification as read by its ID.",
    responses={
        200: ModerationNotificationSerializer,
        401: OpenApiResponse(description="Authentication required"),
        403: OpenApiResponse(description="Permission denied"),
        404: OpenApiResponse(description="Notification not found"),
    },
    tags=["Notifications"]
)
class MarkNotificationReadView(APIView):
    # ...
```

### **Query Parameters:**
```python
@extend_schema(
    parameters=[
        OpenApiParameter(
            name='status',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Filter by notification status',
            enum=['pending', 'read']
        ),
    ],
)
```

## 📊 Benefits

### **1. Developer Experience**
- **Interactive testing** - Try APIs directly in browser
- **Clear examples** - Real request/response samples
- **Type safety** - Detailed schema definitions
- **Error handling** - Comprehensive error documentation

### **2. API Client Generation**
- **OpenAPI 3.0 compliant** - Generate clients for any language
- **Type definitions** - TypeScript, Python, Java clients
- **SDK generation** - Automated client library creation

### **3. Team Collaboration**
- **Shared documentation** - Single source of truth
- **Version control** - Documentation changes tracked
- **Review process** - Documentation in code reviews

### **4. Quality Assurance**
- **Schema validation** - Automatic request/response validation
- **Consistency** - Standardized documentation format
- **Testing** - Documentation drives test cases

## 🚀 Usage Examples

### **Frontend Integration:**
```javascript
// Generated from OpenAPI schema
import { ModerationApi } from './generated/api';

const api = new ModerationApi();

// Get notifications with type safety
const notifications = await api.listNotifications({
  status: 'pending',
  unreadOnly: true
});

// Mark as read
await api.markNotificationRead(notificationId);

// Bulk actions
await api.bulkNotificationAction({
  notificationIds: [1, 2, 3],
  action: 'mark_read'
});
```

### **API Testing:**
```python
# Test cases based on schema
def test_create_notification_settings():
    data = {
        "manager": self.manager.id,
        "email_enabled": True,
        "info_table_enabled": True,
        "notify_for_actions": ["ad_max_attempts"]
    }
    response = self.client.post('/api/moderation/settings/', data)
    assert response.status_code == 201
    assert response.data['email_enabled'] is True
```

## 🎯 Conclusion

The moderation API is fully documented with Swagger, providing:

1. **📚 Complete documentation** - All endpoints, parameters, responses
2. **🧪 Interactive testing** - Try APIs directly in browser
3. **🔧 Client generation** - Generate SDKs for any language
4. **👥 Team collaboration** - Shared, version-controlled docs
5. **✅ Quality assurance** - Schema-driven validation

Access the documentation at `/api/docs/` for interactive exploration of the moderation API!
