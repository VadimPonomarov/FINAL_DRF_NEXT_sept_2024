"""
URL маршруты для курсов валют
"""
from django.urls import path
from . import views

app_name = 'currency'

urlpatterns = [
    # Список всех курсов
    path('rates/', views.CurrencyRateListView.as_view(), name='rates-list'),
    
    # Получить курс для конкретной пары валют
    path('rates/<str:base_currency>/<str:target_currency>/', 
         views.get_currency_rate, name='get-rate'),
    
    # Конвертация валют
    path('convert/', views.convert_currency, name='convert'),
    
    # Принудительное обновление курса
    path('update/<str:base_currency>/<str:target_currency>/', 
         views.update_currency_rate, name='update-rate'),
    
    # Статус системы курсов
    path('status/', views.currency_status, name='status'),
    
    # История обновлений
    path('logs/', views.CurrencyUpdateLogListView.as_view(), name='update-logs'),
]
