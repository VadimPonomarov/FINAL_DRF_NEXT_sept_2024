"""
Simplified mailing service application.
Clean, minimal, and focused on core functionality.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

import pika
import uvicorn
from config import settings
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from services.mail_services import send_email_direct
from services.rabbitmq import ConnectionFactory

# Setup logging
logging.basicConfig(level=getattr(logging, settings.log_level))
logger = logging.getLogger(__name__)


async def start_consumer():
    """Start RabbitMQ consumer for email processing with retry logic."""
    max_retries = 10
    retry_delay = 3

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"🔄 Starting RabbitMQ consumer (attempt {attempt}/{max_retries})")

            connection_params = pika.ConnectionParameters(
                host=settings.rabbitmq_host,
                port=settings.rabbitmq_port,
                virtual_host=settings.rabbitmq_vhost,
                credentials=pika.PlainCredentials(
                    username=settings.rabbitmq_user,
                    password=settings.rabbitmq_password
                ),
                heartbeat=600,
                blocked_connection_timeout=300,
            )

            def consume():
                # ConnectionFactory will automatically try fallback hosts
                consumer = ConnectionFactory(
                    parameters=connection_params,
                    queue_name=settings.email_queue_name,
                    callback=send_email_direct,
                )

                # Log the actual connected host
                actual_host = consumer.parameters.host
                logger.info(f"✅ Consumer connected to RabbitMQ at: {actual_host}")

                # This will block forever (until connection is lost)
                consumer.consume()

            # Run in thread to avoid blocking event loop
            await asyncio.to_thread(consume)

            # If we get here, consumer started successfully
            logger.info("🎉 RabbitMQ consumer started successfully")
            return

        except Exception as e:
            logger.error(f"❌ Consumer start attempt {attempt}/{max_retries} failed")
            logger.debug(f"Error details: {e}")

            if attempt == max_retries:
                logger.error("💥 All consumer start attempts failed - continuing without consumer")
                logger.warning("⚠️  Mailing service will run in API-only mode")
                # Don't raise - let FastAPI continue running
                return
            else:
                logger.info(f"⏳ Retrying consumer start in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info(f"Starting mailing service in {settings.environment} environment")

    consumer_task = None

    try:
        # Start consumer in Docker mode (non-blocking)
        if settings.is_docker:
            logger.info("Starting consumer in Docker mode (background)")
            # Don't await - let it run in background without blocking FastAPI startup
            consumer_task = asyncio.create_task(start_consumer())
        else:
            logger.info("Running in local mode - consumer not started")

        # FastAPI is now ready to serve requests
        logger.info("✅ FastAPI server is ready")
        
        yield

    finally:
        # Cleanup
        if consumer_task and not consumer_task.done():
            logger.info("Cancelling consumer task...")
            consumer_task.cancel()
            try:
                await consumer_task
            except asyncio.CancelledError:
                logger.info("Consumer task cancelled")

        logger.info("Mailing service shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Mailing Service",
    description="Simple email service with RabbitMQ and Celery",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Mailing service is running",
        "version": "1.0.0",
        "environment": settings.environment,
        "is_docker": settings.is_docker,
        "rabbitmq_host": settings.rabbitmq_host,
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "mailing",
            "environment": settings.environment,
            "is_docker": settings.is_docker,
        },
        status_code=200,
    )


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "dev",
        log_level=settings.log_level.lower(),
    )
