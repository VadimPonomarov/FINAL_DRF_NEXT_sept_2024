"""
Management command to seed car reference data from CSV file.
"""
import os
import csv
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from apps.ads.models.reference import (
    CarMarkModel, CarModel, CarGenerationModel, CarModificationModel, CarColorModel
)


class Command(BaseCommand):
    help = 'Seed car reference data from cars_dict_output.csv file'

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

    def handle(self, *args, **options):
        """Main command handler."""
        self.stdout.write(self.style.SUCCESS('Starting car reference data seeding...'))
        
        # Check if data already exists
        if not options['force'] and not options['clear']:
            if CarMarkModel.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        'Car reference data already exists. Use --force to update or --clear to reset.'
                    )
                )
                return

        # Clear existing data if requested
        if options['clear']:
            self.clear_existing_data()

        # Load and process CSV data
        csv_file_path = os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv')

        self.stdout.write(f'Looking for CSV file at: {csv_file_path}')
        self.stdout.write(f'BASE_DIR is: {settings.BASE_DIR}')
        self.stdout.write(f'Current working directory: {os.getcwd()}')

        if not os.path.exists(csv_file_path):
            raise CommandError(f'CSV file not found: {csv_file_path}')

        try:
            with transaction.atomic():
                self.process_csv_file(csv_file_path)
                self.seed_default_colors()
                
        except Exception as e:
            raise CommandError(f'Error processing CSV file: {e}')

        self.stdout.write(self.style.SUCCESS('Car reference data seeding completed successfully!'))

    def clear_existing_data(self):
        """Clear existing reference data."""
        self.stdout.write('Clearing existing car reference data...')
        
        # Delete in reverse order of dependencies
        CarModificationModel.objects.all().delete()
        CarGenerationModel.objects.all().delete()
        CarModel.objects.all().delete()
        CarMarkModel.objects.all().delete()
        CarColorModel.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('Existing data cleared.'))

    def process_csv_file(self, csv_file_path):
        """Process the CSV file and create reference data."""
        self.stdout.write(f'Processing CSV file: {csv_file_path}')
        
        car_types = set()
        marks_data = {}  # {car_type: {mark_name: set(models)}}
        
        # First pass: collect all data
        with open(csv_file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for row_num, row in enumerate(reader, 1):
                if len(row) < 3:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping row {row_num}: insufficient columns')
                    )
                    continue
                
                car_type, mark_name, model_name = row[0].strip(), row[1].strip(), row[2].strip()
                
                if not all([car_type, mark_name, model_name]):
                    self.stdout.write(
                        self.style.WARNING(f'Skipping row {row_num}: empty values')
                    )
                    continue
                
                car_types.add(car_type)
                
                if car_type not in marks_data:
                    marks_data[car_type] = {}
                
                if mark_name not in marks_data[car_type]:
                    marks_data[car_type][mark_name] = set()
                
                marks_data[car_type][mark_name].add(model_name)

        # Create marks and models
        total_marks = 0
        total_models = 0
        
        for car_type, marks in marks_data.items():
            self.stdout.write(f'Processing car type: {car_type}')
            
            for mark_name, models in marks.items():
                # Create or get mark
                mark, created = CarMarkModel.objects.get_or_create(
                    name=mark_name,
                    defaults={'is_popular': self.is_popular_mark(mark_name)}
                )
                
                if created:
                    total_marks += 1
                    self.stdout.write(f'  Created mark: {mark_name}')
                
                # Create models for this mark
                for model_name in models:
                    model, created = CarModel.objects.get_or_create(
                        mark=mark,
                        name=model_name,
                        defaults={'is_popular': self.is_popular_model(mark_name, model_name)}
                    )
                    
                    if created:
                        total_models += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Created {total_marks} marks and {total_models} models'
            )
        )

    def is_popular_mark(self, mark_name):
        """Determine if a mark should be marked as popular."""
        popular_marks = {
            'Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Ford',
            'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru',
            'Lexus', 'Volvo', 'Peugeot', 'Renault', 'Opel', 'Skoda',
            'Mitsubishi', 'Suzuki', 'Infiniti', 'Acura', 'Cadillac',
            'Chevrolet', 'Jeep', 'Land Rover', 'Porsche', 'Jaguar'
        }
        return mark_name in popular_marks

    def is_popular_model(self, mark_name, model_name):
        """Determine if a model should be marked as popular."""
        popular_combinations = {
            'Toyota': ['Camry', 'Corolla', 'RAV4', 'Prius', 'Highlander'],
            'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'X1'],
            'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class'],
            'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3'],
            'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo', 'Jetta'],
            'Ford': ['Focus', 'Fiesta', 'Kuga', 'Mondeo', 'EcoSport'],
            'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot'],
            'Nissan': ['Qashqai', 'X-Trail', 'Micra', 'Juke', 'Leaf']
        }
        
        return model_name in popular_combinations.get(mark_name, [])

    def seed_default_colors(self):
        """Seed default car colors."""
        default_colors = [
            {'name': 'Білий', 'hex_code': '#FFFFFF', 'is_popular': True},
            {'name': 'Чорний', 'hex_code': '#000000', 'is_popular': True},
            {'name': 'Сірий', 'hex_code': '#808080', 'is_popular': True},
            {'name': 'Сріблястий', 'hex_code': '#C0C0C0', 'is_popular': True, 'is_metallic': True},
            {'name': 'Червоний', 'hex_code': '#FF0000', 'is_popular': True},
            {'name': 'Синій', 'hex_code': '#0000FF', 'is_popular': True},
            {'name': 'Зелений', 'hex_code': '#008000', 'is_popular': False},
            {'name': 'Жовтий', 'hex_code': '#FFFF00', 'is_popular': False},
            {'name': 'Коричневий', 'hex_code': '#8B4513', 'is_popular': False},
            {'name': 'Золотистий', 'hex_code': '#FFD700', 'is_popular': False, 'is_metallic': True},
            {'name': 'Бежевий', 'hex_code': '#F5F5DC', 'is_popular': False},
            {'name': 'Темно-синій', 'hex_code': '#000080', 'is_popular': False},
        ]
        
        colors_created = 0
        for color_data in default_colors:
            color, created = CarColorModel.objects.get_or_create(
                name=color_data['name'],
                defaults=color_data
            )
            if created:
                colors_created += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {colors_created} default colors')
        )
