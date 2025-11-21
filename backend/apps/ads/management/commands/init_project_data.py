"""
Management command to initialize all project data on startup.
This command runs automatically when the project starts.
Includes smart seeding tracking to prevent duplicates and handle interruptions.
"""
import os
import time
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from apps.accounts.models import RawAccountAddress
from core.utils.seeding_tracker import seeding_tracker
from core.utils.environment_detector import EnvironmentDetector


class Command(BaseCommand):
    help = 'Initialize all project data (migrations, references, test users)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-migrations',
            action='store_true',
            help='Skip running migrations',
        )
        parser.add_argument(
            '--skip-references',
            action='store_true',
            help='Skip populating reference data',
        )
        parser.add_argument(
            '--skip-users',
            action='store_true',
            help='Skip creating test users',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of all data',
        )

    def handle(self, *args, **options):
        """Initialize all project data with smart seeding optimization and tracking."""
        try:
            # Check if seeds should run based on environment variable
            run_seeds = os.getenv('RUN_SEEDS', 'true').lower() in ('true', '1', 't', 'yes')

            if not run_seeds:
                self.stdout.write('⏭️ Seeds disabled by RUN_SEEDS environment variable')
                return

            # Check for force reseed flag
            force_reseed = seeding_tracker.should_force_reseed() or options.get('force', False)
            if force_reseed:
                self.stdout.write('🔄 FORCE_RESEED=true detected - clearing seeding history')
                seeding_tracker.clear_seeding_history(force_clear=True)

            self.stdout.write('🚀 Initializing AutoRia project data...')

            # Show current seeding status
            status = seeding_tracker.get_seeding_status()
            completed_seeds = seeding_tracker.list_completed_seeds()
            if completed_seeds:
                self.stdout.write(f'📋 Previously completed seeds: {", ".join(completed_seeds)}')

            # 0. Register backend service in Redis
            self._register_backend_service()

            # 1. Run migrations
            if not options['skip_migrations']:
                self._run_migrations()

            # 2. Analyze database state and determine what needs seeding
            empty_tables = self._analyze_database_state()

            # 3. Smart seeding with tracking
            self._smart_seeding_with_tracking(empty_tables, options, force_reseed)

            # 4. Always print summary of current database state
            self._print_summary()

            self.stdout.write(self.style.SUCCESS('✅ Project initialization completed successfully!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Project initialization failed: {e}'))
            # Mark any running seeds as failed
            self._mark_failed_seeds(str(e))
            raise

    def _smart_seeding_with_tracking(self, empty_tables, options, force_reseed=False):
        """Smart seeding with tracking to prevent duplicates and handle interruptions."""
        environment = "docker" if EnvironmentDetector.is_docker() else "local"

        # Define seeding operations in order
        seeding_operations = [
            ('reference_data', 'Reference data (regions, cities, car marks/models)', self._populate_reference_data),
            ('test_users', 'Test users', self._create_test_users),
            ('car_generations', 'Car generations and modifications', self._create_car_generations),
            ('formatted_addresses', 'Formatted addresses', self._create_formatted_addresses),
            ('car_ads', 'Car advertisements', self._create_car_advertisements),
            ('car_images', 'Car images', self._create_car_images),
        ]

        # Filter operations based on what needs seeding
        needed_operations = []
        for seed_name, description, method in seeding_operations:
            # Check if already completed (unless force reseed)
            if not force_reseed and seeding_tracker.is_seeding_completed(seed_name):
                self.stdout.write(f'✅ Skipping {description} - already completed')
                continue

            # Check if table group is in empty_tables or force is enabled
            if seed_name in empty_tables or force_reseed or options.get('force', False):
                needed_operations.append((seed_name, description, method))

        if not needed_operations:
            self.stdout.write('✅ All seeding operations already completed')
            return

        self.stdout.write(f'🎯 Found {len(needed_operations)} seeding operations to execute')

        # Execute seeding operations with tracking
        for seed_name, description, method in needed_operations:
            self._execute_seeding_operation(seed_name, description, method, environment, force_reseed)

    def _execute_seeding_operation(self, seed_name, description, method, environment, forced=False):
        """Execute a single seeding operation with full tracking."""
        start_time = time.time()

        try:
            self.stdout.write(f'🔄 Seeding {seed_name}...')

            # Mark as started
            seeding_tracker.mark_seeding_started(
                seed_name=seed_name,
                environment=environment,
                forced=forced
            )

            # Execute the seeding method
            result = method()

            # Calculate execution time
            execution_time = time.time() - start_time

            # Extract records created/updated from result if available
            records_created = 0
            records_updated = 0

            if isinstance(result, dict):
                records_created = result.get('created', 0)
                records_updated = result.get('updated', 0)
            elif isinstance(result, (int, float)):
                records_created = int(result)

            # Mark as completed
            seeding_tracker.mark_seeding_completed(
                seed_name=seed_name,
                records_created=records_created,
                records_updated=records_updated,
                execution_time=execution_time
            )

            self.stdout.write(f'✅ Completed {description} in {execution_time:.2f}s')
            if records_created > 0:
                self.stdout.write(f'   📊 Created {records_created} records')
            if records_updated > 0:
                self.stdout.write(f'   📊 Updated {records_updated} records')

        except Exception as e:
            # Mark as failed
            seeding_tracker.mark_seeding_failed(seed_name, str(e))
            self.stdout.write(self.style.ERROR(f'❌ Failed {description}: {e}'))
            raise

    def _mark_failed_seeds(self, error_message):
        """Mark any currently running seeds as failed."""
        status = seeding_tracker.get_seeding_status()
        for seed_name, operation in status['operations'].items():
            if operation.get('status') == 'running':
                seeding_tracker.mark_seeding_failed(seed_name, f"Interrupted: {error_message}")

    def _register_backend_service(self):
        """Register backend service in Redis service registry."""
        self.stdout.write('📡 Registering backend service in Redis...')
        try:
            from core.services.service_registry import register_current_service
            register_current_service()
            self.stdout.write('✅ Backend service registered successfully')
        except Exception as e:
            self.stdout.write(f'⚠️ Failed to register backend service: {e}')
            # Don't raise - continue with initialization

    def _run_migrations(self):
        """Run database migrations."""
        self.stdout.write('📊 Running database migrations...')
        try:
            call_command('migrate', verbosity=0)
            self.stdout.write('✅ Migrations completed')
        except Exception as e:
            self.stdout.write(f'⚠️ Migration warning: {e}')

    def _analyze_database_state(self):
        """Analyze database state and return list of empty tables that need seeding."""
        self.stdout.write('🔍 Analyzing database state...')

        empty_tables = []

        # Define table checks with their models and descriptions
        table_checks = {
            'reference_data': {
                'models': [
                    ('apps.ads.models.reference', 'RegionModel'),
                    ('apps.ads.models.reference', 'CityModel'),
                    ('apps.ads.models.reference', 'CarMarkModel'),
                    ('apps.ads.models.reference', 'CarModel'),
                ],
                'description': 'Reference data (regions, cities, car marks/models)'
            },
            'test_users': {
                'models': [
                    ('django.contrib.auth.models', 'User'),
                ],
                'description': 'Test users'
            },
            'car_generations': {
                'models': [
                    ('apps.ads.models.reference', 'CarGenerationModel'),
                    ('apps.ads.models.reference', 'CarModificationModel'),
                ],
                'description': 'Car generations and modifications'
            },
            'formatted_addresses': {
                'models': [
                    ('apps.accounts.models', 'RawAccountAddress'),
                ],
                'description': 'Formatted addresses'
            },
            'car_ads': {
                'models': [
                    ('apps.ads.models', 'CarAd'),
                ],
                'description': 'Car advertisements'
            },
            'car_images': {
                'models': [
                    ('apps.ads.models', 'AddImageModel'),
                ],
                'description': 'Car images'
            }
        }

        # Check each table group
        for table_name, config in table_checks.items():
            is_empty = True

            for module_path, model_name in config['models']:
                try:
                    # Dynamic import of model
                    module = __import__(module_path, fromlist=[model_name])
                    model = getattr(module, model_name)

                    # Check if model has data
                    if model.objects.exists():
                        is_empty = False
                        break

                except (ImportError, AttributeError) as e:
                    self.stdout.write(f'⚠️ Could not check {model_name}: {e}')
                    continue

            if is_empty:
                empty_tables.append(table_name)
                self.stdout.write(f'   📋 Empty: {config["description"]}')
            else:
                self.stdout.write(f'   ✅ Has data: {config["description"]}')

        if empty_tables:
            self.stdout.write(f'🎯 Found {len(empty_tables)} table groups that need seeding: {", ".join(empty_tables)}')
        else:
            self.stdout.write('✅ All table groups already contain data')

        return empty_tables

    def _populate_reference_data(self):
        """Populate reference data."""
        self.stdout.write('📚 Populating reference data...')
        try:
            # Run reference population command
            call_command('auto_populate_references', verbosity=1)

            # Count created records
            from apps.ads.models.reference import RegionModel, CityModel, CarMarkModel, CarModel
            regions_count = RegionModel.objects.count()
            cities_count = CityModel.objects.count()
            marks_count = CarMarkModel.objects.count()
            models_count = CarModel.objects.count()

            total_created = regions_count + cities_count + marks_count + models_count
            self.stdout.write(f'✅ Reference data populated: {regions_count} regions, {cities_count} cities, {marks_count} marks, {models_count} models')

            return {'created': total_created}

        except Exception as e:
            self.stdout.write(f'❌ Error populating references: {e}')
            raise

    def _create_test_users(self):
        """Create test users."""
        self.stdout.write('👥 Creating test users...')
        try:
            from django.contrib.auth import get_user_model
            UserModel = get_user_model()

            initial_count = UserModel.objects.count()

            # Run test users creation command
            call_command('create_test_users', verbosity=0)

            final_count = UserModel.objects.count()
            created_count = final_count - initial_count

            self.stdout.write(f'✅ Test users created: {created_count} new users')
            return {'created': created_count}

        except Exception as e:
            self.stdout.write(f'❌ Error creating test users: {e}')
            raise

    def _create_car_generations(self):
        """Create car generations and modifications."""
        self.stdout.write('🚗 Creating car generations and modifications...')
        try:
            # Call existing method
            self._create_car_generations_and_modifications()

            # Count created records
            from apps.ads.models.reference import CarGenerationModel, CarModificationModel
            generations_count = CarGenerationModel.objects.count()
            modifications_count = CarModificationModel.objects.count()
            total_created = generations_count + modifications_count

            self.stdout.write(f'✅ Car generations created: {generations_count} generations, {modifications_count} modifications')
            return {'created': total_created}

        except Exception as e:
            self.stdout.write(f'❌ Error creating car generations: {e}')
            raise

    def _create_formatted_addresses(self):
        """Create formatted addresses."""
        self.stdout.write('📍 Creating formatted addresses...')
        try:
            # Call existing method
            self._create_formatted_addresses_for_accounts()

            # Count created records
            from apps.accounts.models import RawAccountAddress
            addresses_count = RawAccountAddress.objects.count()

            self.stdout.write(f'✅ Formatted addresses created: {addresses_count} addresses')
            return {'created': addresses_count}

        except Exception as e:
            self.stdout.write(f'❌ Error creating formatted addresses: {e}')
            raise

    def _create_car_advertisements(self):
        """Create car advertisements."""
        self.stdout.write('🚗 Creating car advertisements...')
        try:
            # Call existing method
            self._create_car_ads()

            # Count created records
            from apps.ads.models import CarAd
            ads_count = CarAd.objects.count()

            self.stdout.write(f'✅ Car advertisements created: {ads_count} ads')
            return {'created': ads_count}

        except Exception as e:
            self.stdout.write(f'❌ Error creating car advertisements: {e}')
            raise

    def _create_car_images(self):
        """Create car images."""
        self.stdout.write('📸 Creating car images...')
        try:
            # Call existing method
            self._create_car_images_for_ads()

            # Count created records
            from apps.ads.models import AddImageModel
            images_count = AddImageModel.objects.count()

            self.stdout.write(f'✅ Car images created: {images_count} images')
            return {'created': images_count}

        except Exception as e:
            self.stdout.write(f'❌ Error creating car images: {e}')
            raise

    def _print_summary(self):
        """Print comprehensive summary of current database state."""
        try:
            from apps.ads.models.reference import (
                VehicleTypeModel, CarMarkModel, CarModel, CarColorModel,
                RegionModel, CityModel, CarGenerationModel, CarModificationModel
            )
            from apps.ads.models import CarAd, AddImageModel
            from apps.accounts.models import AddsAccount
            from django.contrib.auth import get_user_model

            UserModel = get_user_model()

            # Get comprehensive counts
            vehicle_types = VehicleTypeModel.objects.count()
            car_marks = CarMarkModel.objects.count()
            car_models = CarModel.objects.count()
            colors = CarColorModel.objects.count()
            generations = CarGenerationModel.objects.count()
            modifications = CarModificationModel.objects.count()
            regions = RegionModel.objects.count()
            cities = CityModel.objects.count()
            users = UserModel.objects.count()
            accounts = AddsAccount.objects.count()
            car_ads = CarAd.objects.count()
            car_images = AddImageModel.objects.count()

            self.stdout.write('\n🎯 AutoRia Project Database Summary:')
            self.stdout.write('=' * 50)
            self.stdout.write('📚 СПРАВОЧНИКИ:')
            self.stdout.write(f'   🚛 Типы транспорта: {vehicle_types}')
            self.stdout.write(f'   🏭 Марки автомобилей: {car_marks}')
            self.stdout.write(f'   🚙 Модели автомобилей: {car_models}')
            self.stdout.write(f'   🎨 Цвета: {colors}')
            self.stdout.write(f'   🔧 Поколения: {generations}')
            self.stdout.write(f'   ⚙️ Модификации: {modifications}')
            self.stdout.write('')
            self.stdout.write('🗺️ ГЕОГРАФИЯ:')
            self.stdout.write(f'   🏛️ Регионы: {regions}')
            self.stdout.write(f'   🏙️ Города: {cities}')
            self.stdout.write('')
            self.stdout.write('👥 ПОЛЬЗОВАТЕЛИ:')
            self.stdout.write(f'   👤 Всего пользователей: {users}')
            self.stdout.write(f'   🏪 Аккаунты продавцов: {accounts}')
            self.stdout.write('')
            self.stdout.write('🚗 ОБЪЯВЛЕНИЯ:')
            self.stdout.write(f'   📝 Объявления о продаже: {car_ads}')
            self.stdout.write(f'   🖼️ Изображения автомобилей: {car_images}')
            self.stdout.write('=' * 50)

            # Show sample data with more details
            if regions > 0:
                self.stdout.write('\n📍 Примеры регионов:')
                for region in RegionModel.objects.all()[:5]:
                    cities_in_region = region.cities.count()
                    self.stdout.write(f'   - {region.name} ({cities_in_region} городов)')

            if car_marks > 0:
                self.stdout.write('\n🚗 Примеры марок автомобилей:')
                for mark in CarMarkModel.objects.all()[:5]:
                    models_count = mark.models.count()
                    self.stdout.write(f'   - {mark.name} ({models_count} моделей)')

            # Show test users info if any exist
            if users > 0:
                self.stdout.write('\n👤 Информация о тестовых пользователях:')
                self.stdout.write('   📧 Все тестовые пользователи используют пароль: 12345678')

                # Show some example users
                sample_users = UserModel.objects.filter(
                    email__in=[
                        'admin@autoria.com',
                        'pvs.versia@gmail.com',
                        'test.user@example.com',
                        'seller1@gmail.com'
                    ]
                )[:4]

                if sample_users.exists():
                    self.stdout.write('   🔑 Примеры учетных записей:')
                    for user in sample_users:
                        role = 'Администратор' if user.is_superuser else 'Пользователь'
                        self.stdout.write(f'      - {user.email} ({role})')

            # Show environment info
            import os
            is_docker = os.getenv('IS_DOCKER', 'false').lower() == 'true'
            env_type = 'Docker контейнер' if is_docker else 'Локальная среда'
            self.stdout.write(f'\n🌍 Среда выполнения: {env_type}')

        except Exception as e:
            self.stdout.write(f'⚠️ Could not generate summary: {e}')

    def _fill_all_tables(self):
        """Fill all remaining empty tables with sample data."""
        self.stdout.write('🗂️ Filling all remaining tables...')

        try:
            # Fill car generations and modifications
            self._create_car_generations_and_modifications()

            # Fill formatted addresses
            self._create_formatted_addresses()

            # Fill car images
            self._create_car_images()

            # Fill auth groups
            self._create_auth_groups()

            # FINAL STEP: Fill car advertisements (depends on all reference data)
            self._create_car_advertisements()

            self.stdout.write('✅ All tables filled')

        except Exception as e:
            self.stdout.write(f'❌ Error filling tables: {e}')

    def _create_car_generations_and_modifications(self):
        """Create car generations and modifications."""
        from apps.ads.models.reference import CarGenerationModel, CarModificationModel, CarModel

        # Check if already exists
        existing_generations = CarGenerationModel.objects.count()
        existing_modifications = CarModificationModel.objects.count()

        if existing_generations > 0 and existing_modifications > 0:
            self.stdout.write(f'ℹ️ Car generations and modifications already exist: {existing_generations} generations, {existing_modifications} modifications')
            return

        self.stdout.write('🚗 Creating car generations and modifications...')

        # Get some popular car models
        popular_models = CarModel.objects.filter(
            mark__name__in=['BMW', 'Mercedes-Benz', 'Audi', 'Toyota', 'Volkswagen']
        )[:20]

        generations_created = 0
        modifications_created = 0

        for car_model in popular_models:
            # Create 1-3 generations per model
            import random
            for gen_num in range(1, random.randint(2, 4)):
                generation_name = f'{car_model.name} {gen_num} покоління'

                # Use get_or_create to avoid duplicates
                generation, created = CarGenerationModel.objects.get_or_create(
                    name=generation_name,
                    model=car_model,
                    defaults={
                        'year_start': 2000 + (gen_num - 1) * 5,
                        'year_end': 2000 + gen_num * 5 - 1 if gen_num < 3 else None
                    }
                )
                if created:
                    generations_created += 1

                # Create 2-4 modifications per generation
                engines = ['1.6', '2.0', '2.5', '3.0', '3.5']
                for mod_num in range(random.randint(2, 4)):
                    engine = random.choice(engines)
                    modification_name = f'{generation.name} {engine}'

                    # Use get_or_create to avoid duplicates
                    modification, created = CarModificationModel.objects.get_or_create(
                        name=modification_name,
                        generation=generation,
                        defaults={
                            'engine_type': 'petrol',
                            'engine_volume': float(engine),
                            'power_hp': random.randint(120, 300),
                            'transmission': 'manual',
                            'drive_type': 'fwd'
                        }
                    )
                    if created:
                        modifications_created += 1

        self.stdout.write(f'✅ Created {generations_created} generations and {modifications_created} modifications')

    def _create_formatted_addresses(self):
        """Formatted addresses are now auto-created with raw addresses."""
        # This method is no longer needed as geocoding happens automatically
        pass

        self.stdout.write('📍 Creating formatted addresses...')

        raw_addresses = RawAccountAddress.objects.all()
        created_count = 0

        for raw_address in raw_addresses:
            # Create formatted address
            formatted_address = f'{raw_address.street}, {raw_address.building}, {raw_address.locality}, {raw_address.region}, {raw_address.country}'

            FormattedAccountAddress.objects.create(
                raw_address=raw_address,
                place_id=f'place_{raw_address.id}_{hash(formatted_address)}',
                formatted_address=formatted_address,
                latitude=50.4501 + (hash(raw_address.id) % 1000) / 10000,  # Random around Kyiv
                longitude=30.5234 + (hash(raw_address.id) % 1000) / 10000
            )
            created_count += 1

        self.stdout.write(f'✅ Created {created_count} formatted addresses')

    def _create_car_images(self):
        """Create car images based on actual ad characteristics using AI generation."""
        from apps.ads.models import AddImageModel, CarAd
        from core.services.chat_ai import ChatAI
        from langchain.prompts import PromptTemplate
        from django.core.files.base import ContentFile
        from django.conf import settings
        import requests

        # Check if already exists
        if AddImageModel.objects.exists():
            return

        self.stdout.write('🖼️ Creating car images with AI generation based on ad characteristics...')

        # Get some car ads (only select_related for ForeignKey fields)
        car_ads = CarAd.objects.select_related('mark', 'account', 'moderated_by').all()[:10]
        created_count = 0

        # Initialize ChatAI for image generation
        try:
            chat_ai = ChatAI("flux")
        except Exception:
            # Fallback to placeholder images if AI generation fails
            self._create_placeholder_images(car_ads)
            return

        # Create LangChain prompt template for car images
        car_image_template = PromptTemplate(
            input_variables=[
                "mark", "model", "year", "color", "body_type",
                "condition", "generation", "modification"
            ],
            template="""Professional automotive photograph of {mark} {model} {year}:

Vehicle Details:
- Generation: {generation}
- Modification: {modification}
- Color: {color}
- Body Type: {body_type}
- Condition: {condition}

Photography Style:
- High-quality automotive photography
- Professional lighting
- 3/4 front angle view
- Clean background
- Sharp focus
- Commercial quality
- Realistic car proportions
- Show specific color and body type

Style: Photorealistic, automotive magazine quality"""
        )

        for ad in car_ads:
            try:
                # Extract car characteristics from the ad
                characteristics = self._extract_ad_characteristics(ad)

                # Generate detailed prompt
                detailed_prompt = car_image_template.format(**characteristics)

                # Generate AI image
                image_url = chat_ai.generate_image(
                    prompt=detailed_prompt,
                    car_ad_id=ad.id,
                    **characteristics
                )

                if image_url:
                    # Convert relative URLs to absolute URLs
                    if image_url.startswith('/media/'):
                        # Convert relative media URL to absolute URL
                        base_url = getattr(settings, 'MEDIA_URL_BASE', 'http://localhost:8000')
                        image_url = f"{base_url.rstrip('/')}{image_url}"
                        self.stdout.write(f'   🔗 Converted relative URL for ad {ad.id}: {image_url}')
                    elif not image_url.startswith('http'):
                        # Skip non-HTTP URLs that we can't download
                        self.stdout.write(f'   ⚠️ Skipping non-HTTP URL for ad {ad.id}: {image_url}')
                        continue

                    # Try to download and save the generated image
                    try:
                        response = requests.get(image_url, timeout=30)
                        if response.status_code == 200:
                            image_content = ContentFile(
                                response.content,
                                name=f'car_{ad.id}_ai_generated.jpg'
                            )

                            AddImageModel.objects.create(
                                ad=ad,
                                image=image_content,
                                order=1,
                                is_primary=True,
                                caption=f'AI-generated photo of {characteristics["mark"]} {characteristics["model"]}'
                            )
                            created_count += 1

                            car_desc = f"{characteristics['mark']} {characteristics['model']} {characteristics['year']}"
                            self.stdout.write(f'   ✅ Generated image for {car_desc}')
                    except Exception as e:
                        self.stdout.write(f'   ⚠️ Failed to download image for ad {ad.id}: {e}')

            except Exception as e:
                self.stdout.write(f'   ⚠️ Failed to generate image for ad {ad.id}: {e}')
                continue

        self.stdout.write(f'✅ Created {created_count} AI-generated car images')

    def _extract_ad_characteristics(self, ad):
        """Extract characteristics from car ad for image generation."""
        return {
            'mark': ad.mark.name if ad.mark else 'Unknown',
            'model': ad.model if ad.model else 'Unknown',  # model is CharField, not ForeignKey
            'year': str(ad.dynamic_fields.get('year', 'modern')),
            'generation': ad.generation if ad.generation else 'standard',  # generation is CharField
            'modification': ad.modification if ad.modification else 'base',  # modification is CharField
            'color': ad.dynamic_fields.get('color', 'silver'),
            'body_type': ad.dynamic_fields.get('body_type', 'sedan'),
            'condition': ad.dynamic_fields.get('condition', 'used')
        }

    def _create_placeholder_images(self, car_ads):
        """Fallback method to create placeholder images if AI generation fails."""
        from apps.ads.models import AddImageModel
        from django.core.files.base import ContentFile
        import requests

        self.stdout.write('   ⚠️ AI generation failed, using placeholder images...')

        created_count = 0
        sample_images = [
            'https://picsum.photos/800/600?random=1',
            'https://picsum.photos/800/600?random=2',
            'https://picsum.photos/800/600?random=3'
        ]

        for ad in car_ads[:5]:  # Limit to 5 ads for placeholders
            try:
                import random
                image_url = random.choice(sample_images)
                response = requests.get(image_url, timeout=10)

                if response.status_code == 200:
                    image_content = ContentFile(response.content, name=f'car_{ad.id}_placeholder.jpg')
                    AddImageModel.objects.create(
                        ad=ad,
                        image=image_content,
                        order=1,
                        is_primary=True,
                        caption=f'Placeholder photo for {ad.title}'
                    )
                    created_count += 1
            except Exception:
                continue

        self.stdout.write(f'✅ Created {created_count} placeholder images')

    def _create_auth_groups(self):
        """Create authentication groups."""
        from django.contrib.auth.models import Group, Permission

        # Check if already exists
        if Group.objects.exists():
            return

        self.stdout.write('👥 Creating auth groups...')

        # Create groups based on user roles
        groups_data = [
            ('Продавці', 'Звичайні продавці автомобілів'),
            ('Автосалони', 'Автосалони та дилери'),
            ('Менеджери', 'Менеджери платформи'),
            ('Модератори', 'Модератори контенту')
        ]

        created_count = 0
        for group_name, description in groups_data:
            group = Group.objects.create(name=group_name)

            # Add relevant permissions
            if 'Продавці' in group_name:
                # Basic permissions for sellers
                perms = Permission.objects.filter(
                    content_type__app_label='ads',
                    codename__in=['add_caradmodel', 'change_caradmodel', 'view_caradmodel']
                )
                group.permissions.set(perms)
            elif 'Автосалони' in group_name:
                # Extended permissions for dealers
                perms = Permission.objects.filter(
                    content_type__app_label__in=['ads', 'accounts']
                )
                group.permissions.set(perms)
            elif 'Менеджери' in group_name:
                # Management permissions
                perms = Permission.objects.filter(
                    content_type__app_label__in=['ads', 'accounts', 'users']
                )
                group.permissions.set(perms)

            created_count += 1

        self.stdout.write(f'✅ Created {created_count} auth groups')

    def _check_database_connection(self):
        """Check if database is accessible."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return True
        except Exception:
            return False

    def _create_car_advertisements(self):
        """Create car advertisements with images using frontend algorithm (FINAL STEP)."""
        self.stdout.write('🚗 Creating car advertisements with images...')

        try:
            from apps.ads.models import CarAd
            import os

            # Check if car ads already exist
            existing_ads = CarAd.objects.count()
            ads_with_images = CarAd.objects.filter(images__isnull=False).distinct().count()
            min_ads_with_images = int(os.getenv('MIN_TEST_ADS_WITH_IMAGES', '10') or '10')
            self.stdout.write(f'ℹ️ Current car ads: total={existing_ads}, with images={ads_with_images}')

            if ads_with_images >= min_ads_with_images:
                self.stdout.write(f'✅ Minimum {min_ads_with_images} car ads with images already satisfied')
                return {'created': 0}

            needed_with_images = max(0, min_ads_with_images - ads_with_images)
            if needed_with_images == 0:
                self.stdout.write('ℹ️ No additional ads with images required')
                return {'created': 0}

            # Check environment variable for test ads generation
            generate_with_images = os.getenv('GENERATE_TEST_ADS_WITH_IMAGES', 'true').lower() in ('true', '1', 't', 'yes')

            if generate_with_images:
                # Use the new algorithm-consistent test ads generator
                self.stdout.write(f'🎨 Using frontend-consistent image generation algorithm (creating {needed_with_images} ads with images)...')
                call_command(
                    'generate_test_ads_with_images',
                    count=needed_with_images,
                    with_images=True,
                    image_types='front,side',
                    verbosity=1
                )
                new_ads_with_images = CarAd.objects.filter(images__isnull=False).distinct().count()
                self.stdout.write(f'✅ Now {new_ads_with_images} car ads have images')
                created_delta = max(0, new_ads_with_images - ads_with_images)
                return {'created': created_delta}
            else:
                # Fallback to old method without images
                self.stdout.write('📝 Generating ads without images (legacy mode)...')
                call_command('seed_car_ads', count=max(needed_with_images, 50), verbosity=0)
                new_total_ads = CarAd.objects.count()
                self.stdout.write(f'✅ Total car advertisements after legacy seeding: {new_total_ads}')
                created_delta = max(0, new_total_ads - existing_ads)
                return {'created': created_delta}

        except Exception as e:
            self.stdout.write(f'❌ Error creating car advertisements: {e}')
            raise
