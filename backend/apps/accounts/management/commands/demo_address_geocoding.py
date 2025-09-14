"""
Django management command to demonstrate address geocoding system.
Shows how raw addresses are converted to formatted addresses using Google Maps API.
"""

import random
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import RawAccountAddress, FormattedAccountAddress, AddsAccount
from apps.users.models import UserModel
from apps.accounts.utils.geocoding import get_geocode


class Command(BaseCommand):
    help = 'Demonstrate address geocoding system with raw and formatted addresses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of test addresses to create (default: 10)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if addresses already exist'
        )

    def handle(self, *args, **options):
        """Main handler for demonstrating address geocoding."""
        try:
            count = options['count']
            force = options['force']
            
            self.stdout.write('🗺️ ДЕМОНСТРАЦИЯ СИСТЕМЫ ГЕОКОДИРОВАНИЯ АДРЕСОВ')
            self.stdout.write('=' * 70)
            
            # Check if addresses already exist
            existing_count = RawAccountAddress.objects.count()
            if existing_count > 0 and not force:
                self.stdout.write(f'✅ Адреса уже существуют ({existing_count}), показываем существующие')
                self._show_existing_addresses()
                return
            
            # Create demo account if needed
            account = self._ensure_demo_account()
            
            # Create test addresses
            self.stdout.write(f'📍 Создание {count} тестовых адресов...')
            created_addresses = self._create_test_addresses(count, account)
            
            # Show results
            self._show_geocoding_results(created_addresses)
            
            self.stdout.write(f'✅ Демонстрация завершена! Создано {len(created_addresses)} адресов')
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка демонстрации: {e}')
            raise

    def _ensure_demo_account(self):
        """Create demo account for address testing."""
        # Create or get demo user
        user, created = UserModel.objects.get_or_create(
            email='demo_geocoding@autoria.com',
            defaults={
                'is_active': True,
                'password': 'demo_password_123'
            }
        )
        
        if created:
            user.set_password('demo_password_123')
            user.save()
            self.stdout.write('✅ Создан демо-пользователь')
        
        # Create or get demo account
        account, created = AddsAccount.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': 'Демо Геокодирование',
                'role': 'seller',
                'account_type': 'BASIC',
            }
        )
        
        if created:
            self.stdout.write('✅ Создан демо-аккаунт')
        
        return account

    def _create_test_addresses(self, count, account):
        """Create test addresses with various Ukrainian locations."""
        # Test addresses with different formats and potential errors
        test_addresses = [
            {
                'street': 'вул. Хрещатик',
                'building': '1',
                'locality': 'Київ',
                'region': 'Київська область',
                'country': 'Україна',
                'description': 'Центр Києва - правильний адрес'
            },
            {
                'street': 'Khreshchatyk Street',  # English version
                'building': '1',
                'locality': 'Kyiv',
                'region': 'Kyiv Oblast',
                'country': 'Ukraine',
                'description': 'Той же адрес англійською'
            },
            {
                'street': 'вулиця Дерибасівська',
                'building': '13',
                'locality': 'Одеса',
                'region': 'Одеська область',
                'country': 'Україна',
                'description': 'Одеса - популярна вулиця'
            },
            {
                'street': 'пр. Свободи',
                'building': '28',
                'locality': 'Львів',
                'region': 'Львівська область',
                'country': 'Україна',
                'description': 'Львів - проспект Свободи'
            },
            {
                'street': 'вул. Сумська',
                'building': '25',
                'locality': 'Харків',
                'region': 'Харківська область',
                'country': 'Україна',
                'description': 'Харків - центральна вулиця'
            },
            {
                'street': 'Sumskaya str',  # Mixed languages
                'building': '25',
                'locality': 'Kharkiv',
                'region': 'Kharkivska oblast',
                'country': 'Ukraine',
                'description': 'Той же адрес змішаними мовами'
            },
            {
                'street': 'вул. Соборна',
                'building': '10',
                'locality': 'Дніпро',
                'region': 'Дніпропетровська область',
                'country': 'Україна',
                'description': 'Дніпро - Соборна вулиця'
            },
            {
                'street': 'вул. Грушевського',  # Typo in street name
                'building': '5',
                'locality': 'Київ',
                'region': 'Київська обл',  # Abbreviated region
                'country': 'Україна',
                'description': 'Адрес з можливими помилками'
            },
            {
                'street': 'вул. Миру',
                'building': '15А',  # Building with letter
                'locality': 'Полтава',
                'region': 'Полтавська область',
                'country': 'Україна',
                'description': 'Полтава з літерою в номері будинку'
            },
            {
                'street': 'вул. Незалежності',
                'building': '100',
                'locality': 'Івано-Франківськ',
                'region': 'Івано-Франківська область',
                'country': 'Україна',
                'description': 'Івано-Франківськ - довга назва'
            },
        ]
        
        created_addresses = []
        
        for i in range(min(count, len(test_addresses))):
            address_data = test_addresses[i]
            description = address_data.pop('description')
            
            try:
                with transaction.atomic():
                    # Create raw address
                    raw_address = RawAccountAddress.objects.create(
                        account=account,
                        **address_data
                    )
                    
                    self.stdout.write(f'📍 Создан сырой адрес: {description}')
                    
                    # Test geocoding
                    place_id = get_geocode(
                        country=raw_address.country,
                        region=raw_address.region,
                        locality=raw_address.locality,
                        street=raw_address.street,
                        building=raw_address.building
                    )
                    
                    if place_id:
                        # Create formatted address
                        formatted_address = FormattedAccountAddress.objects.create(
                            raw_address=raw_address,
                            place_id=place_id,
                            formatted_address=f"Форматированный адрес для {raw_address.locality}"
                        )
                        self.stdout.write(f'   ✅ Геокодирование успешно: {place_id[:20]}...')
                    else:
                        self.stdout.write(f'   ⚠️ Геокодирование не удалось')
                    
                    created_addresses.append({
                        'raw': raw_address,
                        'formatted': formatted_address if place_id else None,
                        'description': description
                    })
                    
            except Exception as e:
                self.stdout.write(f'❌ Ошибка создания адреса: {e}')
                continue
        
        return created_addresses

    def _show_existing_addresses(self):
        """Show existing addresses and their geocoding status."""
        raw_addresses = RawAccountAddress.objects.all()[:10]
        
        self.stdout.write('\n📋 СУЩЕСТВУЮЩИЕ АДРЕСА:')
        self.stdout.write('-' * 70)
        
        for i, raw_addr in enumerate(raw_addresses, 1):
            self.stdout.write(f'{i:2d}. Сырой адрес: {raw_addr.street}, {raw_addr.building}')
            self.stdout.write(f'    {raw_addr.locality}, {raw_addr.region}, {raw_addr.country}')
            
            if hasattr(raw_addr, 'formatted_address') and raw_addr.formatted_address:
                formatted = raw_addr.formatted_address
                self.stdout.write(f'    ✅ Форматированный: {formatted.place_id[:30]}...')
                if formatted.latitude and formatted.longitude:
                    self.stdout.write(f'    📍 Координаты: {formatted.latitude:.6f}, {formatted.longitude:.6f}')
            else:
                self.stdout.write(f'    ❌ Форматированный адрес отсутствует')
            self.stdout.write('')

    def _show_geocoding_results(self, addresses):
        """Show results of geocoding demonstration."""
        self.stdout.write('\n📊 РЕЗУЛЬТАТЫ ГЕОКОДИРОВАНИЯ:')
        self.stdout.write('=' * 70)
        
        successful = 0
        failed = 0
        
        for addr_data in addresses:
            raw = addr_data['raw']
            formatted = addr_data['formatted']
            description = addr_data['description']
            
            self.stdout.write(f'📍 {description}')
            self.stdout.write(f'   Сырой: {raw.street}, {raw.building}, {raw.locality}')
            
            if formatted:
                self.stdout.write(f'   ✅ Place ID: {formatted.place_id}')
                successful += 1
            else:
                self.stdout.write(f'   ❌ Геокодирование не удалось')
                failed += 1
            self.stdout.write('')
        
        self.stdout.write(f'📊 СТАТИСТИКА:')
        self.stdout.write(f'   ✅ Успешно: {successful}')
        self.stdout.write(f'   ❌ Неудачно: {failed}')
        self.stdout.write(f'   📈 Процент успеха: {(successful/(successful+failed)*100):.1f}%' if (successful+failed) > 0 else '0%')
        
        # Show table structure info
        self.stdout.write(f'\n🗂️ СТРУКТУРА ТАБЛИЦ:')
        self.stdout.write(f'   📋 raw_account_addresses: {RawAccountAddress.objects.count()} записей')
        self.stdout.write(f'   📋 formatted_account_addresses: {FormattedAccountAddress.objects.count()} записей')
        
        self.stdout.write(f'\n💡 ПРИНЦИП РАБОТЫ:')
        self.stdout.write(f'   1. Пользователь вводит адрес в любом формате (сырой адрес)')
        self.stdout.write(f'   2. Система отправляет запрос к Google Maps API')
        self.stdout.write(f'   3. Получает уникальный place_id и стандартизированный адрес')
        self.stdout.write(f'   4. Сохраняет в formatted_account_addresses для унификации')
        self.stdout.write(f'   5. Все адреса с одним place_id считаются одинаковыми')
