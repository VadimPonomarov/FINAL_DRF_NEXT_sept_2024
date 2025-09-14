"""
Custom Swagger schemas for moderation API.
"""
from drf_spectacular.utils import OpenApiExample
from rest_framework import serializers


class ErrorResponseSerializer(serializers.Serializer):
    """Generic error response serializer."""
    error = serializers.CharField(help_text="Error message")


class ValidationErrorResponseSerializer(serializers.Serializer):
    """Validation error response serializer."""
    field_name = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of validation errors for this field"
    )


class BulkActionResponseSerializer(serializers.Serializer):
    """Response serializer for bulk actions."""
    message = serializers.CharField(help_text="Success message")
    updated_count = serializers.IntegerField(help_text="Number of items updated", required=False)
    deleted_count = serializers.IntegerField(help_text="Number of items deleted", required=False)


# Swagger examples for different scenarios
SWAGGER_EXAMPLES = {
    # Manager Settings Examples
    'manager_settings_create': OpenApiExample(
        "Create manager settings",
        summary="Create notification settings for a manager",
        description="Example of creating notification settings",
        value={
            "manager": 2,
            "email_enabled": True,
            "info_table_enabled": True,
            "email_address": "custom@example.com",
            "notify_for_actions": ["ad_max_attempts", "ad_flagged"],
            "is_active": True
        },
        request_only=True,
    ),
    
    'manager_settings_update': OpenApiExample(
        "Update manager settings",
        summary="Update notification settings",
        description="Example of updating notification settings",
        value={
            "email_enabled": False,
            "info_table_enabled": True,
            "notify_for_actions": ["ad_max_attempts"]
        },
        request_only=True,
    ),
    
    'manager_settings_response': OpenApiExample(
        "Manager settings response",
        summary="Manager notification settings",
        description="Example response for manager settings",
        value={
            "id": 1,
            "manager": 2,
            "manager_name": "John Manager",
            "manager_email": "manager@example.com",
            "email_enabled": True,
            "info_table_enabled": True,
            "email_address": "",
            "notify_for_actions": ["ad_max_attempts"],
            "is_active": True,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        },
        response_only=True,
    ),
    
    # Notification Examples
    'notification_create': OpenApiExample(
        "Create notification",
        summary="Create a new moderation notification",
        description="Example of creating a notification",
        value={
            "manager": 2,
            "action": "ad_max_attempts",
            "title": "Ad #123 requires manual review",
            "message": "Ad reached maximum edit attempts (3)",
            "ad_id": 123,
            "user_id": 456,
            "data": {
                "attempts_count": 3,
                "reason": "Inappropriate content"
            },
            "priority": 8
        },
        request_only=True,
    ),
    
    'notification_response': OpenApiExample(
        "Notification response",
        summary="Moderation notification",
        description="Example response for a notification",
        value={
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
            "is_read": False,
            "created_at": "2024-01-15T10:30:00Z",
            "read_at": None,
            "admin_url": "/admin/ads/caradmodel/123/change/"
        },
        response_only=True,
    ),
    
    'notification_list_response': OpenApiExample(
        "Notification list response",
        summary="List of notifications with pagination",
        description="Example paginated response for notifications",
        value={
            "count": 25,
            "next": "http://api/moderation/notifications/?page=2",
            "previous": None,
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
                    "is_read": False,
                    "created_at": "2024-01-15T10:30:00Z"
                }
            ]
        },
        response_only=True,
    ),
    
    # Statistics Examples
    'stats_response': OpenApiExample(
        "Statistics response",
        summary="Notification statistics",
        description="Example response for notification statistics",
        value={
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
                    "created_at": "2024-01-15T10:30:00Z"
                }
            ]
        },
        response_only=True,
    ),
    
    # Template Examples
    'template_create': OpenApiExample(
        "Create template",
        summary="Create notification template",
        description="Example of creating a notification template",
        value={
            "action": "ad_max_attempts",
            "subject_template": "🚨 Ad #{{ ad_id }} needs review - {{ site_name }}",
            "html_template": "<html><body><h1>Ad Review Required</h1><p>Ad #{{ ad_id }} needs manual review.</p></body></html>",
            "text_template": "Ad #{{ ad_id }} needs manual review. Please check the admin panel.",
            "available_variables": ["ad_id", "user_id", "reason", "site_name"],
            "is_active": True
        },
        request_only=True,
    ),
    
    'template_response': OpenApiExample(
        "Template response",
        summary="Notification template",
        description="Example response for a notification template",
        value={
            "id": 1,
            "action": "ad_max_attempts",
            "action_display": "Ad Max Attempts",
            "subject_template": "🚨 Ad #{{ ad_id }} needs review",
            "html_template": "<html>...</html>",
            "text_template": "Plain text version",
            "available_variables": ["ad_id", "user_id", "reason"],
            "is_active": True,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        },
        response_only=True,
    ),
    
    # Log Examples
    'log_response': OpenApiExample(
        "Log response",
        summary="Notification log",
        description="Example response for a notification log",
        value={
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
        },
        response_only=True,
    ),
    
    # Error Examples
    'error_401': OpenApiExample(
        "Unauthorized",
        summary="Authentication required",
        description="User is not authenticated",
        value={
            "detail": "Authentication credentials were not provided."
        },
        response_only=True,
    ),
    
    'error_403': OpenApiExample(
        "Forbidden",
        summary="Permission denied",
        description="User doesn't have required permissions",
        value={
            "error": "Only managers can access notification settings"
        },
        response_only=True,
    ),
    
    'error_404': OpenApiExample(
        "Not Found",
        summary="Resource not found",
        description="Requested resource doesn't exist",
        value={
            "error": "Notification not found"
        },
        response_only=True,
    ),
    
    'error_validation': OpenApiExample(
        "Validation Error",
        summary="Request validation failed",
        description="Request data is invalid",
        value={
            "manager": ["This field is required."],
            "action": ["Invalid choice."],
            "notification_ids": ["This field may not be empty."]
        },
        response_only=True,
    ),
    
    # Success Action Examples
    'bulk_action_success': OpenApiExample(
        "Bulk action success",
        summary="Successful bulk action",
        description="Result of successful bulk action",
        value={
            "message": "Marked 5 notifications as read",
            "updated_count": 5
        },
        response_only=True,
    ),
}
