"""
Serializers for moderation system.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.serializers.base import BaseModelSerializer
# from drf_spectacular.utils import extend_schema_serializer, OpenApiExample  # TODO: Install drf_spectacular
from .models import (
    ManagerNotificationSettings,
    ModerationNotification,
    NotificationTemplate,
    NotificationLog
)

User = get_user_model()


class ManagerNotificationSettingsSerializer(BaseModelSerializer):
    """Serializer for manager notification settings."""

    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    manager_email = serializers.EmailField(source='manager.email', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = ManagerNotificationSettings
        fields = [
            'manager', 'manager_name', 'manager_email',
            'email_enabled', 'info_table_enabled', 'email_address',
            'notify_for_actions', 'is_active'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
    
    def validate_manager(self, value):
        """Validate that user is a manager."""
        if not value.is_staff:
            raise serializers.ValidationError("User must be a staff member (manager)")
        return value


class ModerationNotificationSerializer(BaseModelSerializer):
    """Serializer for moderation notifications."""

    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    admin_url = serializers.CharField(source='get_admin_url', read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = ModerationNotification
        fields = [
            'manager', 'manager_name', 'action', 'action_display',
            'title', 'message', 'ad_id', 'user_id', 'data',
            'status', 'status_display', 'priority', 'is_read',
            'read_at', 'admin_url'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'read_at': {'read_only': True},
        }
    
    def get_is_read(self, obj):
        """Check if notification is read."""
        return obj.status == 'read'


class ModerationNotificationCreateSerializer(BaseModelSerializer):
    """Serializer for creating moderation notifications."""

    class Meta(BaseModelSerializer.Meta):
        model = ModerationNotification
        fields = [
            'manager', 'action', 'title', 'message',
            'ad_id', 'user_id', 'data', 'priority'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
    
    def validate_manager(self, value):
        """Validate that user is a manager."""
        if not value.is_staff:
            raise serializers.ValidationError("User must be a staff member (manager)")
        return value


class NotificationTemplateSerializer(BaseModelSerializer):
    """Serializer for notification templates."""

    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = NotificationTemplate
        fields = [
            'action', 'action_display', 'subject_template',
            'html_template', 'text_template', 'available_variables',
            'is_active'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer


class NotificationLogSerializer(BaseModelSerializer):
    """Serializer for notification logs."""

    notification_title = serializers.CharField(source='notification.title', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = NotificationLog
        fields = [
            'notification', 'notification_title', 'method', 'method_display',
            'recipient', 'status', 'status_display', 'error_message',
            'sent_at', 'delivered_at', 'external_id'
        ]
        # id, created_at, updated_at are inherited from BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            'sent_at': {'read_only': True},
            'delivered_at': {'read_only': True},
        }


class ManagerNotificationStatsSerializer(serializers.Serializer):
    """Serializer for manager notification statistics."""
    
    manager_id = serializers.IntegerField()
    manager_name = serializers.CharField()
    manager_email = serializers.EmailField()
    
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    read_notifications = serializers.IntegerField()
    
    notifications_by_action = serializers.DictField()
    recent_notifications = ModerationNotificationSerializer(many=True)


# @extend_schema_serializer(
#     examples=[
#         OpenApiExample(
#             "Mark multiple notifications as read",
#             summary="Example request to mark notifications as read",
#             description="Provide a list of notification IDs to mark as read",
#             value={
#                 "notification_ids": [1, 2, 3, 4, 5]
#             },
#             request_only=True,
#         ),
#     ]
# )
class NotificationMarkReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read."""

    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of notification IDs to mark as read"
    )
    
    def validate_notification_ids(self, value):
        """Validate that all notification IDs exist."""
        if not value:
            raise serializers.ValidationError("At least one notification ID is required")
        
        # Check if all notifications exist
        existing_ids = set(
            ModerationNotification.objects.filter(id__in=value).values_list('id', flat=True)
        )
        missing_ids = set(value) - existing_ids
        
        if missing_ids:
            raise serializers.ValidationError(f"Notifications not found: {list(missing_ids)}")
        
        return value


# @extend_schema_serializer(
#     examples=[
#         OpenApiExample(
#             "Mark notifications as read",
#             summary="Bulk mark as read action",
#             description="Mark multiple notifications as read",
#             value={
#                 "notification_ids": [1, 2, 3],
#                 "action": "mark_read"
#             },
#             request_only=True,
#         ),
#         OpenApiExample(
#             "Delete notifications",
#             summary="Bulk delete action",
#             description="Delete multiple notifications",
#             value={
#                 "notification_ids": [4, 5, 6],
#                 "action": "delete"
#             },
#             request_only=True,
#         ),
#     ]
# )
class BulkNotificationActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on notifications."""

    ACTION_CHOICES = [
        ('mark_read', 'Mark as Read'),
        ('delete', 'Delete'),
    ]

    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of notification IDs"
    )
    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    
    def validate_notification_ids(self, value):
        """Validate notification IDs."""
        if not value:
            raise serializers.ValidationError("At least one notification ID is required")
        return value
