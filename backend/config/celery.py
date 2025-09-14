import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('drf-lessons')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Configure periodic tasks
app.conf.beat_schedule = {
    # Clean generated media files weekly (Sunday at 3:00 AM)
    'clean-generated-media-weekly': {
        'task': 'clean_generated_media',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
        'args': (7,),  # Keep files for 7 days
    },

    # Clean blacklisted tokens daily (at 2:00 AM)
    'clean-blacklisted-tokens-daily': {
        'task': 'clean_blacklisted_tokens',
        'schedule': crontab(hour=2, minute=0),
        'args': (30,),  # Keep tokens for 30 days after expiration
    },

    # Clean temporary files daily (at 4:00 AM)
    'clean-temp-files-daily': {
        'task': 'clean_temp_files',
        'schedule': crontab(hour=4, minute=0),
        'args': (7,),  # Keep files for 7 days
    },

    # Currency rates updates
    'update-currency-rates-daily': {
        'task': 'apps.currency.tasks.update_currency_rates_daily',
        'schedule': crontab(hour=8, minute=0),  # Daily at 8:00 AM
        'kwargs': {'source': 'NBU'}
    },

    'update-currency-rates-backup': {
        'task': 'apps.currency.tasks.update_currency_rates_daily',
        'schedule': crontab(hour=14, minute=0),  # Backup update at 2:00 PM
        'kwargs': {'source': 'PRIVATBANK'}
    },

    'cleanup-old-currency-rates': {
        'task': 'apps.currency.tasks.cleanup_old_currency_rates',
        'schedule': crontab(hour=3, minute=0),  # Daily cleanup at 3:00 AM
        'kwargs': {'days_to_keep': 30}
    },

    # Clean chat temporary files hourly
    'cleanup-chat-temp-files-hourly': {
        'task': 'cleanup_chat_temp_files',
        'schedule': crontab(minute=0),  # Every hour at minute 0
        'args': (),
    },

    # Analytics tasks
    'generate-quick-stats-every-15min': {
        'task': 'apps.ads.tasks.analytics_tasks.generate_quick_stats',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },

    'generate-platform-analytics-hourly': {
        'task': 'apps.ads.tasks.analytics_tasks.generate_analytics_for_all_locales',
        'schedule': crontab(minute=0),  # Every hour
    },

    'generate-daily-report': {
        'task': 'apps.ads.tasks.analytics_tasks.generate_daily_report',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9:00 AM
    },

    'cleanup-analytics-cache-daily': {
        'task': 'apps.ads.tasks.analytics_tasks.cleanup_old_analytics_cache',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1:00 AM
    },
}

# Optional configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
