"""
Django management command to demonstrate geographical grouping with mock data.
Shows how the system would work with real geocoding.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress, AddsAccount
from apps.users.models import UserModel


class Command(BaseCommand):
    help = 'Demonstrate geographical grouping with mock geocoded data'

    def handle(self, *args, **options):
        """Demonstrate geographical grouping with mock data."""
        try:
            self.stdout.write('🗺️ ДЕМОНСТРАЦИЯ ГЕОГРАФИЧЕСКОЙ ГРУППИРОВКИ (MOCK DATA)')
            self.stdout.write('=' * 70)
            
            self._create_mock_geocoded_locations()
            self._show_grouping_results()
            self._show_practical_examples()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка демонстрации: {e}')
            raise

    def _create_mock_geocoded_locations(self):
        """Create mock geocoded locations to demonstrate grouping."""
        self.stdout.write('\n📝 СОЗДАНИЕ MOCK ГЕОКОДИРОВАННЫХ ЛОКАЦИЙ')
        self.stdout.write('-' * 50)
        
        # Ensure demo account exists
        account = self._ensure_demo_account()
        
        # Mock geocoded locations with realistic Ukrainian data
        mock_locations = [
            {
                'input_region': 'Київська область',
                'input_locality': 'Київ',
                'region': 'Kyiv Oblast',
                'locality': 'Kyiv',
                'geo_code': 'kyiv_oblast_kyiv',
                'latitude': 50.4501,
                'longitude': 30.5234,
                'is_geocoded': True
            },
            {
                'input_region': 'Київська область', 
                'input_locality': 'Київ',
                'region': 'Kyiv Oblast',
                'locality': 'Kyiv',
                'geo_code': 'kyiv_oblast_kyiv',  # Same geo_code for grouping
                'latitude': 50.4502,
                'longitude': 30.5235,
                'is_geocoded': True
            },
            {
                'input_region': 'Київська область',
                'input_locality': 'Бровари',
                'region': 'Kyiv Oblast',
                'locality': 'Brovary',
                'geo_code': 'kyiv_oblast_brovary',
                'latitude': 50.5108,
                'longitude': 30.7909,
                'is_geocoded': True
            },
            {
                'input_region': 'Одеська область',
                'input_locality': 'Одеса',
                'region': 'Odesa Oblast',
                'locality': 'Odesa',
                'geo_code': 'odesa_oblast_odesa',
                'latitude': 46.4825,
                'longitude': 30.7233,
                'is_geocoded': True
            },
            {
                'input_region': 'Львівська область',
                'input_locality': 'Львів',
                'region': 'Lviv Oblast',
                'locality': 'Lviv',
                'geo_code': 'lviv_oblast_lviv',
                'latitude': 49.8397,
                'longitude': 24.0297,
                'is_geocoded': True
            },
            {
                'input_region': 'Одеська область',
                'input_locality': 'Одеса',
                'region': 'Odesa Oblast',
                'locality': 'Odesa',
                'geo_code': 'odesa_oblast_odesa',  # Same geo_code for grouping
                'latitude': 46.4826,
                'longitude': 30.7234,
                'is_geocoded': True
            }
        ]
        
        created_count = 0
        for location_data in mock_locations:
            try:
                with transaction.atomic():
                    # Create location with mock geocoded data
                    location = RawAccountAddress(**location_data, account=account)
                    location.save()
                    
                    self.stdout.write(
                        f'✅ Mock локация: {location.input_locality}, {location.input_region} '
                        f'→ {location.locality}, {location.region} (geo_code: {location.geo_code})'
                    )
                    created_count += 1
                        
            except Exception as e:
                self.stdout.write(f'❌ Ошибка создания mock локации: {e}')
        
        self.stdout.write(f'\n📊 Создано mock локаций: {created_count}')

    def _show_grouping_results(self):
        """Show geographical grouping results."""
        self.stdout.write('\n📊 РЕЗУЛЬТАТЫ ГЕОГРАФИЧЕСКОЙ ГРУППИРОВКИ')
        self.stdout.write('-' * 50)
        
        # Get location statistics
        location_stats = RawAccountAddress.get_location_statistics()
        geocoded_stats = [stat for stat in location_stats if stat['geo_code'] != 'unknown_location']
        
        if geocoded_stats:
            self.stdout.write('🏙️ ГРУППИРОВКА ПО ГЕОГРАФИЧЕСКИМ КОДАМ:')
            for stat in geocoded_stats:
                geo_code = stat['geo_code']
                region = stat['region']
                locality = stat['locality']
                count = stat['address_count']
                
                self.stdout.write(f'   📍 {locality}, {region}')
                self.stdout.write(f'      🔑 geo_code: {geo_code}')
                self.stdout.write(f'      📊 количество адресов: {count}')
                
                # Show similar locations
                similar = RawAccountAddress.find_by_geo_code(geo_code)
                if similar.count() > 1:
                    self.stdout.write(f'      🔗 группируется с {similar.count()-1} другими адресами')
                self.stdout.write('')
            
            # Show unique locations
            unique_geocoded = len([s for s in geocoded_stats if s['geo_code'] != 'unknown_location'])
            self.stdout.write(f'🌍 Уникальных геокодированных локаций: {unique_geocoded}')
            
            # Show most popular location
            if geocoded_stats:
                top_location = geocoded_stats[0]
                self.stdout.write(f'🏆 Самая популярная локация: {top_location["locality"]}, {top_location["region"]} ({top_location["address_count"]} адресов)')

    def _show_practical_examples(self):
        """Show practical usage examples."""
        self.stdout.write('\n📚 ПРАКТИЧЕСКИЕ ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ')
        self.stdout.write('-' * 50)
        
        self.stdout.write('🔍 1. ГРУППИРОВКА ОБЪЯВЛЕНИЙ ПО КИЕВУ:')
        kyiv_addresses = RawAccountAddress.find_by_geo_code('kyiv_oblast_kyiv')
        self.stdout.write(f'   Найдено {kyiv_addresses.count()} адресов в Киеве')
        for addr in kyiv_addresses[:3]:  # Show first 3
            self.stdout.write(f'   - {addr.input_locality}, {addr.input_region} → {addr.locality}, {addr.region}')
        
        self.stdout.write('\n🔍 2. АНАЛИТИКА ПО ОДЕССЕ:')
        odesa_addresses = RawAccountAddress.find_by_geo_code('odesa_oblast_odesa')
        self.stdout.write(f'   Найдено {odesa_addresses.count()} адресов в Одессе')
        if odesa_addresses.exists():
            first_addr = odesa_addresses.first()
            self.stdout.write(f'   Координаты: {first_addr.latitude}, {first_addr.longitude}')
        
        self.stdout.write('\n🔍 3. ВСЕ УНИКАЛЬНЫЕ ЛОКАЦИИ:')
        unique_locations = RawAccountAddress.objects.filter(
            is_geocoded=True
        ).values('geo_code', 'region', 'locality').distinct()
        
        for loc in unique_locations:
            if loc['geo_code'] != 'unknown_location':
                count = RawAccountAddress.find_by_geo_code(loc['geo_code']).count()
                self.stdout.write(f'   📍 {loc["locality"]}, {loc["region"]} ({count} адресов)')
        
        self.stdout.write('\n💡 ПРЕИМУЩЕСТВА СИСТЕМЫ:')
        self.stdout.write('   ✅ Автоматическая группировка одинаковых локаций')
        self.stdout.write('   ✅ Стандартизация названий через Google Maps')
        self.stdout.write('   ✅ Уникальные geo_code для быстрого поиска')
        self.stdout.write('   ✅ Координаты для отображения на картах')
        self.stdout.write('   ✅ Минимальная структура данных')

    def _ensure_demo_account(self):
        """Ensure demo account exists."""
        user, created = UserModel.objects.get_or_create(
            email='demo_mock_geocoding@autoria.com',
            defaults={'is_active': True}
        )
        
        account, created = AddsAccount.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': 'Демо Mock Геокодирование',
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )
        
        return account
