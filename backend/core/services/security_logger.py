"""
Security logging service for monitoring authentication events and suspicious activity.
"""

import logging
from typing import Optional, Dict, Any
from django.http import HttpRequest
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

User = get_user_model()

# Get security loggers
security_logger = logging.getLogger('security')
auth_logger = logging.getLogger('security.auth')
ratelimit_logger = logging.getLogger('security.ratelimit')


class SecurityLogger:
    """Service for logging security events."""
    
    @staticmethod
    def get_client_info(request: HttpRequest) -> Dict[str, Any]:
        """Extract client information from request."""
        return {
            'ip_address': SecurityLogger.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
            'referer': request.META.get('HTTP_REFERER', ''),
            'method': request.method,
            'path': request.path,
            'timestamp': timezone.now().isoformat(),
        }
    
    @staticmethod
    def get_client_ip(request: HttpRequest) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'Unknown')
        return ip
    
    @staticmethod
    def log_login_success(request: HttpRequest, user: User) -> None:
        """Log successful login attempt."""
        if not getattr(settings, 'SECURITY_MONITORING', {}).get('LOG_SUCCESSFUL_LOGINS', True):
            return
            
        client_info = SecurityLogger.get_client_info(request)
        auth_logger.info(
            f"LOGIN_SUCCESS: User {user.email} (ID: {user.id}) logged in successfully",
            extra={
                'event_type': 'login_success',
                'user_id': user.id,
                'user_email': user.email,
                **client_info
            }
        )
    
    @staticmethod
    def log_login_failed(request: HttpRequest, email: str, reason: str = 'Invalid credentials') -> None:
        """Log failed login attempt."""
        client_info = SecurityLogger.get_client_info(request)
        auth_logger.warning(
            f"LOGIN_FAILED: Failed login attempt for {email} - {reason}",
            extra={
                'event_type': 'login_failed',
                'email': email,
                'reason': reason,
                **client_info
            }
        )
    
    @staticmethod
    def log_registration(request: HttpRequest, user: User) -> None:
        """Log user registration."""
        client_info = SecurityLogger.get_client_info(request)
        auth_logger.info(
            f"REGISTRATION: New user registered - {user.email} (ID: {user.id})",
            extra={
                'event_type': 'registration',
                'user_id': user.id,
                'user_email': user.email,
                **client_info
            }
        )
    
    @staticmethod
    def log_logout(request: HttpRequest, user: Optional[User] = None) -> None:
        """Log user logout."""
        client_info = SecurityLogger.get_client_info(request)
        user_info = f"{user.email} (ID: {user.id})" if user else "Unknown user"
        auth_logger.info(
            f"LOGOUT: User {user_info} logged out",
            extra={
                'event_type': 'logout',
                'user_id': user.id if user else None,
                'user_email': user.email if user else None,
                **client_info
            }
        )
    
    @staticmethod
    def log_token_refresh(request: HttpRequest, user: User) -> None:
        """Log token refresh (if enabled)."""
        if not getattr(settings, 'SECURITY_MONITORING', {}).get('LOG_TOKEN_REFRESH', False):
            return
            
        client_info = SecurityLogger.get_client_info(request)
        auth_logger.info(
            f"TOKEN_REFRESH: User {user.email} (ID: {user.id}) refreshed token",
            extra={
                'event_type': 'token_refresh',
                'user_id': user.id,
                'user_email': user.email,
                **client_info
            }
        )
    
    @staticmethod
    def log_rate_limit_exceeded(request: HttpRequest, limit_type: str = 'general') -> None:
        """Log rate limit exceeded."""
        client_info = SecurityLogger.get_client_info(request)
        ratelimit_logger.warning(
            f"RATE_LIMIT_EXCEEDED: Rate limit exceeded for {limit_type}",
            extra={
                'event_type': 'rate_limit_exceeded',
                'limit_type': limit_type,
                **client_info
            }
        )
    
    @staticmethod
    def log_permission_denied(request: HttpRequest, user: Optional[User], resource: str) -> None:
        """Log permission denied access."""
        client_info = SecurityLogger.get_client_info(request)
        user_info = f"{user.email} (ID: {user.id})" if user else "Anonymous user"
        security_logger.warning(
            f"PERMISSION_DENIED: {user_info} denied access to {resource}",
            extra={
                'event_type': 'permission_denied',
                'user_id': user.id if user else None,
                'user_email': user.email if user else None,
                'resource': resource,
                **client_info
            }
        )
    
    @staticmethod
    def log_suspicious_activity(request: HttpRequest, activity_type: str, details: str) -> None:
        """Log suspicious activity."""
        client_info = SecurityLogger.get_client_info(request)
        security_logger.error(
            f"SUSPICIOUS_ACTIVITY: {activity_type} - {details}",
            extra={
                'event_type': 'suspicious_activity',
                'activity_type': activity_type,
                'details': details,
                **client_info
            }
        )
    
    @staticmethod
    def log_invalid_token(request: HttpRequest, token_type: str = 'JWT') -> None:
        """Log invalid token usage."""
        client_info = SecurityLogger.get_client_info(request)
        security_logger.warning(
            f"INVALID_TOKEN: Invalid {token_type} token used",
            extra={
                'event_type': 'invalid_token',
                'token_type': token_type,
                **client_info
            }
        )


# Convenience functions
def log_login_success(request: HttpRequest, user: User) -> None:
    """Convenience function for logging successful login."""
    SecurityLogger.log_login_success(request, user)


def log_login_failed(request: HttpRequest, email: str, reason: str = 'Invalid credentials') -> None:
    """Convenience function for logging failed login."""
    SecurityLogger.log_login_failed(request, email, reason)


def log_registration(request: HttpRequest, user: User) -> None:
    """Convenience function for logging user registration."""
    SecurityLogger.log_registration(request, user)


def log_logout(request: HttpRequest, user: Optional[User] = None) -> None:
    """Convenience function for logging user logout."""
    SecurityLogger.log_logout(request, user)


def log_rate_limit_exceeded(request: HttpRequest, limit_type: str = 'general') -> None:
    """Convenience function for logging rate limit exceeded."""
    SecurityLogger.log_rate_limit_exceeded(request, limit_type)


def log_permission_denied(request: HttpRequest, user: Optional[User], resource: str) -> None:
    """Convenience function for logging permission denied."""
    SecurityLogger.log_permission_denied(request, user, resource)


def log_suspicious_activity(request: HttpRequest, activity_type: str, details: str) -> None:
    """Convenience function for logging suspicious activity."""
    SecurityLogger.log_suspicious_activity(request, activity_type, details)
