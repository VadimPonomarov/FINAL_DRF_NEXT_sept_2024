"""
Management command to generate test ads using the same algorithm as frontend generator.
Generates ads with images using reverse-cascade (Model -> Brand -> Type) selection.
"""
import random
import time
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.ads.models import CarAd
from apps.ads.models.reference import CarModel, RegionModel, CityModel
from apps.accounts.models import AddsAccount
from core.enums.ads import AdStatusEnum
from decimal import Decimal
import json
import requests
from django.conf import settings

UserModel = get_user_model()


class Command(BaseCommand):
    help = 'Generate test car ads with images using reverse-cascade algorithm (Model → Brand → Type)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of test ads to generate (default: 10)'
        )
        parser.add_argument(
            '--with-images',
            action='store_true',
            help='Generate images for each ad (using mock algorithm)'
        )
        parser.add_argument(
            '--image-types',
            type=str,
            default='front,side',
            help='Comma-separated list of image types (front,side,rear,top,interior)'
        )

    def handle(self, *args, **options):
        count = options['count']
        with_images = options['with_images']
        image_types = options['image_types'].split(',') if options['image_types'] else ['front', 'side']

        self.stdout.write(f'🚀 Generating {count} test ads with reverse-cascade algorithm...')
        if with_images:
            self.stdout.write(f'📸 Will generate images for each ad ({", ".join(image_types)})')

        # Get or create test users
        users = self._get_test_users()
        if not users:
            self.stdout.write(self.style.ERROR('❌ No users found. Please create test users first.'))
            return

        # Get reference data
        models = list(CarModel.objects.select_related('mark', 'mark__vehicle_type').all())
        regions = list(RegionModel.objects.all())

        if not models or not regions:
            self.stdout.write(self.style.ERROR('❌ Missing reference data. Please run init_project_data first.'))
            return

        self.stdout.write(f'📊 Found {len(models)} car models and {len(regions)} regions')

        created_ads = []
        for i in range(count):
            try:
                self.stdout.write(f'🔄 Creating test ad {i + 1}/{count}...')

                # 1. Select random user
                user = random.choice(users)

                # 2. REVERSE CASCADE: Select random model → get brand → get type
                model = random.choice(models)
                brand = model.mark
                vehicle_type = brand.vehicle_type

                self.stdout.write(f'   🚗 Selected: {vehicle_type.name} → {brand.name} → {model.name}')

                # 3. Generate ad data
                ad_data = self._generate_ad_data(model, brand, vehicle_type, i + 1)

                # 4. Select random location
                region = random.choice(regions)
                cities = list(region.cities.all())
                city = random.choice(cities) if cities else None

                # 5. Get or create account for user
                account, _ = AddsAccount.objects.get_or_create(
                    user=user,
                    defaults={
                        'organization_name': f"{user.email} Account",
                        'role': 'seller',
                        'account_type': 'PREMIUM'  # Premium for unlimited ads
                    }
                )

                # 6. Create the ad
                ad = CarAd.objects.create(
                    account=account,
                    mark=brand,
                    model=model.name,
                    generation=ad_data['generation'],
                    modification=ad_data['modification'],
                    vehicle_type=vehicle_type,
                    title=ad_data['title'],
                    description=ad_data['description'],
                    price=ad_data['price'],
                    currency=ad_data['currency'],
                    price_usd=ad_data['price_usd'],
                    price_eur=ad_data['price_eur'],
                    region=region,
                    city=city,
                    status=AdStatusEnum.ACTIVE,
                    is_validated=True,
                    dynamic_fields=ad_data['dynamic_fields']
                )

                created_ads.append(ad)
                self.stdout.write(f'   ✅ Created ad #{ad.id}: {ad.title}')

                # 7. Generate images if requested
                if with_images:
                    images_created = self._generate_images_for_ad(ad, ad_data, image_types)
                    
                    if images_created == 0:
                        # КРИТИЧНО: Блокируем объявления с пустыми фото
                        ad.status = 'pending'  # Requires image regeneration
                        ad.save()
                        self.stdout.write(f'   ⚠️ No images generated for ad #{ad.id} - marked as PENDING for regeneration')
                    else:
                        self.stdout.write(f'   📸 Generated {images_created} images for ad #{ad.id}')

                # Small delay to avoid overwhelming the system
                time.sleep(0.5)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   ❌ Error creating ad {i + 1}: {e}'))
                continue

        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully created {len(created_ads)} test ads!'))

        # Print summary
        self._print_summary(created_ads, with_images)

    def _get_test_users(self):
        """Get available test users for ad generation."""
        # Get users with various account types
        users = list(UserModel.objects.filter(
            email__in=[
                'admin@autoria.com',
                'pvs.versia@gmail.com',
                'seller1@gmail.com',
                'seller2@gmail.com',
                'premium.user@example.com',
                'test.user@example.com'
            ]
        ))

        # If no specific users found, use any existing users
        if not users:
            users = list(UserModel.objects.all()[:5])

        return users

    def _generate_ad_data(self, model, brand, vehicle_type, index):
        """Generate ad data similar to frontend mock data generator."""
        # Random specs
        year = random.randint(2015, 2024)
        mileage = random.randint(10000, 200000)
        engine_volume = round(random.uniform(1.4, 4.0), 1)
        power = random.randint(100, 400)

        # Random colors
        colors = ['Чорний', 'Білий', 'Сірий', 'Синій', 'Червоний', 'Срібний', 'Зелений']
        color = random.choice(colors)

        # Random body types by vehicle type
        body_types = {
            'car': ['седан', 'хетчбек', 'універсал', 'купе', 'кабріолет'],
            'truck': ['бортовий', 'тягач', 'самоскид', 'цистерна'],
            'motorcycle': ['спорт', 'круізер', 'турінг', 'ендуро'],
            'bus': ['міжміський', 'міський', 'маршрутка'],
            'van': ['мікроавтобус', 'вантажний', 'пасажирський']
        }

        vehicle_type_key = 'car'  # default
        if vehicle_type.name.lower() in ['грузовой', 'грузовий', 'вантажний']:
            vehicle_type_key = 'truck'
        elif 'мотоцикл' in vehicle_type.name.lower():
            vehicle_type_key = 'motorcycle'
        elif 'автобус' in vehicle_type.name.lower():
            vehicle_type_key = 'bus'
        elif 'фургон' in vehicle_type.name.lower() or 'мінівен' in vehicle_type.name.lower():
            vehicle_type_key = 'van'

        body_type = random.choice(body_types.get(vehicle_type_key, body_types['car']))

        # Fuel types
        fuel_types = ['бензин', 'дизель', 'гібрид', 'електро', 'газ']
        fuel_type = random.choice(fuel_types)

        # Transmission
        transmission = random.choice(['автомат', 'механіка', 'робот', 'варіатор'])

        # Drive type
        drive_type = random.choice(['передній', 'задній', 'повний'])

        # Price calculation
        base_price = random.randint(200000, 1500000)  # UAH
        # Exchange rates (approximate)
        USD_RATE = Decimal('41.65')
        EUR_RATE = Decimal('45.20')

        price_usd = int(Decimal(base_price) / USD_RATE)
        price_eur = int(Decimal(base_price) / EUR_RATE)

        # Generation and modification
        generation = f'{model.name} Generation {random.randint(1, 3)}'
        modification = f'{engine_volume}L {fuel_type.upper()}'

        # Title and description
        title = f'{brand.name} {model.name} {year} - {body_type.capitalize()} - Test Ad {index}'
        description = f"""Тестове оголошення {index}

{brand.name} {model.name} {year} року випуску в чудовому стані.

Основні характеристики:
• Двигун: {engine_volume}л, {power} к.с.
• Коробка передач: {transmission}
• Привід: {drive_type}
• Пальне: {fuel_type}
• Колір: {color}
• Пробіг: {mileage:,} км

Автомобіль знаходиться в відмінному технічному стані, регулярно обслуговувався у офіційного дилера.
Всі документи в порядку, можлива перевірка на СТО.

Торг при огляді. Обмін не розглядаю."""

        # Dynamic fields
        dynamic_fields = {
            'year': year,
            'mileage': mileage,
            'engine_volume': engine_volume,
            'power_hp': power,
            'color': color,
            'body_type': body_type,
            'fuel_type': fuel_type,
            'transmission': transmission,
            'drive_type': drive_type,
            'condition': 'used',
            'seller_type': 'private',
            'exchange_status': 'no_exchange',
            'negotiable': True,
            'vehicle_type_name': vehicle_type.name
        }

        return {
            'title': title,
            'description': description,
            'price': base_price,
            'currency': 'UAH',
            'price_usd': price_usd,
            'price_eur': price_eur,
            'generation': generation,
            'modification': modification,
            'dynamic_fields': dynamic_fields
        }

    def _generate_images_for_ad(self, ad, ad_data, image_types):
        """Generate images for the ad using mock algorithm (Pollinations.ai)."""
        try:
            from apps.ads.models import AddImageModel

            # Prepare car data for image generation
            # КРИТИЧНО: Правильная передача vehicle_type_name для релевантных изображений
            vehicle_type_name = ad.vehicle_type.name if ad.vehicle_type else None
            if not vehicle_type_name:
                self.stdout.write(f'      ⚠️ No vehicle type for ad #{ad.id}, skipping image generation')
                return 0
            
            car_data = {
                'brand': ad.mark.name,
                'model': ad.model,
                'year': ad_data['dynamic_fields'].get('year', 2020),
                'color': ad_data['dynamic_fields'].get('color', 'silver').lower(),
                'body_type': ad_data['dynamic_fields'].get('body_type', 'sedan'),
                'vehicle_type': vehicle_type_name.lower(),  # English version (e.g., 'car', 'truck')
                'vehicle_type_name': vehicle_type_name,  # Original Ukrainian name (e.g., 'Легкові', 'Вантажівки')
                'condition': ad_data['dynamic_fields'].get('condition', 'used'),
                'description': ad.description
            }
            
            self.stdout.write(f'      🚗 Vehicle type: {vehicle_type_name}')

            self.stdout.write(f'   🎨 Generating images for {car_data["brand"]} {car_data["model"]}...')

            # Call backend image generation endpoint
            backend_url = settings.BACKEND_URL if hasattr(settings, 'BACKEND_URL') else 'http://localhost:8000'
            response = requests.post(
                f'{backend_url}/api/chat/generate-car-images-mock/',
                json={
                    'car_data': car_data,
                    'angles': image_types,
                    'style': 'realistic',
                    'use_mock_algorithm': True
                },
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('images'):
                    images_created = 0

                    for idx, img in enumerate(data['images']):
                        url = img.get('url', '').strip()

                        # Skip invalid URLs
                        if not url or 'placeholder' in url.lower():
                            continue

                        # Save image to ad
                        try:
                            AddImageModel.objects.create(
                                ad=ad,
                                image_url=url,
                                caption=img.get('title', f'{ad_data["dynamic_fields"]["body_type"]} view'),
                                is_primary=(idx == 0),
                                order=idx + 1
                            )
                            images_created += 1
                        except Exception as e:
                            self.stdout.write(f'      ⚠️ Failed to save image {idx + 1}: {e}')

                    return images_created
                else:
                    self.stdout.write(f'      ⚠️ No images in response')
            else:
                self.stdout.write(f'      ⚠️ Image generation failed: {response.status_code}')

        except Exception as e:
            self.stdout.write(f'      ❌ Image generation error: {e}')

        return 0

    def _print_summary(self, created_ads, with_images):
        """Print summary of generated ads."""
        if not created_ads:
            return

        self.stdout.write('\n' + '='*60)
        self.stdout.write('📊 TEST ADS GENERATION SUMMARY')
        self.stdout.write('='*60)

        # Group by vehicle type
        by_type = {}
        for ad in created_ads:
            vtype = ad.vehicle_type.name if ad.vehicle_type else 'Unknown'
            if vtype not in by_type:
                by_type[vtype] = []
            by_type[vtype].append(ad)

        for vtype, ads in by_type.items():
            self.stdout.write(f'\n🚗 {vtype}: {len(ads)} ads')
            for ad in ads[:3]:  # Show first 3 examples
                price_str = f'{ad.price:,} UAH'
                self.stdout.write(f'   • {ad.title} - {price_str}')

        # Image statistics
        if with_images:
            from apps.ads.models import AddImageModel
            total_images = AddImageModel.objects.filter(ad__in=created_ads).count()
            self.stdout.write(f'\n📸 Total images created: {total_images}')
            avg_images = total_images / len(created_ads) if created_ads else 0
            self.stdout.write(f'   Average per ad: {avg_images:.1f}')

        self.stdout.write('\n' + '='*60)
        self.stdout.write(f'✅ Total: {len(created_ads)} test ads created successfully!')
        self.stdout.write('='*60)
