"""
Views for moderation system.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

# Import documentation decorators
from .docs import (
    manager_settings_list_docs,
    manager_settings_create_docs,
    manager_settings_detail_docs,
    manager_settings_update_docs,
    manager_settings_delete_docs,
    my_settings_docs,
    notification_list_docs,
    notification_detail_docs,
    mark_read_docs,
    mark_multiple_read_docs,
    bulk_action_docs,
    stats_docs,
    template_list_docs,
    template_detail_docs,
    log_list_docs,
    log_detail_docs
)
from .models import (
    ManagerNotificationSettings,
    ModerationNotification,
    NotificationTemplate,
    NotificationLog
)
from .serializers import (
    ManagerNotificationSettingsSerializer,
    ModerationNotificationSerializer,
    ModerationNotificationCreateSerializer,
    NotificationTemplateSerializer,
    NotificationLogSerializer,
    ManagerNotificationStatsSerializer,
    NotificationMarkReadSerializer,
    BulkNotificationActionSerializer
)

User = get_user_model()


# Manager Notification Settings Views
class ManagerNotificationSettingsListView(generics.ListCreateAPIView):
    """List and create manager notification settings."""

    serializer_class = ManagerNotificationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        if self.request.user.is_superuser:
            return ManagerNotificationSettings.objects.select_related('manager').all()
        elif self.request.user.is_staff:
            # Managers can only see their own settings
            return ManagerNotificationSettings.objects.select_related('manager').filter(
                manager=self.request.user
            )
        else:
            return ManagerNotificationSettings.objects.none()

    @manager_settings_list_docs
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    @manager_settings_create_docs
    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class ManagerNotificationSettingsDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete manager notification settings."""

    serializer_class = ManagerNotificationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        if self.request.user.is_superuser:
            return ManagerNotificationSettings.objects.select_related('manager').all()
        elif self.request.user.is_staff:
            return ManagerNotificationSettings.objects.select_related('manager').filter(
                manager=self.request.user
            )
        else:
            return ManagerNotificationSettings.objects.none()

    @manager_settings_detail_docs
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    @manager_settings_update_docs
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @manager_settings_update_docs
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @manager_settings_delete_docs
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


