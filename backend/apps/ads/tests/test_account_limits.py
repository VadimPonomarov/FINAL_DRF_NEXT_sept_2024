"""
Tests for account type limitations on ad creation.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import AddsAccount
from apps.ads.models import CarAd
from apps.ads.models.reference import CarMarkModel, RegionModel, CityModel, VehicleTypeModel
from core.enums.ads import AccountTypeEnum, AdStatusEnum

User = get_user_model()


class AccountLimitsTestCase(TestCase):
    """Test case for account type limitations on ad creation."""

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
            organization_name='Basic User Account'
        )
        self.premium_account = AddsAccount.objects.create(
            user=self.premium_user,
            account_type=AccountTypeEnum.PREMIUM,
            organization_name='Premium User Account'
        )

        # Create reference data
        self.vehicle_type = VehicleTypeModel.objects.create(name='Легковий автомобіль')
        self.mark = CarMarkModel.objects.create(name='Toyota', is_popular=True, vehicle_type=self.vehicle_type)
        self.region = RegionModel.objects.create(name='Київська область')
        self.city = CityModel.objects.create(name='Київ', region=self.region)

        self.client = APIClient()

    def test_basic_user_can_create_first_ad(self):
        """Test that basic user can create their first ad."""
        self.client.force_authenticate(user=self.basic_user)

        ad_data = {
            'title': 'Toyota Camry 2020',
            'description': 'Excellent condition car for sale',
            'price': '25000',
            'currency': 'UAH',
            'mark': self.mark.id,
            'model': 'Camry',
            'region': 'Київська область',
            'city': 'Київ',
            'dynamic_fields': {
                'year': 2020,
                'mileage': 50000
            }
        }

        url = reverse('car_ads_create')
        response = self.client.post(url, ad_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_basic_user_cannot_create_second_ad(self):
        """Test that basic user cannot create a second ad."""
        # Create first ad
        CarAd.objects.create(
            title='First Ad',
            description='First ad description',
            price=Decimal('20000'),
            currency='UAH',
            account=self.basic_account,
            mark=self.mark,
            model='Camry',
            region='Київська область',
            city='Київ',
            status=AdStatusEnum.ACTIVE
        )

        self.client.force_authenticate(user=self.basic_user)

        ad_data = {
            'title': 'Toyota Corolla 2021',
            'description': 'Second car for sale',
            'price': '22000',
            'currency': 'UAH',
            'mark': self.mark.id,
            'model': 'Corolla',
            'region': 'Київська область',
            'city': 'Київ',
            'dynamic_fields': {
                'year': 2021,
                'mileage': 30000
            }
        }

        url = reverse('car_ads_create')
        response = self.client.post(url, ad_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('account_limit', response.data)

    def test_premium_user_can_create_multiple_ads(self):
        """Test that premium user can create multiple ads."""
        # Create first ad
        CarAd.objects.create(
            title='First Premium Ad',
            description='First premium ad description',
            price=Decimal('30000'),
            currency='UAH',
            account=self.premium_account,
            mark=self.mark,
            model='Camry',
            region='Київська область',
            city='Київ',
            status=AdStatusEnum.ACTIVE
        )

        self.client.force_authenticate(user=self.premium_user)

        ad_data = {
            'title': 'Toyota Corolla 2021',
            'description': 'Second premium car for sale',
            'price': '25000',
            'currency': 'UAH',
            'mark': self.mark.id,
            'model': 'Corolla',
            'region': 'Київська область',
            'city': 'Київ',
            'dynamic_fields': {
                'year': 2021,
                'mileage': 25000
            }
        }

        url = reverse('car_ads_create')
        response = self.client.post(url, ad_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_basic_user_can_create_ad_after_deleting_existing(self):
        """Test that basic user can create new ad after deleting existing one."""
        # Create and then delete first ad
        first_ad = CarAd.objects.create(
            title='First Ad',
            description='First ad description',
            price=Decimal('20000'),
            currency='UAH',
            account=self.basic_account,
            mark=self.mark,
            model='Camry',
            region='Київська область',
            city='Київ',
            status=AdStatusEnum.ACTIVE
        )
        first_ad.delete()

        self.client.force_authenticate(user=self.basic_user)

        ad_data = {
            'title': 'Toyota Corolla 2021',
            'description': 'New car for sale',
            'price': '22000',
            'currency': 'UAH',
            'mark': self.mark.id,
            'model': 'Corolla',
            'region': 'Київська область',
            'city': 'Київ',
            'dynamic_fields': {
                'year': 2021,
                'mileage': 30000
            }
        }

        url = reverse('car_ads_create')
        response = self.client.post(url, ad_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_basic_user_can_create_ad_after_selling_existing(self):
        """Test that basic user can create new ad after marking existing as sold."""
        # Create first ad and mark as sold
        CarAd.objects.create(
            title='Sold Ad',
            description='Sold ad description',
            price=Decimal('20000'),
            currency='UAH',
            account=self.basic_account,
            mark=self.mark,
            model='Camry',
            region='Київська область',
            city='Київ',
            status=AdStatusEnum.SOLD  # SOLD status doesn't count towards limit
        )

        self.client.force_authenticate(user=self.basic_user)

        ad_data = {
            'title': 'Toyota Corolla 2021',
            'description': 'New car for sale',
            'price': '22000',
            'currency': 'UAH',
            'mark': self.mark.id,
            'model': 'Corolla',
            'region': 'Київська область',
            'city': 'Київ',
            'dynamic_fields': {
                'year': 2021,
                'mileage': 30000
            }
        }

        url = reverse('car_ads_create')
        response = self.client.post(url, ad_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
