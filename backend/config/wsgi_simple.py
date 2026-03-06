"""
Simple WSGI configuration for Render deployment.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_railway')

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
