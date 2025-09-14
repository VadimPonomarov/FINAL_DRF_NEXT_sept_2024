"""
Service for tracking ad views for analytics purposes.
"""
import logging
from typing import Optional
from django.utils import timezone
from django.contrib.sessions.models import Session

from ..models import AdViewModel, CarAd

logger = logging.getLogger(__name__)


class AdViewTracker:
    """
    Service for tracking ad views.
    
    Handles deduplication and analytics data collection.
    """
    
    @classmethod
    def track_view(
        cls,
        ad: CarAd,
        ip_address: str,
        user_agent: Optional[str] = None,
        referrer: Optional[str] = None,
        session_key: Optional[str] = None
    ) -> Optional[AdViewModel]:
        """
        Track a view for an ad.
        
        Args:
            ad: The CarAd being viewed
            ip_address: IP address of the viewer
            user_agent: User agent string
            referrer: Referrer URL
            session_key: Session key for deduplication
            
        Returns:
            AdViewModel instance if view was tracked, None if duplicate
        """
        try:
            # Check for duplicate views within the last hour from same IP/session
            if cls._is_duplicate_view(ad, ip_address, session_key):
                logger.debug(f"Duplicate view detected for ad {ad.id} from {ip_address}")
                return None
            
            # Create view record
            view = AdViewModel.objects.create(
                ad=ad,
                ip_address=ip_address,
                user_agent=user_agent[:1000] if user_agent else None,  # Truncate if too long
                referrer=referrer,
                session_key=session_key
            )
            
            logger.info(f"Tracked view for ad {ad.id} from {ip_address}")
            return view
            
        except Exception as e:
            logger.error(f"Error tracking view for ad {ad.id}: {e}")
            return None
    
    @classmethod
    def _is_duplicate_view(
        cls,
        ad: CarAd,
        ip_address: str,
        session_key: Optional[str] = None,
        hours: int = 24 * 30
    ) -> bool:
        """
        Check if this is a duplicate view within the specified time window.
        Default window is 30 days to enforce "one user/session — one view" policy.

        Args:
            ad: The CarAd being viewed
            ip_address: IP address of the viewer
            session_key: Session key for more accurate deduplication
            hours: Time window in hours to check for duplicates (default 30 days)

        Returns:
            True if duplicate view, False otherwise
        """
        cutoff_time = timezone.now() - timezone.timedelta(hours=hours)

        # Build query for duplicate detection
        query = AdViewModel.objects.filter(
            ad=ad,
            ip_address=ip_address,
            created_at__gte=cutoff_time
        )

        # If we have a session key, use it for more accurate deduplication
        if session_key:
            query = query.filter(session_key=session_key)

        return query.exists()
    
    @classmethod
    def get_view_count(cls, ad: CarAd) -> int:
        """
        Get total view count for an ad.
        
        Args:
            ad: The CarAd instance
            
        Returns:
            Total number of views
        """
        return ad.ad_views.count()
    
    @classmethod
    def get_unique_view_count(cls, ad: CarAd, days: int = 30) -> int:
        """
        Get unique view count for an ad within specified days.
        
        Args:
            ad: The CarAd instance
            days: Number of days to look back
            
        Returns:
            Number of unique views (by IP address)
        """
        cutoff_date = timezone.now() - timezone.timedelta(days=days)
        
        return (
            ad.ad_views
            .filter(created_at__gte=cutoff_date)
            .values('ip_address')
            .distinct()
            .count()
        )
    
    @classmethod
    def get_recent_views(cls, ad: CarAd, hours: int = 24) -> int:
        """
        Get view count for recent period.
        
        Args:
            ad: The CarAd instance
            hours: Number of hours to look back
            
        Returns:
            Number of views in the specified period
        """
        cutoff_time = timezone.now() - timezone.timedelta(hours=hours)
        
        return ad.ad_views.filter(created_at__gte=cutoff_time).count()
