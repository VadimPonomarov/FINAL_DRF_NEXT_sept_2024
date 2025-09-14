"""
Management command to generate mock car advertisements using LLM for AutoRia clone demonstration.
This command creates realistic car ads with all necessary data and relationships.
"""
import random
import json
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.ads.models import CarAd, CarMarkModel
from apps.accounts.models import AddsAccount
from core.enums.ads import AccountTypeEnum
from core.enums.ads import AdStatusEnum
from apps.ads.services.llm_service import LLMService

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate mock car advertisements using LLM for AutoRia clone demonstration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of mock ads to generate (default: 50)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing ads before generating new ones'
        )

    def handle(self, *args, **options):
        count = options['count']
        clear_existing = options['clear']

        self.stdout.write(f'🚗 Generating {count} mock car advertisements for AutoRia clone...')

        if clear_existing:
            self.clear_existing_data()

        # Initialize data
        self.create_test_users()
        self.create_car_marks_and_models()
        
        # Generate ads
        with transaction.atomic():
            for i in range(count):
                try:
                    self.generate_single_ad(i + 1)
                    if (i + 1) % 10 == 0:
                        self.stdout.write(f'✅ Generated {i + 1}/{count} ads')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Failed to generate ad {i + 1}: {str(e)}')
                    )

        self.stdout.write(
            self.style.SUCCESS(f'🎉 Successfully generated {count} mock advertisements!')
        )
        self.print_statistics()

    def clear_existing_data(self):
        """Clear existing test data."""
        self.stdout.write('🧹 Clearing existing test data...')
        CarAd.objects.filter(title__contains='[MOCK]').delete()
        User.objects.filter(email__contains='mock').delete()

    def create_test_users(self):
        """Create test users with different account types."""
        self.stdout.write('👥 Creating test users...')
        
        self.test_users = []
        
        # Create users with different account types
        user_data = [
            ('mock.basic1@autoria.com', 'Basic', 'User1', AccountTypeEnum.BASIC),
            ('mock.basic2@autoria.com', 'Basic', 'User2', AccountTypeEnum.BASIC),
            ('mock.premium1@autoria.com', 'Premium', 'User1', AccountTypeEnum.PREMIUM),
            ('mock.premium2@autoria.com', 'Premium', 'User2', AccountTypeEnum.PREMIUM),
            ('mock.premium3@autoria.com', 'Premium', 'User3', AccountTypeEnum.PREMIUM),
        ]
        
        for email, first_name, last_name, account_type in user_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'is_active': True
                }
            )

            if created:
                user.set_password('mockpass123')
                user.save()

                # Create profile with name and surname
                from apps.users.models import ProfileModel
                ProfileModel.objects.create(
                    user=user,
                    name=first_name,
                    surname=last_name
                )
            
            # Create account
            account, _ = AddsAccount.objects.get_or_create(
                user=user,
                defaults={
                    'account_type': account_type
                }
            )
            
            self.test_users.append((user, account))

    def create_car_marks_and_models(self):
        """Create car marks and models for all vehicle types."""
        self.stdout.write('🏭 Creating car marks and models for all vehicle types...')

        # Use existing marks from database instead of hardcoded data
        from apps.ads.models import VehicleTypeModel

        # Get all available vehicle types
        vehicle_types = list(VehicleTypeModel.objects.all())
        if not vehicle_types:
            self.stdout.write(self.style.ERROR('❌ No vehicle types found. Please run auto_populate_references first.'))
            return

        # Get all available marks for all vehicle types
        all_marks = list(CarMarkModel.objects.select_related('vehicle_type').all())
        if not all_marks:
            self.stdout.write(self.style.ERROR('❌ No car marks found. Please run auto_populate_references first.'))
            return

        # Group marks by vehicle type for easy selection
        self.marks_by_vehicle_type = {}
        for mark in all_marks:
            vehicle_type_name = mark.vehicle_type.name
            if vehicle_type_name not in self.marks_by_vehicle_type:
                self.marks_by_vehicle_type[vehicle_type_name] = []
            self.marks_by_vehicle_type[vehicle_type_name].append(mark)

        # Get models for each mark (from existing database)
        from apps.ads.models import CarModel
        self.models_by_mark = {}
        for mark in all_marks:
            models = list(CarModel.objects.filter(mark=mark).values_list('name', flat=True))
            if models:
                self.models_by_mark[mark.id] = models
            else:
                # Fallback models if none exist in database
                self.models_by_mark[mark.id] = [f'Model {mark.name}']

        self.stdout.write(f'✅ Found {len(all_marks)} marks across {len(vehicle_types)} vehicle types')
        for vt_name, marks in self.marks_by_vehicle_type.items():
            self.stdout.write(f'  - {vt_name}: {len(marks)} marks')

    def generate_single_ad(self, index):
        """Generate a single advertisement for random vehicle type using LLM."""
        # Select random vehicle type and mark
        vehicle_type_name = random.choice(list(self.marks_by_vehicle_type.keys()))
        mark = random.choice(self.marks_by_vehicle_type[vehicle_type_name])
        model_name = random.choice(self.models_by_mark[mark.id])
        user, account = random.choice(self.test_users)

        # Generate vehicle specifications based on type
        specs = self.generate_vehicle_specs(mark.name, model_name, vehicle_type_name)

        # Generate LLM content
        llm_content = self.generate_llm_content(mark.name, model_name, specs, vehicle_type_name)

        # Get random region and city objects
        from apps.ads.models import RegionModel, CityModel

        # Try to get existing regions and cities, or create fallback
        try:
            regions = list(RegionModel.objects.all()[:6])  # Get first 6 regions
            if not regions:
                # Create a fallback region if none exist
                region = RegionModel.objects.create(name='Київська область')
            else:
                region = random.choice(regions)
        except Exception:
            region = RegionModel.objects.create(name='Київська область')

        try:
            cities = list(CityModel.objects.filter(region=region)[:3])  # Get cities in this region
            if not cities:
                # Create a fallback city if none exist
                city = CityModel.objects.create(name='Київ', region=region)
            else:
                city = random.choice(cities)
        except Exception:
            city = CityModel.objects.create(name='Київ', region=region)

        # Create the ad
        car_ad = CarAd.objects.create(
            account=account,
            mark=mark,  # Use the mark object directly
            model=model_name,
            title=f"[MOCK] {llm_content['title']}",
            description=llm_content['description'],
            price=specs['price'],
            currency=random.choice(['USD', 'EUR', 'UAH']),
            dynamic_fields=specs,
            region=region,
            city=city,
            status=random.choices([
                AdStatusEnum.ACTIVE,
                AdStatusEnum.PENDING,
                AdStatusEnum.SOLD
            ], weights=[70, 20, 10])[0],
            is_validated=True,
            created_at=self.random_date()
        )

        # Generate images for the ad
        try:
            self.generate_images_for_ad(car_ad, mark.name, model_name, specs, vehicle_type_name)
        except Exception as e:
            self.stdout.write(f'⚠️ Image generation failed for ad {car_ad.id}: {str(e)}')

        return car_ad

    def generate_images_for_ad(self, car_ad, mark_name, model_name, specs, vehicle_type):
        """Generate images using the same approach as the frontend form editor."""
        try:
            # Use the frontend API approach for consistency
            self._generate_images_via_frontend_api(car_ad, mark_name, model_name, specs, vehicle_type)

        except Exception as e:
            self.stdout.write(f'❌ Error generating images for ad {car_ad.id}: {str(e)}')
            # Create placeholder images as fallback
            self._create_placeholder_images(car_ad, mark_name, model_name, ['front', 'side'])

    def _generate_images_via_frontend_api(self, car_ad, mark_name, model_name, specs, vehicle_type):
        """Generate images using direct function calls (same logic as frontend form editor)."""
        try:
            # Import the backend image generation functions directly
            from apps.chat.views.image_generation_views import create_car_image_prompt, generate_placeholder_url, get_angle_title
            import json
            import hashlib
            import time
            import logging

            logger = logging.getLogger(__name__)

            # Build canonical car data (same as frontend)
            canonical_data = self._build_canonical_car_data(mark_name, model_name, specs, vehicle_type)
            self.stdout.write(f'🔍 Debug canonical_data: {canonical_data}')

            # Create session ID for consistency (same as frontend)
            session_data = f"{canonical_data['brand']}_{canonical_data['model']}_{canonical_data['year']}_{canonical_data['color']}_{canonical_data['body_type']}"
            car_session_id = hashlib.md5(f"{session_data}_{int(time.time())}".encode()).hexdigest()[:8]

            # Add session_id to canonical_data for seed consistency
            canonical_data['session_id'] = f"CAR-{car_session_id}"

            # Define angles based on vehicle type
            angles = self._get_angles_for_vehicle_type(vehicle_type)

            self.stdout.write(f'🎨 Generating {len(angles)} images for {mark_name} {model_name} ({vehicle_type})')
            self.stdout.write(f'🔗 Session ID: CAR-{car_session_id} (ensures consistency)')

            # Generate images directly using the same logic as the view
            generated_images = []
            style = 'realistic'

            # Check if G4F is available
            try:
                from g4f.client import Client
                G4F_AVAILABLE = True
            except ImportError:
                G4F_AVAILABLE = False
                logger.warning("g4f not available, using placeholders")

            for index, angle in enumerate(angles):
                try:
                    prompt = create_car_image_prompt(canonical_data, angle, style, car_session_id)
                    # Simple translation without LLM to avoid prompt distortion
                    english_prompt = self._simple_translate_to_english(prompt, canonical_data)

                    # Use pollinations.ai directly for consistent image generation
                    try:
                        import urllib.parse
                        # Create pollinations.ai URL with encoded prompt and seed for consistency
                        encoded_prompt = urllib.parse.quote(english_prompt)
                        # Use session_id as seed to ensure all images in series look consistent
                        session_id = canonical_data.get('session_id', 'DEFAULT')
                        seed = abs(hash(session_id)) % 1000000  # Convert session_id to numeric seed
                        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=600&model=flux&enhance=true&seed={seed}"

                        # Log full URL for manual testing
                        brand = canonical_data.get('brand', 'Unknown')
                        self.stdout.write(f'🔗 TESTING URL for {brand} {angle}: {image_url}')
                        self.stdout.write(f'📝 Expected: {brand} logos only, check for wrong logos!')
                    except Exception as e:
                        logger.warning(f"Pollinations generation failed for {angle}: {e}")
                        image_url = generate_placeholder_url(prompt)
                        self.stdout.write(f'⚠️ Pollinations failed for {angle}, using placeholder: {str(e)[:50]}...')

                    generated_images.append({
                        'url': image_url,
                        'angle': angle,
                        'title': get_angle_title(angle, canonical_data),
                        'isMain': index == 0,
                        'prompt': prompt,
                        'success': True
                    })

                except Exception as e:
                    logger.error(f"Failed to generate image for angle {angle}: {e}")
                    generated_images.append({
                        'url': generate_placeholder_url(f"{mark_name} {model_name} {angle}"),
                        'angle': angle,
                        'title': get_angle_title(angle, canonical_data),
                        'isMain': index == 0,
                        'prompt': f"{mark_name} {model_name} {angle}",
                        'success': False
                    })

            # Save generated images to database
            if generated_images:
                self._save_generated_images(generated_images, car_ad)
                self.stdout.write(f'✅ Generated {len(generated_images)} images for ad {car_ad.id}')
                self.stdout.write(f'   📐 Angles: {", ".join([img.get("angle", "unknown") for img in generated_images])}')
            else:
                self.stdout.write(f'⚠️ No images generated')
                self._create_placeholder_images(car_ad, mark_name, model_name, angles)

        except Exception as e:
            self.stdout.write(f'❌ Error in direct image generation: {str(e)}')
            self._create_placeholder_images(car_ad, mark_name, model_name, angles)

    def _simple_translate_to_english(self, prompt, canonical_data):
        """Create ultra-strict English prompt with strong brand and type enforcement."""
        brand = canonical_data.get('brand', '')
        model = canonical_data.get('model', '')
        year = canonical_data.get('year', '')
        color = canonical_data.get('color', '')
        vehicle_type = canonical_data.get('vehicle_type', 'car')
        session_id = canonical_data.get('session_id', 'UNKNOWN')

        # Get detailed vehicle type description for AI
        vehicle_description = self._get_detailed_vehicle_description(vehicle_type, brand, model, year, color)

        # Simple mapping for Ukrainian colors to English
        color_mapping = {
            'червоний': 'red', 'синій': 'blue', 'зелений': 'green',
            'жовтий': 'yellow', 'білий': 'white', 'чорний': 'black',
            'сірий': 'gray', 'срібний': 'silver', 'коричневий': 'brown'
        }
        english_color = color_mapping.get(color.lower(), color)

        # Transliterate Cyrillic brand and model names for AI understanding
        english_brand = self._transliterate_brand(brand)
        english_model = self._transliterate_text(model)

        # Extract angle from prompt
        if 'front' in prompt.lower():
            angle = 'front'
        elif 'rear' in prompt.lower():
            angle = 'rear'
        elif 'side' in prompt.lower():
            angle = 'side'
        elif 'top' in prompt.lower():
            angle = 'top'
        elif 'interior' in prompt.lower():
            angle = 'interior'
        elif 'dashboard' in prompt.lower():
            angle = 'dashboard'
        elif 'engine' in prompt.lower():
            angle = 'engine'
        elif 'details' in prompt.lower():
            angle = 'details'
        elif 'wheels' in prompt.lower():
            angle = 'wheels'
        else:
            angle = 'front'

        # Simple angle descriptions
        angle_descriptions = {
            'front': 'front view',
            'rear': 'rear view',
            'side': 'side profile view',
            'top': 'top view from above',
            'interior': 'interior cabin view',
            'dashboard': 'dashboard close-up',
            'engine': 'engine bay view',
            'details': 'detail close-up',
            'wheels': 'wheels and tires detail'
        }
        angle_desc = angle_descriptions.get(angle, 'front view')

        # Get detailed vehicle type description
        vehicle_description = self._get_detailed_vehicle_description(vehicle_type, brand, model, year, color)

        # Safe brand handling - use logos only for well-known brands
        if self._is_safe_brand_for_logos(english_brand):
            # Use brand-specific prompt for well-known brands
            negative_brands = self._get_negative_brands_for(english_brand)
            english_prompt = f"Generate a {vehicle_description} {english_brand} {english_model} {year} model in {english_color} color, {angle_desc}, ONLY {english_brand} brand logos and styling, {negative_brands}, high quality, photorealistic, clean background, studio lighting, series ID {session_id}"
        else:
            # Safe mode: no logos for uncertain brands
            english_prompt = f"Generate a {vehicle_description} in {english_color} color, {angle_desc}, clean design, no visible logos, no brand badges, no text, high quality, photorealistic, clean background, studio lighting, series ID {session_id}"

        return english_prompt

    def _get_detailed_vehicle_description(self, vehicle_type, brand, model, year, color):
        """Get detailed vehicle type description for AI prompt."""
        descriptions = {
            'car': 'passenger car vehicle (sedan/hatchback/coupe)',
            'truck': 'commercial truck vehicle (cargo/freight truck)',
            'bus': 'passenger bus vehicle (city bus/coach)',
            'motorcycle': 'motorcycle vehicle (motorbike/scooter)',
            'trailer': 'trailer vehicle (semi-trailer/cargo trailer)',
            'special': 'special purpose vehicle (construction/utility equipment)',
            'agricultural': 'agricultural vehicle (tractor/farming equipment)',
            'boat': 'watercraft vehicle (boat/yacht/marine vessel)'
        }
        return descriptions.get(vehicle_type, 'motor vehicle')

    def _transliterate_text(self, text):
        """Transliterate Cyrillic text to Latin for AI understanding."""
        if not text:
            return text

        # Cyrillic to Latin mapping
        cyrillic_to_latin = {
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'ZH',
            'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
            'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'KH', 'Ц': 'TS',
            'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SHCH', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
            'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
            'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        }

        result = ''
        for char in text:
            result += cyrillic_to_latin.get(char, char)
        return result

    def _transliterate_brand(self, brand):
        """Transliterate Cyrillic brand names to Latin for AI understanding."""
        # Known Ukrainian/Russian automotive brands mapping
        cyrillic_brands = {
            'БАЗ': 'BAZ',
            'ГАЗ': 'GAZ',
            'ЗАЗ': 'ZAZ',
            'УАЗ': 'UAZ',
            'ВАЗ': 'VAZ',
            'КАМАЗ': 'KAMAZ',
            'МАЗ': 'MAZ',
            'МЗКТ': 'MZKT',
            'ЛАЗ': 'LAZ',
            'ЛиАЗ': 'LiAZ',
            'ПАЗ': 'PAZ',
            'КрАЗ': 'KrAZ',
            'Богдан': 'Bogdan',
            'Еталон': 'Etalon',
            'ТОВ Трактор': 'Traktor'
        }

        # Check if brand is in known Cyrillic brands
        if brand in cyrillic_brands:
            return cyrillic_brands[brand]

        # Simple transliteration for other Cyrillic text
        cyrillic_to_latin = {
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
            'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
            'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
            'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SHCH',
            'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        }

        # Transliterate character by character
        result = ''
        for char in brand:
            result += cyrillic_to_latin.get(char, char)

        return result

    def _get_negative_brands_for(self, brand):
        """Generate specific negative prompts for brands that are commonly confused."""
        # Common brand confusions that AI makes
        brand_confusions = {
            'Daewoo': ['Toyota', 'Honda', 'Hyundai', 'Kia'],
            'Lotus': ['Ferrari', 'Lamborghini', 'Porsche'],
            'Citroen': ['Peugeot', 'Renault', 'Opel'],
            'TATA': ['Toyota', 'Mahindra', 'Ashok Leyland'],
            'LDV': ['Ford', 'Mercedes', 'Iveco'],
            'Geeli': ['Honda', 'Yamaha', 'Suzuki'],
            'TM Racing': ['KTM', 'Husqvarna', 'Beta'],
            'TaiLG': ['Honda', 'Yamaha', 'Suzuki'],
            'HFR': ['Krone', 'Schmitz', 'Kogel'],
            'Howo': ['Volvo', 'Scania', 'MAN']
        }

        # Get confused brands for this specific brand
        confused_with = brand_confusions.get(brand, [])

        if confused_with:
            return f"NOT {', NOT '.join(confused_with)} logos"

        # Default negative prompt for unknown brands
        return "NOT Toyota, NOT Honda, NOT BMW logos"

    def _is_safe_brand_for_logos(self, brand):
        """Determine if brand is safe to use with logos (well-known brands that AI recognizes correctly)."""
        # Well-known brands that AI usually gets right
        safe_brands = {
            # Major car manufacturers
            'Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Ford', 'Chevrolet',
            'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Volvo', 'Jaguar', 'Land Rover',
            'Porsche', 'Ferrari', 'Lamborghini', 'Bentley', 'Rolls-Royce', 'Maserati',
            'Peugeot', 'Renault', 'Citroen', 'Fiat', 'Alfa Romeo', 'Lancia',
            'Opel', 'Skoda', 'SEAT', 'Lexus', 'Infiniti', 'Acura', 'Genesis',

            # Major motorcycle brands
            'Harley-Davidson', 'Yamaha', 'Suzuki', 'Kawasaki', 'Ducati', 'KTM',
            'Triumph', 'Indian', 'Victory', 'Aprilia', 'MV Agusta',

            # Major truck/bus brands
            'Scania', 'Volvo', 'MAN', 'Mercedes-Benz', 'Iveco', 'DAF', 'Renault Trucks',
            'Freightliner', 'Peterbilt', 'Kenworth', 'Mack', 'International',

            # Major trailer brands
            'Schmitz', 'Krone', 'Kogel', 'Wielton', 'Fruehauf'
        }

        # Check if brand is in safe list (case-insensitive)
        return brand in safe_brands or brand.lower() in [b.lower() for b in safe_brands]

    def _create_detailed_car_prompt(self, brand, model, year, color, vehicle_type, angle, session_id):
        """Create detailed car prompt based on working revision structure."""

        # Build canonical car data structure
        canonical_data = {
            'brand': brand,
            'model': model,
            'year': year,
            'color': color,
            'body_type': 'sedan',  # Default, will be overridden by vehicle type
            'vehicle_type': vehicle_type,
            'condition': 'excellent',
            'description': f'{brand} {model} {year} {color} in excellent condition',
            'session_id': session_id  # Add session_id for seed consistency
        }

        # Create structured prompt using the working revision approach
        prompt = self._create_car_image_prompt_detailed(canonical_data, angle, 'realistic', session_id)

        # Translate to English with proper structure
        english_prompt = self._translate_prompt_to_english_detailed(prompt, canonical_data)

        return english_prompt

    def _create_car_image_prompt_detailed(self, car_data, angle, style, car_session_id=None):
        """
        Create a structured, enforceable prompt for FLUX that:
        - First, makes the LLM understand the required vehicle TYPE
        - Then injects brand, model, year, color, condition, scene description
        - Enforces SAME vehicle across a series using a stable ID and repeated cues
        """
        brand = (car_data.get('brand') or '').strip()
        model = (car_data.get('model') or '').strip()
        year = car_data.get('year') or ''
        color = (car_data.get('color') or 'silver').strip()
        body_type = (car_data.get('body_type') or '').strip() or 'sedan'
        condition = (car_data.get('condition') or '').strip()
        scene_desc = (car_data.get('description') or '').strip()
        vehicle_type = car_data.get('vehicle_type', 'car')

        # Stable series ID for consistency across angles
        if not car_session_id:
            import hashlib, time
            session_data = f"{brand}_{model}_{year}_{color}_{body_type}_{vehicle_type}_{int(time.time())}"
            car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]

        # Reusable consistency cues (avoid changing object between shots)
        consistency_elements = [
            f"SAME unique vehicle across all images (vehicle ID: CAR-{car_session_id})",
            "keep identical proportions, trims, and options in every shot",
            "same lighting conditions and color temperature",
            "same photographic style and post-processing",
            "single subject, no people, clean set"
        ]

        # Styles
        style_descriptions = {
            'realistic': 'photorealistic, high quality, professional automotive photography',
            'professional': 'studio lighting, clean background, commercial photography',
            'artistic': 'artistic composition, dramatic lighting, creative angle'
        }

        # Angle dictionary incl. common synonyms
        vt = vehicle_type
        angle_key = str(angle or '').lower().replace('-', '_')
        angle_descriptions = {
            'front': f'front view of the same {vt}, centered, showing grille, headlights, bumper',
            'front_left': f'front-left three-quarter view of the same {vt}, dynamic perspective',
            'front_right': f'front-right three-quarter view of the same {vt}, dynamic perspective',
            'rear': f'rear view of the same {vt}, taillights and rear bumper visible',
            'rear_left': f'rear-left three-quarter view of the same {vt}',
            'rear_right': f'rear-right three-quarter view of the same {vt}',
            'side': f'side profile of the same {vt}, complete silhouette, doors and windows visible',
            'left': f'left side profile of the same {vt}',
            'right': f'right side profile of the same {vt}',
            'top': f'top view (bird-eye) of the same {vt}, roof and proportions visible',
            'interior': f'interior cabin of the same {vt}, dashboard, steering wheel, seats',
            'dashboard': f'dashboard close-up of the same {vt}, instrument cluster and center console',
            'engine': f'engine bay of the same {vt}, engine block and components',
            'trunk': f'cargo/trunk area of the same {vt}',
            'wheels': f'wheels and tires detail of the same {vt}',
            'details': f'close-up details of the same {vt}, materials and craftsmanship'
        }

        # Core object description
        parts = [
            f"Task: generate a {vt}",
            f"Exact vehicle: {brand} {model} {year}",
            f"Primary color: {color}",
            f"Body type: {body_type}",
        ]
        if condition:
            parts.append(f"Condition: {condition}")
        if scene_desc:
            parts.append(f"Scene: {scene_desc}")

        base_prompt = ", ".join(parts)
        angle_prompt = angle_descriptions.get(angle_key, f"automotive photography of the same {vt}")
        style_prompt = style_descriptions.get(style, style if style else 'realistic')
        consistency_prompt = ", ".join(consistency_elements + [f"Series ID: CAR-{car_session_id}"])

        # Final structured prompt
        final_prompt = (
            f"{base_prompt}. "
            f"Angle: {angle_prompt}. Style: {style_prompt}. {consistency_prompt}. "
            f"High resolution, clean background or coherent scene, professional rendering."
        )

        return final_prompt

    def _translate_prompt_to_english_detailed(self, prompt, canonical_data):
        """
        Translate prompt to English with strict brand enforcement to prevent wrong logos.
        """
        brand = canonical_data.get('brand', '')
        model = canonical_data.get('model', '')
        year = canonical_data.get('year', '')
        color = canonical_data.get('color', '')
        vehicle_type = canonical_data.get('vehicle_type', 'car')

        # Get vehicle type enforcement
        type_enforcement = self._get_vehicle_description_backend(vehicle_type, canonical_data.get('body_type', ''))

        # Create strict brand enforcement to prevent wrong logos
        brand_enforcement = self._create_strict_brand_enforcement(brand)

        # Create English prompt with strict brand control
        english_prompt = (
            f"Professional automotive photography of a {color} {brand} {model} {year}. "
            f"Vehicle type: {type_enforcement}. "
            f"{brand_enforcement}. "
            f"{prompt}. "
            f"Photorealistic, high quality, studio lighting, clean background."
        )

        return english_prompt

    def _create_strict_brand_enforcement(self, brand):
        """Create strict brand enforcement to prevent wrong logos appearing."""
        brand_lower = brand.lower()

        # Common problematic brands that AI often defaults to
        forbidden_brands = []

        if 'mercedes' not in brand_lower:
            forbidden_brands.append('Mercedes-Benz logo')
            forbidden_brands.append('Mercedes star')
            forbidden_brands.append('three-pointed star')

        if 'bmw' not in brand_lower:
            forbidden_brands.append('BMW logo')
            forbidden_brands.append('BMW roundel')
            forbidden_brands.append('blue and white roundel')

        if 'audi' not in brand_lower:
            forbidden_brands.append('Audi rings')
            forbidden_brands.append('four rings logo')

        if 'volkswagen' not in brand_lower and 'vw' not in brand_lower:
            forbidden_brands.append('VW logo')
            forbidden_brands.append('Volkswagen logo')

        if 'toyota' not in brand_lower:
            forbidden_brands.append('Toyota logo')
            forbidden_brands.append('Toyota oval')

        if 'ford' not in brand_lower:
            forbidden_brands.append('Ford logo')
            forbidden_brands.append('Ford oval')

        # Create enforcement text
        if forbidden_brands:
            forbidden_text = ', '.join(forbidden_brands)
            enforcement = (
                f"CRITICAL: Show ONLY {brand} branding and logos. "
                f"ABSOLUTELY NO: {forbidden_text}. "
                f"If {brand} logo is unclear, show NO logos at all. "
                f"Clean vehicle without any brand badges is better than wrong brand."
            )
        else:
            enforcement = f"Show authentic {brand} branding and styling only."

        return enforcement

    def _get_vehicle_description_backend(self, vehicle_type, body_type):
        """Returns an English descriptor of the vehicle for prompt conditioning."""
        if vehicle_type == 'trailer':
            return f"{body_type} trailer, commercial semi-trailer, industrial transport equipment"
        elif vehicle_type == 'truck':
            return f"{body_type} truck, commercial vehicle, heavy-duty transport"
        elif vehicle_type == 'motorcycle':
            return f"{body_type} motorcycle, two-wheeled vehicle, motorbike"
        elif vehicle_type == 'scooter':
            return f"{body_type} electric/kick scooter, personal mobility device"
        elif vehicle_type == 'bus':
            return f"{body_type} bus, passenger transport vehicle, public transport"
        elif vehicle_type == 'van':
            return f"{body_type} van/MPV, light commercial vehicle"
        elif vehicle_type == 'special':
            return f"{body_type} special vehicle, construction equipment, industrial machinery"
        elif vehicle_type == 'boat':
            return f"{body_type} watercraft, marine vessel, boat"
        else:
            return f"{body_type} car, passenger vehicle, automobile"

    def _get_strict_angle_description(self, angle, vehicle_type):
        """Get strict angle description based on vehicle type."""
        base_angles = {
            'front': f'front view showing grille and headlights',
            'side': f'side profile showing complete silhouette',
            'rear': f'rear view showing taillights',
            'top': f'top-down bird eye view',
            'interior': f'interior cabin view',
            'dashboard': f'dashboard and instrument panel',
            'engine': f'engine bay view',
            'details': f'close-up detail shot',
            'wheels': f'wheels and tires detail',
            'trunk': f'cargo/trunk area'
        }

        if vehicle_type == 'motorcycle':
            return base_angles.get(angle, f'{angle} view').replace('grille', 'front fairing').replace('cabin', 'rider cockpit')
        elif vehicle_type == 'trailer':
            return base_angles.get(angle, f'{angle} view').replace('engine bay', 'coupling mechanism').replace('interior', 'cargo area')
        elif vehicle_type == 'bus':
            return base_angles.get(angle, f'{angle} view').replace('grille', 'large front grille with bus proportions')
        else:
            return base_angles.get(angle, f'{angle} view of the {vehicle_type}')

    def _get_vehicle_type_enforcement(self, vehicle_type):
        """Get positive vehicle type enforcement (no negatives)."""
        if vehicle_type == 'car':
            return "Passenger car with 4 wheels, car doors, sedan/hatchback/SUV proportions"
        elif vehicle_type == 'truck':
            return "Heavy commercial truck with large cargo area, truck cabin, multiple axles"
        elif vehicle_type == 'motorcycle':
            return "Motorcycle with exactly 2 wheels, handlebars, exposed frame, rider seat"
        elif vehicle_type == 'bus':
            return "Large passenger bus with multiple windows, bus doors, high roof, long wheelbase"
        elif vehicle_type == 'trailer':
            return "Standalone trailer with hitch coupling, cargo area, trailer wheels"
        elif vehicle_type == 'special':
            return "Construction/industrial equipment with heavy attachments, specialized machinery"
        elif vehicle_type == 'boat':
            return "Watercraft with boat hull, marine design, nautical proportions"
        else:
            return f"{vehicle_type} with authentic proportions and design"

    def _get_brand_enforcement(self, brand, model):
        """Get positive brand enforcement for consistency."""
        return (
            f"Authentic {brand} {model} design with correct {brand} styling cues. "
            f"Consistent {brand} brand identity throughout. "
            f"Clean, professional appearance with proper proportions."
        )

    def _build_canonical_car_data(self, mark_name, model_name, specs, vehicle_type):
        """Build canonical car data same as frontend."""
        # Map Ukrainian vehicle types to English (same as frontend mapping)
        vehicle_type_mapping = {
            'Легкові': 'car',
            'Мото': 'motorcycle',
            'Вантажівки': 'truck',
            'Автобуси': 'bus',
            'Спецтехніка': 'special',
            'Причепи': 'trailer',
            'Сільгосптехніка': 'special',
            'Водний транспорт': 'boat'
        }

        return {
            'brand': mark_name,
            'model': model_name,
            'year': specs['year'],
            'color': specs['color'],
            'body_type': specs.get('body_type', 'sedan'),
            'vehicle_type': vehicle_type_mapping.get(vehicle_type, 'car'),
            'vehicle_type_name': vehicle_type,  # Keep original for context
            'condition': specs['condition'],
            'description': f"{mark_name} {model_name} {specs['year']} {specs['color']} in excellent condition"
        }

    def _get_angles_for_vehicle_type(self, vehicle_type):
        """Get appropriate angles for vehicle type (same logic as frontend)."""
        if vehicle_type == 'Мото':
            return ['front', 'side', 'rear', 'top', 'details', 'wheels', 'engine']  # 7 angles for motorcycles
        elif vehicle_type in ['Вантажівки', 'Автобуси']:
            return ['front', 'side', 'rear', 'top', 'interior', 'dashboard', 'engine', 'details']  # 8 angles for trucks/buses
        elif vehicle_type == 'Водний транспорт':
            return ['front', 'side', 'rear', 'top', 'interior', 'details', 'engine']  # 7 angles for boats
        elif vehicle_type in ['Спецтехніка', 'Сільгосптехніка']:
            return ['front', 'side', 'rear', 'top', 'details', 'engine', 'wheels']  # 7 angles for special vehicles
        elif vehicle_type == 'Причепи':
            return ['front', 'side', 'rear', 'top', 'details', 'wheels']  # 6 angles for trailers
        else:
            # All 10 angles for regular cars
            return ['front', 'rear', 'side', 'top', 'interior', 'dashboard', 'engine', 'trunk', 'wheels', 'details']

    def _save_generated_images(self, images, car_ad):
        """Save generated images to database directly (same structure as API)."""
        self.stdout.write(f'💾 Saving {len(images)} images for ad {car_ad.id}...')
        self._save_images_direct(images, car_ad)

    def _get_auth_token(self):
        """Get authentication token for API calls."""
        try:
            import requests

            # Try to login as test user
            login_resp = requests.post(
                'http://127.0.0.1:8000/api/auth/login',
                json={
                    'email': 'pvs.versia@gmail.com',
                    'password': '12345678'
                }
            )

            if login_resp.status_code == 200:
                login_data = login_resp.json()
                return login_data.get('access') or login_data.get('token')
            else:
                return None

        except Exception as e:
            logger.warning(f"Failed to get auth token: {e}")
            return None

    def _save_image_direct(self, image_data, car_ad, index):
        """Fallback: save image directly to database."""
        from apps.ads.models import AddImageModel

        AddImageModel.objects.create(
            ad=car_ad,
            image_url=image_data.get('url', ''),
            caption=image_data.get('title', f"{image_data.get('angle', 'front')} view"),
            order=index + 1,
            is_primary=(index == 0)
        )

    def _save_images_direct(self, images, car_ad):
        """Fallback: save all images directly to database."""
        for i, image_data in enumerate(images):
            self._save_image_direct(image_data, car_ad, i)

    def _create_placeholder_images(self, car_ad, mark_name, model_name, angles):
        """Create placeholder images as fallback using the unified service structure."""
        try:
            from apps.chat.views.image_generation_views import generate_placeholder_url
            from apps.ads.models import AddImageModel

            for i, angle in enumerate(angles):
                prompt = f"{mark_name} {model_name} {angle} view"
                placeholder_url = generate_placeholder_url(prompt)
                AddImageModel.objects.create(
                    ad=car_ad,
                    image_url=placeholder_url,
                    order=i,
                    is_primary=(i == 0),
                    caption=f"{mark_name} {model_name} - {angle} (placeholder)"
                )

            self.stdout.write(f'📷 Created {len(angles)} placeholder images for ad {car_ad.id}')
            self.stdout.write(f'   ⚠️ Using placeholders due to generation failure')
        except Exception as e:
            self.stdout.write(f'❌ Failed to create placeholder images: {str(e)}')

    def generate_vehicle_specs(self, mark, model, vehicle_type):
        """Generate realistic vehicle specifications based on type."""
        current_year = datetime.now().year
        year = random.randint(2010, current_year)

        # Base specifications that vary by vehicle type
        if vehicle_type == 'Мото':
            # Motorcycle specifications
            mileage = random.randint(1000, 50000)
            specs = {
                'year': year,
                'mileage': mileage,
                'engine_volume': round(random.uniform(0.1, 1.8), 1),
                'engine_power': random.randint(15, 200),
                'fuel_type': random.choice(['petrol']),
                'transmission': random.choice(['manual', 'automatic']),
                'body_type': random.choice(['sport', 'cruiser', 'touring', 'naked', 'enduro']),
                'color': random.choice(['black', 'white', 'red', 'blue', 'yellow', 'green']),
                'condition': 'new' if mileage < 5000 else 'used',  # Автоматическое определение состояния
                'owners_count': random.randint(1, 3),
                'price': random.randint(2000, 25000)
            }
        elif vehicle_type == 'Вантажівки':
            # Truck specifications
            mileage = random.randint(50000, 500000)
            specs = {
                'year': year,
                'mileage': mileage,
                'engine_volume': round(random.uniform(2.0, 15.0), 1),
                'engine_power': random.randint(150, 600),
                'fuel_type': random.choice(['diesel', 'petrol']),
                'transmission': random.choice(['manual', 'automatic']),
                'body_type': random.choice(['box', 'flatbed', 'tanker', 'refrigerated', 'dump']),
                'color': random.choice(['white', 'blue', 'red', 'yellow', 'gray']),
                'condition': 'new' if mileage < 5000 else 'used',  # Автоматическое определение состояния
                'owners_count': random.randint(1, 5),
                'price': random.randint(15000, 150000)
            }
        else:
            # Default car specifications (Легкові)
            mileage = random.randint(5000, 200000)
            specs = {
                'year': year,
                'mileage': mileage,
                'engine_volume': round(random.uniform(1.0, 4.0), 1),
                'engine_power': random.randint(100, 500),
                'fuel_type': random.choice(['petrol', 'diesel', 'hybrid', 'electric']),
                'transmission': random.choice(['manual', 'automatic', 'cvt']),
                'drive_type': random.choice(['front', 'rear', 'all']),
                'body_type': random.choice(['sedan', 'hatchback', 'suv', 'coupe', 'wagon']),
                'color': random.choice(['black', 'white', 'silver', 'red', 'blue', 'gray']),
                'condition': 'new' if mileage < 5000 else 'used',  # Автоматическое определение состояния
                'owners_count': random.randint(1, 4),
                'price': random.randint(8000, 80000)
            }

        # Adjust price by year for all vehicle types
        age_factor = max(0.5, 1 - (current_year - year) * 0.1)
        specs['price'] = int(specs['price'] * age_factor)

        return specs

    def generate_llm_content(self, mark, model, specs, vehicle_type):
        """Generate title and description using LLM."""
        try:
            # Determine vehicle type for prompt
            vehicle_type_text = {
                'Легкові': 'car',
                'Мото': 'motorcycle',
                'Вантажівки': 'truck',
                'Водний транспорт': 'boat'
            }.get(vehicle_type, 'vehicle')

            prompt = f"""
            Generate a realistic {vehicle_type_text} advertisement for a {mark} {model} {specs['year']} with the following specifications:
            - Mileage: {specs['mileage']} km
            - Engine: {specs['engine_volume']}L, {specs['engine_power']} HP
            - Fuel: {specs['fuel_type']}
            - Transmission: {specs['transmission']}
            - Color: {specs['color']}
            - Condition: {specs['condition']}
            - Price: ${specs['price']}

            Please provide:
            1. A compelling title (max 80 characters)
            2. A detailed description (100-300 words) in Ukrainian language

            Format as JSON: {{"title": "...", "description": "..."}}
            """

            # Use LLM service to generate content
            response = LLMService.generate_content(prompt)

            if response and 'title' in response and 'description' in response:
                return response
            else:
                # Fallback to template-based generation
                return self.generate_fallback_content(mark, model, specs, vehicle_type)

        except Exception as e:
            self.stdout.write(f'⚠️ LLM generation failed, using fallback: {str(e)}')
            return self.generate_fallback_content(mark, model, specs, vehicle_type)

    def generate_fallback_content(self, mark, model, specs, vehicle_type):
        """Fallback content generation without LLM."""
        condition_map = {
            'excellent': 'відмінному',
            'good': 'хорошому',
            'fair': 'задовільному',
            'needs_work': 'робочому'
        }

        title = f"{mark} {model} {specs['year']} - {specs['color']} в {condition_map.get(specs['condition'], 'хорошому')} стані"

        # Generate description based on vehicle type
        if vehicle_type == 'Мото':
            description = f"""
            Продається мотоцикл {mark} {model} {specs['year']} року випуску в {condition_map.get(specs['condition'], 'хорошому')} стані.

            Технічні характеристики:
            • Пробіг: {specs['mileage']:,} км
            • Двигун: {specs['engine_volume']}л, {specs['engine_power']} к.с.
            • Паливо: {specs['fuel_type']}
            • Коробка передач: {specs['transmission']}
            • Тип: {specs['body_type']}
            • Колір: {specs['color']}
            • Кількість власників: {specs['owners_count']}

            Мотоцикл в хорошому технічному стані, регулярно обслуговувався.
            Всі документи в порядку. Торг можливий при огляді.

            Ціна: ${specs['price']:,}
            """
        elif vehicle_type == 'Вантажівки':
            description = f"""
            Продається вантажівка {mark} {model} {specs['year']} року випуску в {condition_map.get(specs['condition'], 'хорошому')} стані.

            Технічні характеристики:
            • Пробіг: {specs['mileage']:,} км
            • Двигун: {specs['engine_volume']}л, {specs['engine_power']} к.с.
            • Паливо: {specs['fuel_type']}
            • Коробка передач: {specs['transmission']}
            • Тип кузова: {specs['body_type']}
            • Колір: {specs['color']}
            • Кількість власників: {specs['owners_count']}

            Вантажівка в хорошому технічному стані, регулярно обслуговувалась.
            Всі документи в порядку. Торг можливий при огляді.

            Ціна: ${specs['price']:,}
            """
        else:
            # Default car description
            description = f"""
            Продається {mark} {model} {specs['year']} року випуску в {condition_map.get(specs['condition'], 'хорошому')} стані.

            Технічні характеристики:
            • Пробіг: {specs['mileage']:,} км
            • Двигун: {specs['engine_volume']}л, {specs['engine_power']} к.с.
            • Паливо: {specs['fuel_type']}
            • Коробка передач: {specs['transmission']}
            • Привід: {specs.get('drive_type', 'передній')}
            • Колір: {specs['color']}
            • Кількість власників: {specs['owners_count']}

            Автомобіль в хорошому технічному стані, регулярно обслуговувався.
            Всі документи в порядку. Торг можливий при огляді.

            Ціна: ${specs['price']:,}
            """
        
        return {
            'title': title[:80],
            'description': description.strip()
        }

    def random_date(self):
        """Generate random date within last 6 months."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        
        time_between = end_date - start_date
        days_between = time_between.days
        random_days = random.randrange(days_between)
        
        return start_date + timedelta(days=random_days)

    def print_statistics(self):
        """Print generation statistics."""
        total_ads = CarAd.objects.filter(title__contains='[MOCK]').count()
        active_ads = CarAd.objects.filter(
            title__contains='[MOCK]',
            status=AdStatusEnum.ACTIVE
        ).count()
        
        self.stdout.write('\n📊 Generation Statistics:')
        self.stdout.write(f'Total mock ads: {total_ads}')
        self.stdout.write(f'Active ads: {active_ads}')
        self.stdout.write(f'Test users: {len(self.test_users)}')
        total_marks = CarMarkModel.objects.count()
        self.stdout.write(f'Car marks: {total_marks}')
        self.stdout.write('\n🎯 Demo ready! You can now test the full AutoRia clone functionality.')
