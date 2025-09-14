"""
Safe management command to seed car reference data with memory monitoring.
Ensures no memory leaks and proper connection management.
"""
import csv
import gc
import os
import psutil
from collections import defaultdict
from typing import Dict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection
from django.conf import settings
from django.utils.text import slugify

from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel, CarColorModel


class Command(BaseCommand):
    help = 'Safely seed car reference data with memory monitoring'

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
            help='Batch size for bulk operations',
        )
        parser.add_argument(
            '--monitor-memory',
            action='store_true',
            help='Monitor memory usage during operation',
        )

    def handle(self, *args, **options):
        """Main handler with comprehensive resource management."""
        self.batch_size = options['batch_size']
        self.monitor_memory = options['monitor_memory']
        
        if self.monitor_memory:
            self._log_memory("Start")
        
        try:
            # Check existing data
            if not options['force'] and not options['clear']:
                if self._check_data_exists():
                    self.stdout.write('✅ Reference data already exists. Use --force or --clear.')
                    return

            # Clear if requested
            if options['clear']:
                self._clear_data_safe()

            # Populate data
            self._populate_data_safe()
            
            self.stdout.write('✅ Reference data seeding completed successfully!')
            
        except Exception as e:
            self.stdout.write(f'❌ Error: {e}')
            raise
        finally:
            self._cleanup_resources()
            if self.monitor_memory:
                self._log_memory("End")

    def _check_data_exists(self):
        """Check if reference data exists."""
        try:
            return (
                VehicleTypeModel.objects.exists() and
                CarMarkModel.objects.exists() and
                CarModel.objects.exists()
            )
        except Exception:
            return False

    def _clear_data_safe(self):
        """Safely clear existing data."""
        self.stdout.write('🧹 Clearing existing data...')
        
        try:
            with transaction.atomic():
                CarModel.objects.all().delete()
                CarMarkModel.objects.all().delete()
                VehicleTypeModel.objects.all().delete()
                CarColorModel.objects.all().delete()
            
            self.stdout.write('✅ Data cleared successfully')
            
        except Exception as e:
            self.stdout.write(f'❌ Error clearing data: {e}')
            raise
        finally:
            gc.collect()
            if self.monitor_memory:
                self._log_memory("After clear")

    def _populate_data_safe(self):
        """Safely populate data with memory management."""
        csv_file_path = os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv')
        
        if not os.path.exists(csv_file_path):
            raise CommandError(f'CSV file not found: {csv_file_path}')

        self.stdout.write(f'📁 Processing: {csv_file_path}')
        
        # Collect data efficiently
        vehicle_types_data = {}
        marks_data = defaultdict(dict)
        models_data = defaultdict(lambda: defaultdict(set))
        
        try:
            # Read CSV with memory management
            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
                csv_reader = csv.reader(csvfile)
                
                for row_num, row in enumerate(csv_reader, 1):
                    if len(row) >= 3:
                        vehicle_type, mark_name, model_name = [col.strip() for col in row[:3]]
                        
                        if vehicle_type and mark_name and model_name:
                            # Collect data
                            if vehicle_type not in vehicle_types_data:
                                vehicle_types_data[vehicle_type] = self._get_vehicle_type_data(vehicle_type)
                            
                            if mark_name not in marks_data[vehicle_type]:
                                marks_data[vehicle_type][mark_name] = self._get_mark_data(mark_name)
                            
                            models_data[vehicle_type][mark_name].add(model_name)
                    
                    # Memory check every 5000 rows
                    if self.monitor_memory and row_num % 5000 == 0:
                        self._log_memory(f"Row {row_num}")
                        gc.collect()

            # Create data in transaction
            with transaction.atomic():
                self._create_vehicle_types_safe(vehicle_types_data)
                self._create_marks_safe(marks_data)
                self._create_models_safe(models_data)
                self._create_colors_safe()

        except Exception as e:
            self.stdout.write(f'❌ Error processing data: {e}')
            raise
        finally:
            # Clean up collections
            del vehicle_types_data, marks_data, models_data
            gc.collect()

    def _create_vehicle_types_safe(self, data: Dict):
        """Safely create vehicle types."""
        self.stdout.write('🚗 Creating vehicle types...')
        
        objects_to_create = []
        for name, config in data.items():
            objects_to_create.append(VehicleTypeModel(
                name=name,
                slug=config['slug'],
                description=config['description'],
                icon=config['icon'],
                is_popular=config['is_popular'],
                is_active=config['is_active'],
                sort_order=config['sort_order']
            ))
        
        VehicleTypeModel.objects.bulk_create(
            objects_to_create,
            batch_size=self.batch_size,
            ignore_conflicts=True
        )
        
        self.stdout.write(f'✅ Created {len(objects_to_create)} vehicle types')
        del objects_to_create
        gc.collect()

    def _create_marks_safe(self, data: Dict):
        """Safely create car marks."""
        self.stdout.write('🏭 Creating car marks...')
        
        # Get vehicle types mapping
        vehicle_types_map = {vt.name: vt for vt in VehicleTypeModel.objects.all()}
        
        objects_to_create = []
        for vehicle_type_name, marks in data.items():
            vehicle_type = vehicle_types_map.get(vehicle_type_name)
            if not vehicle_type:
                continue
                
            for mark_name, mark_config in marks.items():
                objects_to_create.append(CarMarkModel(
                    vehicle_type=vehicle_type,
                    name=mark_name,
                    is_popular=mark_config['is_popular']
                ))
        
        CarMarkModel.objects.bulk_create(
            objects_to_create,
            batch_size=self.batch_size,
            ignore_conflicts=True
        )
        
        self.stdout.write(f'✅ Created {len(objects_to_create)} car marks')
        del objects_to_create, vehicle_types_map
        gc.collect()

    def _create_models_safe(self, data: Dict):
        """Safely create car models."""
        self.stdout.write('🚙 Creating car models...')
        
        # Get marks mapping
        marks_map = {}
        for mark in CarMarkModel.objects.select_related('vehicle_type').all():
            key = f"{mark.vehicle_type.name}_{mark.name}"
            marks_map[key] = mark
        
        objects_to_create = []
        for vehicle_type_name, marks in data.items():
            for mark_name, model_names in marks.items():
                mark_key = f"{vehicle_type_name}_{mark_name}"
                mark = marks_map.get(mark_key)
                
                if not mark:
                    continue
                
                for model_name in model_names:
                    objects_to_create.append(CarModel(
                        mark=mark,
                        name=model_name,
                        is_popular=self._is_popular_model(model_name)
                    ))
        
        # Create in batches to manage memory
        total_created = 0
        for i in range(0, len(objects_to_create), self.batch_size):
            batch = objects_to_create[i:i + self.batch_size]
            CarModel.objects.bulk_create(
                batch,
                batch_size=self.batch_size,
                ignore_conflicts=True
            )
            total_created += len(batch)
            
            if self.monitor_memory and total_created % 5000 == 0:
                self._log_memory(f"Created {total_created} models")
                gc.collect()
        
        self.stdout.write(f'✅ Created {total_created} car models')
        del objects_to_create, marks_map
        gc.collect()

    def _create_colors_safe(self):
        """Safely create car colors."""
        self.stdout.write('🎨 Creating car colors...')
        
        colors_data = [
            {'name': 'Білий', 'hex_code': '#FFFFFF', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Чорний', 'hex_code': '#000000', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Сірий', 'hex_code': '#808080', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Сріблястий', 'hex_code': '#C0C0C0', 'is_popular': True, 'is_metallic': True, 'is_pearlescent': False},
            {'name': 'Червоний', 'hex_code': '#FF0000', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Синій', 'hex_code': '#0000FF', 'is_popular': True, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Зелений', 'hex_code': '#008000', 'is_popular': False, 'is_metallic': False, 'is_pearlescent': False},
            {'name': 'Жовтий', 'hex_code': '#FFFF00', 'is_popular': False, 'is_metallic': False, 'is_pearlescent': False},
        ]
        
        objects_to_create = [CarColorModel(**color) for color in colors_data]
        
        CarColorModel.objects.bulk_create(
            objects_to_create,
            batch_size=100,
            ignore_conflicts=True
        )
        
        self.stdout.write(f'✅ Created {len(objects_to_create)} colors')

    def _get_vehicle_type_data(self, vehicle_type: str) -> Dict:
        """Get vehicle type configuration."""
        mapping = {
            'Легкові': {'slug': 'cars', 'description': 'Легкові автомобілі', 'icon': 'car', 'is_popular': True, 'is_active': True, 'sort_order': 1},
            'Мото': {'slug': 'motorcycles', 'description': 'Мотоцикли', 'icon': 'motorcycle', 'is_popular': True, 'is_active': True, 'sort_order': 2},
            'Вантажівки': {'slug': 'trucks', 'description': 'Вантажні автомобілі', 'icon': 'truck', 'is_popular': True, 'is_active': True, 'sort_order': 3},
        }
        
        return mapping.get(vehicle_type, {
            'slug': slugify(vehicle_type), 'description': vehicle_type, 'icon': 'vehicle',
            'is_popular': False, 'is_active': True, 'sort_order': 99
        })

    def _get_mark_data(self, mark_name: str) -> Dict:
        """Get mark configuration."""
        popular_marks = {'Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Ford', 'Honda', 'Nissan'}
        return {'is_popular': mark_name in popular_marks}

    def _is_popular_model(self, model_name: str) -> bool:
        """Check if model is popular."""
        popular_keywords = {'Camry', 'Corolla', 'Golf', 'Focus', 'Civic'}
        return any(keyword in model_name for keyword in popular_keywords)

    def _log_memory(self, stage: str):
        """Log memory usage."""
        try:
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            self.stdout.write(f'🧠 Memory at {stage}: {memory_mb:.2f} MB')
        except ImportError:
            self.stdout.write(f'🧠 Memory check at {stage} (psutil not available)')

    def _cleanup_resources(self):
        """Clean up all resources."""
        try:
            connection.close()
            gc.collect()
            self.stdout.write('🔌 Resources cleaned up')
        except Exception as e:
            self.stdout.write(f'⚠️  Cleanup warning: {e}')
