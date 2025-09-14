"""
Tests for ad analytics functionality.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import AddsAccount
from apps.ads.models import CarAd, AdViewModel
from apps.ads.models.reference import CarMarkModel, RegionModel, CityModel, VehicleTypeModel
from apps.ads.services.analytics import AdAnalyticsService
from apps.ads.services.view_tracker import AdViewTracker
from core.enums.ads import AccountTypeEnum, AdStatusEnum

User = get_user_model()


class AdAnalyticsTestCase(TestCase):
    """Test case for ad analytics functionality."""
    
    def setUp(self):
        """Set up test data."""
        # Create users
        self.basic_user = User.objects.create_user(
            email='basic@test.com',
            password='testpass123'
        )
        self.premium_user = User.objects.create_user(
            email='premium@test.com',
            password='testpass123'
        )
        
        # Create accounts
        self.basic_account = AddsAccount.objects.create(
            user=self.basic_user,
            account_type=AccountTypeEnum.BASIC,
            organization_name='Basic Account'
        )
        self.premium_account = AddsAccount.objects.create(
            user=self.premium_user,
            account_type=AccountTypeEnum.PREMIUM,
            organization_name='Premium Account'
        )
        
        # Create reference data
        self.vehicle_type = VehicleTypeModel.objects.create(
            name='Car',
            sort_order=1
        )
        self.mark = CarMarkModel.objects.create(
            name='Toyota',
            vehicle_type=self.vehicle_type
        )
        self.region = RegionModel.objects.create(name='Київська область')
        self.city = CityModel.objects.create(name='Київ', region=self.region)
        
        # Create ads
        self.basic_ad = CarAd.objects.create(
            title='Toyota Camry Basic',
            description='Test car for basic user',
            price=Decimal('25000'),
            currency='UAH',
            account=self.basic_account,
            mark=self.mark,
            model='Camry',
            region='Київська область',
            city='Київ',
            status=AdStatusEnum.ACTIVE,
            is_validated=True
        )

        self.premium_ad = CarAd.objects.create(
            title='Toyota Camry Premium',
            description='Test car for premium user',
            price=Decimal('30000'),
            currency='UAH',
            account=self.premium_account,
            mark=self.mark,
            model='Camry',
            region='Київська область',
            city='Київ',
            status=AdStatusEnum.ACTIVE,
            is_validated=True
        )
        
        # Create some views for premium ad
        for i in range(5):
            AdViewModel.objects.create(
                ad=self.premium_ad,
                ip_address=f'192.168.1.{i+1}',
                user_agent='Test Browser'
            )
        
        self.client = APIClient()
    
    def test_basic_user_cannot_access_analytics(self):
        """Test that basic users cannot access detailed analytics."""
        self.client.force_authenticate(user=self.basic_user)
        
        url = reverse('car_ads_analytics', kwargs={'ad_id': self.basic_ad.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('Upgrade to premium', response.data['message'])
        self.assertFalse(response.data['is_premium'])
    
    def test_premium_user_can_access_analytics(self):
        """Test that premium users can access detailed analytics."""
        self.client.force_authenticate(user=self.premium_user)
        
        url = reverse('car_ads_analytics', kwargs={'ad_id': self.premium_ad.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_premium'])
        self.assertIn('views', response.data)
        self.assertIn('pricing', response.data)
        
        # Check views data
        views_data = response.data['views']
        self.assertEqual(views_data['total'], 5)
        self.assertIn('today', views_data)
        self.assertIn('this_week', views_data)
        self.assertIn('this_month', views_data)
        
        # Check pricing data
        pricing_data = response.data['pricing']
        self.assertIn('your_price', pricing_data)
        self.assertIn('region_average', pricing_data)
        self.assertIn('ukraine_average', pricing_data)
    
    def test_user_cannot_access_other_users_analytics(self):
        """Test that users cannot access analytics for ads they don't own."""
        self.client.force_authenticate(user=self.basic_user)
        
        url = reverse('car_ads_analytics', kwargs={'ad_id': self.premium_ad.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
    
    def test_view_tracking(self):
        """Test that ad views are tracked correctly."""
        initial_count = self.premium_ad.ad_views.count()
        
        # Track a view
        view = AdViewTracker.track_view(
            ad=self.premium_ad,
            ip_address='192.168.1.100',
            user_agent='Test Browser',
            session_key='test_session'
        )
        
        self.assertIsNotNone(view)
        self.assertEqual(self.premium_ad.ad_views.count(), initial_count + 1)
    
    def test_duplicate_view_prevention(self):
        """Test that duplicate views are prevented."""
        ip_address = '192.168.1.200'
        session_key = 'duplicate_test_session'
        
        # Track first view
        view1 = AdViewTracker.track_view(
            ad=self.premium_ad,
            ip_address=ip_address,
            session_key=session_key
        )
        
        # Track duplicate view (should be ignored)
        view2 = AdViewTracker.track_view(
            ad=self.premium_ad,
            ip_address=ip_address,
            session_key=session_key
        )
        
        self.assertIsNotNone(view1)
        self.assertIsNone(view2)  # Should be None due to duplicate detection
    
    def test_ad_detail_view_tracking(self):
        """Test that viewing ad detail page tracks the view."""
        url = reverse('car_ads_detail', kwargs={'pk': self.premium_ad.id})
        initial_count = self.premium_ad.ad_views.count()
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # View should be tracked
        self.premium_ad.refresh_from_db()
        self.assertGreater(self.premium_ad.ad_views.count(), initial_count)
    
    def test_analytics_service_directly(self):
        """Test the analytics service directly."""
        # Test basic user
        basic_result = AdAnalyticsService.get_ad_analytics(self.basic_ad, self.basic_user)
        self.assertFalse(basic_result['is_premium'])
        self.assertIn('message', basic_result)
        
        # Test premium user
        premium_result = AdAnalyticsService.get_ad_analytics(self.premium_ad, self.premium_user)
        self.assertTrue(premium_result['is_premium'])
        self.assertIn('views', premium_result)
        self.assertIn('pricing', premium_result)
        
        # Test unauthorized access
        unauthorized_result = AdAnalyticsService.get_ad_analytics(self.premium_ad, self.basic_user)
        self.assertIn('error', unauthorized_result)
