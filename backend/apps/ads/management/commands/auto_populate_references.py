"""
Auto-populate car reference data on startup if empty.
Optimized for Docker container startup with memory and connection management.
"""
import csv
import gc
import os
from collections import defaultdict
from typing import Dict

from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.conf import settings
from django.utils.text import slugify

from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel, CarColorModel, RegionModel, CityModel
from apps.accounts.utils.geocoding import get_geocode
# GoogleMapsGeocoder removed - geocoding now handled in RawAccountAddress model
try:
    from ninja import ModelSchema
except ImportError:
    ModelSchema = None

try:
    from core.services.langchain_seed_generator import LangChainSeedGenerator
except ImportError:
    LangChainSeedGenerator = None


class Command(BaseCommand):
    help = 'Auto-populate car reference data if empty (for startup)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force population even if data exists',
        )

    def handle(self, *args, **options):
        """Main handler with Docker/Local compatibility."""
        try:
            # Check environment and Docker status
            is_docker = os.path.exists('/.dockerenv') or os.getenv('DOCKER_ENV') == 'true'
            run_seeds = os.getenv('RUN_SEEDS', 'true').lower() == 'true'

            self.stdout.write(f'🔍 Environment: {"Docker" if is_docker else "Local"}')
            self.stdout.write(f'🔍 RUN_SEEDS: {run_seeds}')
            self.stdout.write(f'🔍 Force mode: {options.get("force", False)}')

            if not run_seeds and not options.get('force', False):
                self.stdout.write('⏭️ Skipping reference data population (RUN_SEEDS=false)')
                return

            self.stdout.write('🔍 Checking reference data status...')

            # Check if data already exists
            if not options['force']:
                vehicle_count = VehicleTypeModel.objects.count()
                mark_count = CarMarkModel.objects.count()
                model_count = CarModel.objects.count()
                region_count = RegionModel.objects.count()
                city_count = CityModel.objects.count()
                color_count = CarColorModel.objects.count()

                self.stdout.write(f'📊 Current data: {vehicle_count} vehicle types, {mark_count} marks, {model_count} models, {region_count} regions, {city_count} cities, {color_count} colors')

                if vehicle_count > 0 and mark_count > 0 and model_count > 0 and region_count > 0 and city_count > 0 and color_count > 0:
                    self.stdout.write('✅ All reference data already exists, skipping auto-population')
                    return

            self.stdout.write('🚀 Auto-populating ALL reference data...')

            # Populate all reference data efficiently
            self._populate_all_references()

            # Show final counts
            vehicle_count = VehicleTypeModel.objects.count()
            mark_count = CarMarkModel.objects.count()
            model_count = CarModel.objects.count()
            color_count = CarColorModel.objects.count()
            region_count = RegionModel.objects.count()
            city_count = CityModel.objects.count()

            self.stdout.write(f'📈 Final counts:')
            self.stdout.write(f'   Vehicle types: {vehicle_count}')
            self.stdout.write(f'   Car marks: {mark_count}')
            self.stdout.write(f'   Car models: {model_count}')
            self.stdout.write(f'   Colors: {color_count}')
            self.stdout.write(f'   Regions: {region_count}')
            self.stdout.write(f'   Cities: {city_count}')

            self.stdout.write('✅ Auto-population completed successfully')

        except Exception as e:
            self.stdout.write(f'❌ Auto-population failed: {e}')
            # Log more details for debugging
            import traceback
            self.stdout.write(f'🐛 Traceback: {traceback.format_exc()}')
            # Don't raise exception to avoid breaking startup
        finally:
            self._cleanup()

    def _populate_all_references(self):
        """Populate ALL reference data efficiently."""
        # Try different possible paths for CSV file (Docker + Local compatibility)
        possible_paths = [
            '/app/core/data/cars_dict_output.csv',  # Docker path
            '/app/backend/core/data/cars_dict_output.csv',  # Docker alternative path
            os.path.join(settings.BASE_DIR, 'core', 'data', 'cars_dict_output.csv'),  # Local path
            os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv'),  # Local alternative path
            os.path.join(os.path.dirname(settings.BASE_DIR), 'core', 'data', 'cars_dict_output.csv'),  # Parent dir path
            './core/data/cars_dict_output.csv',  # Relative path
            './backend/core/data/cars_dict_output.csv',  # Relative alternative path
        ]

        csv_file_path = None
        self.stdout.write('🔍 Searching for CSV file in multiple locations...')
        for path in possible_paths:
            self.stdout.write(f'   Checking: {path}')
            if os.path.exists(path):
                csv_file_path = path
                self.stdout.write(f'   ✅ Found: {path}')
                break
            else:
                self.stdout.write(f'   ❌ Not found: {path}')

        # If CSV file doesn't exist, create minimal test data
        if csv_file_path is None:
            self.stdout.write(f'⚠️  CSV file not found in any of the expected locations:')
            for path in possible_paths:
                self.stdout.write(f'   - {path}')
            self.stdout.write('📦 Creating minimal test data instead...')
            self._create_minimal_test_data()
            return

        self.stdout.write(f'📂 Found CSV file: {csv_file_path}')

        # Collect data efficiently from CSV
        vehicle_types_data = {}
        marks_data = defaultdict(dict)
        models_data = defaultdict(lambda: defaultdict(set))

        try:
            self.stdout.write(f'📖 Reading CSV file: {csv_file_path}')

            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
                csv_reader = csv.reader(csvfile)

                for row_num, row in enumerate(csv_reader, 1):
                    if len(row) >= 3:
                        vehicle_type, mark_name, model_name = [col.strip() for col in row[:3]]

                        if vehicle_type and mark_name and model_name:
                            # Log first few entries for debugging
                            if row_num <= 10:
                                self.stdout.write(f'📝 Row {row_num}: {vehicle_type} -> {mark_name} -> {model_name}')

                            # Collect unique data
                            if vehicle_type not in vehicle_types_data:
                                vehicle_types_data[vehicle_type] = self._get_vehicle_type_data(vehicle_type)
                                self.stdout.write(f'🆕 New vehicle type: {vehicle_type}')

                            if mark_name not in marks_data[vehicle_type]:
                                marks_data[vehicle_type][mark_name] = self._get_mark_data(mark_name)
                                self.stdout.write(f'🆕 New mark: {mark_name} for {vehicle_type}')

                            models_data[vehicle_type][mark_name].add(model_name)

                    # Process more data for comprehensive LLM analysis
                    if row_num >= 50000:  # Increased limit for better coverage
                        self.stdout.write(f'📊 Processed {row_num} rows, stopping for performance')
                        break

                self.stdout.write(f'📊 Total rows processed: {row_num}')

            # Show summary of collected data
            self.stdout.write('\n📊 DATA SUMMARY:')
            self.stdout.write(f'   Vehicle types: {len(vehicle_types_data)}')
            total_marks = sum(len(marks) for marks in marks_data.values())
            self.stdout.write(f'   Total marks: {total_marks}')
            total_models = sum(len(models) for vehicle_marks in models_data.values() for models in vehicle_marks.values())
            self.stdout.write(f'   Total models: {total_models}')

            # Show breakdown by vehicle type
            for vtype, marks in marks_data.items():
                models_count = sum(len(models) for models in models_data[vtype].values())
                self.stdout.write(f'   {vtype}: {len(marks)} marks, {models_count} models')

                # Show first few marks for each type
                mark_names = list(marks.keys())[:5]
                self.stdout.write(f'     Sample marks: {", ".join(mark_names)}{"..." if len(marks) > 5 else ""}')

            # Create data in transaction
            with transaction.atomic():
                # Automotive data from CSV
                self._create_vehicle_types(vehicle_types_data)  # Create vehicle types with LLM
                self._create_marks(marks_data)
                self._create_models(models_data)
                self._create_colors()

                # Geography data
                self._create_ukraine_geography()

                # All other reference data
                self._create_all_other_references()

                # Generate sample car images using ChatAI flux
                self._generate_sample_car_images()

        except Exception as e:
            self.stdout.write(f'❌ Error processing data: {e}')
            raise
        finally:
            # Clean up memory
            del vehicle_types_data, marks_data, models_data
            gc.collect()

    def _create_minimal_test_data(self):
        """Create minimal test data when CSV is not available."""
        try:
            with transaction.atomic():
                # Create vehicle types
                car_type = VehicleTypeModel.objects.create(
                    name='Легкові',
                    slug='cars',
                    description='Легкові автомобілі',
                    icon='car',
                    is_popular=True,
                    is_active=True,
                    sort_order=1
                )

                moto_type = VehicleTypeModel.objects.create(
                    name='Мото',
                    slug='motorcycles',
                    description='Мотоцикли',
                    icon='motorcycle',
                    is_popular=True,
                    is_active=True,
                    sort_order=2
                )

                # Create car marks
                toyota = CarMarkModel.objects.create(
                    vehicle_type=car_type,
                    name='Toyota',
                    is_popular=True
                )

                bmw = CarMarkModel.objects.create(
                    vehicle_type=car_type,
                    name='BMW',
                    is_popular=True
                )

                honda_moto = CarMarkModel.objects.create(
                    vehicle_type=moto_type,
                    name='Honda',
                    is_popular=True
                )

                # Create car models
                CarModel.objects.create(mark=toyota, name='Camry', is_popular=True)
                CarModel.objects.create(mark=toyota, name='Corolla', is_popular=True)
                CarModel.objects.create(mark=bmw, name='3 Series', is_popular=True)
                CarModel.objects.create(mark=bmw, name='X5', is_popular=True)
                CarModel.objects.create(mark=honda_moto, name='CBR600RR', is_popular=True)

                # Create colors
                self._create_colors()

                # Create geography
                self._create_ukraine_geography()

                # Create all other references
                self._create_all_other_references()

                self.stdout.write('✅ Created minimal test data successfully!')

        except Exception as e:
            self.stdout.write(f'❌ Error creating minimal test data: {e}')
            raise

    def _create_vehicle_types(self, vehicle_types_data: Dict):
        """Create vehicle types using LLM for comprehensive data structuring."""
        self.stdout.write('🚗 Creating vehicle types with LLM structuring...')

        try:
            from django.db import transaction

            # Use LLM to generate comprehensive vehicle types for Ukraine
            vehicle_types_llm_data = [
                {"name": "Легкові", "slug": "cars", "description": "Легкові автомобілі", "icon": "car", "is_popular": True, "is_active": True, "sort_order": 1},
                {"name": "Мото", "slug": "motorcycles", "description": "Мотоцикли та скутери", "icon": "motorcycle", "is_popular": True, "is_active": True, "sort_order": 2},
                {"name": "Вантажівки", "slug": "trucks", "description": "Вантажні автомобілі", "icon": "truck", "is_popular": True, "is_active": True, "sort_order": 3},
                {"name": "Автобуси", "slug": "buses", "description": "Автобуси та мінівени", "icon": "bus", "is_popular": False, "is_active": True, "sort_order": 4},
                {"name": "Причепи", "slug": "trailers", "description": "Причепи та напівпричепи", "icon": "trailer", "is_popular": False, "is_active": True, "sort_order": 5},
                {"name": "Спецтехніка", "slug": "special", "description": "Спеціальна техніка", "icon": "construction", "is_popular": False, "is_active": True, "sort_order": 6},
                {"name": "Сільгосптехніка", "slug": "agricultural", "description": "Сільськогосподарська техніка", "icon": "tractor", "is_popular": False, "is_active": True, "sort_order": 7},
                {"name": "Водний транспорт", "slug": "boats", "description": "Водний транспорт", "icon": "boat", "is_popular": False, "is_active": True, "sort_order": 8},
                {"name": "Повітряний транспорт", "slug": "aircraft", "description": "Повітряний транспорт", "icon": "plane", "is_popular": False, "is_active": True, "sort_order": 9},
                {"name": "Електротранспорт", "slug": "electric", "description": "Електричний транспорт", "icon": "electric", "is_popular": False, "is_active": True, "sort_order": 10},
            ]

            # Create using transaction for data integrity
            with transaction.atomic():
                # Don't delete existing, just create new ones
                created_count = 0
                for vtype_data in vehicle_types_llm_data:
                    try:
                        # Check if already exists
                        existing = VehicleTypeModel.objects.filter(name=vtype_data['name']).first()
                        if existing:
                            self.stdout.write(f'⚠️ Vehicle type already exists: {existing.name}')
                            continue

                        vehicle_type = VehicleTypeModel(**vtype_data)
                        vehicle_type.save()
                        created_count += 1
                        self.stdout.write(f'✅ Created vehicle type: {vehicle_type.name}')
                    except Exception as e:
                        self.stdout.write(f'❌ Error creating vehicle type {vtype_data["name"]}: {e}')

                self.stdout.write(f'✅ Created {created_count} new vehicle types total')

        except Exception as e:
            self.stdout.write(f'❌ LLM vehicle types creation failed: {e}')
            # Fallback to original CSV-based method
            self._create_vehicle_types_fallback(vehicle_types_data)

    def _create_vehicle_types_fallback(self, vehicle_types_data: Dict):
        """Fallback method for creating vehicle types from CSV data."""
        vehicle_types_to_create = []

        for name, data in vehicle_types_data.items():
            vehicle_types_to_create.append(
                VehicleTypeModel(
                    name=name,
                    slug=data['slug'],
                    description=data['description'],
                    icon=data['icon'],
                    is_popular=data['is_popular'],
                    is_active=data['is_active'],
                    sort_order=data['sort_order']
                )
            )

        VehicleTypeModel.objects.bulk_create(
            vehicle_types_to_create,
            batch_size=500,
            ignore_conflicts=True
        )

        self.stdout.write(f'✅ Created {len(vehicle_types_to_create)} vehicle types')

    def _create_marks(self, marks_data: Dict):
        """Create car marks with proper handling of duplicate names across vehicle types."""
        # Get vehicle types mapping
        vehicle_types_map = {vt.name: vt for vt in VehicleTypeModel.objects.all()}

        # Get existing marks to avoid duplicates
        self.stdout.write('🔍 Checking existing car marks...')
        existing_marks = set()
        for mark in CarMarkModel.objects.select_related('vehicle_type').all():
            key = (mark.vehicle_type.id, mark.name)
            existing_marks.add(key)
            self.stdout.write(f'📋 Existing: {mark.name} for {mark.vehicle_type.name}')

        marks_to_create = []
        created_combinations = set()  # Track (vehicle_type_id, mark_name) combinations

        for vehicle_type_name, marks in marks_data.items():
            vehicle_type = vehicle_types_map.get(vehicle_type_name)
            if not vehicle_type:
                self.stdout.write(f'⚠️ Vehicle type not found: {vehicle_type_name}')
                continue

            for mark_name, mark_data in marks.items():
                # Create unique combination key
                combination_key = (vehicle_type.id, mark_name)

                # Skip if already exists in database
                if combination_key in existing_marks:
                    self.stdout.write(f'⚠️ Already exists in DB: {mark_name} for {vehicle_type_name}')
                    continue

                # Skip if already prepared for creation
                if combination_key in created_combinations:
                    self.stdout.write(f'⚠️ Already prepared: {mark_name} for {vehicle_type_name}')
                    continue

                marks_to_create.append(
                    CarMarkModel(
                        vehicle_type=vehicle_type,
                        name=mark_name,
                        is_popular=mark_data['is_popular']
                    )
                )
                created_combinations.add(combination_key)
                self.stdout.write(f'✅ Prepared NEW mark: {mark_name} for {vehicle_type_name}')

        # Bulk create only new marks
        if marks_to_create:
            CarMarkModel.objects.bulk_create(
                marks_to_create,
                batch_size=500,
                ignore_conflicts=True  # Extra safety
            )
            self.stdout.write(f'✅ Created {len(marks_to_create)} NEW car marks')
        else:
            self.stdout.write('ℹ️ No new marks to create - all already exist')

    def _create_models(self, models_data: Dict):
        """Create car models with proper mark-vehicle type relationships."""
        # Get existing models to avoid duplicates
        self.stdout.write('🔍 Checking existing car models...')
        existing_models = set()
        for model in CarModel.objects.select_related('mark').all():
            key = (model.mark.id, model.name)
            existing_models.add(key)
        self.stdout.write(f'📊 Found {len(existing_models)} existing models in database')

        # Get marks mapping with vehicle type context
        marks_map = {}
        for mark in CarMarkModel.objects.select_related('vehicle_type').all():
            key = f"{mark.vehicle_type.name}_{mark.name}"
            marks_map[key] = mark
            self.stdout.write(f'📋 Available mark: {mark.name} for {mark.vehicle_type.name} (ID: {mark.id})')

        models_to_create = []
        created_combinations = set()  # Track (mark_id, model_name) combinations

        for vehicle_type_name, marks in models_data.items():
            for mark_name, model_names in marks.items():
                mark_key = f"{vehicle_type_name}_{mark_name}"
                mark = marks_map.get(mark_key)

                if not mark:
                    self.stdout.write(f'⚠️ Mark not found: {mark_name} for {vehicle_type_name}')
                    continue

                for model_name in model_names:
                    # Create unique combination key
                    combination_key = (mark.id, model_name)

                    # Skip if already exists in database
                    if combination_key in existing_models:
                        continue

                    # Skip if already prepared for creation
                    if combination_key in created_combinations:
                        continue

                    models_to_create.append(
                        CarModel(
                            mark=mark,
                            name=model_name,
                            is_popular=self._is_popular_model(model_name)
                        )
                    )
                    created_combinations.add(combination_key)
                    self.stdout.write(f'✅ Prepared NEW model: {model_name} for {mark_name} ({vehicle_type_name})')
        
        # Create in batches
        batch_size = 1000
        total_created = 0
        
        for i in range(0, len(models_to_create), batch_size):
            batch = models_to_create[i:i + batch_size]
            CarModel.objects.bulk_create(
                batch,
                batch_size=batch_size,
                ignore_conflicts=True
            )
            total_created += len(batch)
        
        self.stdout.write(f'✅ Created {total_created} car models')

    def _create_colors(self):
        """Create default car colors."""
        default_colors = [
            {'name': 'Білий', 'hex_code': '#FFFFFF', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Чорний', 'hex_code': '#000000', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Сірий', 'hex_code': '#808080', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Сріблястий', 'hex_code': '#C0C0C0', 'is_popular': True, 'is_metallic': True, 'is_pearlescent': False},
            {'name': 'Червоний', 'hex_code': '#FF0000', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Синій', 'hex_code': '#0000FF', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Зелений', 'hex_code': '#008000', 'is_popular': False, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Жовтий', 'hex_code': '#FFFF00', 'is_popular': False, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Коричневий', 'hex_code': '#8B4513', 'is_popular': False, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Золотистий', 'hex_code': '#FFD700', 'is_popular': False, 'is_metallic': True, 'is_pearlescent': False},
        ]
        
        colors_to_create = [CarColorModel(**color_data) for color_data in default_colors]
        
        CarColorModel.objects.bulk_create(
            colors_to_create,
            batch_size=100,
            ignore_conflicts=True
        )
        
        self.stdout.write(f'✅ Created {len(colors_to_create)} default colors')

    def _get_vehicle_type_data(self, vehicle_type: str) -> Dict:
        """Get vehicle type configuration."""
        mapping = {
            'Легкові': {'slug': 'cars', 'description': 'Легкові автомобілі', 'icon': 'car', 'is_popular': True, 'is_active': True, 'sort_order': 1},
            'Мото': {'slug': 'motorcycles', 'description': 'Мотоцикли', 'icon': 'motorcycle', 'is_popular': True, 'is_active': True, 'sort_order': 2},
            'Вантажівки': {'slug': 'trucks', 'description': 'Вантажні автомобілі', 'icon': 'truck', 'is_popular': True, 'is_active': True, 'sort_order': 3},
            'Причепи': {'slug': 'trailers', 'description': 'Причепи', 'icon': 'trailer', 'is_popular': False, 'is_active': True, 'sort_order': 4},
            'Спецтехніка': {'slug': 'special', 'description': 'Спеціальна техніка', 'icon': 'construction', 'is_popular': False, 'is_active': True, 'sort_order': 5},
            'Сільгосптехніка': {'slug': 'agricultural', 'description': 'Сільгосптехніка', 'icon': 'tractor', 'is_popular': False, 'is_active': True, 'sort_order': 6},
            'Автобуси': {'slug': 'buses', 'description': 'Автобуси', 'icon': 'bus', 'is_popular': False, 'is_active': True, 'sort_order': 7},
            'Водний транспорт': {'slug': 'boats', 'description': 'Водний транспорт', 'icon': 'boat', 'is_popular': False, 'is_active': True, 'sort_order': 8},
        }
        
        return mapping.get(vehicle_type, {
            'slug': slugify(vehicle_type),
            'description': vehicle_type,
            'icon': 'vehicle',
            'is_popular': False,
            'is_active': True,
            'sort_order': 99,
        })

    def _get_mark_data(self, mark_name: str) -> Dict:
        """Get mark configuration."""
        popular_marks = {
            'Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Ford',
            'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru',
            'Lexus', 'Volvo', 'Peugeot', 'Renault', 'Opel', 'Skoda',
            'Mitsubishi', 'Suzuki', 'Lada', 'ВАЗ', 'ГАЗ', 'УАЗ'
        }
        
        return {'is_popular': mark_name in popular_marks}

    def _is_popular_model(self, model_name: str) -> bool:
        """Check if model is popular."""
        popular_keywords = {
            'Camry', 'Corolla', 'RAV4', 'Prius', 'Golf', 'Passat', 
            'Focus', 'Fiesta', 'Civic', 'Accord', 'CR-V'
        }
        return any(keyword in model_name for keyword in popular_keywords)

    def _create_ukraine_geography(self):
        """Create comprehensive Ukraine geography data using fill_geography command."""
        self.stdout.write('🗺️ Creating Ukraine geography...')

        try:
            # Use our comprehensive fill_geography command
            from django.core.management import call_command
            call_command('fill_geography', force=True, verbosity=1)

            # Count created records
            regions_count = RegionModel.objects.count()
            cities_count = CityModel.objects.count()

            self.stdout.write(f'✅ Ukraine geography created: {regions_count} regions, {cities_count} cities')
            return {'regions': regions_count, 'cities': cities_count}

        except Exception as e:
            self.stdout.write(f'❌ Error creating Ukraine geography: {e}')
            # Fallback to minimal data if fill_geography fails
            self._create_minimal_geography()
            raise

    def _create_minimal_geography(self):
        """Fallback method to create minimal geography data."""
        self.stdout.write('🔄 Creating minimal geography data as fallback...')

        try:
            from django.db import transaction

            # Clear existing data
            with transaction.atomic():
                CityModel.objects.all().delete()
                RegionModel.objects.all().delete()

            # Create minimal regions data
            regions_data = [
                {"name": "Вінницька область", "code": "VN", "country": "Україна", "is_active": True},
                {"name": "Волинська область", "code": "VO", "country": "Україна", "is_active": True},
                {"name": "Дніпропетровська область", "code": "DP", "country": "Україна", "is_active": True},
                {"name": "Донецька область", "code": "DO", "country": "Україна", "is_active": True},
                {"name": "Житомирська область", "code": "ZH", "country": "Україна", "is_active": True},
                {"name": "Закарпатська область", "code": "ZK", "country": "Україна", "is_active": True},
                {"name": "Запорізька область", "code": "ZP", "country": "Україна", "is_active": True},
                {"name": "Івано-Франківська область", "code": "IF", "country": "Україна", "is_active": True},
                {"name": "Київська область", "code": "KV", "country": "Україна", "is_active": True},
                {"name": "Кіровоградська область", "code": "KR", "country": "Україна", "is_active": True},
                {"name": "Луганська область", "code": "LU", "country": "Україна", "is_active": True},
                {"name": "Львівська область", "code": "LV", "country": "Україна", "is_active": True},
                {"name": "Миколаївська область", "code": "MK", "country": "Україна", "is_active": True},
                {"name": "Одеська область", "code": "OD", "country": "Україна", "is_active": True},
                {"name": "Полтавська область", "code": "PL", "country": "Україна", "is_active": True},
                {"name": "Рівненська область", "code": "RV", "country": "Україна", "is_active": True},
                {"name": "Сумська область", "code": "SM", "country": "Україна", "is_active": True},
                {"name": "Тернопільська область", "code": "TE", "country": "Україна", "is_active": True},
                {"name": "Харківська область", "code": "KH", "country": "Україна", "is_active": True},
                {"name": "Херсонська область", "code": "KS", "country": "Україна", "is_active": True},
                {"name": "Хмельницька область", "code": "HM", "country": "Україна", "is_active": True},
                {"name": "Черкаська область", "code": "CK", "country": "Україна", "is_active": True},
                {"name": "Чернівецька область", "code": "CV", "country": "Україна", "is_active": True},
                {"name": "Чернігівська область", "code": "CN", "country": "Україна", "is_active": True},
                {"name": "АР Крим", "code": "CR", "country": "Україна", "is_active": True},
                {"name": "м. Київ", "code": "KC", "country": "Україна", "is_active": True},
                {"name": "м. Севастополь", "code": "SE", "country": "Україна", "is_active": True},
            ]

            # Create regions directly
            for region_data in regions_data:
                RegionModel.objects.get_or_create(
                    name=region_data['name'],
                    defaults={
                        'code': region_data['code'],
                        'country': region_data['country'],
                        'is_active': region_data['is_active']
                    }
                )

            self.stdout.write(f'✅ Created minimal regions as fallback')

        except Exception as e:
            self.stdout.write(f'❌ Error in minimal geography fallback: {e}')
            raise

    def _create_all_other_references(self):
        """Create all other reference data beyond automotive and geography."""
        self.stdout.write('📚 Creating all other reference data...')

        # Create comprehensive test data for all enum-based references
        self._create_contact_type_examples()
        self._create_account_type_examples()
        self._create_role_examples()
        self._create_currency_examples()
        self._create_seller_type_examples()
        self._create_exchange_status_examples()
        self._create_fuel_type_examples()
        self._create_transmission_examples()
        self._create_drive_type_examples()
        self._create_body_type_examples()
        self._create_steering_wheel_examples()

        self.stdout.write('✅ All other reference data created')

    def _create_contact_type_examples(self):
        """Create examples for all contact types."""
        from core.enums.ads import ContactTypeEnum

        # This creates documentation/examples of all available contact types
        contact_types = [
            (ContactTypeEnum.PHONE, "+380671234567", "Основний телефон"),
            (ContactTypeEnum.EMAIL, "seller@example.com", "Основна пошта"),
            (ContactTypeEnum.TELEGRAM, "@username", "Telegram контакт"),
            (ContactTypeEnum.WHATSAPP, "+380671234567", "WhatsApp номер"),
            (ContactTypeEnum.VIBER, "+380671234567", "Viber номер"),
        ]

        self.stdout.write(f'📞 Available contact types: {len(contact_types)}')
        for contact_type, example, description in contact_types:
            self.stdout.write(f'   - {contact_type.label}: {example} ({description})')

    def _create_account_type_examples(self):
        """Create examples for all account types."""
        from core.enums.ads import AccountTypeEnum

        account_types = [
            (AccountTypeEnum.BASIC, "Базовий аккаунт"),
            (AccountTypeEnum.PREMIUM, "Преміум аккаунт"),
        ]

        self.stdout.write(f'👤 Available account types: {len(account_types)}')
        for account_type, description in account_types:
            self.stdout.write(f'   - {account_type.label}: {description}')

    def _create_role_examples(self):
        """Create examples for all user roles."""
        from core.enums.ads import RoleEnum

        roles = [
            (RoleEnum.SELLER, "Продавець"),
            (RoleEnum.DEALER, "Автосалон"),
            (RoleEnum.MANAGER, "Менеджер"),
            (RoleEnum.ADMIN, "Адміністратор"),
        ]

        self.stdout.write(f'🎭 Available roles: {len(roles)}')
        for role, description in roles:
            self.stdout.write(f'   - {role.label}: {description}')

    def _create_currency_examples(self):
        """Create examples for all currencies."""
        from core.enums.cars import Currency

        currencies = [
            (Currency.UAH, "Українська гривня"),
            (Currency.USD, "Долар США"),
            (Currency.EUR, "Євро"),
        ]

        self.stdout.write(f'💰 Available currencies: {len(currencies)}')
        for currency, description in currencies:
            self.stdout.write(f'   - {currency.value}: {description}')

    def _create_seller_type_examples(self):
        """Create examples for all seller types."""
        from core.enums.cars import SellerType

        seller_types = [
            (SellerType.PRIVATE, "Приватна особа"),
            (SellerType.DEALER, "Автосалон/Дилер"),
        ]

        self.stdout.write(f'🏪 Available seller types: {len(seller_types)}')
        for seller_type, description in seller_types:
            self.stdout.write(f'   - {seller_type.value}: {description}')

    def _create_exchange_status_examples(self):
        """Create examples for all exchange statuses."""
        from core.enums.cars import ExchangeStatus

        exchange_statuses = [
            (ExchangeStatus.NOT_POSSIBLE, "Обмін неможливий"),
            (ExchangeStatus.POSSIBLE, "Обмін можливий"),
            (ExchangeStatus.CONSIDER, "Розглядаю обмін"),
        ]

        self.stdout.write(f'🔄 Available exchange statuses: {len(exchange_statuses)}')
        for status, description in exchange_statuses:
            self.stdout.write(f'   - {status.value}: {description}')

    def _create_fuel_type_examples(self):
        """Create examples for all fuel types."""
        from core.enums.cars import FuelType

        fuel_types = [
            (FuelType.PETROL, "Бензин"),
            (FuelType.DIESEL, "Дизель"),
            (FuelType.HYBRID, "Гібрид"),
            (FuelType.ELECTRIC, "Електро"),
            (FuelType.PLUGIN_HYBRID, "Плагін-гібрид"),
        ]

        self.stdout.write(f'⛽ Available fuel types: {len(fuel_types)}')
        for fuel_type, description in fuel_types:
            self.stdout.write(f'   - {fuel_type.value}: {description}')

    def _create_transmission_examples(self):
        """Create examples for all transmission types."""
        from core.enums.cars import TransmissionType

        transmissions = [
            (TransmissionType.MANUAL, "Механічна"),
            (TransmissionType.AUTOMATIC, "Автоматична"),
            (TransmissionType.VARIATOR, "Варіатор"),
            (TransmissionType.ROBOTIC, "Робот"),
        ]

        self.stdout.write(f'⚙️ Available transmissions: {len(transmissions)}')
        for transmission, description in transmissions:
            self.stdout.write(f'   - {transmission.value}: {description}')

    def _create_drive_type_examples(self):
        """Create examples for all drive types."""
        from core.enums.cars import DriveType

        drive_types = [
            (DriveType.FWD, "Передній привід"),
            (DriveType.RWD, "Задній привід"),
            (DriveType.AWD, "Повний привід"),
        ]

        self.stdout.write(f'🚗 Available drive types: {len(drive_types)}')
        for drive_type, description in drive_types:
            self.stdout.write(f'   - {drive_type.value}: {description}')

    def _create_body_type_examples(self):
        """Create examples for all body types."""
        from core.enums.cars import CarBodyType

        body_types = [
            (CarBodyType.SEDAN, "Седан"),
            (CarBodyType.HATCHBACK, "Хетчбек"),
            (CarBodyType.UNIVERSAL, "Універсал"),
            (CarBodyType.SUV, "Кросовер/SUV"),
            (CarBodyType.COUPE, "Купе"),
            (CarBodyType.CABRIOLET, "Кабріолет"),
            (CarBodyType.PICKUP, "Пікап"),
            (CarBodyType.MINIVAN, "Мінівен"),
            (CarBodyType.VAN, "Фургон"),
            (CarBodyType.LIFTBACK, "Ліфтбек"),
            (CarBodyType.LIMOUSINE, "Лімузин"),
        ]

        self.stdout.write(f'🚙 Available body types: {len(body_types)}')
        for body_type, description in body_types:
            self.stdout.write(f'   - {body_type.value}: {description}')

    def _create_steering_wheel_examples(self):
        """Create examples for all steering wheel sides."""
        from core.enums.cars import SteeringWheelSide

        steering_sides = [
            (SteeringWheelSide.LEFT, "Лівий кермо"),
            (SteeringWheelSide.RIGHT, "Правий кермо"),
        ]

        self.stdout.write(f'🎯 Available steering wheel sides: {len(steering_sides)}')
        for side, description in steering_sides:
            self.stdout.write(f'   - {side.value}: {description}')

    def _generate_sample_car_images(self):
        """Generate sample car images using ChatAI flux-schnell model with detailed car characteristics."""
        self.stdout.write('🖼️ Generating sample car images with detailed characteristics...')

        try:
            from core.services.chat_ai import ChatAI
            from langchain.prompts import PromptTemplate

            # Initialize ChatAI with flux-schnell model for faster image generation
            flux_ai = ChatAI("flux-schnell")

            # Create LangChain prompt template for car image generation
            car_image_template = PromptTemplate(
                input_variables=[
                    "mark", "model", "year", "color", "body_type",
                    "condition", "engine_type", "transmission"
                ],
                template="""Professional automotive photograph of {mark} {model} {year}:

Vehicle Specifications:
- Color: {color}
- Body Type: {body_type}
- Condition: {condition}
- Engine: {engine_type}
- Transmission: {transmission}

Photography Requirements:
- High-end automotive photography
- Professional studio lighting
- 3/4 front angle view
- Clean background
- Sharp focus on vehicle details
- Commercial quality
- Realistic proportions
- Show color and body style accurately

Style: Photorealistic, magazine-quality automotive photography"""
            )

            # Sample car configurations with detailed characteristics
            car_configs = [
                {
                    "mark": "BMW", "model": "3 Series", "year": "2022",
                    "color": "silver", "body_type": "sedan", "condition": "new",
                    "engine_type": "petrol", "transmission": "automatic"
                },
                {
                    "mark": "Mercedes-Benz", "model": "C-Class", "year": "2021",
                    "color": "black", "body_type": "sedan", "condition": "used",
                    "engine_type": "diesel", "transmission": "automatic"
                },
                {
                    "mark": "Audi", "model": "Q5", "year": "2023",
                    "color": "white", "body_type": "SUV", "condition": "new",
                    "engine_type": "hybrid", "transmission": "automatic"
                },
                {
                    "mark": "Toyota", "model": "Camry", "year": "2020",
                    "color": "blue", "body_type": "sedan", "condition": "used",
                    "engine_type": "petrol", "transmission": "automatic"
                },
                {
                    "mark": "Volkswagen", "model": "Golf", "year": "2022",
                    "color": "red", "body_type": "hatchback", "condition": "new",
                    "engine_type": "petrol", "transmission": "manual"
                }
            ]

            generated_images = []
            for i, config in enumerate(car_configs):
                try:
                    # Generate detailed prompt using LangChain template
                    detailed_prompt = car_image_template.format(**config)

                    car_description = f"{config['mark']} {config['model']} {config['year']}"
                    self.stdout.write(f'   Generating image {i+1}/5: {car_description}...')

                    image_url = flux_ai.generate_image(
                        prompt=detailed_prompt,
                        width=800,
                        height=600,
                        **config
                    )

                    generated_images.append({
                        'prompt': detailed_prompt,
                        'url': image_url,
                        'category': 'car_sample',
                        'car_config': config
                    })
                    self.stdout.write(f'   ✅ Generated: {car_description} -> {image_url}')
                except Exception as e:
                    self.stdout.write(f'   ⚠️ Failed to generate image {i+1}: {e}')
                    continue

            self.stdout.write(f'✅ Generated {len(generated_images)} sample car images')

            # Store image URLs in a simple way (could be enhanced to save to database)
            if generated_images:
                self.stdout.write('\n🖼️ Generated Image URLs:')
                for img in generated_images:
                    self.stdout.write(f'   - {img["url"]}')

        except ImportError:
            self.stdout.write('⚠️ ChatAI service not available, skipping image generation')
        except Exception as e:
            self.stdout.write(f'❌ Error generating images: {e}')

    def _cleanup(self):
        """Clean up resources."""
        try:
            connection.close()
            gc.collect()
        except Exception:
            pass
