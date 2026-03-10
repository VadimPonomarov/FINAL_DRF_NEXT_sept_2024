"""
Diagnostic views for debugging and monitoring
Follows clean architecture - separate from business logic
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from django.apps import apps


@api_view(['GET'])
def system_diagnostic(request):
    """
    Diagnostic endpoint to check installed apps and debug info
    Separated from business logic - follows clean architecture
    """
    try:
        installed_apps = list(settings.INSTALLED_APPS)
        app_configs = []
        
        for app_name in installed_apps:
            try:
                app_config = apps.get_app_config(app_name.split('.')[-1])
                app_configs.append({
                    'name': app_config.name,
                    'verbose_name': str(app_config.verbose_name),
                    'label': app_config.label,
                    'models': [model._meta.model_name for model in app_config.get_models()]
                })
            except:
                app_configs.append({
                    'name': app_name,
                    'error': 'Failed to load app config'
                })
        
        # Check specifically for chat app
        chat_app_loaded = 'apps.chat' in installed_apps
        
        return Response({
            'installed_apps': installed_apps,
            'app_configs': app_configs,
            'chat_app_loaded': chat_app_loaded,
            'django_version': settings.__dict__.get('VERSION', 'unknown'),
            'debug_mode': getattr(settings, 'DEBUG', False)
        })
    except Exception as e:
        return Response({
            'error': str(e),
            'installed_apps_count': len(settings.INSTALLED_APPS) if hasattr(settings, 'INSTALLED_APPS') else 0
        }, status=500)
