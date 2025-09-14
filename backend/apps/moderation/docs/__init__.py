"""
Swagger documentation modules for moderation system.
"""
from .manager_settings_docs import (
    manager_settings_list_docs,
    manager_settings_detail_docs,
    my_settings_docs
)
from .notifications_docs import (
    notification_list_docs,
    notification_detail_docs,
    mark_read_docs,
    mark_multiple_read_docs,
    bulk_action_docs,
    stats_docs
)
from .templates_logs_docs import (
    template_list_docs,
    template_detail_docs,
    log_list_docs,
    log_detail_docs
)

__all__ = [
    # Manager Settings
    'manager_settings_list_docs',
    'manager_settings_detail_docs',
    'my_settings_docs',
    
    # Notifications
    'notification_list_docs',
    'notification_detail_docs',
    'mark_read_docs',
    'mark_multiple_read_docs',
    'bulk_action_docs',
    'stats_docs',
    
    # Templates & Logs
    'template_list_docs',
    'template_detail_docs',
    'log_list_docs',
    'log_detail_docs',
]
