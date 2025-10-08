# Autonomous Celery Application Configuration
# Independent microservice for queue management

import os
from celery import Celery
from loguru import logger

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# =============================================================================
# CELERY APPLICATION SETUP
# =============================================================================

# Create Celery app instance
app = Celery('celery-microservice')

# =============================================================================
# BROKER AND BACKEND CONFIGURATION
# =============================================================================

# RabbitMQ broker configuration
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = os.getenv('RABBITMQ_PORT', '5672')
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD', 'guest')

BROKER_URL = f"pyamqp://{RABBITMQ_USER}:{RABBITMQ_PASSWORD}@{RABBITMQ_HOST}:{RABBITMQ_PORT}//"

# Redis result backend configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
REDIS_DB = os.getenv('REDIS_DB', '0')

RESULT_BACKEND = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

# =============================================================================
# CELERY CONFIGURATION
# =============================================================================

app.conf.update(
    # Broker settings
    broker_url=BROKER_URL,
    result_backend=RESULT_BACKEND,
    
    # Connection and heartbeat settings for stability
    broker_heartbeat=60,  # Heartbeat every 60 seconds
    broker_heartbeat_checkrate=2,  # Check heartbeat every 2 seconds
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=100,  # Retry up to 100 times
    broker_connection_timeout=300,  # 5 minutes timeout
    broker_transport_options={
        'master_name': 'rabbitmq',
        'max_retries': 3,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.5,
    },
    
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task settings
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=60,  # 1 minute
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    
    # Result settings
    result_expires=3600,  # 1 hour
    
    # Worker settings
    worker_max_tasks_per_child=1000,
    worker_max_memory_per_child=200000,  # 200MB
    
    # Task routing
    task_routes={
        'tasks.email.*': {'queue': 'email'},
        'tasks.notifications.*': {'queue': 'notifications'},
        'tasks.data_processing.*': {'queue': 'data_processing'},
        'tasks.cleanup.*': {'queue': 'cleanup'},
    },
    
    # Task discovery
    include=[
        'tasks.email_tasks',
        'tasks.notification_tasks',
        'tasks.data_processing_tasks',
        'tasks.cleanup_tasks',
    ]
)

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

logger.add(
    "logs/celery.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
)

# =============================================================================
# STARTUP LOGGING
# =============================================================================

@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks"""
    logger.info("🚀 Celery microservice started successfully")
    logger.info(f"📡 Broker: {BROKER_URL}")
    logger.info(f"💾 Result Backend: {RESULT_BACKEND}")

# =============================================================================
# ERROR HANDLING
# =============================================================================

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing"""
    logger.info(f'Request: {self.request!r}')
    return f'Debug task executed successfully'

# Export the app
celery_app = app
