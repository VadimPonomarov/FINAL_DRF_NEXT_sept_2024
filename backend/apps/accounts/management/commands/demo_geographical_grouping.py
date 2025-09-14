"""
Django management command to demonstrate the optimized geographical grouping system.
Shows how addresses are grouped by geo_code for ads analytics.
"""

import os
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress, AddsAccount
from apps.users.models import UserModel
from core.utils.encryption import encryption_service


class Command(BaseCommand):
    help = 'Demonstrate the optimized geographical grouping system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-samples',
            action='store_true',
            help='Create sample geographical locations'
        )
        parser.add_argument(
            '--show-stats',
            action='store_true',
            help='Show geographical grouping statistics'
        )

    def handle(self, *args, **options):
        """Demonstrate geographical grouping system."""
        try:
            self.stdout.write('🗺️ ДЕМОНСТРАЦИЯ СИСТЕМЫ ГЕОГРАФИЧЕСКОЙ ГРУППИРОВКИ')
            self.stdout.write('=' * 70)
            
            # Check API key
            if not self._check_api_key():
                self.stdout.write('⚠️ Google Maps API недоступен - будет показана структура без геокодирования')
            
            self._show_table_structure()
            
            if options['create_samples']:
                self._create_sample_locations()
            
            if options['show_stats']:
                self._show_geographical_statistics()
            
            self._show_benefits()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка демонстрации: {e}')
            raise

    def _check_api_key(self):
        """Check if Google Maps API key is available."""
        try:
            encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
            if encrypted_key:
                api_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
                return bool(api_key)
        except Exception:
            pass
        return False

    def _show_table_structure(self):
        """Show the optimized table structure."""
        self.stdout.write('\n📋 ОПТИМИЗИРОВАННАЯ СТРУКТУРА ТАБЛИЦЫ')
        self.stdout.write('-' * 50)
        
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type, character_maximum_length, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'raw_account_addresses'
                ORDER BY ordinal_position;
            """)
            
            columns = cursor.fetchall()
            
            self.stdout.write('📊 Поля таблицы (только необходимые для группировки):')
            essential_fields = []
            for col in columns:
                name, data_type, max_length, nullable = col
                if name not in ['id', 'created_at', 'updated_at', 'account_id']:
                    length_info = f"({max_length})" if max_length else ""
                    null_info = "NULL" if nullable == "YES" else "NOT NULL"
                    
                    # Highlight key fields
                    if name in ['geo_code', 'region', 'locality']:
                        self.stdout.write(f'   🔑 {name:<20} {data_type}{length_info:<15} {null_info}')
                    elif name in ['input_region', 'input_locality']:
                        self.stdout.write(f'   📝 {name:<20} {data_type}{length_info:<15} {null_info}')
                    elif name in ['latitude', 'longitude']:
                        self.stdout.write(f'   📍 {name:<20} {data_type}{length_info:<15} {null_info}')
                    else:
                        self.stdout.write(f'   ⚙️ {name:<20} {data_type}{length_info:<15} {null_info}')
                    
                    essential_fields.append(name)
            
            self.stdout.write(f'\n📈 Итого полей: {len(essential_fields)} (минимально необходимые)')

    def _create_sample_locations(self):
        """Create sample geographical locations."""
        self.stdout.write('\n📝 СОЗДАНИЕ ОБРАЗЦОВ ГЕОГРАФИЧЕСКИХ ЛОКАЦИЙ')
        self.stdout.write('-' * 50)
        
        # Ensure demo account exists
        account = self._ensure_demo_account()
        
        sample_locations = [
            {'input_region': 'Київська область', 'input_locality': 'Київ'},
            {'input_region': 'Київська область', 'input_locality': 'Бровари'},
            {'input_region': 'Одеська область', 'input_locality': 'Одеса'},
            {'input_region': 'Львівська область', 'input_locality': 'Львів'},
            {'input_region': 'Харківська область', 'input_locality': 'Харків'},
            {'input_region': 'Київська область', 'input_locality': 'Київ'},  # Duplicate for grouping demo
        ]
        
        created_count = 0
        for location_data in sample_locations:
            try:
                with transaction.atomic():
                    # Create location
                    location = RawAccountAddress.objects.create(
                        account=account,
                        **location_data
                    )
                    
                    if location.is_geocoded:
                        self.stdout.write(
                            f'✅ Создана локация: {location.input_locality}, {location.input_region} '
                            f'(geo_code: {location.geo_code})'
                        )
                        created_count += 1
                    else:
                        self.stdout.write(
                            f'⚠️ Локация создана без геокодирования: {location.input_locality}, {location.input_region} '
                            f'(ошибка: {location.geocoding_error})'
                        )
                        
            except Exception as e:
                self.stdout.write(f'❌ Ошибка создания локации: {e}')
        
        self.stdout.write(f'\n📊 Создано локаций: {created_count}')

    def _show_geographical_statistics(self):
        """Show geographical grouping statistics."""
        self.stdout.write('\n📊 СТАТИСТИКА ГЕОГРАФИЧЕСКОЙ ГРУППИРОВКИ')
        self.stdout.write('-' * 50)
        
        # Total locations
        total_locations = RawAccountAddress.objects.count()
        geocoded_locations = RawAccountAddress.objects.filter(is_geocoded=True).count()
        
        self.stdout.write(f'📍 Всего локаций: {total_locations}')
        self.stdout.write(f'🗺️ Геокодированных: {geocoded_locations}')
        
        if geocoded_locations > 0:
            # Group by geo_code
            location_stats = RawAccountAddress.get_location_statistics()
            
            self.stdout.write('\n🏙️ ГРУППИРОВКА ПО ГЕОГРАФИЧЕСКИМ КОДАМ:')
            for stat in location_stats[:10]:  # Show top 10
                geo_code = stat['geo_code']
                region = stat['region']
                locality = stat['locality']
                count = stat['address_count']
                
                self.stdout.write(f'   📍 {locality}, {region}')
                self.stdout.write(f'      geo_code: {geo_code}')
                self.stdout.write(f'      количество адресов: {count}')
                self.stdout.write('')
            
            # Show unique locations
            unique_locations = RawAccountAddress.objects.filter(is_geocoded=True).values('geo_code').distinct().count()
            self.stdout.write(f'🌍 Уникальных географических локаций: {unique_locations}')
            
            # Show most popular location
            if location_stats:
                top_location = location_stats[0]
                self.stdout.write(f'🏆 Самая популярная локация: {top_location["locality"]}, {top_location["region"]} ({top_location["address_count"]} адресов)')

    def _show_benefits(self):
        """Show benefits of the optimized system."""
        self.stdout.write('\n💡 ПРЕИМУЩЕСТВА ОПТИМИЗИРОВАННОЙ СИСТЕМЫ')
        self.stdout.write('-' * 50)
        
        self.stdout.write('✅ МИНИМАЛЬНАЯ СТРУКТУРА:')
        self.stdout.write('   📝 input_region, input_locality - пользовательский ввод')
        self.stdout.write('   🌍 region, locality - стандартизированные названия')
        self.stdout.write('   🔑 geo_code - уникальный код для группировки')
        self.stdout.write('   📍 latitude, longitude - координаты для карт')
        self.stdout.write('   ⚙️ is_geocoded, geocoding_error - статус обработки')
        
        self.stdout.write('\n🎯 ИДЕАЛЬНО ДЛЯ ГРУППИРОВКИ ОБЪЯВЛЕНИЙ:')
        self.stdout.write('   🏠 Группировка объявлений по geo_code')
        self.stdout.write('   📊 Аналитика по регионам и городам')
        self.stdout.write('   🔍 Быстрый поиск по географическим локациям')
        self.stdout.write('   📈 Статистика популярности локаций')
        
        self.stdout.write('\n🚀 ПРОИЗВОДИТЕЛЬНОСТЬ:')
        self.stdout.write('   ⚡ Минимальное количество полей (8 вместо 20+)')
        self.stdout.write('   🗂️ Индексы по geo_code и region+locality')
        self.stdout.write('   💾 Экономия места в базе данных')
        self.stdout.write('   🔄 Быстрые запросы группировки')
        
        self.stdout.write('\n📋 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:')
        self.stdout.write('   SELECT geo_code, COUNT(*) FROM raw_account_addresses GROUP BY geo_code;')
        self.stdout.write('   SELECT * FROM raw_account_addresses WHERE geo_code = "kyivska_oblast_kyiv";')
        self.stdout.write('   SELECT region, locality, COUNT(*) FROM raw_account_addresses GROUP BY region, locality;')

    def _ensure_demo_account(self):
        """Ensure demo account exists."""
        user, created = UserModel.objects.get_or_create(
            email='demo_geographical_grouping@autoria.com',
            defaults={'is_active': True}
        )
        
        account, created = AddsAccount.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': 'Демо Географическая Группировка',
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )
        
        return account

    def _show_usage_examples(self):
        """Show practical usage examples."""
        self.stdout.write('\n📚 ПРАКТИЧЕСКИЕ ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ')
        self.stdout.write('-' * 50)
        
        self.stdout.write('🔍 1. ГРУППИРОВКА ОБЪЯВЛЕНИЙ ПО ЛОКАЦИЯМ:')
        self.stdout.write('   from apps.accounts.models import RawAccountAddress')
        self.stdout.write('   locations = RawAccountAddress.get_location_statistics()')
        self.stdout.write('   for loc in locations:')
        self.stdout.write('       print(f"{loc["locality"]}: {loc["address_count"]} объявлений")')
        
        self.stdout.write('\n🔍 2. ПОИСК ОБЪЯВЛЕНИЙ В КОНКРЕТНОЙ ЛОКАЦИИ:')
        self.stdout.write('   kyiv_addresses = RawAccountAddress.find_by_geo_code("kyivska_oblast_kyiv")')
        self.stdout.write('   print(f"Найдено {kyiv_addresses.count()} адресов в Киеве")')
        
        self.stdout.write('\n🔍 3. АНАЛИТИКА ПО РЕГИОНАМ:')
        self.stdout.write('   from django.db.models import Count')
        self.stdout.write('   regions = RawAccountAddress.objects.values("region").annotate(count=Count("id"))')
        self.stdout.write('   for region in regions:')
        self.stdout.write('       print(f"{region["region"]}: {region["count"]} объявлений")')
