"""
URLs для аналитики и трекинга
"""
from django.urls import path
from ..views.analytics_tracking_views import (
    TrackPageViewAPI, TrackAdInteractionAPI, TrackAdViewDetailAPI,
    TrackSearchQueryAPI, UpdatePageViewMetricsAPI, GetAdAnalyticsAPI,
    GetAdAnalyticsForCardAPI, TrackPhoneViewAPI, ResetAdCountersAPI
)
from ..views.search_analytics_view import SearchAnalyticsSeriesAPI
from ..views.analytics_api_extras import LLMMarketInsightsAPI, AnalyticsDashboardAPI, ForecastSeriesAPI


# Analytics tracking URL patterns
urlpatterns = [
    # Трекинг событий
    path('track/page-view/', TrackPageViewAPI.as_view(), name='track_page_view'),
    path('track/ad-interaction/', TrackAdInteractionAPI.as_view(), name='track_ad_interaction'),
    path('track/ad-view-detail/', TrackAdViewDetailAPI.as_view(), name='track_ad_view_detail'),
    path('track/search-query/', TrackSearchQueryAPI.as_view(), name='track_search_query'),
    path('track/update-page-metrics/', UpdatePageViewMetricsAPI.as_view(), name='update_page_metrics'),
    path('track/phone-view/', TrackPhoneViewAPI.as_view(), name='track_phone_view'),

    # Получение/сброс аналитики
    path('ad/<int:ad_id>/', GetAdAnalyticsAPI.as_view(), name='get_ad_analytics'),

    # Поисковая аналитика (серии для вкладки)
    path('search/series/', SearchAnalyticsSeriesAPI.as_view(), name='search_analytics_series'),

    # Дополнительные API для аналитики и инсайтов
    path('search/insights/', LLMMarketInsightsAPI.as_view(), name='search_analytics_insights'),
    path('dashboard/', AnalyticsDashboardAPI.as_view(), name='analytics_dashboard'),
    path('forecast/', ForecastSeriesAPI.as_view(), name='analytics_forecast'),

    path('ad/<int:ad_id>/card/', GetAdAnalyticsForCardAPI.as_view(), name='get_ad_analytics_for_card'),
    path('ad/reset-counters/', ResetAdCountersAPI.as_view(), name='reset_ad_counters'),
]
