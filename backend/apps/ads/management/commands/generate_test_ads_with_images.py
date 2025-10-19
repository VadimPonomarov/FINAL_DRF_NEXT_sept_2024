"""
Django management command to generate test car ads with guaranteed images.
Simplified version that focuses on reliable image generation.
"""

import random
import urllib.parse
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.ads.models import (
    CarAd, 
    AddImageModel,
    VehicleTypeModel,
    CarMarkModel,
    CarModelModel,
    RegionModel,
    CityModel
)
from apps.accounts.models import AddsAccount
from core.enums.ads import AccountTypeEnum, AdStatusEnum

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate test car ads with guaranteed images using pollinations.ai'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of test ads to generate (default: 10)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test ads before generating new ones'
        )
        parser.add_argument(
            '--images-per-ad',
            type=int,
            default=3,
            help='Number of images per ad (default: 3)'
        )

    def handle(self, *args, **options):
        count = options['count']
        clear_existing = options['clear']
        images_per_ad = options['images_per_ad']
        
        self.stdout.write('🚗 ГЕНЕРАЦИЯ ТЕСТОВЫХ ОБЪЯВЛЕНИЙ С ИЗОБРАЖЕНИЯМИ')
        self.stdout.write('=' * 70)
        
        if clear_existing:
            self.clear_test_data()
        
        # Получаем или создаем тестового пользователя
        test_user = self.get_or_create_test_user()
        
        # Получаем данные для генерации
        vehicle_types = list(VehicleTypeModel.objects.all()[:3])  # Берем первые 3 типа
        regions = list(RegionModel.objects.all()[:5])  # Берем первые 5 регионов
        
        if not vehicle_types:
            self.stdout.write(self.style.ERROR('❌ Нет типов транспорта в базе!'))
            return
        
        self.stdout.write(f'\n📊 Параметры генерации:')
        self.stdout.write(f'   Количество объявлений: {count}')
        self.stdout.write(f'   Изображений на объявление: {images_per_ad}')
        self.stdout.write(f'   Пользователь: {test_user.email}')
        
        self.stdout.write(f'\n🎨 Генерация объявлений...')
        self.stdout.write('-' * 70)
        
        success_count = 0
        error_count = 0
        
        for i in range(count):
            try:
                with transaction.atomic():
                    # Выбираем случайный тип транспорта
                    vehicle_type = random.choice(vehicle_types)
                    
                    # Получаем марки для этого типа
                    marks = list(CarMarkModel.objects.filter(vehicle_type=vehicle_type)[:20])
                    if not marks:
                        self.stdout.write(self.style.WARNING(f'⚠️  Нет марок для типа {vehicle_type.name}'))
                        continue
                    
                    mark = random.choice(marks)
                    
                    # Получаем модели для этой марки
                    models = list(CarModelModel.objects.filter(mark=mark)[:10])
                    model = random.choice(models) if models else None
                    
                    # Генерируем данные объявления
                    year = random.randint(2010, 2024)
                    price = Decimal(random.randint(5000, 50000))
                    mileage = random.randint(10000, 200000)
                    
                    colors = ['black', 'white', 'silver', 'blue', 'red', 'gray', 'green']
                    color = random.choice(colors)
                    
                    # Выбираем регион и город (обязательные поля)
                    if not regions:
                        self.stdout.write(self.style.WARNING(f'⚠️  Нет регионов в базе, пропускаем объявление'))
                        continue

                    region = random.choice(regions)
                    cities = list(CityModel.objects.filter(region=region))

                    if not cities:
                        self.stdout.write(self.style.WARNING(f'⚠️  Нет городов для региона {region.name}, пропускаем объявление'))
                        continue

                    city = random.choice(cities)
                    
                    # Получаем или создаем аккаунт для пользователя
                    account, _ = AddsAccount.objects.get_or_create(
                        user=test_user,
                        defaults={'account_type': AccountTypeEnum.BASIC.value}
                    )

                    # Создаем объявление
                    model_name = model.name if model else 'Unknown Model'
                    title = f"{mark.name} {model_name} {year} - Test Ad {i+1}"

                    car_ad = CarAd.objects.create(
                        account=account,
                        mark=mark,
                        model=model_name,  # model это CharField, не ForeignKey
                        title=title,
                        description=f"Test advertisement for {mark.name} {model_name}. Generated automatically for testing purposes.",
                        price=price,
                        currency='USD',
                        status=AdStatusEnum.ACTIVE.value,
                        region=region,
                        city=city,
                        dynamic_fields={
                            'year': year,
                            'mileage': mileage,
                            'color': color,
                            'body_type': 'sedan',
                            'fuel_type': 'gasoline',
                            'transmission': 'automatic'
                        }
                    )
                    
                    self.stdout.write(f'\n{i+1}/{count}. ✅ Создано объявление ID {car_ad.id}: {title[:50]}')
                    
                    # Генерируем изображения
                    images_created = self.generate_images_for_ad(
                        car_ad, 
                        mark.name, 
                        model_name, 
                        year, 
                        color,
                        images_per_ad
                    )
                    
                    if images_created > 0:
                        success_count += 1
                        self.stdout.write(self.style.SUCCESS(f'   ✅ Добавлено {images_created} изображений'))
                    else:
                        self.stdout.write(self.style.WARNING(f'   ⚠️  Не удалось добавить изображения'))
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'\n{i+1}/{count}. ❌ Ошибка: {str(e)[:100]}'))
                continue
        
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'✅ Успешно создано: {success_count}/{count}'))
        if error_count > 0:
            self.stdout.write(self.style.WARNING(f'⚠️  Ошибок: {error_count}'))
        self.stdout.write(self.style.SUCCESS('\n🎉 Генерация завершена!'))
    
    def clear_test_data(self):
        """Удаляет тестовые объявления."""
        self.stdout.write('\n🧹 Удаление существующих тестовых объявлений...')
        deleted_count = CarAd.objects.filter(title__contains='Test Ad').delete()[0]
        self.stdout.write(f'   Удалено объявлений: {deleted_count}')
    
    def get_or_create_test_user(self):
        """Получает или создает тестового пользователя."""
        email = 'test@test.com'
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'is_active': True}
        )
        
        if created:
            user.set_password('test123')
            user.save()
            self.stdout.write(f'✅ Создан тестовый пользователь: {email}')
        
        # Создаем или получаем аккаунт
        account, _ = AddsAccount.objects.get_or_create(
            user=user,
            defaults={'account_type': AccountTypeEnum.BASIC.value}
        )
        
        return user
    
    def generate_images_for_ad(self, car_ad, mark_name, model_name, year, color, count=3):
        """Генерирует изображения для объявления используя pollinations.ai."""
        angles = ['front', 'side', 'rear', 'interior', 'dashboard']
        images_created = 0
        
        for i in range(min(count, len(angles))):
            try:
                angle = angles[i]
                
                # Создаем промпт
                prompt = f"Professional photo of {year} {mark_name} {model_name}, {color} color, {angle} view, high quality, automotive photography, studio lighting"
                
                # Кодируем промпт для URL
                encoded_prompt = urllib.parse.quote(prompt)
                
                # Создаем уникальный seed
                seed = (car_ad.id * 1000) + i
                
                # Генерируем URL через pollinations.ai
                image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}"
                
                # Сохраняем в базу
                AddImageModel.objects.create(
                    ad=car_ad,
                    image_url=image_url,
                    caption=f"{mark_name} {model_name} - {angle} view",
                    order=i,
                    is_primary=(i == 0)
                )
                
                images_created += 1
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'   ⚠️  Ошибка создания изображения {angle}: {str(e)[:50]}'))
                continue
        
        return images_created

