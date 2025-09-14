"""
Signals for automatic data seeding after migrations.
"""
import logging
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.core.management import call_command
from django.apps import AppConfig

logger = logging.getLogger(__name__)


@receiver(post_migrate)
def seed_reference_data(sender, **kwargs):
    """
    Automatically seed reference data after migrations.
    This ensures that regions and cities are always populated.
    """
    # Only run for ads app migrations
    if sender.name != 'apps.ads':
        return
    
    try:
        from apps.ads.models.reference import RegionModel, CityModel
        
        # Check if regions are already populated
        regions_count = RegionModel.objects.count()
        cities_count = CityModel.objects.count()
        
        logger.info(f"📊 Current data: {regions_count} regions, {cities_count} cities")
        
        # If we have less than 25 regions, run the seeding
        if regions_count < 25:
            logger.info("🌱 Seeding reference data (regions and cities)...")
            
            try:
                # Run the geography filling command
                call_command('fill_geography', '--force', verbosity=1)
                
                # Log results
                new_regions_count = RegionModel.objects.count()
                new_cities_count = CityModel.objects.count()
                
                logger.info(f"✅ Seeding completed: {new_regions_count} regions, {new_cities_count} cities")
                
            except Exception as e:
                logger.error(f"❌ Failed to seed reference data: {e}")
                # Don't raise exception to avoid breaking migrations
                
        else:
            logger.info("✅ Reference data already populated, skipping seeding")
            
    except Exception as e:
        logger.error(f"❌ Error checking reference data: {e}")
        # Don't raise exception to avoid breaking migrations


def seed_on_startup():
    """
    Function to call during app startup for additional seeding if needed.
    Can be called from apps.py ready() method.
    """
    try:
        from apps.ads.models.reference import RegionModel, CityModel
        
        regions_count = RegionModel.objects.count()
        cities_count = CityModel.objects.count()
        
        if regions_count < 25:
            logger.info("🚀 Startup seeding: Running reference data population...")
            call_command('fill_geography', '--force', verbosity=0)
            
            new_regions_count = RegionModel.objects.count()
            new_cities_count = CityModel.objects.count()
            logger.info(f"✅ Startup seeding completed: {new_regions_count} regions, {new_cities_count} cities")
        else:
            logger.info(f"✅ Reference data OK: {regions_count} regions, {cities_count} cities")
            
    except Exception as e:
        logger.error(f"❌ Startup seeding failed: {e}")
