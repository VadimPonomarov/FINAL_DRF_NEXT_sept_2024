"""
Management command to seed vehicle types from CSV file.
"""
import csv
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.conf import settings
from django.utils.text import slugify
from apps.ads.models.reference import VehicleTypeModel


class Command(BaseCommand):
    help = 'Seed vehicle types from CSV file (first column)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if data already exists',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing vehicle types before seeding',
        )

    def handle(self, *args, **options):
        """Main command handler."""
        self.stdout.write(self.style.SUCCESS('Starting vehicle types seeding from CSV...'))
        
        # Check if data already exists
        if not options['force'] and not options['clear']:
            if VehicleTypeModel.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        'Vehicle types data already exists. Use --force to update or --clear to reset.'
                    )
                )
                return

        # Clear existing data if requested
        if options['clear']:
            self.clear_existing_data()

        try:
            with transaction.atomic():
                self.process_csv_file()
                
        except Exception as e:
            raise CommandError(f'Error processing CSV file: {e}')

        self.stdout.write(self.style.SUCCESS('Vehicle types seeding completed successfully!'))

    def clear_existing_data(self):
        """Clear existing vehicle types data."""
        self.stdout.write('Clearing existing vehicle types data...')
        VehicleTypeModel.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Existing vehicle types data cleared.'))

    def process_csv_file(self):
        """Process CSV file and extract unique vehicle types."""
        csv_file_path = os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv')
        
        self.stdout.write(f'Looking for CSV file at: {csv_file_path}')
        
        if not os.path.exists(csv_file_path):
            raise CommandError(f'CSV file not found: {csv_file_path}')

        # Set to store unique vehicle types
        vehicle_types = set()
        
        # Read CSV and extract first column
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            csv_reader = csv.reader(csvfile)
            
            for row_num, row in enumerate(csv_reader, 1):
                if len(row) >= 1:
                    vehicle_type = row[0].strip()
                    if vehicle_type:
                        vehicle_types.add(vehicle_type)
                
                # Progress indicator
                if row_num % 5000 == 0:
                    self.stdout.write(f'Processed {row_num} rows...')
        
        self.stdout.write(f'Found {len(vehicle_types)} unique vehicle types')
        
        # Create vehicle types with predefined data
        vehicle_type_data = self.get_vehicle_type_mapping()
        
        created_count = 0
        for vehicle_type in sorted(vehicle_types):
            data = vehicle_type_data.get(vehicle_type, {})
            
            vehicle_type_obj, created = VehicleTypeModel.objects.get_or_create(
                name=vehicle_type,
                defaults={
                    'slug': data.get('slug', slugify(vehicle_type)),
                    'description': data.get('description', ''),
                    'icon': data.get('icon', ''),
                    'is_popular': data.get('is_popular', False),
                    'is_active': data.get('is_active', True),
                    'sort_order': data.get('sort_order', 0),
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  Created vehicle type: {vehicle_type}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {created_count} vehicle types')
        )

    def get_vehicle_type_mapping(self):
        """Get predefined data for vehicle types."""
        return {
            'Легкові': {
                'slug': 'cars',
                'description': 'Легкові автомобілі',
                'icon': 'car',
                'is_popular': True,
                'is_active': True,
                'sort_order': 1,
            },
            'Мото': {
                'slug': 'motorcycles',
                'description': 'Мотоцикли та мототехніка',
                'icon': 'motorcycle',
                'is_popular': True,
                'is_active': True,
                'sort_order': 2,
            },
            'Вантажівки': {
                'slug': 'trucks',
                'description': 'Вантажні автомобілі',
                'icon': 'truck',
                'is_popular': True,
                'is_active': True,
                'sort_order': 3,
            },
            'Причепи': {
                'slug': 'trailers',
                'description': 'Причепи та напівпричепи',
                'icon': 'trailer',
                'is_popular': False,
                'is_active': True,
                'sort_order': 4,
            },
            'Спецтехніка': {
                'slug': 'special-vehicles',
                'description': 'Спеціальна техніка',
                'icon': 'construction',
                'is_popular': False,
                'is_active': True,
                'sort_order': 5,
            },
            'Сільгосптехніка': {
                'slug': 'agricultural',
                'description': 'Сільськогосподарська техніка',
                'icon': 'tractor',
                'is_popular': False,
                'is_active': True,
                'sort_order': 6,
            },
            'Автобуси': {
                'slug': 'buses',
                'description': 'Автобуси та мікроавтобуси',
                'icon': 'bus',
                'is_popular': False,
                'is_active': True,
                'sort_order': 7,
            },
            'Водний транспорт': {
                'slug': 'boats',
                'description': 'Човни, яхти та водний транспорт',
                'icon': 'boat',
                'is_popular': False,
                'is_active': True,
                'sort_order': 8,
            },
        }
