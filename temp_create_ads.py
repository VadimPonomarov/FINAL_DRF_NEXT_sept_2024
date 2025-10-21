#!/usr/bin/env python3
"""
Временный скрипт для создания тестовых объявлений модерации
"""
import os
import sys
import django

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.ads.models.car_ad_model import CarAd
from apps.ads.models.reference import CarMarkModel, RegionModel, CityModel
from apps.accounts.models import AddsAccount
from core.enums.ads import AdStatusEnum

User = get_user_model()

def create_test_ads():
    print("🔧 Создание тестовых объявлений для модерации...")
    
    # Получаем пользователя и аккаунт
    user = User.objects.get(email='test@example.com')
    account = AddsAccount.objects.get(user=user)
    
    # Получаем референсные данные
    mark = CarMarkModel.objects.first()
    region = RegionModel.objects.first()
    city = CityModel.objects.first()
    
    if not mark or not region or not city:
        print("❌ Не найдены референсные данные")
        return
    
    # Создаем объявления для модерации
    ads_data = [
        {'title': 'BMW X5 2020 в отличном состоянии', 'status': AdStatusEnum.PENDING, 'model': 'X5', 'price': 45000, 'currency': 'USD'},
        {'title': 'Toyota Camry 2019 с небольшим пробегом', 'status': AdStatusEnum.PENDING, 'model': 'Camry', 'price': 25000, 'currency': 'USD'},
        {'title': 'Mercedes C-Class 2021 преміум комплектація', 'status': AdStatusEnum.NEEDS_REVIEW, 'model': 'C-Class', 'price': 55000, 'currency': 'EUR'},
        {'title': 'Honda Civic 2018 экономичный вариант', 'status': AdStatusEnum.REJECTED, 'model': 'Civic', 'price': 18000, 'currency': 'USD'},
    ]
    
    created_count = 0
    for ad_data in ads_data:
        ad = CarAd.objects.create(
            title=ad_data['title'],
            description=f'Описание для {ad_data["title"]}',
            price=ad_data['price'],
            currency=ad_data['currency'],
            status=ad_data['status'],
            model=ad_data['model'],
            account=account,
            mark=mark,
            region=region,
            city=city,
            dynamic_fields={'year': 2020, 'mileage': 50000}
        )
        print(f'✅ Создано: {ad.title} (ID: {ad.id}, Статус: {ad.status})')
        created_count += 1
    
    print(f'\n🎉 Создано {created_count} объявлений!')
    
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

if __name__ == '__main__':
    create_test_ads()
