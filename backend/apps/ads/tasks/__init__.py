"""Public interface for Celery tasks of the ``ads`` app.

This package is intentionally minimal. It only re-exports the
notification tasks used by the rest of the codebase via::

    from apps.ads.tasks import notify_ad_status_changed

All analytics-related tasks live in the submodule
``apps.ads.tasks.analytics_tasks`` and are referenced there directly
by Celery beat and statistics views.
"""

from .moderation_notifications import notify_ad_status_changed, notify_bulk_status_changed

__all__ = [
    "notify_ad_status_changed",
    "notify_bulk_status_changed",
]
