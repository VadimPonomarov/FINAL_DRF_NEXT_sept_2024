"""
Documentation for Manager Settings views.
"""
from apps.moderation.serializers import ManagerNotificationSettingsSerializer
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi


# Manager Settings List View Documentation
manager_settings_list_docs = swagger_auto_schema(
    operation_summary="👥 Manager Settings List",
    operation_description="List and create manager notification settings. Superusers see all settings, staff users see only their own.",
    tags=['🛡️ Moderation'],
    responses={
        200: openapi.Response(
            description='List of manager notification settings',
            schema=ManagerNotificationSettingsSerializer(many=True)
        ),
        401: openapi.Response(description='Authentication required'),
        403: openapi.Response(description='Permission denied')
    }
)

manager_settings_create_docs = swagger_auto_schema(
    operation_summary="👥 Create Manager Settings",
    operation_description="Create new notification settings for a manager.",
    tags=['🛡️ Moderation'],
    request_body=ManagerNotificationSettingsSerializer,
    responses={
        201: openapi.Response(
            description='Manager settings created successfully',
            schema=ManagerNotificationSettingsSerializer
        ),
        400: openapi.Response(description='Invalid data'),
        401: openapi.Response(description='Authentication required'),
        403: openapi.Response(description='Permission denied')
    }
)


# Manager Settings Detail View Documentation
manager_settings_detail_docs = swagger_auto_schema(
    operation_summary="👥 Manager Settings Detail",
    operation_description="Retrieve manager notification settings by ID.",
    tags=['🛡️ Moderation'],
    responses={
        200: openapi.Response(
            description='Manager settings details',
            schema=ManagerNotificationSettingsSerializer
        ),
        401: openapi.Response(description='Authentication required'),
        403: openapi.Response(description='Permission denied'),
        404: openapi.Response(description='Settings not found')
    }
)

manager_settings_update_docs = swagger_auto_schema(
    operation_summary="👥 Update Manager Settings",
    operation_description="Update manager notification settings.",
    tags=['🛡️ Moderation'],
    request_body=ManagerNotificationSettingsSerializer,
    responses={
        200: openapi.Response(
            description='Manager settings updated successfully',
            schema=ManagerNotificationSettingsSerializer
        ),
        400: openapi.Response(description='Invalid data'),
        401: openapi.Response(description='Authentication required'),
        403: openapi.Response(description='Permission denied'),
        404: openapi.Response(description='Settings not found')
    }
)

manager_settings_delete_docs = swagger_auto_schema(
    operation_summary="👥 Delete Manager Settings",
    operation_description="Delete manager notification settings.",
    tags=['🛡️ Moderation'],
    responses={
        204: openapi.Response(description='Manager settings deleted successfully'),
        401: openapi.Response(description='Authentication required'),
        403: openapi.Response(description='Permission denied'),
        404: openapi.Response(description='Settings not found')
    }
)


# My Settings View Documentation
def my_settings_docs(cls):
    """
    Documentation decorator for MyNotificationSettingsView.

    GET: Get my notification settings
    - Returns current user's notification settings
    - Only managers can access
    - Returns: ManagerNotificationSettingsSerializer

    POST: Update my notification settings
    - Updates current user's notification settings
    - Only managers can update
    - Request: ManagerNotificationSettingsSerializer
    - Returns: Updated ManagerNotificationSettingsSerializer
    """
    cls.__doc__ = """
    Get and update current user's notification settings.

    Only staff users (managers) can access this endpoint.
    """
    return cls
