#!/usr/bin/env python3
"""
Service registration script for Docker containers.
Registers the current service in Redis Service Registry.
"""
import os
import sys
import time
import argparse
import json
import logging

# Add the project root to Python path
sys.path.insert(0, '/app')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from core.services.service_registry import ServiceRegistry

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def register_service(service_name: str, heartbeat: bool = False):
    """Register service in Redis Service Registry."""
    try:
        registry = ServiceRegistry()
        
        # Determine service configuration based on service name
        if service_name == 'backend':
            config = {
                'host': os.getenv('BACKEND_HOST', 'app'),
                'port': int(os.getenv('BACKEND_PORT', '8000')),
                'protocol': 'http',
                'service_type': 'django_backend',
                'version': '1.0.0',
                'debug': os.getenv('DEBUG', 'False').lower() == 'true',
            }
        elif service_name == 'frontend':
            config = {
                'host': os.getenv('FRONTEND_HOST', 'frontend'),
                'port': int(os.getenv('FRONTEND_PORT', '3000')),
                'protocol': 'http',
                'service_type': 'nextjs_frontend',
                'version': '1.0.0',
            }
        elif service_name == 'mailing':
            config = {
                'host': os.getenv('MAILING_HOST', 'mailing'),
                'port': int(os.getenv('MAILING_PORT', '8000')),
                'protocol': 'http',
                'service_type': 'fastapi_mailing',
                'version': '1.0.0',
            }
        else:
            logger.error(f"Unknown service name: {service_name}")
            return False
        
        # Register service
        if heartbeat:
            success = registry.register_with_heartbeat(service_name, config)
        else:
            success = registry.register_service(service_name, config)
        
        if success:
            logger.info(f"✅ Service '{service_name}' registered successfully")
            if heartbeat:
                logger.info(f"💓 Heartbeat started for '{service_name}'")
                # Keep the script running for heartbeat
                try:
                    while True:
                        time.sleep(30)  # Sleep for 30 seconds between heartbeats
                except KeyboardInterrupt:
                    logger.info(f"🛑 Stopping heartbeat for '{service_name}'")
        else:
            logger.error(f"❌ Failed to register service '{service_name}'")
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"💥 Error registering service '{service_name}': {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Register service in Redis Service Registry')
    parser.add_argument('service_name', help='Name of the service to register')
    parser.add_argument('--heartbeat', action='store_true', help='Start heartbeat after registration')
    
    args = parser.parse_args()
    
    logger.info(f"🚀 Starting service registration for '{args.service_name}'")
    
    success = register_service(args.service_name, args.heartbeat)
    
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()
