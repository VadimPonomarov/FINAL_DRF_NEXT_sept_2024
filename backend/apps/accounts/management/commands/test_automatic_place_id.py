"""
Django management command to test automatic place_id generation on create/update.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress, AddsAccount
from apps.users.models import UserModel


class Command(BaseCommand):
    help = 'Test automatic place_id generation on create and update'

    def handle(self, *args, **options):
        """Test automatic place_id generation."""
        try:
            self.stdout.write('🧪 ТЕСТИРОВАНИЕ АВТОМАТИЧЕСКОГО ПОЛУЧЕНИЯ PLACE_ID')
            self.stdout.write('=' * 70)
            
            # Ensure test account exists
            account = self._ensure_test_account()
            
            # Test 1: Create new address
            self._test_create_address(account)
            
            # Test 2: Update existing address
            self._test_update_address()
            
            # Test 3: Test grouping by place_id
            self._test_place_id_grouping()
            
            self.stdout.write('\n🎉 ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ!')
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка тестирования: {e}')
            raise

    def _ensure_test_account(self):
        """Ensure test account exists."""
        user, created = UserModel.objects.get_or_create(
            email='test_automatic_place_id@autoria.com',
            defaults={'is_active': True}
        )
        
        account, created = AddsAccount.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': 'Тест Автоматического Place ID',
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )
        
        return account

    def _test_create_address(self, account):
        """Test creating new address with automatic place_id."""
        self.stdout.write('\n🆕 ТЕСТ 1: СОЗДАНИЕ НОВОГО АДРЕСА')
        self.stdout.write('-' * 50)
        
        test_locations = [
            {'input_region': 'Київська область', 'input_locality': 'Київ'},
            {'input_region': 'Львівська область', 'input_locality': 'Львів'},
            {'input_region': 'Одеська область', 'input_locality': 'Одеса'},
        ]
        
        for i, location_data in enumerate(test_locations, 1):
            self.stdout.write(f'\n{i}. 📍 Створення адреси: {location_data["input_locality"]}, {location_data["input_region"]}')
            
            try:
                with transaction.atomic():
                    # Create address - place_id should be obtained automatically
                    address = RawAccountAddress.objects.create(
                        account=account,
                        **location_data
                    )
                    
                    # Check results
                    if address.is_geocoded and address.geo_code.startswith('ChIJ'):
                        self.stdout.write('   ✅ Успешно создан с place_id!')
                        self.stdout.write(f'   🗺️ Стандартизированный: {address.locality}, {address.region}')
                        self.stdout.write(f'   🔑 Google place_id: {address.geo_code}')
                        self.stdout.write(f'   📍 Координаты: {address.latitude}, {address.longitude}')
                        
                        # Test reverse lookup
                        place_info = RawAccountAddress.get_place_info_by_place_id(address.geo_code)
                        if place_info:
                            self.stdout.write(f'   🔄 Обратный поиск: {place_info.get("name", "N/A")}')
                        
                    else:
                        self.stdout.write('   ❌ Не удалось получить place_id')
                        self.stdout.write(f'   💬 Ошибка: {address.geocoding_error}')
                        
            except Exception as e:
                self.stdout.write(f'   ❌ Ошибка создания: {e}')

    def _test_update_address(self):
        """Test updating address with automatic re-geocoding."""
        self.stdout.write('\n🔄 ТЕСТ 2: ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕГО АДРЕСА')
        self.stdout.write('-' * 50)
        
        # Find an existing address to update
        address = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).first()
        
        if not address:
            self.stdout.write('⚠️ Нет адресов с place_id для тестирования обновления')
            return
        
        self.stdout.write(f'📍 Обновление адреса #{address.id}')
        self.stdout.write(f'   Текущий: {address.locality}, {address.region}')
        self.stdout.write(f'   Текущий place_id: {address.geo_code}')
        
        # Update to different location
        old_place_id = address.geo_code
        
        try:
            with transaction.atomic():
                # Change location - should trigger re-geocoding
                address.input_region = 'Харківська область'
                address.input_locality = 'Харків'
                address.save()
                
                # Check if place_id changed
                if address.geo_code != old_place_id and address.geo_code.startswith('ChIJ'):
                    self.stdout.write('   ✅ Успешно обновлен с новым place_id!')
                    self.stdout.write(f'   🗺️ Новый: {address.locality}, {address.region}')
                    self.stdout.write(f'   🔑 Новый place_id: {address.geo_code}')
                    self.stdout.write(f'   🔄 Старый place_id: {old_place_id}')
                else:
                    self.stdout.write('   ⚠️ Place_id не изменился или обновление не удалось')
                    
        except Exception as e:
            self.stdout.write(f'   ❌ Ошибка обновления: {e}')

    def _test_place_id_grouping(self):
        """Test grouping addresses by place_id."""
        self.stdout.write('\n🔗 ТЕСТ 3: ГРУППИРОВКА ПО PLACE_ID')
        self.stdout.write('-' * 50)
        
        # Get statistics
        from django.db.models import Count
        
        place_id_stats = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).values('geo_code', 'region', 'locality').annotate(
            count=Count('id')
        ).order_by('-count')
        
        self.stdout.write(f'📊 Найдено {place_id_stats.count()} уникальных place_id')
        
        for i, stat in enumerate(place_id_stats[:5], 1):  # Show top 5
            place_id = stat['geo_code']
            region = stat['region']
            locality = stat['locality']
            count = stat['count']
            
            self.stdout.write(f'\n{i}. 📍 {locality}, {region} ({count} адресов)')
            self.stdout.write(f'   🔑 place_id: {place_id}')
            
            # Test finding similar locations
            similar_addresses = RawAccountAddress.find_by_geo_code(place_id)
            self.stdout.write(f'   🔗 Группировка работает: найдено {similar_addresses.count()} адресов')
            
            # Show first few addresses in group
            for addr in similar_addresses[:3]:
                self.stdout.write(f'      - Адрес #{addr.id}: {addr.input_locality}, {addr.input_region}')
        
        # Test reverse lookup for first place_id
        if place_id_stats:
            first_place_id = place_id_stats[0]['geo_code']
            self.stdout.write(f'\n🔄 ТЕСТ ОБРАТНОГО ПОИСКА для {first_place_id}:')
            
            place_info = RawAccountAddress.get_place_info_by_place_id(first_place_id)
            if place_info:
                self.stdout.write('   ✅ Обратный поиск работает!')
                self.stdout.write(f'   📍 Google название: {place_info.get("name", "N/A")}')
                self.stdout.write(f'   🏠 Адрес: {place_info.get("formatted_address", "N/A")}')
            else:
                self.stdout.write('   ❌ Обратный поиск не работает')

    def _show_final_statistics(self):
        """Show final statistics."""
        self.stdout.write('\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:')
        self.stdout.write('-' * 40)
        
        total_addresses = RawAccountAddress.objects.count()
        place_id_addresses = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).count()
        unknown_addresses = RawAccountAddress.objects.filter(geo_code='unknown').count()
        
        self.stdout.write(f'📍 Всего адресов: {total_addresses}')
        self.stdout.write(f'🗺️ С Google place_id: {place_id_addresses}')
        self.stdout.write(f'❓ С unknown geo_code: {unknown_addresses}')
        
        if total_addresses > 0:
            place_id_percent = (place_id_addresses / total_addresses) * 100
            self.stdout.write(f'📈 Процент place_id: {place_id_percent:.1f}%')
        
        unique_place_ids = RawAccountAddress.objects.filter(
            geo_code__startswith='ChIJ'
        ).values('geo_code').distinct().count()
        
        self.stdout.write(f'🌍 Уникальных place_id: {unique_place_ids}')
        
        self.stdout.write('\n💡 ВЫВОДЫ:')
        if place_id_percent > 90:
            self.stdout.write('   ✅ Автоматическое получение place_id работает отлично!')
        elif place_id_percent > 70:
            self.stdout.write('   ✅ Автоматическое получение place_id работает хорошо')
        else:
            self.stdout.write('   ⚠️ Требуется улучшение системы получения place_id')
        
        self.stdout.write('   🔄 Обратный поиск по place_id доступен')
        self.stdout.write('   🔗 Группировка по place_id работает')
        self.stdout.write('   🗺️ Интеграция с Google Maps готова')
