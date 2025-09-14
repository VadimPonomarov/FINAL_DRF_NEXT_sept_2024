"""
URL patterns for AutoRia Clone - Car Sales Platform
Структура URL согласно требованиям клиента
"""
from django.urls import path, include
from .views.car_ad_views import (
    CarAdListView, CarAdCreateView, CarAdDetailView,
    CarAdUpdateView, CarAdDeleteView, MyCarAdsListView,
    car_ad_check_limits, car_ad_statistics, car_ad_analytics,
    cleanup_all_ads
)
from .views.reference_views import (
    CarMarkListCreateView, CarMarkRetrieveUpdateDestroyView,
    CarModelListCreateView, CarModelRetrieveUpdateDestroyView,
    CarColorListCreateView, CarColorRetrieveUpdateDestroyView,
    RegionListView, CityListView,
    car_marks_popular, car_marks_choices, car_models_by_mark,
    car_colors_popular, car_colors_choices, cities_by_region
)
from .views.favorites_toggle_view import toggle_favorite, check_favorite, FavoritesListView
from .views.statistics_view import (
    PlatformAnalyticsView, QuickStatsView, DailyReportView,
    AnalyticsTaskStatusView
)

urlpatterns = [
    # =============================================================================
    # ОБЪЯВЛЕНИЯ О ПРОДАЖЕ АВТОМОБИЛЕЙ
    # =============================================================================

    # Специальные endpoints для тестирования (должны быть ПЕРВЫМИ!)
    path('cars/cleanup-all', cleanup_all_ads, name='cleanup-all-ads'),

    # Основные операции с объявлениями
    path('cars/', CarAdListView.as_view(), name='car-ads-list'),
    path('cars/create/', CarAdCreateView.as_view(), name='car-ads-create'),
    path('cars/<int:pk>/', CarAdDetailView.as_view(), name='car-ads-detail'),
    path('cars/<int:pk>/update', CarAdUpdateView.as_view(), name='car-ads-update'),
    path('cars/<int:pk>/delete', CarAdDeleteView.as_view(), name='car-ads-delete'),

    # Мои объявления
    path('cars/my', MyCarAdsListView.as_view(), name='my-car-ads'),

    # Проверка лимитов аккаунта (базовый = 1 объявление, премиум = без лимитов)
    path('cars/check-limits/', car_ad_check_limits, name='car-ads-check-limits'),

    # Общая статистика платформы
    path('cars/statistics', car_ad_statistics, name='car-ads-statistics'),

    # Аналитика платформы (кешированная)
    path('statistics/', PlatformAnalyticsView.as_view(), name='platform-analytics'),
    path('statistics/quick/', QuickStatsView.as_view(), name='quick-stats'),
    path('statistics/daily/', DailyReportView.as_view(), name='daily-report'),
    path('statistics/task/<str:task_id>/', AnalyticsTaskStatusView.as_view(), name='analytics-task-status'),

    # Аналитика объявления (только для премиум аккаунтов)
    path('cars/<int:pk>/analytics', car_ad_analytics, name='car-ads-analytics'),

    # =============================================================================
    # ИЗБРАННЫЕ ОБЪЯВЛЕНИЯ
    # =============================================================================

    # Список избранных объявлений
    path('favorites/', FavoritesListView.as_view(), name='favorites-list'),

    # Добавить/удалить объявление из избранного
    path('favorites/toggle/', toggle_favorite, name='favorites-toggle'),

    # Проверить, находится ли объявление в избранном
    path('favorites/check/<int:car_ad_id>/', check_favorite, name='favorites-check'),



    # =============================================================================
    # СПРАВОЧНЫЕ ДАННЫЕ
    # =============================================================================

    # Марки автомобилей (BMW, Toyota, Daewoo и т.д.)
    path('reference/marks/', CarMarkListCreateView.as_view(), name='car-marks-list'),
    path('reference/car-marks/<int:pk>/', CarMarkRetrieveUpdateDestroyView.as_view(), name='car-marks-detail'),
    path('reference/car-marks/popular', car_marks_popular, name='car-marks-popular'),
    path('reference/car-marks/choices', car_marks_choices, name='car-marks-choices'),

    # Модели автомобилей (X5, Camry, Lanos и т.д.)
    path('reference/car-models/', CarModelListCreateView.as_view(), name='car-models-list'),
    path('reference/car-models/<int:pk>/', CarModelRetrieveUpdateDestroyView.as_view(), name='car-models-detail'),
    path('reference/car-models/by-mark', car_models_by_mark, name='car-models-by-mark'),

    # Цвета автомобилей
    path('reference/car-colors/', CarColorListCreateView.as_view(), name='car-colors-list'),
    path('reference/car-colors/<int:pk>/', CarColorRetrieveUpdateDestroyView.as_view(), name='car-colors-detail'),
    path('reference/car-colors/popular', car_colors_popular, name='car-colors-popular'),
    path('reference/car-colors/choices', car_colors_choices, name='car-colors-choices'),

    # Регионы и города Украины
    path('reference/regions/', RegionListView.as_view(), name='regions-list'),
    path('reference/cities/', CityListView.as_view(), name='cities-list'),
    path('reference/cities/by-region', cities_by_region, name='cities-by-region'),

    # =============================================================================
    # АНАЛИТИКА И ТРЕКИНГ
    # =============================================================================
    path('analytics/', include('apps.ads.urls.analytics_urls')),
]
