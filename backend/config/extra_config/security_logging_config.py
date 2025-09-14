"""
Security logging and monitoring configuration.
"""

import os


def get_security_logging_config():
    """Get security logging configuration."""
    return {
        'ENABLED': os.getenv('SECURITY_LOGGING_ENABLED', 'true').lower() == 'true',
        'LOG_LEVEL': os.getenv('SECURITY_LOG_LEVEL', 'INFO'),
        'LOG_FILE': os.getenv('SECURITY_LOG_FILE', 'logs/security.log'),
        'MAX_LOG_SIZE': int(os.getenv('SECURITY_MAX_LOG_SIZE', 10 * 1024 * 1024)),  # 10MB
        'BACKUP_COUNT': int(os.getenv('SECURITY_BACKUP_COUNT', 5)),
        'LOG_FAILED_LOGINS': os.getenv('LOG_FAILED_LOGINS', 'true').lower() == 'true',
        'LOG_PERMISSION_DENIED': os.getenv('LOG_PERMISSION_DENIED', 'true').lower() == 'true',
        'LOG_SUSPICIOUS_ACTIVITY': os.getenv('LOG_SUSPICIOUS_ACTIVITY', 'true').lower() == 'true',
    }


def get_security_monitoring_config():
    """Get security monitoring configuration."""
    return {
        'ENABLED': os.getenv('SECURITY_MONITORING_ENABLED', 'true').lower() == 'true',
        'ALERT_EMAIL': os.getenv('SECURITY_ALERT_EMAIL', 'admin@example.com'),
        'FAILED_LOGIN_THRESHOLD': int(os.getenv('FAILED_LOGIN_THRESHOLD', 5)),
        'FAILED_LOGIN_WINDOW': int(os.getenv('FAILED_LOGIN_WINDOW', 300)),  # 5 minutes
        'RATE_LIMIT_THRESHOLD': int(os.getenv('RATE_LIMIT_THRESHOLD', 100)),
        'RATE_LIMIT_WINDOW': int(os.getenv('RATE_LIMIT_WINDOW', 3600)),  # 1 hour
        'SUSPICIOUS_IP_THRESHOLD': int(os.getenv('SUSPICIOUS_IP_THRESHOLD', 10)),
        'BLOCK_SUSPICIOUS_IPS': os.getenv('BLOCK_SUSPICIOUS_IPS', 'false').lower() == 'true',
    }


# Security logging configuration
SECURITY_LOGGING = get_security_logging_config()

# Security monitoring configuration
SECURITY_MONITORING = get_security_monitoring_config()
