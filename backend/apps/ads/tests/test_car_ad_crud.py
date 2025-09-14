from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import AddsAccount
from apps.ads.models import CarAd
from apps.ads.models.reference import CarMarkModel, RegionModel, CityModel
from core.enums.ads import AccountTypeEnum, AdStatusEnum

User = get_user_model()


class CarAdCRUDTestCase(TestCase):
    """End-to-end CRUD tests for car advertisements API."""

    def setUp(self):
        self.client = APIClient()

        # Users and accounts
        self.owner = User.objects.create_user(email='owner@example.com', password='pass1234')
        self.other = User.objects.create_user(email='other@example.com', password='pass1234')

        self.owner_account = AddsAccount.objects.create(user=self.owner, type=AccountTypeEnum.BASIC)
        self.other_account = AddsAccount.objects.create(user=self.other, type=AccountTypeEnum.BASIC)

        # Reference data
        self.mark = CarMarkModel.objects.create(name='Toyota')
        self.region = RegionModel.objects.create(name='Київська область')
        self.city = CityModel.objects.create(name='Київ', region=self.region)

    def _authenticate_owner(self):
        self.client.force_authenticate(user=self.owner)

    def _authenticate_other(self):
        self.client.force_authenticate(user=self.other)

    def test_crud_flow_create_read_update_delete(self):
        """Owner can create, read, update and delete their ad."""
        self._authenticate_owner()

        # CREATE
        create_url = reverse('car_ads_create')
        payload = {
            'title': 'Toyota Camry 2020',
            'description': 'Excellent condition car for sale',
            'price': '25000',
            'currency': 'UAH',
            'mark': self.mark.id,  # matches existing tests
            'model': 'Camry',
            # API accepts region/city by name (per existing tests)
            'region': self.region.name,
            'city': self.city.name,
            'dynamic_fields': {
                'year': 2020,
                'mileage': 50000
            }
        }
        resp = self.client.post(create_url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data if hasattr(resp, 'data') else resp.content)
        ad_id = resp.data.get('id') if hasattr(resp, 'data') else resp.json().get('id')
        self.assertIsNotNone(ad_id)

        # READ (detail)
        detail_url = reverse('car_ads_detail', kwargs={'pk': ad_id})
        resp = self.client.get(detail_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], ad_id)

        # UPDATE
        update_url = reverse('car_ads_update', kwargs={'pk': ad_id})
        update_payload = {
            'title': 'Toyota Camry 2020 Updated Title',
            'price': '24000',
        }
        resp = self.client.put(update_url, update_payload, format='json')
        self.assertIn(resp.status_code, (status.HTTP_200_OK, status.HTTP_202_ACCEPTED))

        # Verify updated
        resp = self.client.get(detail_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Toyota Camry 2020 Updated Title')

        # DELETE
        delete_url = reverse('car_ads_delete', kwargs={'pk': ad_id})
        resp = self.client.delete(delete_url)
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))

        # Verify deleted
        resp = self.client.get(detail_url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_forbidden_for_non_owner(self):
        """Non-owner should not be able to delete someone else's ad."""
        # Create ad for owner (directly in DB)
        ad = CarAd.objects.create(
            title='Owner Ad',
            description='Should not be deletable by others',
            price=Decimal('15000'),
            currency='UAH',
            account=self.owner_account,
            mark=self.mark,
            model='Camry',
            region=self.region.name,
            city=self.city.name,
            status=AdStatusEnum.ACTIVE
        )

        self._authenticate_other()
        delete_url = reverse('car_ads_delete', kwargs={'pk': ad.id})
        resp = self.client.delete(delete_url)
        # The view filters queryset by owner, so non-owner should see 404 (or 403 depending on permission implementation)
        self.assertIn(resp.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))

        # Ensure the ad still exists
        self.assertTrue(CarAd.objects.filter(id=ad.id).exists())

