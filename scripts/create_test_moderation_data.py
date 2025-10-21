#!/usr/bin/env python3
"""
Скрипт для создания тестовых данных модерации
"""
import os
import sys
import django

# Добавляем корневую папку проекта в PYTHONPATH
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.ads.models.car_ad_model import CarAd
from apps.ads.models.reference import CarMarkModel, RegionModel, CityModel
from core.enums.ads import AdStatusEnum

User = get_user_model()

def create_test_moderation_data():
    """Создать тестовые данные для модерации"""

    print("🔧 Создание тестовых данных модерации...")

    # Получаем или создаем тестового пользователя
    try:
        test_user = User.objects.get(email='test@example.com')
    except User.DoesNotExist:
        test_user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Тестовый',
            last_name='Пользователь',
            is_active=True
        )

    # Получаем референсные данные
    try:
        mark = CarMarkModel.objects.first()
        region = RegionModel.objects.first()
        city = CityModel.objects.first()
    except:
        print("❌ Не найдены референсные данные. Запустите seeding сначала.")
        return

    if not mark or not region or not city:
        print("❌ Не найдены референсные данные.")
        return

    # Создаем тестовые объявления для модерации
    test_ads_data = [
        {
            'title': 'BMW X5 2020 в отличном состоянии',
            'description': 'Продаю BMW X5 2020 года выпуска. Отличное состояние, один владелец, полная сервисная история.',
            'price': 45000,
            'currency': 'USD',
            'status': AdStatusEnum.PENDING,
            'model': 'X5'
        },
        {
            'title': 'Toyota Camry 2019 с небольшим пробегом',
            'description': 'Toyota Camry в идеальном состоянии. Пробег всего 45000 км. Все ТО пройдены timely.',
            'price': 25000,
            'currency': 'USD',
            'status': AdStatusEnum.PENDING,
            'model': 'Camry'
        },
        {
            'title': 'Mercedes C-Class 2021 преміум комплектація',
            'description': 'Mercedes C-Class в максимальной комплектации. Кожаный салон, панорамная крыша, все опции.',
            'price': 55000,
            'currency': 'EUR',
            'status': AdStatusEnum.PENDING,
            'model': 'C-Class'
        },
        {
            'title': 'Honda Civic 2018 экономичный вариант',
            'description': 'Honda Civic 2018 года. Экономичный двигатель 1.5 турбо. Идеально для города.',
            'price': 18000,
            'currency': 'USD',
            'status': AdStatusEnum.NEEDS_REVIEW,
            'model': 'Civic'
        },
        {
            'title': 'Audi A4 2020 спорт версия',
            'description': 'Audi A4 в спортивной комплектации S-line. Полный привод quattro, спортивная подвеска.',
            'price': 42000,
            'currency': 'EUR',
            'status': AdStatusEnum.REJECTED,
            'model': 'A4'
        }
    ]

    created_count = 0

    for ad_data in test_ads_data:
        try:
            # Проверяем, существует ли уже такое объявление
            existing_ad = CarAd.objects.filter(
                title=ad_data['title'],
                account=test_user.addsaccount
            ).first()

            if existing_ad:
                print(f"⚠️ Объявление уже существует: {ad_data['title']}")
                continue

            # Создаем новое объявление
            ad = CarAd.objects.create(
                title=ad_data['title'],
                description=ad_data['description'],
                price=ad_data['price'],
                currency=ad_data['currency'],
                status=ad_data['status'],
                model=ad_data['model'],
                account=test_user.addsaccount,
                mark=mark,
                region=region,
                city=city,
                dynamic_fields={
                    'year': 2020,
                    'mileage': 50000,
                    'fuel_type': 'Бензин',
                    'transmission': 'Автомат',
                    'body_type': 'Седан',
                    'color': 'Черный',
                    'condition': 'Отличное'
                }
            )

            print(f"✅ Создано объявление: {ad.title} (ID: {ad.id}, Статус: {ad.status})")
            created_count += 1

        except Exception as e:
            print(f"❌ Ошибка при создании объявления '{ad_data['title']}': {str(e)}")

    print(f"\n🎉 Создано {created_count} тестовых объявлений для модерации!")

    # Показываем статистику
    stats = {
        'pending': CarAd.objects.filter(status=AdStatusEnum.PENDING).count(),
        'needs_review': CarAd.objects.filter(status=AdStatusEnum.NEEDS_REVIEW).count(),
        'rejected': CarAd.objects.filter(status=AdStatusEnum.REJECTED).count(),
        'active': CarAd.objects.filter(status=AdStatusEnum.ACTIVE).count(),
        'blocked': CarAd.objects.filter(status=AdStatusEnum.BLOCKED).count(),
    }

    print("\n📊 Статистика объявлений:")
    for status, count in stats.items():
        print(f"   {status}: {count}")

    print("
🔗 Теперь откройте http://localhost:3000/autoria/moderation чтобы увидеть объявления для модерации!"
if __name__ == '__main__':
    create_test_moderation_data()