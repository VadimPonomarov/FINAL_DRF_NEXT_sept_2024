"""
URLs for moderation system.
"""
from django.urls import path
from .views import (
    # Manager Notification Settings
    ManagerNotificationSettingsListView,
    ManagerNotificationSettingsDetailView,
    MyNotificationSettingsView,

    # Moderation Notifications
    ModerationNotificationListView,
    ModerationNotificationDetailView,
    MarkNotificationReadView,
    MarkMultipleNotificationsReadView,
    BulkNotificationActionView,
    NotificationStatsView,

    # Notification Templates
    NotificationTemplateListView,
    NotificationTemplateDetailView,

    # Notification Logs
    NotificationLogListView,
    NotificationLogDetailView,
)

app_name = 'moderation'

urlpatterns = [
    # Manager Notification Settings
    path('api/moderation/settings/', ManagerNotificationSettingsListView.as_view(), name='settings-list'),
    path('api/moderation/settings/<int:pk>/', ManagerNotificationSettingsDetailView.as_view(), name='settings-detail'),
    path('api/moderation/settings/my/', MyNotificationSettingsView.as_view(), name='my-settings'),

    # Moderation Notifications
    path('api/moderation/notifications/', ModerationNotificationListView.as_view(), name='notifications-list'),
    path('api/moderation/notifications/<int:pk>/', ModerationNotificationDetailView.as_view(), name='notifications-detail'),
    path('api/moderation/notifications/<int:pk>/mark-read/', MarkNotificationReadView.as_view(), name='mark-read'),
    path('api/moderation/notifications/mark-multiple-read/', MarkMultipleNotificationsReadView.as_view(), name='mark-multiple-read'),
    path('api/moderation/notifications/bulk-action/', BulkNotificationActionView.as_view(), name='bulk-action'),
    path('api/moderation/notifications/stats/', NotificationStatsView.as_view(), name='stats'),

    # Notification Templates
    path('api/moderation/templates/', NotificationTemplateListView.as_view(), name='templates-list'),
    path('api/moderation/templates/<int:pk>/', NotificationTemplateDetailView.as_view(), name='templates-detail'),

    # Notification Logs
    path('api/moderation/logs/', NotificationLogListView.as_view(), name='logs-list'),
    path('api/moderation/logs/<int:pk>/', NotificationLogDetailView.as_view(), name='logs-detail'),
]
