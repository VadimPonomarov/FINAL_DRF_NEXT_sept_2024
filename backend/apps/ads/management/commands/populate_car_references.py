"""
Optimized management command to populate car reference data with memory and connection management.
Creates hierarchy: VehicleType -> CarMark -> CarModel with efficient bulk operations.
"""
import csv
import gc
import os
from collections import defaultdict
from typing import Dict, Set, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection
from django.conf import settings
from django.utils.text import slugify

from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel, CarColorModel


class Command(BaseCommand):
    help = 'Populate car reference data with optimized memory and connection management'

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
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for bulk operations (default: 1000)',
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit number of rows to process (for testing)',
        )
        parser.add_argument(
            '--memory-check',
            action='store_true',
            help='Enable memory usage monitoring',
        )

    def handle(self, *args, **options):
        """Main command handler with memory management."""
        self.batch_size = options['batch_size']
        self.memory_check = options['memory_check']
        
        self.stdout.write(self.style.SUCCESS('🚀 Starting optimized car reference data population...'))
        
        if self.memory_check:
            self._log_memory_usage("Initial")

        # Check if data already exists
        if not options['force'] and not options['clear']:
            if VehicleTypeModel.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        '⚠️  Reference data already exists. Use --force to update or --clear to reset.'
                    )
                )
                return

        # Clear existing data if requested
        if options['clear']:
            self._clear_existing_data()

        try:
            # Process data in optimized way
            self._process_csv_data_optimized(options.get('limit'))
            
            # Add default colors
            self._populate_default_colors()
            
        except Exception as e:
            self._close_connections()
            raise CommandError(f'❌ Error processing data: {e}')
        finally:
            # Ensure connections are closed
            self._close_connections()
            if self.memory_check:
                self._log_memory_usage("Final")

        self.stdout.write(self.style.SUCCESS('✅ Car reference data population completed successfully!'))

    def _clear_existing_data(self):
        """Clear existing reference data with proper connection management."""
        self.stdout.write('🧹 Clearing existing reference data...')
        
        try:
            with transaction.atomic():
                # Delete in reverse order of dependencies
                CarModel.objects.all().delete()
                CarMarkModel.objects.all().delete()
                VehicleTypeModel.objects.all().delete()
                CarColorModel.objects.all().delete()
                
            self.stdout.write(self.style.SUCCESS('✅ Existing reference data cleared.'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error clearing data: {e}'))
            raise
        finally:
            # Force garbage collection and close connections
            gc.collect()
            self._close_connections()

    def _process_csv_data_optimized(self, limit=None):
        """Process CSV data with optimized memory usage and bulk operations."""
        csv_file_path = os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv')
        
        self.stdout.write(f'📁 Processing CSV file: {csv_file_path}')
        
        if not os.path.exists(csv_file_path):
            raise CommandError(f'❌ CSV file not found: {csv_file_path}')

        # Use memory-efficient data structures
        vehicle_types_data = {}
        marks_data = defaultdict(dict)  # {vehicle_type: {mark_name: mark_data}}
        models_data = defaultdict(lambda: defaultdict(dict))  # {vehicle_type: {mark_name: {model_name: model_data}}}
        
        processed_rows = 0
        
        try:
            # Read and process CSV in chunks
            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
                csv_reader = csv.reader(csvfile)
                
                for row_num, row in enumerate(csv_reader, 1):
                    if len(row) >= 3:
                        vehicle_type, mark_name, model_name = [col.strip() for col in row[:3]]
                        
                        if vehicle_type and mark_name and model_name:
                            # Collect vehicle types
                            if vehicle_type not in vehicle_types_data:
                                vehicle_types_data[vehicle_type] = self._get_vehicle_type_data(vehicle_type)
                            
                            # Collect marks
                            if mark_name not in marks_data[vehicle_type]:
                                marks_data[vehicle_type][mark_name] = self._get_mark_data(mark_name)
                            
                            # Collect models
                            if model_name not in models_data[vehicle_type][mark_name]:
                                models_data[vehicle_type][mark_name][model_name] = self._get_model_data(model_name)
                            
                            processed_rows += 1
                            
                            # Apply limit if specified
                            if limit and processed_rows >= limit:
                                break
                    
                    # Progress indicator and memory check
                    if row_num % 5000 == 0:
                        self.stdout.write(f'📊 Processed {row_num} rows...')
                        if self.memory_check:
                            self._log_memory_usage(f"After {row_num} rows")
                        
                        # Force garbage collection periodically
                        gc.collect()

            self.stdout.write(f'📈 Collected data from {processed_rows} rows')
            self.stdout.write(f'   Vehicle types: {len(vehicle_types_data)}')
            self.stdout.write(f'   Marks: {sum(len(marks) for marks in marks_data.values())}')
            self.stdout.write(f'   Models: {sum(len(models) for vehicle_marks in models_data.values() for models in vehicle_marks.values())}')
            
            # Create data in optimized batches
            self._create_vehicle_types_bulk(vehicle_types_data)
            self._create_marks_bulk(marks_data)
            self._create_models_bulk(models_data)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error processing CSV: {e}'))
            raise
        finally:
            # Clean up memory
            del vehicle_types_data, marks_data, models_data
            gc.collect()

    def _create_vehicle_types_bulk(self, vehicle_types_data: Dict):
        """Create vehicle types using bulk operations."""
        self.stdout.write('🚗 Creating vehicle types...')
        
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
        
        try:
            with transaction.atomic():
                VehicleTypeModel.objects.bulk_create(
                    vehicle_types_to_create,
                    batch_size=self.batch_size,
                    ignore_conflicts=True
                )
            
            self.stdout.write(self.style.SUCCESS(f'✅ Created {len(vehicle_types_to_create)} vehicle types'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating vehicle types: {e}'))
            raise
        finally:
            del vehicle_types_to_create
            gc.collect()

    def _create_marks_bulk(self, marks_data: Dict):
        """Create car marks using bulk operations with proper foreign key handling."""
        self.stdout.write('🏭 Creating car marks...')
        
        # Get vehicle types mapping
        vehicle_types_map = {vt.name: vt for vt in VehicleTypeModel.objects.all()}
        
        marks_to_create = []
        
        for vehicle_type_name, marks in marks_data.items():
            vehicle_type = vehicle_types_map.get(vehicle_type_name)
            if not vehicle_type:
                self.stdout.write(self.style.WARNING(f'⚠️  Vehicle type not found: {vehicle_type_name}'))
                continue
                
            for mark_name, mark_data in marks.items():
                marks_to_create.append(
                    CarMarkModel(
                        vehicle_type=vehicle_type,
                        name=mark_name,
                        is_popular=mark_data['is_popular']
                    )
                )
        
        try:
            with transaction.atomic():
                CarMarkModel.objects.bulk_create(
                    marks_to_create,
                    batch_size=self.batch_size,
                    ignore_conflicts=True
                )
            
            self.stdout.write(self.style.SUCCESS(f'✅ Created {len(marks_to_create)} car marks'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating car marks: {e}'))
            raise
        finally:
            del marks_to_create, vehicle_types_map
            gc.collect()

    def _create_models_bulk(self, models_data: Dict):
        """Create car models using bulk operations with proper foreign key handling."""
        self.stdout.write('🚙 Creating car models...')
        
        # Get marks mapping
        marks_map = {}
        for mark in CarMarkModel.objects.select_related('vehicle_type').all():
            key = f"{mark.vehicle_type.name}_{mark.name}"
            marks_map[key] = mark
        
        models_to_create = []
        
        for vehicle_type_name, marks in models_data.items():
            for mark_name, models in marks.items():
                mark_key = f"{vehicle_type_name}_{mark_name}"
                mark = marks_map.get(mark_key)
                
                if not mark:
                    self.stdout.write(self.style.WARNING(f'⚠️  Mark not found: {mark_key}'))
                    continue
                
                for model_name, model_data in models.items():
                    models_to_create.append(
                        CarModel(
                            mark=mark,
                            name=model_name,
                            is_popular=model_data['is_popular']
                        )
                    )
        
        try:
            # Process in batches to avoid memory issues
            total_created = 0
            for i in range(0, len(models_to_create), self.batch_size):
                batch = models_to_create[i:i + self.batch_size]
                
                with transaction.atomic():
                    CarModel.objects.bulk_create(
                        batch,
                        batch_size=self.batch_size,
                        ignore_conflicts=True
                    )
                
                total_created += len(batch)
                self.stdout.write(f'📊 Created {total_created}/{len(models_to_create)} models...')
                
                # Force garbage collection between batches
                gc.collect()
            
            self.stdout.write(self.style.SUCCESS(f'✅ Created {total_created} car models'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating car models: {e}'))
            raise
        finally:
            del models_to_create, marks_map
            gc.collect()
