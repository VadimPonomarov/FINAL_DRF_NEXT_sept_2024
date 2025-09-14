#!/usr/bin/env python
"""
Test script for auto-population of reference data.
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel, CarColorModel


def test_reference_data():
    """Test if reference data exists and show statistics."""
    print("🔍 Testing reference data...")
    
    try:
        # Count existing data
        vehicle_count = VehicleTypeModel.objects.count()
        mark_count = CarMarkModel.objects.count()
        model_count = CarModel.objects.count()
        color_count = CarColorModel.objects.count()
        
        print(f"📊 Current reference data:")
        print(f"   Vehicle types: {vehicle_count}")
        print(f"   Car marks: {mark_count}")
        print(f"   Car models: {model_count}")
        print(f"   Colors: {color_count}")
        
        # Show some examples
        if vehicle_count > 0:
            print(f"\n🚗 Vehicle types:")
            for vt in VehicleTypeModel.objects.all()[:5]:
                print(f"   - {vt.name} ({vt.slug})")
        
        if mark_count > 0:
            print(f"\n🏭 Car marks (first 10):")
            for mark in CarMarkModel.objects.select_related('vehicle_type')[:10]:
                print(f"   - {mark.name} ({mark.vehicle_type.name})")
        
        if model_count > 0:
            print(f"\n🚙 Car models (first 10):")
            for model in CarModel.objects.select_related('mark', 'mark__vehicle_type')[:10]:
                print(f"   - {model.name} ({model.mark.name})")
        
        if color_count > 0:
            print(f"\n🎨 Colors:")
            for color in CarColorModel.objects.all():
                print(f"   - {color.name} ({color.hex_code})")
        
        # Check data integrity
        print(f"\n🔍 Data integrity check:")
        
        # Check if all marks have vehicle types
        marks_without_type = CarMarkModel.objects.filter(vehicle_type__isnull=True).count()
        print(f"   Marks without vehicle type: {marks_without_type}")
        
        # Check if all models have marks
        models_without_mark = CarModel.objects.filter(mark__isnull=True).count()
        print(f"   Models without mark: {models_without_mark}")
        
        # Check popular items
        popular_vehicle_types = VehicleTypeModel.objects.filter(is_popular=True).count()
        popular_marks = CarMarkModel.objects.filter(is_popular=True).count()
        popular_models = CarModel.objects.filter(is_popular=True).count()
        
        print(f"   Popular vehicle types: {popular_vehicle_types}")
        print(f"   Popular marks: {popular_marks}")
        print(f"   Popular models: {popular_models}")
        
        # Overall status
        if vehicle_count > 0 and mark_count > 0 and model_count > 0:
            print(f"\n✅ Reference data is properly populated!")
            return True
        else:
            print(f"\n❌ Reference data is incomplete!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing reference data: {e}")
        import traceback
        print(f"🐛 Traceback: {traceback.format_exc()}")
        return False


def show_environment():
    """Show relevant environment variables."""
    print("🌍 Environment variables:")
    env_vars = [
        'IS_DOCKER',
        'AUTO_POPULATE_REFERENCES',
        'FORCE_AUTO_POPULATE_ON_READY',
        'DEBUG',
        'POSTGRES_HOST',
        'POSTGRES_NAME'
    ]
    
    for var in env_vars:
        value = os.environ.get(var, 'Not set')
        print(f"   {var}: {value}")


if __name__ == '__main__':
    print("🧪 Auto-populate test script")
    print("=" * 50)
    
    show_environment()
    print()
    
    success = test_reference_data()
    
    print("=" * 50)
    if success:
        print("✅ Test completed successfully!")
    else:
        print("❌ Test failed!")
    
    sys.exit(0 if success else 1)
