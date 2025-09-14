"""
Management command to remove duplicate records from reference models.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from apps.ads.models.reference import CarMarkModel, RegionModel


class Command(BaseCommand):
    help = 'Remove duplicate records from reference models'

    def handle(self, *args, **options):
        """Remove duplicates from all reference models."""
        try:
            self.stdout.write('🧹 Removing duplicates from reference models...')
            
            with transaction.atomic():
                self._remove_car_mark_duplicates()
                self._remove_region_duplicates()
            
            self.stdout.write('✅ All duplicates removed successfully!')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error removing duplicates: {e}'))
            raise

    def _remove_car_mark_duplicates(self):
        """Remove duplicate CarMarkModel records."""
        self.stdout.write('🚗 Checking CarMarkModel duplicates...')
        
        duplicates = CarMarkModel.objects.values('name').annotate(
            count=Count('name')
        ).filter(count__gt=1)
        
        removed_count = 0
        for dup in duplicates:
            name = dup['name']
            count = dup['count']
            self.stdout.write(f'  Found {count} duplicates for: {name}')
            
            # Keep the oldest record, remove the rest
            marks = CarMarkModel.objects.filter(name=name).order_by('created_at')
            keep_mark = marks.first()
            
            for mark in marks[1:]:
                self.stdout.write(f'    Removing duplicate ID: {mark.id}')
                mark.delete()
                removed_count += 1
        
        self.stdout.write(f'✅ CarMarkModel: {removed_count} duplicates removed')

    def _remove_region_duplicates(self):
        """Remove duplicate RegionModel records."""
        self.stdout.write('🌍 Checking RegionModel duplicates...')
        
        duplicates = RegionModel.objects.values('name').annotate(
            count=Count('name')
        ).filter(count__gt=1)
        
        removed_count = 0
        for dup in duplicates:
            name = dup['name']
            count = dup['count']
            self.stdout.write(f'  Found {count} duplicates for: {name}')
            
            # Keep the oldest record, remove the rest
            regions = RegionModel.objects.filter(name=name).order_by('created_at')
            keep_region = regions.first()
            
            for region in regions[1:]:
                self.stdout.write(f'    Removing duplicate ID: {region.id}')
                region.delete()
                removed_count += 1
        
        self.stdout.write(f'✅ RegionModel: {removed_count} duplicates removed')
