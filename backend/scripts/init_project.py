#!/usr/bin/env python
"""
Script to initialize AutoRia project data.
This script runs automatically on project startup.
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
from django.core.management.base import CommandError


def main():
    """Main initialization function."""
    print("🚀 AutoRia Project Initialization")
    print("=" * 50)
    
    try:
        # Run the initialization command
        call_command('init_project_data', verbosity=2)
        
        print("\n✅ AutoRia project is ready!")
        print("🌐 You can now start the development server")
        
    except CommandError as e:
        print(f"❌ Initialization failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
