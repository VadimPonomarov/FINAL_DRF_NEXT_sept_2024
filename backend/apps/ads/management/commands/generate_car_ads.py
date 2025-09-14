"""
Django management command to generate realistic car advertisements with all reference data.
Similar to auto.ria.com listings with AI-generated images.
"""

import os
import random
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from apps.ads.models import (
    CarAd, CarMarkModel, CarModel, CarGenerationModel, CarModificationModel,
    CarColorModel, RegionModel, CityModel, AddImageModel
)
from apps.accounts.models import AddsAccount
from apps.users.models import UserModel
from core.enums.cars import (
    Currency, SellerType, ExchangeStatus, CarBodyType, FuelType,
    TransmissionType, DriveType, SteeringWheelSide, ConditionType
)
from core.services.chat_ai import ChatAI


class Command(BaseCommand):
    help = 'Generate realistic car advertisements with all reference data and AI images'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of car ads to generate (default: 50)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force generation even if ads already exist'
        )
        parser.add_argument(
            '--with-images',
            action='store_true',
            help='Generate AI images for each ad (slower but more realistic)'
        )

    def handle(self, *args, **options):
        """Main handler for generating car ads."""
        try:
            count = options['count']
            force = options['force']
            with_images = options['with_images']
            
            self.stdout.write('🚗 GENERATING REALISTIC CAR ADVERTISEMENTS')
            self.stdout.write('=' * 60)
            
            # Check if ads already exist
            existing_count = CarAd.objects.count()
            if existing_count > 0 and not force:
                self.stdout.write(f'✅ Car ads already exist ({existing_count}), skipping generation')
                self.stdout.write('Use --force to regenerate')
                return
            
            # Load reference data
            self.stdout.write('📊 Loading reference data...')
            reference_data = self._load_reference_data()
            
            if not self._validate_reference_data(reference_data):
                self.stdout.write('❌ Missing reference data. Run auto_populate_references first.')
                return
            
            # Generate accounts if needed
            self.stdout.write('👤 Ensuring demo accounts exist...')
            accounts = self._ensure_demo_accounts()
            
            # Generate car ads
            self.stdout.write(f'🚗 Generating {count} car advertisements...')
            generated_ads = self._generate_car_ads(count, reference_data, accounts, with_images)
            
            self.stdout.write(f'✅ Successfully generated {len(generated_ads)} car advertisements')
            self._print_generation_summary(generated_ads)
            
        except Exception as e:
            self.stdout.write(f'❌ Generation failed: {e}')
            if settings.DEBUG:
                import traceback
                self.stdout.write(f'🐛 Traceback: {traceback.format_exc()}')
            raise

    def _load_reference_data(self):
        """Load all reference data needed for ad generation."""
        return {
            'marks': list(CarMarkModel.objects.all()),
            'models': list(CarModel.objects.all()),
            'generations': list(CarGenerationModel.objects.all()),
            'modifications': list(CarModificationModel.objects.all()),
            'colors': list(CarColorModel.objects.all()),
            'regions': list(RegionModel.objects.filter(is_active=True)),
            'cities': list(CityModel.objects.filter(is_active=True)),
        }

    def _validate_reference_data(self, data):
        """Validate that all required reference data exists."""
        required_counts = {
            'marks': 10,
            'models': 50,
            'colors': 5,
            'regions': 5,
            'cities': 10,
        }
        
        for key, min_count in required_counts.items():
            if len(data[key]) < min_count:
                self.stdout.write(f'❌ Insufficient {key}: {len(data[key])} < {min_count}')
                return False
        
        return True

    def _ensure_demo_accounts(self):
        """Create demo accounts for car ads."""
        accounts = []

        # Create demo accounts with different types
        demo_accounts_data = [
            {'email': 'dealer1@autoria.com', 'organization_name': 'AutoSalon Premium', 'role': 'dealer'},
            {'email': 'dealer2@autoria.com', 'organization_name': 'Cars & More', 'role': 'dealer'},
            {'email': 'private1@autoria.com', 'organization_name': '', 'role': 'seller'},
            {'email': 'private2@autoria.com', 'organization_name': '', 'role': 'seller'},
            {'email': 'private3@autoria.com', 'organization_name': '', 'role': 'seller'},
        ]

        for account_data in demo_accounts_data:
            # Create or get user first
            user, user_created = UserModel.objects.get_or_create(
                email=account_data['email'],
                defaults={
                    'is_active': True,
                    'password': 'demo_password_123'  # Set a default password
                }
            )

            if user_created:
                user.set_password('demo_password_123')
                user.save()
                self.stdout.write(f'✅ Created user: {user.email}')

            # Create or get account
            # Set account type based on role: dealers get PREMIUM, others get BASIC
            account_type = 'PREMIUM' if account_data['role'] == 'dealer' else 'BASIC'

            account, account_created = AddsAccount.objects.get_or_create(
                user=user,
                defaults={
                    'organization_name': account_data['organization_name'],
                    'role': account_data['role'],
                    'account_type': account_type,
                }
            )
            accounts.append(account)

            if account_created:
                self.stdout.write(f'✅ Created account: {account.organization_name or user.email}')

        return accounts

    def _generate_car_ads(self, count, reference_data, accounts, with_images):
        """Generate realistic car advertisements respecting account limitations."""
        generated_ads = []

        # Separate accounts by type and track ad counts
        from core.enums.ads import AccountTypeEnum
        basic_accounts = [acc for acc in accounts if acc.account_type == AccountTypeEnum.BASIC]
        premium_accounts = [acc for acc in accounts if acc.account_type == AccountTypeEnum.PREMIUM]
        account_ad_counts = {acc.id: 0 for acc in accounts}

        self.stdout.write(f'📊 Account distribution: {len(basic_accounts)} basic, {len(premium_accounts)} premium')

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
                        continue

                    ad = self._create_single_ad(reference_data, [selected_account], with_images)
                    generated_ads.append(ad)
                    account_ad_counts[selected_account.id] += 1

                    if (i + 1) % 10 == 0:
                        self.stdout.write(f'   Generated {len(generated_ads)}/{count} ads...')

            except Exception as e:
                self.stdout.write(f'⚠️ Failed to generate ad {i + 1}: {e}')
                continue

        if skipped_count > 0:
            self.stdout.write(f'⚠️ Skipped {skipped_count} ads due to account limits')

        return generated_ads

    def _select_account_for_ad(self, basic_accounts, premium_accounts, account_ad_counts):
        """
        Select an account for creating an ad, respecting account type limitations.

        Basic accounts: max 1 ad
        Premium accounts: unlimited ads (reasonable limit of 50)

        Returns:
            AddsAccount or None if no suitable account available
        """
        import random

        # Try premium accounts first (they have unlimited ads)
        available_premium = [acc for acc in premium_accounts if account_ad_counts[acc.id] < 50]
        if available_premium:
            return random.choice(available_premium)

        # Try basic accounts (max 1 ad each)
        available_basic = [acc for acc in basic_accounts if account_ad_counts[acc.id] == 0]
        if available_basic:
            return random.choice(available_basic)

        # No available accounts
        return None

    def _create_single_ad(self, reference_data, accounts, with_images):
        """Create a single realistic car advertisement."""
        # Select random reference data
        mark = random.choice(reference_data['marks'])
        models_for_mark = [m for m in reference_data['models'] if m.mark_id == mark.id]
        model = random.choice(models_for_mark) if models_for_mark else random.choice(reference_data['models'])
        
        generations_for_model = [g for g in reference_data['generations'] if g.model_id == model.id]
        generation = random.choice(generations_for_model) if generations_for_model else None
        
        modifications_for_gen = []
        if generation:
            modifications_for_gen = [m for m in reference_data['modifications'] if m.generation_id == generation.id]
        modification = random.choice(modifications_for_gen) if modifications_for_gen else None
        
        color = random.choice(reference_data['colors'])
        region = random.choice(reference_data['regions'])
        cities_for_region = [c for c in reference_data['cities'] if c.region_id == region.id]
        city = random.choice(cities_for_region) if cities_for_region else random.choice(reference_data['cities'])
        
        account = random.choice(accounts)
        
        # Generate realistic car data
        year = random.randint(2010, 2024)
        mileage = self._generate_realistic_mileage(year)
        price_usd = self._generate_realistic_price(mark.name, year, mileage)
        
        # Create dynamic fields with realistic data
        dynamic_fields = self._generate_dynamic_fields(mark.name, year)
        
        # Generate title and description
        title = self._generate_title(mark.name, model.name, year, generation.name if generation else None)
        description = self._generate_description(mark.name, model.name, year, mileage, color.name)
        
        # Create the ad
        ad = CarAd.objects.create(
            title=title,
            description=description,
            price=price_usd,
            currency=Currency.USD.value,
            dynamic_fields=dynamic_fields,
            account=account,
            mark=mark,
            model=model,
            generation=generation,
            modification=modification,
            region=region,
            city=city,
            seller_type=SellerType.DEALER.value if account.organization_name.startswith('Auto') else SellerType.PRIVATE.value,
            exchange_status=random.choice([ExchangeStatus.NOT_POSSIBLE, ExchangeStatus.POSSIBLE, ExchangeStatus.CONSIDER]).value,
        )
        
        # Generate AI image if requested
        if with_images:
            self._generate_ad_image(ad, mark.name, model.name, color.name)
        
        return ad

    def _generate_realistic_mileage(self, year):
        """Generate realistic mileage based on car year."""
        current_year = datetime.now().year
        age = current_year - year

        # Average 15,000-20,000 km per year with some variation
        base_mileage = age * random.randint(12000, 25000)

        # Add some randomness
        variation = random.randint(-5000, 10000)
        mileage = max(0, base_mileage + variation)

        return mileage

    def _generate_realistic_price(self, mark_name, year, mileage):
        """Generate realistic price based on mark, year, and mileage."""
        # Base prices by brand (in USD)
        brand_prices = {
            'Toyota': 15000, 'Honda': 14000, 'Volkswagen': 13000, 'BMW': 25000,
            'Mercedes-Benz': 28000, 'Audi': 24000, 'Ford': 12000, 'Chevrolet': 11000,
            'Nissan': 13000, 'Hyundai': 10000, 'Kia': 9000, 'Mazda': 12000,
            'Subaru': 16000, 'Lexus': 30000, 'Infiniti': 22000, 'Acura': 20000,
        }

        base_price = brand_prices.get(mark_name, 12000)

        # Adjust for year (depreciation)
        current_year = datetime.now().year
        age = current_year - year
        depreciation_factor = max(0.3, 1 - (age * 0.08))  # 8% per year, min 30%

        # Adjust for mileage
        mileage_factor = max(0.5, 1 - (mileage / 300000))  # Reduce price for high mileage

        # Calculate final price
        price = base_price * depreciation_factor * mileage_factor

        # Add some randomness
        price *= random.uniform(0.8, 1.2)

        return round(price, -2)  # Round to nearest 100

    def _generate_dynamic_fields(self, mark_name, year):
        """Generate realistic dynamic fields for the car."""
        return {
            'year': year,
            'mileage_km': self._generate_realistic_mileage(year),
            'engine_volume': round(random.uniform(1.0, 4.0), 1),
            'engine_power': random.randint(90, 400),
            'fuel_type': random.choice([FuelType.PETROL, FuelType.DIESEL, FuelType.HYBRID]).value,
            'transmission_type': random.choice([TransmissionType.MANUAL, TransmissionType.AUTOMATIC]).value,
            'drive_type': random.choice([DriveType.FWD, DriveType.RWD, DriveType.AWD]).value,
            'body_type': random.choice([CarBodyType.SEDAN, CarBodyType.HATCHBACK, CarBodyType.SUV, CarBodyType.UNIVERSAL]).value,
            'steering_wheel': SteeringWheelSide.LEFT.value,
            'condition': random.choice([ConditionType.NEW, ConditionType.USED, ConditionType.EMERGENCY]).value,
            'number_of_doors': random.choice([3, 4, 5]),
            'number_of_seats': random.choice([4, 5, 7]),
            'vin': self._generate_vin(),
            'license_plate': self._generate_license_plate(),
            'owners_count': random.randint(1, 3),
        }

    def _generate_vin(self):
        """Generate a realistic VIN number."""
        import string
        chars = string.ascii_uppercase + string.digits
        # Exclude I, O, Q to match real VIN standards
        chars = chars.replace('I', '').replace('O', '').replace('Q', '')
        return ''.join(random.choice(chars) for _ in range(17))

    def _generate_license_plate(self):
        """Generate a Ukrainian license plate."""
        letters = 'ABCEHIKMOPTX'  # Ukrainian license plate letters
        numbers = ''.join([str(random.randint(0, 9)) for _ in range(4)])
        letter_combo = ''.join([random.choice(letters) for _ in range(2)])
        return f"{letter_combo}{numbers}{random.choice(letters)}{random.choice(letters)}"

    def _generate_title(self, mark, model, year, generation=None):
        """Generate a realistic ad title."""
        title_parts = [mark, model]

        if generation:
            title_parts.append(generation)

        title_parts.append(str(year))

        # Add some selling points
        selling_points = [
            'ідеальний стан', 'не біта', 'один власник', 'повна комплектація',
            'економічна', 'надійна', 'сервісна книжка', 'гарантія'
        ]

        if random.random() < 0.3:  # 30% chance to add selling point
            title_parts.append(random.choice(selling_points))

        return ' '.join(title_parts)

    def _generate_description(self, mark, model, year, mileage, color):
        """Generate a realistic ad description."""
        descriptions = [
            f"Продається {mark} {model} {year} року випуску в {color.lower()} кольорі. "
            f"Пробіг {mileage:,} км. Автомобіль в хорошому технічному стані, "
            "регулярно проходив ТО. Всі системи працюють справно.",

            f"Пропоную {mark} {model} {year} р.в. Колір - {color.lower()}. "
            f"Пробіг {mileage:,} км. Машина не біта, не фарбована. "
            "Салон в ідеальному стані. Вкладень не потребує.",

            f"Терміново продається {mark} {model} {year} року. "
            f"Пробіг {mileage:,} км, колір {color.lower()}. "
            "Автомобіль в відмінному стані, один власник з салону. "
            "Повний пакет документів.",
        ]

        base_description = random.choice(descriptions)

        # Add additional features
        features = [
            "кондиціонер", "електросклопідйомники", "центральний замок",
            "ABS", "подушки безпеки", "електродзеркала", "підігрів сидінь",
            "мультимедійна система", "навігація", "камера заднього виду"
        ]

        selected_features = random.sample(features, random.randint(3, 6))
        features_text = f" Комплектація: {', '.join(selected_features)}."

        return base_description + features_text

    def _generate_ad_image(self, ad, mark, model, color):
        """Generate AI image for the car ad using LangChain prompt template."""
        try:
            from langchain.prompts import PromptTemplate

            chat_ai = ChatAI()

            # Extract detailed characteristics from the ad
            characteristics = self._extract_car_characteristics(ad, mark, model, color)

            # Create LangChain prompt template for car image generation
            image_prompt_template = PromptTemplate(
                input_variables=[
                    "mark", "model", "year", "generation", "modification",
                    "color", "body_type", "condition", "engine_type", "transmission"
                ],
                template="""Generate a professional automotive photograph of:

Car Details:
- Brand: {mark}
- Model: {model}
- Year: {year}
- Generation: {generation}
- Modification: {modification}
- Color: {color}
- Body Type: {body_type}
- Condition: {condition}
- Engine: {engine_type}
- Transmission: {transmission}

Photography Requirements:
- Professional automotive photography style
- High quality, detailed, sharp focus
- 3/4 front view angle showing the car's best features
- Natural lighting with soft shadows
- Clean modern background (showroom or outdoor setting)
- Realistic proportions and accurate car design
- Commercial car photography quality
- Show the specific color and body type clearly
- Highlight the car's condition and year-appropriate styling

Style: Photorealistic, commercial quality, automotive magazine style"""
            )

            # Format the prompt with car characteristics
            formatted_prompt = image_prompt_template.format(**characteristics)

            # Generate image and get local file path
            image_url = chat_ai.generate_image(
                prompt=formatted_prompt,
                car_ad_id=ad.id,
                **characteristics
            )

            if image_url:
                # Log the generated image with detailed info
                car_description = f"{characteristics['mark']} {characteristics['model']} {characteristics['year']}"
                self.stdout.write(f'   🖼️ Generated image for {car_description}')
                self.stdout.write(f'      Characteristics: {characteristics}')
                self.stdout.write(f'      URL: {image_url}')

                # TODO: Create AddImageModel record with actual image file
                # This would require downloading the image and saving it as a Django ImageField

        except Exception as e:
            self.stdout.write(f'   ⚠️ Failed to generate image for {mark} {model}: {e}')

    def _extract_car_characteristics(self, ad, mark, model, color):
        """Extract detailed car characteristics for image generation."""
        return {
            'mark': mark,
            'model': model,
            'year': str(ad.dynamic_fields.get('year', 'modern')),
            'generation': ad.generation.name if ad.generation else 'standard',
            'modification': ad.modification.name if ad.modification else 'base',
            'color': color.lower(),
            'body_type': ad.dynamic_fields.get('body_type', 'sedan'),
            'condition': ad.dynamic_fields.get('condition', 'used'),
            'engine_type': ad.dynamic_fields.get('engine_type', 'petrol'),
            'transmission': ad.dynamic_fields.get('transmission', 'manual')
        }

    def _print_generation_summary(self, ads):
        """Print summary of generated ads."""
        if not ads:
            return

        self.stdout.write('\n📊 GENERATION SUMMARY:')
        self.stdout.write('=' * 40)

        # Count by brand
        brands = {}
        for ad in ads:
            brand = ad.mark.name
            brands[brand] = brands.get(brand, 0) + 1

        self.stdout.write('🚗 By Brand:')
        for brand, count in sorted(brands.items(), key=lambda x: x[1], reverse=True)[:10]:
            self.stdout.write(f'   {brand}: {count} ads')

        # Count by seller type
        seller_types = {}
        for ad in ads:
            seller_type = ad.seller_type
            seller_types[seller_type] = seller_types.get(seller_type, 0) + 1

        self.stdout.write('\n👤 By Seller Type:')
        for seller_type, count in seller_types.items():
            self.stdout.write(f'   {seller_type}: {count} ads')

        # Price statistics
        prices = [float(ad.price) for ad in ads if ad.price]
        if prices:
            self.stdout.write(f'\n💰 Price Statistics:')
            self.stdout.write(f'   Average: ${sum(prices)/len(prices):,.0f}')
            self.stdout.write(f'   Min: ${min(prices):,.0f}')
            self.stdout.write(f'   Max: ${max(prices):,.0f}')

        self.stdout.write(f'\n✅ Total generated: {len(ads)} car advertisements')
