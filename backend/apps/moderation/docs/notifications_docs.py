"""
Documentation for Notifications views.
"""
from apps.moderation.serializers import (
    ModerationNotificationSerializer,
    ModerationNotificationCreateSerializer,
    ManagerNotificationStatsSerializer,
    NotificationMarkReadSerializer,
    BulkNotificationActionSerializer
)


# Notification List View Documentation
def notification_list_docs(cls):
    """
    Documentation decorator for ModerationNotificationListView.

    GET: List moderation notifications
    - Supports filtering by status, action, unread_only
    - Query parameters:
      * status: pending, read
      * action: ad_max_attempts, ad_flagged, ad_needs_review
      * unread_only: boolean
    - Returns: List of ModerationNotificationSerializer

    POST: Create moderation notification
    - Request: ModerationNotificationCreateSerializer
    - Returns: Created ModerationNotificationSerializer
    """
    cls.__doc__ = """
    List and create moderation notifications.

    GET: Returns paginated list with filtering options.
    POST: Creates new notification.
    """
    return cls


# Notification Detail View Documentation
def notification_detail_docs(cls):
    """
    Documentation decorator for ModerationNotificationDetailView.

    GET: Retrieve moderation notification by ID
    PUT/PATCH: Update moderation notification
    DELETE: Delete moderation notification
    """
    cls.__doc__ = """
    Retrieve, update or delete moderation notification.

    All operations require authentication and proper permissions.
    """
    return cls


# Mark Read Documentation
def mark_read_docs(cls):
    """
    Documentation decorator for MarkNotificationReadView.

    POST: Mark notification as read by ID
    """
    cls.__doc__ = """
    Mark a notification as read.

    Updates notification status to 'read' and sets read_at timestamp.
    """
    return cls


# Mark Multiple Read Documentation
def mark_multiple_read_docs(cls):
    """
    Documentation decorator for MarkMultipleNotificationsReadView.

    POST: Mark multiple notifications as read
    - Request: NotificationMarkReadSerializer (list of IDs)
    - Returns: Success message with count
    """
    cls.__doc__ = """
    Mark multiple notifications as read.

    Accepts list of notification IDs and marks them as read.
    """
    return cls


# Bulk Action Documentation
def bulk_action_docs(cls):
    """
    Documentation decorator for BulkNotificationActionView.

    POST: Perform bulk actions on notifications
    - Request: BulkNotificationActionSerializer
    - Actions: mark_read, delete
    - Returns: Success message with count
    """
    cls.__doc__ = """
    Perform bulk actions on notifications.

    Supports mark_read and delete actions on multiple notifications.
    """
    return cls


# Stats Documentation
def stats_docs(cls):
    """
    Documentation decorator for NotificationStatsView.

    GET: Get notification statistics for current manager
    - Returns: ManagerNotificationStatsSerializer
    """
    cls.__doc__ = """
    Get notification statistics for current user.

    Returns counts, breakdowns, and recent notifications.
    """
    return cls



