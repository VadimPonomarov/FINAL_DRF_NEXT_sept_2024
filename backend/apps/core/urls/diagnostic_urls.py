"""
Diagnostic URLs - separate from business logic
Follows clean architecture principles
"""
from django.urls import path
from ..views.diagnostic_views import system_diagnostic

app_name = 'diagnostic'

urlpatterns = [
    path('system/', system_diagnostic, name='system-diagnostic'),
]
