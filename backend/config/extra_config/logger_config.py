import os
from pathlib import Path

from loguru import logger

log_directory = os.environ.get("LOG_DIRECTORY", "./logs")
os.makedirs(log_directory, exist_ok=True)

enable_logging = (
        os.environ.get("ENABLE_LOGGING", "True").lower()
        not in ["false", "0", "no"]
)
if not enable_logging:
    logger.disable("")

else:
    logger.add(
        os.path.join(log_directory, "app.log"),
        level=os.environ.get("LOG_LEVEL", "TRACE"),
        format="{time:YYYY-MM-DD at HH:mm:ss} | {level} | {message}",
        rotation="10 MB",
        compression="zip",
    )

# Django LOGGING configuration
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'security': {
            'format': '{levelname} {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'django.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'security.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'security',
        },
        'auth_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'auth.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'security',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'security.auth': {
            'handlers': ['auth_file', 'security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django_ratelimit': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
