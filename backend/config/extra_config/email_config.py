"""
Email configuration for Django application.
Centralized email settings for different environments and providers.
"""

import os


def get_email_config():
    """Get email configuration based on environment variables."""
    email_backend = os.getenv('EMAIL_BACKEND', 'console')
    
    if email_backend == 'smtp':
        return {
            'BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
            'HOST': os.getenv('EMAIL_HOST', 'smtp.gmail.com'),
            'PORT': int(os.getenv('EMAIL_PORT', 587)),
            'USE_TLS': os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true',
            'USE_SSL': os.getenv('EMAIL_USE_SSL', 'false').lower() == 'true',
            'HOST_USER': os.getenv('EMAIL_HOST_USER', ''),
            'HOST_PASSWORD': os.getenv('EMAIL_HOST_PASSWORD', ''),
        }
    elif email_backend == 'sendgrid':
        return {
            'BACKEND': 'sendgrid_backend.SendgridBackend',
            'API_KEY': os.getenv('SENDGRID_API_KEY', ''),
        }
    elif email_backend == 'console':
        return {
            'BACKEND': 'django.core.mail.backends.console.EmailBackend',
        }
    elif email_backend == 'file':
        return {
            'BACKEND': 'django.core.mail.backends.filebased.EmailBackend',
            'FILE_PATH': os.getenv('EMAIL_FILE_PATH', 'emails'),
        }
    else:
        # Default to console for development
        return {
            'BACKEND': 'django.core.mail.backends.console.EmailBackend',
        }


# Get email configuration
email_config = get_email_config()

# Email backend settings
EMAIL_BACKEND = email_config['BACKEND']

# SMTP settings (if using SMTP)
if 'HOST' in email_config:
    EMAIL_HOST = email_config['HOST']
    EMAIL_PORT = email_config['PORT']
    EMAIL_USE_TLS = email_config['USE_TLS']
    EMAIL_USE_SSL = email_config['USE_SSL']
    EMAIL_HOST_USER = email_config['HOST_USER']
    EMAIL_HOST_PASSWORD = email_config['HOST_PASSWORD']
else:
    # Set defaults for non-SMTP backends
    EMAIL_HOST = None
    EMAIL_PORT = None
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = False
    EMAIL_HOST_USER = None
    EMAIL_HOST_PASSWORD = None

# SendGrid settings (if using SendGrid)
if 'API_KEY' in email_config:
    SENDGRID_API_KEY = email_config['API_KEY']
else:
    SENDGRID_API_KEY = None

# File backend settings (if using file backend)
if 'FILE_PATH' in email_config:
    EMAIL_FILE_PATH = email_config['FILE_PATH']
else:
    EMAIL_FILE_PATH = None

# Email addresses
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@carsales.com')
SERVER_EMAIL = os.getenv('SERVER_EMAIL', DEFAULT_FROM_EMAIL)
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@carsales.com')

# Email templates settings
EMAIL_TEMPLATES = {
    'WELCOME': 'emails/welcome.html',
    'PASSWORD_RESET': 'emails/password_reset.html',
    'ACCOUNT_ACTIVATION': 'emails/account_activation.html',
    'ORDER_CONFIRMATION': 'emails/order_confirmation.html',
    'NOTIFICATION': 'emails/notification.html',
}

# Email subjects
EMAIL_SUBJECTS = {
    'WELCOME': 'Welcome to Car Sales Platform',
    'PASSWORD_RESET': 'Password Reset Request',
    'ACCOUNT_ACTIVATION': 'Activate Your Account',
    'ORDER_CONFIRMATION': 'Order Confirmation',
    'NOTIFICATION': 'Notification from Car Sales Platform',
}

# Email settings
EMAIL_TIMEOUT = 30  # seconds
EMAIL_USE_LOCALTIME = False

# Celery email settings (for async email sending)
EMAIL_USE_CELERY = os.getenv('EMAIL_USE_CELERY', 'false').lower() == 'true'
EMAIL_CELERY_TASK_CONFIG = {
    'name': 'send_email',
    'retry_delay': 60,  # 1 minute
    'max_retries': 3,
}

# Export all email settings
__all__ = [
    'EMAIL_BACKEND',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USE_TLS',
    'EMAIL_USE_SSL',
    'EMAIL_HOST_USER',
    'EMAIL_HOST_PASSWORD',
    'SENDGRID_API_KEY',
    'EMAIL_FILE_PATH',
    'DEFAULT_FROM_EMAIL',
    'SERVER_EMAIL',
    'ADMIN_EMAIL',
    'EMAIL_TEMPLATES',
    'EMAIL_SUBJECTS',
    'EMAIL_TIMEOUT',
    'EMAIL_USE_LOCALTIME',
    'EMAIL_USE_CELERY',
    'EMAIL_CELERY_TASK_CONFIG',
]
