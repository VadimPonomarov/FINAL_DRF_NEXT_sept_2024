"""
Simplified configuration for mailing service.
All settings in one place with minimal complexity.
"""

import os
import logging
from typing import Literal

# from celery import Celery  # Not needed anymore
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from services.encription_service.decrypt_service import decrypt_message

logger = logging.getLogger(__name__)

# Load environment variables from centralized config
# Following DRY principle from ENV_SETUP.md
env_config_dir = os.path.join(os.path.dirname(__file__), "..", "..", "env-config")
load_dotenv(os.path.join(env_config_dir, ".env.base"))
load_dotenv(os.path.join(env_config_dir, ".env.secrets"))
load_dotenv(os.path.join(env_config_dir, ".env.docker"))  # Docker overrides


class Settings(BaseSettings):
    """Mailing service settings - uses centralized env-config/ following DRY principle."""

    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
    )

    # Application (auto-detected)
    debug: bool = False
    log_level: Literal["TRACE", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = (
        "INFO"
    )

    # Environment detection
    is_docker: bool = False
    environment: str = "local"

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    # RabbitMQ (auto-configured based on environment)
    rabbitmq_host: str = Field(default="localhost")
    rabbitmq_port: int = Field(default=5672)
    rabbitmq_user: str = Field(default="guest")
    rabbitmq_password: str = Field(default="guest")
    rabbitmq_vhost: str = Field(default="/")

    # Celery (not used anymore)
    # celery_result_backend: str = "rpc://"

    # Gmail SMTP
    gmail_host: str = "smtp.gmail.com"
    gmail_port: int = 587
    gmail_use_tls: bool = True
    gmail_user: str = Field(default="")
    gmail_password: str = Field(default="")

    # Paths
    templates_path: str = "./src/templates"
    media_path: str = "./src/media"
    logs_path: str = "./logs"

    # Queue
    email_queue_name: str = "email_queue"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Mailing service always runs in Docker
        self.is_docker = True
        self.environment = "docker"

        # Use Docker environment variables
        self.rabbitmq_host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.rabbitmq_user = os.getenv("RABBITMQ_USER", "guest")
        self.rabbitmq_password = os.getenv("RABBITMQ_PASSWORD", "guest")

        # Validate required environment variables
        if not all([self.rabbitmq_host, self.rabbitmq_user, self.rabbitmq_password]):
            raise ValueError("Missing required RabbitMQ configuration for mailing service")

        # Decrypt Gmail credentials if they exist
        if self.gmail_user:
            try:
                self.gmail_user = decrypt_message(self.gmail_user)
            except Exception as e:
                logger.error(f"Failed to decrypt gmail_user: {e}")
                raise ValueError("Gmail user decryption failed - check encryption")

        if self.gmail_password:
            try:
                self.gmail_password = decrypt_message(self.gmail_password)
            except Exception as e:
                logger.error(f"Failed to decrypt gmail_password: {e}")
                raise ValueError("Gmail password decryption failed - check encryption")

    # Celery methods removed - using direct RabbitMQ consumer instead

    @property
    def rabbitmq_url(self) -> str:
        """Get RabbitMQ connection URL."""
        return f"pyamqp://{self.rabbitmq_user}:{self.rabbitmq_password}@{self.rabbitmq_host}:{self.rabbitmq_port}{self.rabbitmq_vhost}"

    def get_alternative_rabbitmq_host(self) -> str:
        """Get alternative RabbitMQ host for fallback."""
        return "rabbitmq" if self.rabbitmq_host == "localhost" else "localhost"

    def switch_rabbitmq_host(self):
        """Switch to alternative RabbitMQ host."""
        old_host = self.rabbitmq_host
        self.rabbitmq_host = self.get_alternative_rabbitmq_host()
        return old_host, self.rabbitmq_host

    def get_rabbitmq_host_from_service_registry(self):
        """Get RabbitMQ host from Service Registry (Redis)."""
        try:
            import redis
            import json

            # Connect to Redis
            redis_host = os.getenv('REDIS_HOST', 'redis' if self.is_docker else 'localhost')
            redis_client = redis.Redis(
                host=redis_host,
                port=6379,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )

            # Get RabbitMQ service info
            service_data = redis_client.get('service_registry:rabbitmq')
            if service_data:
                data = json.loads(service_data)
                host = data.get('host')
                if host:
                    return host

        except Exception as e:
            # Service Registry not available, continue with fallback
            pass

        return None

    def get_rabbitmq_connection_params_with_fallback(self):
        """Get RabbitMQ connection parameters with Service Registry and fallback hosts."""
        import pika

        # Try Service Registry first
        registry_host = self.get_rabbitmq_host_from_service_registry()

        hosts_to_try = []
        if registry_host:
            hosts_to_try.append(registry_host)

        # Add configured hosts
        hosts_to_try.extend([self.rabbitmq_host, self.get_alternative_rabbitmq_host()])

        # Remove duplicates while preserving order
        unique_hosts = []
        for host in hosts_to_try:
            if host not in unique_hosts:
                unique_hosts.append(host)

        connection_params = []
        for host in unique_hosts:
            params = pika.ConnectionParameters(
                host=host,
                port=self.rabbitmq_port,
                virtual_host=self.rabbitmq_vhost,
                credentials=pika.PlainCredentials(
                    username=self.rabbitmq_user, password=self.rabbitmq_password
                ),
                heartbeat=600,
                blocked_connection_timeout=300,
            )
            connection_params.append(params)

        return connection_params


# Global settings instance
settings = Settings()
