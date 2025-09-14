"""
Management command to seed linked reference data from CSV file.
Creates hierarchy: VehicleType -> CarMark -> CarModel
"""
import csv
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.conf import settings
from django.utils.text import slugify
from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel


class Command(BaseCommand):
    help = 'Seed linked reference data (VehicleType -> CarMark -> CarModel) from CSV file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if data already exists',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit number of rows to process (for testing)',
        )

    def handle(self, *args, **options):
        """Main command handler."""
        self.stdout.write(self.style.SUCCESS('Starting linked reference data seeding from CSV...'))
        
        # Check if data already exists
        if not options['force'] and not options['clear']:
            if VehicleTypeModel.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        'Reference data already exists. Use --force to update or --clear to reset.'
                    )
                )
                return

        # Clear existing data if requested
        if options['clear']:
            self.clear_existing_data()

        try:
            with transaction.atomic():
                self.process_csv_file(options.get('limit'))
                
        except Exception as e:
            raise CommandError(f'Error processing CSV file: {e}')

        self.stdout.write(self.style.SUCCESS('Linked reference data seeding completed successfully!'))

    def clear_existing_data(self):
        """Clear existing reference data in correct order."""
        self.stdout.write('Clearing existing reference data...')
        
        # Delete in reverse order of dependencies
        CarModel.objects.all().delete()
        CarMarkModel.objects.all().delete()
        VehicleTypeModel.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('Existing reference data cleared.'))

    def process_csv_file(self, limit=None):
        """Process CSV file and create linked reference data."""
        csv_file_path = os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv')
        
        self.stdout.write(f'Looking for CSV file at: {csv_file_path}')
        
        if not os.path.exists(csv_file_path):
            raise CommandError(f'CSV file not found: {csv_file_path}')

        # Dictionaries to store unique data
        vehicle_types = {}
        marks_by_type = {}
        models_by_mark = {}
        
        # Read CSV and collect data
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            csv_reader = csv.reader(csvfile)
            
            processed_rows = 0
            for row_num, row in enumerate(csv_reader, 1):
                if len(row) >= 3:
                    vehicle_type = row[0].strip()
                    mark = row[1].strip()
                    model = row[2].strip()
                    
                    if vehicle_type and mark and model:
                        # Collect vehicle types
                        if vehicle_type not in vehicle_types:
                            vehicle_types[vehicle_type] = self.get_vehicle_type_data(vehicle_type)
                        
                        # Collect marks by type
                        if vehicle_type not in marks_by_type:
                            marks_by_type[vehicle_type] = {}
                        if mark not in marks_by_type[vehicle_type]:
                            marks_by_type[vehicle_type][mark] = self.get_mark_data(mark)
                        
                        # Collect models by mark
                        mark_key = f"{vehicle_type}_{mark}"
                        if mark_key not in models_by_mark:
                            models_by_mark[mark_key] = {}
                        if model not in models_by_mark[mark_key]:
                            models_by_mark[mark_key][model] = self.get_model_data(model)
                        
                        processed_rows += 1
                        
                        # Apply limit if specified
                        if limit and processed_rows >= limit:
                            break
                
                # Progress indicator
                if row_num % 5000 == 0:
                    self.stdout.write(f'Processed {row_num} rows...')
        
        self.stdout.write(f'Collected data from {processed_rows} rows')
        self.stdout.write(f'Vehicle types: {len(vehicle_types)}')
        self.stdout.write(f'Marks: {sum(len(marks) for marks in marks_by_type.values())}')
        self.stdout.write(f'Models: {sum(len(models) for models in models_by_mark.values())}')
        
        # Create data in correct order
        self.create_vehicle_types(vehicle_types)
        self.create_marks(marks_by_type)
        self.create_models(models_by_mark)

    def get_vehicle_type_data(self, vehicle_type):
        """Get predefined data for vehicle type."""
        vehicle_type_mapping = {
            'Легкові': {
                'slug': 'cars',
                'description': 'Легкові автомобілі',
                'icon': 'car',
                'is_popular': True,
                'sort_order': 1,
            },
            'Мото': {
                'slug': 'motorcycles',
                'description': 'Мотоцикли та мототехніка',
                'icon': 'motorcycle',
                'is_popular': True,
                'sort_order': 2,
            },
            'Вантажівки': {
                'slug': 'trucks',
                'description': 'Вантажні автомобілі',
                'icon': 'truck',
                'is_popular': True,
                'sort_order': 3,
            },
        }
        
        return vehicle_type_mapping.get(vehicle_type, {
            'slug': slugify(vehicle_type),
            'description': vehicle_type,
            'icon': 'vehicle',
            'is_popular': False,
            'sort_order': 99,
        })

    def get_mark_data(self, mark):
        """Get data for car mark."""
        popular_marks = [
            'Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen',
            'Ford', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda',
            'Chevrolet', 'Renault', 'Peugeot', 'Opel', 'Skoda'
        ]
        
        return {
            'is_popular': mark in popular_marks
        }

    def get_model_data(self, model):
        """Get data for car model."""
        popular_models = [
            'Camry', 'Corolla', 'Accord', 'Civic', 'Focus', 'Golf',
            'Passat', 'A4', 'A6', '3 Series', '5 Series', 'C-Class',
            'E-Class', 'Elantra', 'Sonata', 'Optima', 'CX-5', 'RAV4'
        ]
        
        return {
            'is_popular': model in popular_models
        }

    def create_vehicle_types(self, vehicle_types):
        """Create vehicle types."""
        self.stdout.write('Creating vehicle types...')
        
        created_count = 0
        for name, data in vehicle_types.items():
            vehicle_type, created = VehicleTypeModel.objects.get_or_create(
                name=name,
                defaults=data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  Created vehicle type: {name}')
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} vehicle types'))

    def create_marks(self, marks_by_type):
        """Create car marks linked to vehicle types."""
        self.stdout.write('Creating car marks...')
        
        created_count = 0
        for vehicle_type_name, marks in marks_by_type.items():
            try:
                vehicle_type = VehicleTypeModel.objects.get(name=vehicle_type_name)
                
                for mark_name, mark_data in marks.items():
                    mark, created = CarMarkModel.objects.get_or_create(
                        vehicle_type=vehicle_type,
                        name=mark_name,
                        defaults=mark_data
                    )
                    
                    if created:
                        created_count += 1
                        if created_count % 100 == 0:
                            self.stdout.write(f'  Created {created_count} marks...')
                            
            except VehicleTypeModel.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Vehicle type not found: {vehicle_type_name}'))
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} car marks'))

    def create_models(self, models_by_mark):
        """Create car models linked to marks."""
        self.stdout.write('Creating car models...')
        
        created_count = 0
        for mark_key, models in models_by_mark.items():
            vehicle_type_name, mark_name = mark_key.split('_', 1)
            
            try:
                vehicle_type = VehicleTypeModel.objects.get(name=vehicle_type_name)
                mark = CarMarkModel.objects.get(vehicle_type=vehicle_type, name=mark_name)
                
                for model_name, model_data in models.items():
                    model, created = CarModel.objects.get_or_create(
                        mark=mark,
                        name=model_name,
                        defaults=model_data
                    )
                    
                    if created:
                        created_count += 1
                        if created_count % 500 == 0:
                            self.stdout.write(f'  Created {created_count} models...')
                            
            except (VehicleTypeModel.DoesNotExist, CarMarkModel.DoesNotExist) as e:
                self.stdout.write(self.style.ERROR(f'Error creating models for {mark_key}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} car models'))
