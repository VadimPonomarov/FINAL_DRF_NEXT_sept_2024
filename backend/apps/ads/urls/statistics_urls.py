"""
Statistics and Analytics URLs for ads app
"""
from django.urls import path
from ..views.statistics_view import (
    PlatformAnalyticsView, QuickStatsView, DailyReportView,
    AnalyticsTaskStatusView
)
from ..views.user_analytics_view import (
    UserAnalyticsView, UserInsightsView
)

# Statistics URL patterns
urlpatterns = [
    # Platform analytics
    path('quick/', QuickStatsView.as_view(), name='quick_stats'),
    path('', PlatformAnalyticsView.as_view(), name='platform_analytics'),
    path('daily-report/', DailyReportView.as_view(), name='daily_report'),
    path('task-status/<str:task_id>/', AnalyticsTaskStatusView.as_view(), name='analytics_task_status'),

    # User personal analytics
    path('user/', UserAnalyticsView.as_view(), name='user_analytics'),
    path('user/insights/', UserInsightsView.as_view(), name='user_insights'),
]


# Mock URLs (раскомментировать если основные views не работают):
# path('', MockStatisticsView.as_view(), name='admin_statistics_mock'),
# path('daily-report/', MockDailyReportView.as_view(), name='daily_report_mock'),
