#!/usr/bin/env python
"""
Script to reset migrations and create fresh ones.
Use this when migrations are conflicted.
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


def reset_migrations():
    """Reset migrations and create fresh ones."""
    print("🔄 Resetting migrations...")
    
    try:
        # Drop all tables
        print("🗑️  Dropping all tables...")
        with connection.cursor() as cursor:
            cursor.execute("DROP SCHEMA public CASCADE;")
            cursor.execute("CREATE SCHEMA public;")
        
        print("✅ Database schema reset")
        
        # Remove migration files (keep __init__.py)
        apps_to_reset = ['ads', 'accounts', 'users']
        
        for app_name in apps_to_reset:
            migrations_dir = backend_dir / 'apps' / app_name / 'migrations'
            if migrations_dir.exists():
                for file in migrations_dir.glob('*.py'):
                    if file.name != '__init__.py':
                        file.unlink()
                        print(f"🗑️  Removed {file}")
        
        print("✅ Migration files cleaned")
        
        # Create fresh migrations
        print("📝 Creating fresh migrations...")
        call_command('makemigrations')
        
        print("🚀 Applying migrations...")
        call_command('migrate')
        
        print("✅ Migrations reset successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting migrations: {e}")
        return False


if __name__ == '__main__':
    reset_migrations()
