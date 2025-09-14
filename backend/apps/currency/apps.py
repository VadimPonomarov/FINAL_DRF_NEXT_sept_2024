"""
Currency app configuration
"""
from django.apps import AppConfig


class CurrencyConfig(AppConfig):
    """
    Configuration for the Currency application
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.currency'
    verbose_name = 'Currency Exchange'
    
    def ready(self):
        """
        Perform initialization when the app is ready
        """
        # Import signals if any
        # from . import signals
        pass
