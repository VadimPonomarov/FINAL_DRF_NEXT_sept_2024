#!/usr/bin/env python
"""
Simple health check script for Django application.
Used by Render.com to verify the application is running correctly.
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()

def health_check():
    """Perform basic health checks."""
    try:
        # Check database connection
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result[0] != 1:
                return False, "Database query failed"
        
        # Check if we can import core models
        from apps.users.models import UserModel
        
        print("✅ Health check passed")
        return True, "OK"
        
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False, str(e)

if __name__ == "__main__":
    success, message = health_check()
    if success:
        print(f"Health check: {message}")
        sys.exit(0)
    else:
        print(f"Health check failed: {message}")
        sys.exit(1)
