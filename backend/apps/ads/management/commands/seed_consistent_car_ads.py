"""
Management command to seed consistent car advertisements with proper region-city relationships.
"""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from apps.ads.models import (
    CarAd, CarMarkModel, RegionModel, CityModel, CarColorModel
)
from apps.ads.models.car_specification_model import CarSpecificationModel
from apps.ads.models.car_metadata_model import CarMetadataModel
from apps.accounts.models import AddsAccount
from core.enums.cars import (
    Currency, SellerType, ExchangeStatus,
    CarBodyType, FuelType, TransmissionType, DriveType,
    SteeringWheelSide, ConditionType
)
from core.enums.ads import AdStatusEnum


class Command(BaseCommand):
    help = 'Seed consistent car advertisements with proper relationships'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Number of car ads to create (default: 20)'
        )
        parser.add_argument(
            '--with-images',
            action='store_true',
            help='Generate images for each ad using AI generator'
        )

    def handle(self, *args, **options):
        count = options['count']
        with_images = options['with_images']
        
        self.stdout.write(f"🚗 Creating {count} consistent car advertisements...")
        
        with transaction.atomic():
            self.create_car_ads(count, with_images)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Successfully created {count} car advertisements!')
        )

    def create_car_ads(self, count: int, with_images: bool):
        """Create car advertisements with consistent data."""
        
        # Получаем доступные данные
        accounts = list(AddsAccount.objects.all())
        marks = list(CarMarkModel.objects.all())
        colors = list(CarColorModel.objects.all())
        
        # Получаем регионы с городами (консистентные пары)
        region_city_pairs = self.get_consistent_region_city_pairs()
        
        if not accounts:
            self.stdout.write(self.style.ERROR('❌ No accounts found! Please create accounts first.'))
            return
            
        if not marks:
            self.stdout.write(self.style.ERROR('❌ No car marks found! Please seed reference data first.'))
            return
            
        if not colors:
            self.stdout.write(self.style.ERROR('❌ No car colors found! Please seed reference data first.'))
            return
            
        if not region_city_pairs:
            self.stdout.write(self.style.ERROR('❌ No region-city pairs found! Please seed reference data first.'))
            return

        self.stdout.write(f"📊 Found: {len(accounts)} accounts, {len(marks)} marks, {len(colors)} colors, {len(region_city_pairs)} region-city pairs")

        # Шаблоны для генерации объявлений
        car_models = [
            'Golf', 'Passat', 'Polo', 'Jetta', 'Tiguan', 'Touareg',
            'Corolla', 'Camry', 'RAV4', 'Prius', 'Land Cruiser',
            'Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Explorer',
            'A4', 'A6', 'Q5', 'Q7', 'TT',
            '3 Series', '5 Series', 'X3', 'X5', 'Z4'
        ]
        
        conditions = [
            'Отличное состояние, один владелец',
            'Хорошее состояние, регулярное ТО',
            'Нормальное состояние, небольшие царапины',
            'Требует косметического ремонта',
            'После ДТП, восстановлен'
        ]

        for i in range(count):
            try:
                # Выбираем случайные данные
                account = random.choice(accounts)
                mark = random.choice(marks)
                model = random.choice(car_models)
                color = random.choice(colors)
                region, city = random.choice(region_city_pairs)
                
                # Генерируем основные данные
                year = random.randint(2010, 2024)
                mileage = random.randint(10000, 300000)
                price_uah = random.randint(200000, 2000000)
                
                title = f"{mark.name} {model} {year}"
                description = f"{random.choice(conditions)}. Пробег {mileage:,} км. {mark.name} {model} {year} года."
                
                # Создаем объявление
                car_ad = CarAd.objects.create(
                    account=account,
                    mark=mark,
                    model=model,
                    title=title,
                    description=description,
                    price=Decimal(str(price_uah)),
                    currency='UAH',  # Используем строку вместо enum
                    region=region,
                    city=city,
                    seller_type='private',  # Используем строку вместо enum
                    exchange_status='possible',  # Используем строку вместо enum
                    status='active',  # Используем строку вместо enum
                    dynamic_fields={
                        'year': year,
                        'mileage': mileage,
                        'condition': random.choice(['excellent', 'good', 'fair', 'poor'])
                    }
                )
                
                # Создаем технические характеристики
                CarSpecificationModel.objects.create(
                    car_ad=car_ad,
                    year=year,
                    mileage_km=mileage,
                    fuel_type=random.choice(['petrol', 'diesel', 'hybrid']),
                    engine_volume=round(random.uniform(1.0, 4.0), 1),
                    engine_power=random.randint(100, 400),
                    transmission_type=random.choice(['manual', 'automatic']),
                    drive_type=random.choice(['front', 'rear', 'all']),
                    body_type=random.choice(['sedan', 'hatchback', 'suv']),
                    color=color,
                    steering_wheel='left',
                    condition=random.choice(['new', 'used', 'damaged'])
                )
                
                # Создаем метаданные
                CarMetadataModel.objects.create(
                    car_ad=car_ad,
                    is_active=True,
                    is_verified=random.choice([True, False]),
                    is_vip=random.choice([True, False]) if i < 5 else False,  # Первые 5 - VIP
                    is_premium=account.is_premium() if hasattr(account, 'is_premium') else False,
                    views_count=random.randint(0, 1000),
                    phone_views_count=random.randint(0, 100),
                    expires_at=timezone.now() + timezone.timedelta(days=random.randint(15, 60))
                )
                
                self.stdout.write(f"✅ Created ad {i+1}/{count}: {title} in {city.name}, {region.name}")
                
                # Генерируем изображения, если запрошено
                if with_images:
                    self.generate_images_for_ad(car_ad)
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error creating ad {i+1}: {str(e)}')
                )
                continue

    def get_consistent_region_city_pairs(self):
        """Получить консистентные пары регион-город из базы данных."""
        pairs = []
        
        # Получаем все регионы
        regions = RegionModel.objects.all()

        for region in regions:
            # Получаем города для этого региона
            cities = list(CityModel.objects.filter(region=region))
            
            if cities:  # Только если есть города
                for city in cities[:5]:  # Берем максимум 5 городов на регион
                    pairs.append((region, city))
        
        self.stdout.write(f"🌍 Found {len(pairs)} consistent region-city pairs")
        return pairs

    def generate_images_for_ad(self, car_ad):
        """Генерировать изображения для объявления."""
        try:
            import requests
            from apps.ads.models import AddImageModel

            # Подготавливаем данные для генерации
            car_data = {
                'brand': car_ad.mark.name,
                'model': car_ad.model,
                'year': car_ad.dynamic_fields.get('year', 2020),
                'color': car_ad.specs.color.name if hasattr(car_ad, 'specs') and car_ad.specs else 'silver',
                'body_type': car_ad.specs.body_type if hasattr(car_ad, 'specs') and car_ad.specs else 'sedan',
                'condition': car_ad.dynamic_fields.get('condition', 'good')
            }

            # Вызываем генератор изображений
            response = requests.post(
                'http://localhost:8000/api/chat/generate-car-images/',
                json={
                    'car_data': car_data,
                    'angles': ['front', 'side', 'rear'],
                    'style': 'realistic'
                },
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('images'):
                    # Сохраняем сгенерированные изображения
                    for i, image_data in enumerate(result['images']):
                        AddImageModel.objects.create(
                            ad=car_ad,
                            image_url=image_data['url'],
                            is_main=image_data.get('isMain', i == 0),
                            alt_text=f"{car_ad.title} - {image_data.get('title', 'Car image')}",
                            order=i
                        )

                    self.stdout.write(f"🖼️ Generated {len(result['images'])} images for: {car_ad.title}")
                else:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️ No images generated for {car_ad.title}')
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ Image generation failed for {car_ad.title}: HTTP {response.status_code}')
                )

        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'⚠️ Failed to generate images for {car_ad.title}: {str(e)}')
            )
