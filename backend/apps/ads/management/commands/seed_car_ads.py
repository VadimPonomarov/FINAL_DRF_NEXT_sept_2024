"""
Django management command to seed car advertisements.
This is the final step in the seeding chain as it depends on all reference data.
"""

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.ads.models import CarAd
from apps.ads.models.reference import CarMarkModel, RegionModel, CityModel, CarColorModel
from apps.accounts.models import AddsAccount
from core.enums.cars import SellerType, ExchangeStatus, Currency
from core.enums.ads import AdStatusEnum


class Command(BaseCommand):
    help = 'Seed car advertisements (final step in seeding chain)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of car ads to create (default: 100)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing car ads before seeding'
        )

    def handle(self, *args, **options):
        """Seed car advertisements."""
        try:
            self.stdout.write('🚗 НАПОЛНЕНИЕ ТАБЛИЦЫ ОБЪЯВЛЕНИЙ О ПРОДАЖЕ АВТОМОБИЛЕЙ')
            self.stdout.write('=' * 70)
            
            # Check dependencies
            if not self._check_dependencies():
                return
            
            # Clear existing ads if requested
            if options['clear']:
                self._clear_existing_ads()
            
            # Create car ads
            count = options['count']
            self._create_car_ads(count)
            
            # Show statistics
            self._show_statistics()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка наполнения: {e}')
            raise

    def _check_dependencies(self):
        """Check if all required reference data exists."""
        self.stdout.write('\n🔍 ПРОВЕРКА ЗАВИСИМОСТЕЙ')
        self.stdout.write('-' * 40)
        
        dependencies = [
            ('Марки автомобилей', CarMarkModel.objects.count()),
            ('Регионы', RegionModel.objects.count()),
            ('Города', CityModel.objects.count()),
            ('Цвета', CarColorModel.objects.count()),
            ('Аккаунты продавцов', AddsAccount.objects.count()),
        ]
        
        all_ok = True
        for name, count in dependencies:
            if count > 0:
                self.stdout.write(f'   ✅ {name}: {count}')
            else:
                self.stdout.write(f'   ❌ {name}: {count} (ОТСУТСТВУЮТ!)')
                all_ok = False
        
        if not all_ok:
            self.stdout.write('\n❌ Не все зависимости выполнены. Запустите сиды для справочников.')
            return False
        
        self.stdout.write('\n✅ Все зависимости выполнены')
        return True

    def _clear_existing_ads(self):
        """Clear existing car ads."""
        self.stdout.write('\n🗑️ ОЧИСТКА СУЩЕСТВУЮЩИХ ОБЪЯВЛЕНИЙ')
        self.stdout.write('-' * 40)
        
        existing_count = CarAd.objects.count()
        if existing_count > 0:
            CarAd.objects.all().delete()
            self.stdout.write(f'   🗑️ Удалено {existing_count} существующих объявлений')
        else:
            self.stdout.write('   ℹ️ Существующих объявлений не найдено')

    def _create_car_ads(self, count):
        """Create car advertisements respecting account type limitations."""
        self.stdout.write(f'\n🚗 СОЗДАНИЕ {count} ОБЪЯВЛЕНИЙ О ПРОДАЖЕ')
        self.stdout.write('-' * 50)

        # Get reference data
        marks = list(CarMarkModel.objects.all())
        regions = list(RegionModel.objects.all())
        cities = list(CityModel.objects.all())
        colors = list(CarColorModel.objects.all())
        accounts = list(AddsAccount.objects.all())

        if not all([marks, regions, cities, accounts]):
            self.stdout.write('❌ Недостаточно справочных данных для создания объявлений')
            return

        # Separate accounts by type for proper distribution
        from core.enums.ads import AccountTypeEnum
        basic_accounts = [acc for acc in accounts if acc.account_type == AccountTypeEnum.BASIC]
        premium_accounts = [acc for acc in accounts if acc.account_type == AccountTypeEnum.PREMIUM]

        self.stdout.write(f'📊 Найдено аккаунтов: {len(basic_accounts)} базовых, {len(premium_accounts)} премиум')

        # Track ads per account to respect limits
        account_ad_counts = {acc.id: 0 for acc in accounts}

        created_count = 0
        skipped_count = 0

        for i in range(count):
            try:
                with transaction.atomic():
                    # Select account respecting limitations
                    selected_account = self._select_account_for_ad(
                        basic_accounts, premium_accounts, account_ad_counts
                    )

                    if not selected_account:
                        skipped_count += 1
                        if skipped_count % 10 == 0:
                            self.stdout.write(f'   ⚠️ Пропущено {skipped_count} объявлений (лимиты аккаунтов)')
                        continue

                    ad_data = self._generate_ad_data(marks, regions, cities, colors, [selected_account])
                    ad = CarAd.objects.create(**ad_data)

                    # Update account ad count
                    account_ad_counts[selected_account.id] += 1
                    created_count += 1

                    if (i + 1) % 20 == 0:  # Show progress every 20 ads
                        self.stdout.write(f'   📊 Создано {created_count} объявлений...')

            except Exception as e:
                self.stdout.write(f'   ❌ Ошибка создания объявления #{i + 1}: {e}')

        self.stdout.write(f'\n✅ Успешно создано {created_count} объявлений')
        if skipped_count > 0:
            self.stdout.write(f'⚠️ Пропущено {skipped_count} объявлений из-за лимитов базовых аккаунтов')

    def _select_account_for_ad(self, basic_accounts, premium_accounts, account_ad_counts):
        """
        Select an account for creating an ad, respecting account type limitations.

        Basic accounts: max 1 ad
        Premium accounts: unlimited ads

        Returns:
            AddsAccount or None if no suitable account available
        """
        from core.enums.ads import AccountTypeEnum

        # Try premium accounts first (they have unlimited ads)
        available_premium = [acc for acc in premium_accounts if account_ad_counts[acc.id] < 50]  # Reasonable limit
        if available_premium:
            return random.choice(available_premium)

        # Try basic accounts (max 1 ad each)
        available_basic = [acc for acc in basic_accounts if account_ad_counts[acc.id] == 0]
        if available_basic:
            return random.choice(available_basic)

        # No available accounts
        return None

    def _generate_ad_data(self, marks, regions, cities, colors, accounts):
        """Generate data for a single car ad."""
        mark = random.choice(marks)
        region = random.choice(regions)
        city = random.choice(cities)
        color = random.choice(colors) if colors else None
        account = random.choice(accounts)
        
        # Generate car models based on mark
        models_by_mark = {
            'Toyota': ['Camry', 'Corolla', 'RAV4', 'Prius', 'Land Cruiser', 'Highlander'],
            'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'i3', 'Z4'],
            'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'A-Class'],
            'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo', 'Jetta', 'Touareg'],
            'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'TT'],
            'Ford': ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Explorer', 'Mustang'],
            'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit', 'Odyssey'],
            'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Maxima', '370Z'],
            'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Genesis'],
            'Kia': ['Optima', 'Sorento', 'Sportage', 'Rio', 'Soul', 'Stinger'],
        }
        
        model_name = random.choice(models_by_mark.get(mark.name, ['Model']))
        
        # Generate year (2010-2024)
        year = random.randint(2010, 2024)
        
        # Generate mileage based on year
        current_year = 2024
        age = current_year - year
        base_mileage = age * random.randint(8000, 25000)  # 8k-25k km per year
        mileage = max(0, base_mileage + random.randint(-20000, 20000))
        
        # Generate price based on year and mark
        base_prices = {
            'Toyota': 15000, 'BMW': 25000, 'Mercedes-Benz': 30000,
            'Volkswagen': 12000, 'Audi': 22000, 'Ford': 10000,
            'Honda': 13000, 'Nissan': 11000, 'Hyundai': 9000, 'Kia': 8000
        }
        
        base_price = base_prices.get(mark.name, 10000)
        # Depreciation: newer cars cost more
        age_factor = max(0.3, 1 - (age * 0.08))  # 8% depreciation per year, min 30%
        price = int(base_price * age_factor * random.uniform(0.8, 1.2))
        
        # Convert to UAH (approximate rate: 1 USD = 37 UAH)
        price_uah = price * 37
        
        # Generate dynamic fields
        dynamic_fields = {
            'year': year,
            'mileage': mileage,
            'engine_volume': round(random.uniform(1.0, 4.0), 1),
            'fuel_type': random.choice(['Бензин', 'Дизель', 'Гібрид', 'Електро', 'Газ']),
            'transmission': random.choice(['Механічна', 'Автоматична', 'Варіатор']),
            'body_type': random.choice(['Седан', 'Хетчбек', 'Універсал', 'Кросовер', 'Позашляховик', 'Купе']),
            'color': color.name if color else 'Білий',
            'condition': random.choice(['Нова', 'Вживана', 'Після ДТП', 'На запчастини']),
            'owners_count': random.randint(1, 4),
        }
        
        # Generate VIN (optional)
        vin = None
        if random.random() < 0.7:  # 70% chance to have VIN
            vin = ''.join(random.choices('ABCDEFGHJKLMNPRSTUVWXYZ0123456789', k=17))
            dynamic_fields['vin'] = vin
        
        # Generate title and description
        title = f"{mark.name} {model_name} {year} року"
        
        descriptions = [
            f"Продається {mark.name} {model_name} {year} року випуску. Пробіг {mileage:,} км. "
            f"Двигун {dynamic_fields['engine_volume']}л, {dynamic_fields['fuel_type'].lower()}. "
            f"Коробка передач: {dynamic_fields['transmission'].lower()}. "
            f"Стан: {dynamic_fields['condition'].lower()}. Власників: {dynamic_fields['owners_count']}.",
            
            f"Пропонується до продажу {mark.name} {model_name}. Рік випуску: {year}. "
            f"Пробіг: {mileage:,} км. Колір: {dynamic_fields['color'].lower()}. "
            f"Тип кузова: {dynamic_fields['body_type'].lower()}. Паливо: {dynamic_fields['fuel_type'].lower()}.",
            
            f"Терміново продається {mark.name} {model_name} {year} р.в. "
            f"Технічний стан відмінний. Пробіг {mileage:,} км. "
            f"Двигун {dynamic_fields['engine_volume']}л. Всі ТО пройдені вчасно."
        ]
        
        description = random.choice(descriptions)
        
        # Генерируем разные статусы для реалистичных тестовых данных
        # 50% - активные, 20% - на модерации, 15% - черновики, 10% - требуют проверки, 5% - отклоненные
        status_weights = [
            (AdStatusEnum.ACTIVE, 50),
            (AdStatusEnum.PENDING, 20),
            (AdStatusEnum.DRAFT, 15),
            (AdStatusEnum.NEEDS_REVIEW, 10),
            (AdStatusEnum.REJECTED, 5),
        ]
        statuses, weights = zip(*status_weights)
        ad_status = random.choices(statuses, weights=weights)[0]
        
        return {
            'account': account,
            'mark': mark,
            'model': model_name,
            'title': title,
            'description': description,
            'price': Decimal(str(price_uah)),
            'currency': Currency.UAH.value,
            'region': region.name,
            'city': city.name,
            'seller_type': random.choice([SellerType.PRIVATE, SellerType.DEALER]),
            'exchange_status': random.choice([ExchangeStatus.POSSIBLE, ExchangeStatus.NOT_POSSIBLE, None]),
            'dynamic_fields': dynamic_fields,
            'status': ad_status,
            'is_validated': (ad_status == AdStatusEnum.ACTIVE),  # Валидированы только активные
        }

    def _show_statistics(self):
        """Show statistics after seeding."""
        self.stdout.write('\n📊 СТАТИСТИКА ОБЪЯВЛЕНИЙ')
        self.stdout.write('-' * 40)
        
        total_ads = CarAd.objects.count()
        self.stdout.write(f'📍 Всего объявлений: {total_ads}')

        # Statistics by mark
        from django.db.models import Count
        mark_stats = CarAd.objects.values('mark__name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        self.stdout.write('\n🚗 ТОП МАРОК:')
        for stat in mark_stats:
            self.stdout.write(f'   {stat["mark__name"]}: {stat["count"]} объявлений')
        
        # Statistics by region
        region_stats = CarAd.objects.values('region').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        self.stdout.write('\n🗺️ ТОП РЕГИОНОВ:')
        for stat in region_stats:
            self.stdout.write(f'   {stat["region"]}: {stat["count"]} объявлений')
        
        # Price statistics
        from django.db.models import Avg, Min, Max
        price_stats = CarAd.objects.aggregate(
            avg_price=Avg('price'),
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        self.stdout.write('\n💰 СТАТИСТИКА ЦЕН (UAH):')
        if price_stats['avg_price']:
            self.stdout.write(f'   Средняя цена: {price_stats["avg_price"]:,.0f} грн')
            self.stdout.write(f'   Минимальная: {price_stats["min_price"]:,.0f} грн')
            self.stdout.write(f'   Максимальная: {price_stats["max_price"]:,.0f} грн')
        
        # Validation statistics
        validated_count = CarAd.objects.filter(is_validated=True).count()
        validation_rate = (validated_count / total_ads * 100) if total_ads > 0 else 0
        
        self.stdout.write(f'\n✅ Валидированных объявлений: {validated_count} ({validation_rate:.1f}%)')
        
        self.stdout.write('\n🎉 НАПОЛНЕНИЕ ТАБЛИЦЫ ОБЪЯВЛЕНИЙ ЗАВЕРШЕНО!')
        self.stdout.write('💡 Теперь система готова для работы с объявлениями о продаже автомобилей')
