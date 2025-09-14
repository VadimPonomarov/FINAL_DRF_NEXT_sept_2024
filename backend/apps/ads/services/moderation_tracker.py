import logging
from typing import Optional, Dict, List, Tuple
from django.db.models import Q, Count
from django.utils import timezone
from django.conf import settings

from ..models import AdModerationLog, CarAd, AdStatistics
from core.enums.ads import AdStatusEnum

logger = logging.getLogger(__name__)

class ModerationTracker:
    """
    Service for tracking ad moderation attempts using log entries.
    This replaces the counter-based approach with a more robust logging system.
    """
    
    # Actions that count as moderation attempts
    MODERATION_ACTIONS = [
        AdModerationLog.ModerationAction.AUTO_REJECTED,
        AdModerationLog.ModerationAction.REJECTED,
    ]
    
    # Time window for considering moderation attempts (in days)
    MODERATION_WINDOW_DAYS = 30
    
    @classmethod
    def get_moderation_attempts(cls, ad: CarAd) -> List[AdModerationLog]:
        """
        Get all moderation attempts for an ad within the moderation window.
        
        Args:
            ad: The CarAd instance
            
        Returns:
            List of AdModerationLog entries representing moderation attempts
        """
        cutoff_date = timezone.now() - timezone.timedelta(days=cls.MODERATION_WINDOW_DAYS)
        
        return AdModerationLog.objects.filter(
            ad=ad,
            action__in=cls.MODERATION_ACTIONS,
            created_at__gte=cutoff_date
        ).order_by('created_at')
    
    @classmethod
    def get_moderation_attempts_count(cls, ad: CarAd) -> int:
        """
        Get the number of moderation attempts for an ad within the moderation window.
        
        Args:
            ad: The CarAd instance
            
        Returns:
            Number of moderation attempts
        """
        return len(cls.get_moderation_attempts(ad))
    
    @classmethod
    def has_exceeded_attempts_limit(cls, ad: CarAd, max_attempts: int = 3) -> bool:
        """
        Check if an ad has exceeded the maximum number of moderation attempts.
        
        Args:
            ad: The CarAd instance
            max_attempts: Maximum allowed attempts before considering it exceeded
            
        Returns:
            bool: True if attempts exceeded, False otherwise
        """
        # First check if we have stats (faster than counting logs)
        try:
            stats = AdStatistics.objects.get(car_ad=ad)
            if stats.moderation_attempts >= max_attempts:
                return True
        except AdStatistics.DoesNotExist:
            pass
            
        # Fallback to log-based counting if needed
        return cls.get_moderation_attempts_count(ad) >= max_attempts
    
    @classmethod
    def log_moderation_attempt(
        cls,
        ad: CarAd,
        action: str,
        reason: Optional[str] = None,
        details: Optional[Dict] = None,
        moderator: Optional[settings.AUTH_USER_MODEL] = None
    ) -> AdModerationLog:
        # Update statistics
        stats, _ = AdStatistics.objects.get_or_create(car_ad=ad)
        stats.record_moderation_attempt()
        """
        Log a moderation attempt for an ad.
        
        Args:
            ad: The CarAd being moderated
            action: The moderation action (from AdModerationLog.ModerationAction)
            reason: Optional reason for the action
            details: Optional additional details
            moderator: Optional user who performed the action
            
        Returns:
            The created AdModerationLog instance
        """
        log_entry = AdModerationLog.objects.create(
            ad=ad,
            action=action,
            status=ad.status,
            reason=reason,
            details=details or {},
            moderated_by=moderator
        )
        
        logger.info(
            f"Logged moderation action: {action} for ad {ad.id} "
            f"(Status: {ad.status}, Reason: {reason})"
        )
        
        return log_entry
    
    @classmethod
    def get_moderation_status(cls, ad: CarAd) -> Dict:
        """
        Get the moderation status of an ad.
        
        Args:
            ad: The CarAd instance
            
        Returns:
            Dict containing moderation status information
        """
        attempts = cls.get_moderation_attempts(ad)
        
        return {
            'attempts': len(attempts),
            'last_attempt': attempts[0].created_at if attempts else None,
            'needs_review': any(
                log.action == AdModerationLog.ModerationAction.FLAGGED 
                for log in attempts
            ),
            'is_blocked': cls.has_exceeded_attempts_limit(ad),
            'history': [
                {
                    'action': log.action,
                    'status': log.status,
                    'reason': log.reason,
                    'timestamp': log.created_at,
                    'moderator': log.moderated_by.get_full_name() if log.moderated_by else None
                }
                for log in attempts
            ]
        }
    
    @classmethod
    def reset_moderation_attempts(cls, ad: CarAd) -> None:
        """
        Reset moderation attempts for an ad by archiving existing logs.
        This is typically called when an ad is approved.
        
        Args:
            ad: The CarAd instance
        """
        # Archive old moderation logs by updating their status
        AdModerationLog.objects.filter(ad=ad).update(
            status=f"archived_{ad.status}",
            details=models.F('details') | {
                'archived_at': timezone.now().isoformat(),
                'archive_reason': 'moderation_reset_after_approval'
            }
        )
        
        logger.info(f"Reset moderation attempts for ad {ad.id}")
