"""
Service for handling account type limitations and restrictions.
"""
from typing import Dict, Any
from django.contrib.auth import get_user_model
from apps.accounts.models import AddsAccount
from core.enums.ads import AccountTypeEnum, AdStatusEnum

User = get_user_model()


class AccountLimitsService:
    """
    Service for checking and enforcing account type limitations.
    
    Business rules:
    - Basic accounts: maximum 1 active ad
    - Premium accounts: unlimited ads
    - Only ACTIVE, PENDING, and NEEDS_REVIEW ads count towards limits
    """
    
    # Account type limits
    LIMITS = {
        AccountTypeEnum.BASIC: 1,
        AccountTypeEnum.PREMIUM: None,  # None means unlimited
    }
    
    # Statuses that count towards ad limits
    ACTIVE_STATUSES = [
        AdStatusEnum.ACTIVE,
        AdStatusEnum.PENDING,
        AdStatusEnum.NEEDS_REVIEW
    ]
    
    @classmethod
    def can_create_ad(cls, user: User) -> Dict[str, Any]:
        """
        Check if user can create a new ad based on their account type.
        
        Args:
            user: User instance
            
        Returns:
            Dict with 'allowed' boolean and additional info
        """
        if not user or not user.is_authenticated:
            return {
                'allowed': False,
                'reason': 'User not authenticated',
                'code': 'NOT_AUTHENTICATED'
            }
        
        # Get user's account
        try:
            account = AddsAccount.objects.get(user=user)
        except AddsAccount.DoesNotExist:
            # If account doesn't exist, it will be created as BASIC
            return {
                'allowed': True,
                'reason': 'New account will be created',
                'account_type': AccountTypeEnum.BASIC,
                'current_ads': 0,
                'max_ads': cls.LIMITS[AccountTypeEnum.BASIC]
            }
        
        # Check account type limits
        account_type = account.account_type
        max_ads = cls.LIMITS.get(account_type)
        
        if max_ads is None:  # Unlimited (Premium)
            return {
                'allowed': True,
                'reason': 'Premium account has unlimited ads',
                'account_type': account_type,
                'current_ads': cls._get_active_ads_count(account),
                'max_ads': None
            }
        
        # Count current active ads
        current_ads = cls._get_active_ads_count(account)
        
        if current_ads >= max_ads:
            return {
                'allowed': False,
                'reason': f'{account_type} account can only have {max_ads} active ad(s)',
                'code': 'ACCOUNT_LIMIT_EXCEEDED',
                'account_type': account_type,
                'current_ads': current_ads,
                'max_ads': max_ads,
                'upgrade_message': 'Upgrade to premium for unlimited ads',
                'upgrade_url': '/accounts/upgrade/'
            }
        
        return {
            'allowed': True,
            'reason': f'Can create {max_ads - current_ads} more ad(s)',
            'account_type': account_type,
            'current_ads': current_ads,
            'max_ads': max_ads
        }
    
    @classmethod
    def _get_active_ads_count(cls, account: AddsAccount) -> int:
        """Get count of active ads for an account."""
        from ..models import CarAd
        
        return CarAd.objects.filter(
            account=account,
            status__in=cls.ACTIVE_STATUSES
        ).count()
