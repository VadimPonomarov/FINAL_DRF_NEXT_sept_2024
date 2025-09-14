# Main entry point for Celery Microservice
# Autonomous queue management service

import os
import sys
from loguru import logger

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import Celery app
from config.celery_app import celery_app

# Configure logging
logger.add(
    "logs/celery-microservice.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
)

def main():
    """Main entry point"""
    logger.info("🚀 Starting Celery Microservice")
    logger.info("📋 Available tasks:")
    
    # List all registered tasks
    for task_name in sorted(celery_app.tasks.keys()):
        if not task_name.startswith('celery.'):
            logger.info(f"  - {task_name}")
    
    logger.info("✅ Celery Microservice ready")

if __name__ == "__main__":
    main()
