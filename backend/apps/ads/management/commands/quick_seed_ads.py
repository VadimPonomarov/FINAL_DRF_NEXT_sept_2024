"""
Быстрое создание тестовых объявлений с правильными изображениями.
Генерация изображений происходит без проверки брендов для ускорения.
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
    help = 'Быстрое создание тестовых объявлений (count параметр)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Количество объявлений для создания (по умолчанию: 10)'
        )

    def handle(self, *args, **options):
        count = options['count']
        self.stdout.write(f'\n🚀 БЫСТРОЕ СОЗДАНИЕ {count} ОБЪЯВЛЕНИЙ')
        self.stdout.write('=' * 60)

        try:
            created = self._create_ads_fast(count)
            self.stdout.write(self.style.SUCCESS(f'\n✅ Создано {created} объявлений'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Ошибка: {e}'))
            raise

    def _create_ads_fast(self, count):
        """Быстрое создание объявлений."""
        # Получаем справочные данные
        marks = list(CarMarkModel.objects.all()[:20])  # Только топ-20 марок
        regions = list(RegionModel.objects.all())
        cities = list(CityModel.objects.all()[:50])  # Только топ-50 городов
        colors = list(CarColorModel.objects.all())
        accounts = list(AddsAccount.objects.all())

        if not all([marks, cities, accounts]):
            self.stdout.write(self.style.ERROR('❌ Недостаточно данных'))
            return 0

        # Популярные модели для быстрой генерации
        popular_models = {
            'Toyota': ['Camry', 'Corolla', 'RAV4', 'Land Cruiser'],
            'BMW': ['3 Series', '5 Series', 'X5', 'X3'],
            'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'S-Class'],
            'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo'],
            'Audi': ['A4', 'A6', 'Q5', 'Q7'],
            'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot'],
            'Ford': ['Focus', 'Fusion', 'Escape', 'F-150'],
            'Nissan': ['Altima', 'Rogue', 'Maxima', 'Pathfinder'],
        }

        created_count = 0

        for i in range(count):
            try:
                with transaction.atomic():
                    mark = random.choice(marks)
                    model_options = popular_models.get(mark.name, ['Model S', 'Model X', 'Model 3'])
                    model_name = random.choice(model_options)
                    
                    color = random.choice(colors)
                    city = random.choice(cities)
                    account = random.choice(accounts)
                    region = city.region if city.region else random.choice(regions)

                    year = random.randint(2010, 2024)
                    mileage = random.randint(10000, 200000)
                    price = random.randint(5000, 50000)

                    # Статусы с весами
                    status_choices = [
                        (AdStatusEnum.ACTIVE, 50),
                        (AdStatusEnum.PENDING, 20),
                        (AdStatusEnum.DRAFT, 15),
                        (AdStatusEnum.NEEDS_REVIEW, 10),
                        (AdStatusEnum.REJECTED, 5),
                    ]
                    statuses, weights = zip(*status_choices)
                    status = random.choices(statuses, weights=weights)[0]

                    ad_data = {
                        'account': account,
                        'title': f'{mark.name} {model_name} {year}',
                        'mark': mark,
                        'model': model_name,
                        'year': year,
                        'mileage': mileage,
                        'color': color,
                        'price': Decimal(str(price)),
                        'currency': Currency.USD,
                        'city': city,
                        'region': region,
                        'seller_type': random.choice(list(SellerType)),
                        'exchange': random.choice([True, False]),
                        'exchange_status': random.choice(list(ExchangeStatus)),
                        'status': status,
                        'is_validated': status == AdStatusEnum.ACTIVE,
                        'description': f'Продается {mark.name} {model_name} {year} года в отличном состоянии. Пробег {mileage} км.',
                    }

                    ad = CarAd.objects.create(**ad_data)
                    created_count += 1

                    if (i + 1) % 5 == 0:
                        self.stdout.write(f'   📊 Создано {created_count}/{count}...')

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'   ⚠️ Ошибка #{i+1}: {e}'))

        return created_count