@my_settings_docs
class MyNotificationSettingsView(APIView):
    """Get and update current user's notification settings."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current user's notification settings."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only managers can access notification settings'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings, created = ManagerNotificationSettings.objects.get_or_create(
            manager=request.user,
            defaults={
                'email_enabled': True,
                'info_table_enabled': True,
                'is_active': True
            }
        )

        serializer = ManagerNotificationSettingsSerializer(settings)
        return Response(serializer.data)

    def post(self, request):
        """Update current user's notification settings."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only managers can update notification settings'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings, created = ManagerNotificationSettings.objects.get_or_create(
            manager=request.user
        )

        serializer = ManagerNotificationSettingsSerializer(
            settings,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Moderation Notifications Views
@notification_list_docs
class ModerationNotificationListView(generics.ListCreateAPIView):
    """List and create moderation notifications."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on method."""
        if self.request.method == 'POST':
            return ModerationNotificationCreateSerializer
        return ModerationNotificationSerializer

    def get_queryset(self):
        """Filter notifications based on user permissions."""
        # Handle case when user is not authenticated (e.g., during Swagger schema generation)
        if not self.request.user.is_authenticated:
            return ModerationNotification.objects.none()

        queryset = ModerationNotification.objects.select_related('manager').all()

        if self.request.user.is_superuser:
            pass  # Superuser sees all
        elif self.request.user.is_staff:
            # Managers can only see their own notifications
            queryset = queryset.filter(manager=self.request.user)
        else:
            return ModerationNotification.objects.none()

        # Apply filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        action_filter = self.request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        unread_only = self.request.query_params.get('unread_only')
        if unread_only and unread_only.lower() == 'true':
            queryset = queryset.filter(status='pending')

        return queryset.order_by('-priority', '-created_at')


@notification_detail_docs
class ModerationNotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a moderation notification."""

    serializer_class = ModerationNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter notifications based on user permissions."""
        if self.request.user.is_superuser:
            return ModerationNotification.objects.select_related('manager').all()
        elif self.request.user.is_staff:
            return ModerationNotification.objects.select_related('manager').filter(
                manager=self.request.user
            )
        else:
            return ModerationNotification.objects.none()
    
@mark_read_docs
class MarkNotificationReadView(APIView):
    """Mark a notification as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """Mark notification as read."""
        try:
            if request.user.is_superuser:
                notification = ModerationNotification.objects.get(pk=pk)
            elif request.user.is_staff:
                notification = ModerationNotification.objects.get(
                    pk=pk,
                    manager=request.user
                )
            else:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            notification.mark_as_read()
            serializer = ModerationNotificationSerializer(notification)
            return Response(serializer.data)

        except ModerationNotification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
@mark_multiple_read_docs
class MarkMultipleNotificationsReadView(APIView):
    """Mark multiple notifications as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Mark multiple notifications as read."""
        serializer = NotificationMarkReadSerializer(data=request.data)
        if serializer.is_valid():
            notification_ids = serializer.validated_data['notification_ids']

            # Filter by user permissions
            if request.user.is_superuser:
                queryset = ModerationNotification.objects.filter(id__in=notification_ids)
            elif request.user.is_staff:
                queryset = ModerationNotification.objects.filter(
                    id__in=notification_ids,
                    manager=request.user
                )
            else:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            updated_count = 0
            for notification in queryset:
                if notification.status == 'pending':
                    notification.mark_as_read()
                    updated_count += 1

            return Response({
                'message': f'Marked {updated_count} notifications as read',
                'updated_count': updated_count
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@bulk_action_docs
class BulkNotificationActionView(APIView):
    """Perform bulk actions on notifications."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Perform bulk actions on notifications."""
        serializer = BulkNotificationActionSerializer(data=request.data)
        if serializer.is_valid():
            notification_ids = serializer.validated_data['notification_ids']
            action_type = serializer.validated_data['action']

            # Filter by user permissions
            if request.user.is_superuser:
                queryset = ModerationNotification.objects.filter(id__in=notification_ids)
            elif request.user.is_staff:
                queryset = ModerationNotification.objects.filter(
                    id__in=notification_ids,
                    manager=request.user
                )
            else:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if action_type == 'mark_read':
                updated_count = 0
                for notification in queryset:
                    if notification.status == 'pending':
                        notification.mark_as_read()
                        updated_count += 1

                return Response({
                    'message': f'Marked {updated_count} notifications as read',
                    'updated_count': updated_count
                })

            elif action_type == 'delete':
                deleted_count = queryset.count()
                queryset.delete()

                return Response({
                    'message': f'Deleted {deleted_count} notifications',
                    'deleted_count': deleted_count
                })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@stats_docs
class NotificationStatsView(APIView):
    """Get notification statistics for current user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get notification statistics for current user."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only managers can access notification stats'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get notifications for current user
        if request.user.is_superuser:
            notifications = ModerationNotification.objects.all()
        else:
            notifications = ModerationNotification.objects.filter(manager=request.user)

        # Calculate stats
        total_count = notifications.count()
        unread_count = notifications.filter(status='pending').count()
        read_count = notifications.filter(status='read').count()

        # Group by action
        action_stats = notifications.values('action').annotate(
            count=Count('id')
        ).order_by('-count')

        notifications_by_action = {
            item['action']: item['count'] for item in action_stats
        }

        # Recent notifications (last 10)
        recent_notifications = notifications.order_by('-created_at')[:10]

        stats_data = {
            'manager_id': request.user.id,
            'manager_name': request.user.get_full_name() or request.user.email,
            'manager_email': request.user.email,
            'total_notifications': total_count,
            'unread_notifications': unread_count,
            'read_notifications': read_count,
            'notifications_by_action': notifications_by_action,
            'recent_notifications': recent_notifications
        }

        serializer = ManagerNotificationStatsSerializer(stats_data)
        return Response(serializer.data)


# Notification Templates Views
@template_list_docs
class NotificationTemplateListView(generics.ListCreateAPIView):
    """List and create notification templates."""

    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only superusers can manage templates."""
        if self.request.user.is_superuser:
            return NotificationTemplate.objects.all()
        else:
            return NotificationTemplate.objects.filter(is_active=True)  # Others can only view active templates


@template_detail_docs
class NotificationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete notification template."""

    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only superusers can manage templates."""
        if self.request.user.is_superuser:
            return NotificationTemplate.objects.all()
        else:
            return NotificationTemplate.objects.filter(is_active=True)


# Notification Logs Views (Read-only)
@log_list_docs
class NotificationLogListView(generics.ListAPIView):
    """List notification logs."""

    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter logs based on user permissions."""
        if self.request.user.is_superuser:
            return NotificationLog.objects.select_related('notification').all()
        elif self.request.user.is_staff:
            # Managers can only see logs for their notifications
            return NotificationLog.objects.select_related('notification').filter(
                notification__manager=self.request.user
            )
        else:
            return NotificationLog.objects.none()


@log_detail_docs
class NotificationLogDetailView(generics.RetrieveAPIView):
    """Retrieve notification log details."""

    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter logs based on user permissions."""
        # Handle case when user is not authenticated (e.g., during Swagger schema generation)
        if not self.request.user.is_authenticated:
            return NotificationLog.objects.none()

        if self.request.user.is_superuser:
            return NotificationLog.objects.select_related('notification').all()
        elif self.request.user.is_staff:
            return NotificationLog.objects.select_related('notification').filter(
                notification__manager=self.request.user
            )
        else:
            return NotificationLog.objects.none()
