from datetime import timedelta
from django.db.models import Avg, Count, F, Q, Sum, Value, IntegerField
from django.db.models.functions import Trunc, TruncDate, TruncWeek, TruncMonth, Coalesce
from django.utils import timezone
from django.conf import settings

from core.enums.ads import AccountTypeEnum, AdStatusEnum


class AdAnalyticsService:
    """
    Service for providing analytics about car ads.
    Premium users get access to detailed analytics about their ads.
    """
    
    @classmethod
    def get_ad_analytics(cls, ad, user):
        """
        Get analytics for a specific ad.
        
        Args:
            ad: The CarAd instance to get analytics for
            user: The user requesting the analytics (for permission checks)
            
        Returns:
            dict: Analytics data for the ad
        """
        # Check if user has permission to view analytics for this ad
        if not user.is_authenticated or ad.account.user != user:
            return {"error": "You don't have permission to view analytics for this ad"}
        
        # Basic ad info
        result = {
            'ad_id': ad.id,
            'title': ad.title,
            'status': ad.status,
            'is_validated': ad.is_validated,
            'created_at': ad.created_at,
            'moderated_at': ad.moderated_at,
            'moderated_by': ad.moderated_by.get_full_name() if ad.moderated_by else 'Auto-moderation',
            'is_premium': ad.account.account_type == AccountTypeEnum.PREMIUM,
        }

        # Only include detailed analytics for premium accounts or superusers
        if ad.account.account_type != AccountTypeEnum.PREMIUM and not user.is_superuser:
            result['message'] = 'Upgrade to premium to view detailed analytics'
            return result
        
        # Get view counts
        view_data = cls._get_view_analytics(ad)
        result.update(view_data)
        
        # Get price comparison data
        price_data = cls._get_price_analytics(ad)
        result.update(price_data)
        
        return result
    
    @classmethod
    def _get_view_analytics(cls, ad):
        """Get view analytics for an ad"""
        now = timezone.now()
        
        # Get total views
        total_views = ad.ad_views.count()
        
        # Get daily views for the last 30 days
        thirty_days_ago = now - timedelta(days=30)
        daily_views = (
            ad.ad_views
            .filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        
        # Get weekly views for the last 12 weeks
        twelve_weeks_ago = now - timedelta(weeks=12)
        weekly_views = (
            ad.ad_views
            .filter(created_at__gte=twelve_weeks_ago)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        
        # Get monthly views for the last 12 months
        twelve_months_ago = now - timedelta(days=365)
        monthly_views = (
            ad.ad_views
            .filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        # Calculate views for today, this week, and this month
        today = now.date()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_month = today.replace(day=1)
        
        today_views = ad.ad_views.filter(created_at__date=today).count()
        week_views = ad.ad_views.filter(created_at__date__gte=start_of_week).count()
        month_views = ad.ad_views.filter(created_at__date__gte=start_of_month).count()
        
        return {
            'views': {
                'total': total_views,
                'today': today_views,
                'this_week': week_views,
                'this_month': month_views,
                'daily': list(daily_views),
                'weekly': list(weekly_views),
                'monthly': list(monthly_views),
            }
        }
    
    @classmethod
    def _get_price_analytics(cls, ad):
        """Get price comparison analytics for an ad"""
        from ..models import CarAd
        
        # Get average prices for the same mark and model in the same region
        # Only include ACTIVE ads for price comparison
        region_avg = (
            CarAd.objects
            .filter(
                mark=ad.mark,
                model=ad.model,
                region=ad.region,
                status=AdStatusEnum.ACTIVE,
                price__isnull=False
            )
            .exclude(id=ad.id)
            .aggregate(
                avg_price=Avg('price'),
                count=Count('id')
            )
        )
        
        # Get average prices for the same mark and model across Ukraine
        # Only include ACTIVE ads for price comparison
        ukraine_avg = (
            CarAd.objects
            .filter(
                mark=ad.mark,
                model=ad.model,
                status=AdStatusEnum.ACTIVE,
                price__isnull=False
            )
            .exclude(id=ad.id)
            .aggregate(
                avg_price=Avg('price'),
                count=Count('id')
            )
        )
        
        # Calculate price position (percentile) in the region
        region_position = None
        if region_avg['count'] > 0 and ad.price:
            cheaper_count = (
                CarAd.objects
                .filter(
                    mark=ad.mark,
                    model=ad.model,
                    region=ad.region,
                    status=AdStatusEnum.ACTIVE,
                    price__lt=ad.price
                )
                .exclude(id=ad.id)
                .count()
            )
            region_position = (cheaper_count / region_avg['count']) * 100
        
        # Calculate price position (percentile) in Ukraine
        ukraine_position = None
        if ukraine_avg['count'] > 0 and ad.price:
            cheaper_count = (
                CarAd.objects
                .filter(
                    mark=ad.mark,
                    model=ad.model,
                    status=AdStatusEnum.ACTIVE,
                    price__lt=ad.price
                )
                .exclude(id=ad.id)
                .count()
            )
            ukraine_position = (cheaper_count / ukraine_avg['count']) * 100
        
        return {
            'pricing': {
                'your_price': {
                    'amount': float(ad.price) if ad.price else None,
                    'currency': ad.currency,
                },
                'region_average': {
                    'amount': float(region_avg['avg_price']) if region_avg['avg_price'] else None,
                    'currency': 'UAH',  # Most ads are in UAH
                    'count': region_avg['count'],
                    'position_percentile': round(region_position, 2) if region_position is not None else None
                },
                'ukraine_average': {
                    'amount': float(ukraine_avg['avg_price']) if ukraine_avg['avg_price'] else None,
                    'currency': 'UAH',  # Most ads are in UAH
                    'count': ukraine_avg['count'],
                    'position_percentile': round(ukraine_position, 2) if ukraine_position is not None else None
                }
            }
        }
    
    @classmethod
    def get_account_analytics(cls, account, user):
        """
        Get analytics for all ads in an account.
        Only available for premium accounts.
        """
        # Check if user has permission to view analytics for this account
        if not user.is_authenticated or account.user != user:
            return {"error": "You don't have permission to view analytics for this account"}
        
        # Only premium accounts or superusers get analytics
        if account.account_type != AccountTypeEnum.PREMIUM and not user.is_superuser:
            return {
                'is_premium': False,
                'message': 'Upgrade to premium to view detailed analytics'
            }
        
        # Get all active ads for this account
        ads = account.car_ads.filter(status=AdStatusEnum.ACTIVE)
        
        # Basic account analytics
        result = {
            'account_id': account.id,
            'account_type': account.account_type,
            'total_ads': ads.count(),
            'total_views': sum(ad.ad_views.count() for ad in ads),
            'ads': []
        }
        
        # Add analytics for each ad
        for ad in ads:
            ad_analytics = {
                'ad_id': ad.id,
                'title': ad.title,
                'created_at': ad.created_at,
                'status': ad.status,
                'is_validated': ad.is_validated,
                'moderated_at': ad.moderated_at,
                'moderated_by': ad.moderated_by.get_full_name() if ad.moderated_by else 'Auto-moderation',
                'views': ad.ad_views.count(),
                'price': {
                    'amount': float(ad.price) if ad.price else None,
                    'currency': ad.currency,
                }
            }
            
            # Add price comparison data for each ad
            price_data = cls._get_price_analytics(ad)
            ad_analytics.update(price_data)
            
            result['ads'].append(ad_analytics)
        
        return result
