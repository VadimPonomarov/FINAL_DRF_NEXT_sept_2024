# Временно отключаем импорт Celery для создания приложения
# from .celery import app as celery_app
# __all__ = ('celery_app',)

# Устанавливаем настройки Django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')