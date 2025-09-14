#!/usr/bin/env python
"""
Auto-seed script for car reference data.
Runs automatically on startup if reference data is empty.
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

from django.core.management import call_command
from django.db import connection
from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel


def check_references_exist():
    """Check if reference data exists."""
    try:
        return (
            VehicleTypeModel.objects.exists() and 
            CarMarkModel.objects.exists() and 
            CarModel.objects.exists()
        )
    except Exception:
        return False


def auto_seed_references():
    """Auto-seed reference data if empty."""
    try:
        print("🔍 Checking reference data...")
        
        if check_references_exist():
            print("✅ Reference data already exists, skipping auto-seed")
            return True
        
        print("📦 Reference data is empty, starting auto-population...")
        
        # Run the auto-populate command
        call_command('auto_populate_references')
        
        print("✅ Auto-seed completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Auto-seed failed: {e}")
        return False
    finally:
        # Ensure connections are closed
        try:
            connection.close()
        except Exception:
            pass


if __name__ == '__main__':
    auto_seed_references()
