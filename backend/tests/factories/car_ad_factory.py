"""
Factory для создания тестовых объявлений автомобилей.
"""
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model

from apps.accounts.models import AddsAccount
from apps.ads.models.car_ad_model import CarAd
from core.enums.ads import AdStatusEnum
from core.enums.cars import Currency

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Factory для создания пользователей."""
    
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True


class AddsAccountFactory(factory.django.DjangoModelFactory):
    """Factory для создания аккаунтов."""
    
    class Meta:
        model = AddsAccount
    
    user = factory.SubFactory(UserFactory)
    organization_name = factory.LazyAttribute(lambda obj: f"{obj.user.email} Account")
    role = 'seller'
    account_type = 'BASIC'


class CarAdFactory(factory.django.DjangoModelFactory):
    """Factory для создания объявлений автомобилей."""
    
    class Meta:
        model = CarAd
    
    title = factory.Faker('sentence', nb_words=6)
    description = factory.Faker('text', max_nb_chars=500)
    price = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True)
    currency = factory.Iterator([Currency.USD, Currency.EUR, Currency.UAH])
    year = factory.Faker('year', minimum=2000, maximum=2024)
    mileage = factory.Faker('random_int', min=0, max=300000)
    brand = factory.Faker('random_element', elements=[
        'Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen',
        'Ford', 'Chevrolet', 'Honda', 'Nissan', 'Hyundai'
    ])
    model = factory.Faker('random_element', elements=[
        'Camry', 'X5', 'C-Class', 'A4', 'Golf',
        'Focus', 'Cruze', 'Civic', 'Altima', 'Elantra'
    ])
    generation = factory.Faker('random_element', elements=[
        'XV70', 'G05', 'W205', 'B9', 'Mk7',
        'Mk3', 'J300', 'FC', 'L33', 'AD'
    ])
    modification = factory.Faker('random_element', elements=[
        '2.5L Hybrid LE', 'xDrive40i', 'C200', '2.0 TFSI', '1.4 TSI',
        '1.6L EcoBoost', '1.4L Turbo', '1.5L VTEC', '2.5L QR25', '1.6L Gamma'
    ])
    color = factory.Faker('random_element', elements=[
        'White', 'Black', 'Silver', 'Gray', 'Red',
        'Blue', 'Green', 'Brown', 'Gold', 'Orange'
    ])
    region = factory.Faker('random_element', elements=[
        'California', 'Texas', 'Florida', 'New York', 'Illinois',
        'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan'
    ])
    city = factory.Faker('random_element', elements=[
        'Los Angeles', 'Houston', 'Miami', 'New York', 'Chicago',
        'Philadelphia', 'Columbus', 'Atlanta', 'Charlotte', 'Detroit'
    ])
    contact_phone = factory.Faker('phone_number')
    contact_email = factory.LazyAttribute(lambda obj: f"contact_{obj.id}@example.com")
    features = factory.LazyFunction(lambda: [
        'Air Conditioning', 'Bluetooth', 'Backup Camera', 'Leather Seats',
        'Sunroof', 'Navigation', 'Heated Seats', 'Remote Start'
    ])
    condition = factory.Faker('random_element', elements=['excellent', 'good', 'fair'])
    fuel_type = factory.Faker('random_element', elements=['gasoline', 'diesel', 'hybrid', 'electric'])
    transmission = factory.Faker('random_element', elements=['manual', 'automatic', 'cvt'])
    body_type = factory.Faker('random_element', elements=['sedan', 'suv', 'hatchback', 'coupe'])
    engine_size = factory.Faker('pyfloat', left_digits=1, right_digits=1, positive=True, min_value=1.0, max_value=6.0)
    horsepower = factory.Faker('random_int', min=100, max=500)
    doors = factory.Faker('random_element', elements=[2, 4, 5])
    seats = factory.Faker('random_element', elements=[2, 4, 5, 7, 8])
    vin = factory.Faker('vin')
    license_plate = factory.Faker('license_plate')
    owners_count = factory.Faker('random_int', min=1, max=5)
    account = factory.SubFactory(AddsAccountFactory)
    status = factory.Iterator([AdStatusEnum.ACTIVE, AdStatusEnum.PENDING, AdStatusEnum.REJECTED])
    
    @factory.post_generation
    def images(self, create, extracted, **kwargs):
        """Создание изображений для объявления."""
        if not create:
            return
        
        if extracted:
            # Если переданы изображения, создаем их
            for i, image_url in enumerate(extracted):
                from apps.ads.models import AddImageModel
                AddImageModel.objects.create(
                    car_ad=self,
                    image_url=image_url,
                    order=i,
                    is_primary=(i == 0)
                )


class PremiumCarAdFactory(CarAdFactory):
    """Factory для создания премиум объявлений."""
    
    account = factory.SubFactory(AddsAccountFactory, account_type='PREMIUM')
    status = AdStatusEnum.ACTIVE
    price = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True, min_value=50000)
    year = factory.Faker('year', minimum=2015, maximum=2024)
    mileage = factory.Faker('random_int', min=0, max=50000)
    condition = 'excellent'
    features = factory.LazyFunction(lambda: [
        'Air Conditioning', 'Bluetooth', 'Backup Camera', 'Leather Seats',
        'Sunroof', 'Navigation', 'Heated Seats', 'Remote Start',
        'Premium Audio', 'Lane Assist', 'Adaptive Cruise Control'
    ])


class BasicCarAdFactory(CarAdFactory):
    """Factory для создания базовых объявлений."""
    
    account = factory.SubFactory(AddsAccountFactory, account_type='BASIC')
    status = AdStatusEnum.PENDING
    price = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True, max_value=30000)
    year = factory.Faker('year', minimum=2000, maximum=2015)
    mileage = factory.Faker('random_int', min=50000, max=200000)
    condition = factory.Faker('random_element', elements=['good', 'fair'])
    features = factory.LazyFunction(lambda: [
        'Air Conditioning', 'Bluetooth', 'Manual Transmission'
    ])


class CarAdWithImagesFactory(CarAdFactory):
    """Factory для создания объявлений с изображениями."""
    
    @factory.post_generation
    def images(self, create, extracted, **kwargs):
        """Создание изображений для объявления."""
        if not create:
            return
        
        # Создаем 3-5 случайных изображений
        import random
        image_count = random.randint(3, 5)
        image_urls = [
            f"https://example.com/images/car_{self.id}_{i}.jpg"
            for i in range(image_count)
        ]
        
        for i, image_url in enumerate(image_urls):
            from apps.ads.models import AddImageModel
            AddImageModel.objects.create(
                car_ad=self,
                image_url=image_url,
                order=i,
                is_primary=(i == 0)
            )
                is_primary=(i == 0)
            )
