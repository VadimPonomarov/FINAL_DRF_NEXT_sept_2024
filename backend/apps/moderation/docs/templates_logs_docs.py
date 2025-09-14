"""
Swagger documentation for Templates and Logs views.
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from apps.moderation.serializers import NotificationTemplateSerializer, NotificationLogSerializer


# Notification Templates Documentation
def template_list_docs(cls):
    """
    Documentation decorator for NotificationTemplateListView.

    GET: List notification templates
    - Superusers see all templates, others see only active ones
    - Returns: List of NotificationTemplateSerializer

    POST: Create notification template
    - Only superusers can create templates
    - Request: NotificationTemplateSerializer
    - Returns: Created NotificationTemplateSerializer
    """
    cls.__doc__ = """
    List and create notification templates.

    GET: Returns list of templates based on user permissions.
    POST: Creates new template (superuser only).
    """
    return cls


def template_detail_docs(cls):
    """
    Documentation decorator for NotificationTemplateDetailView.

    GET: Retrieve notification template by ID
    - Returns: NotificationTemplateSerializer

    PUT/PATCH: Update notification template
    - Only superusers can update templates
    - Request: NotificationTemplateSerializer
    - Returns: Updated NotificationTemplateSerializer

    DELETE: Delete notification template
    - Only superusers can delete templates
    - Returns: 204 No Content
    """
    cls.__doc__ = """
    Retrieve, update or delete notification template.

    All operations require authentication.
    Update/Delete operations require superuser permissions.
    """
    return cls


# Notification Logs Documentation
def log_list_docs(cls):
    """
    Documentation decorator for NotificationLogListView.

    GET: List notification logs
    - Superusers see all logs
    - Managers see only logs for their notifications
    - Returns: List of NotificationLogSerializer
    """
    cls.__doc__ = """
    List notification logs.

    Returns logs based on user permissions.
    Read-only endpoint.
    """
    return cls


def log_detail_docs(cls):
    """
    Documentation decorator for NotificationLogDetailView.

    GET: Retrieve notification log by ID
    - Returns: NotificationLogSerializer
    - Access based on user permissions
    """
    cls.__doc__ = """
    Retrieve notification log details.

    Returns specific log based on user permissions.
    Read-only endpoint.
    """
    return cls
