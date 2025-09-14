"""
Service discovery utilities for auto-detecting external services.
"""
import os
import socket
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)


class ServiceDiscovery:
    """Auto-discovery utility for external services."""
    
    @staticmethod
    def test_connection(host: str, port: int, timeout: int = 2) -> bool:
        """Test if service is available on given host:port."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except Exception:
            return False
    
    @staticmethod
    def discover_service(
        service_name: str,
        port: int,
        env_var: str,
        hosts_to_try: List[Tuple[str, str]],
        fallback: str = 'localhost'
    ) -> str:
        """
        Discover service host with priority order.
        
        Args:
            service_name: Name of the service for logging
            port: Service port
            env_var: Environment variable name
            hosts_to_try: List of (host, description) tuples to test
            fallback: Fallback host if none found
            
        Returns:
            Discovered host
        """
        # 1. Environment variable (highest priority)
        env_host = os.getenv(env_var)
        if env_host:
            logger.info(f"🔧 Using {service_name} host from environment: {env_host}")
            return env_host
        
        # 2. Auto-detection by testing connections
        for host, description in hosts_to_try:
            if ServiceDiscovery.test_connection(host, port):
                logger.info(f"🎯 Auto-detected {service_name} host: {host} ({description})")
                return host
        
        # 3. Fallback
        logger.warning(f"⚠️ Could not auto-detect {service_name} host, falling back to {fallback}")
        return fallback
    
    @staticmethod
    def get_redis_host() -> str:
        """Auto-detect Redis host."""
        return ServiceDiscovery.discover_service(
            service_name='Redis',
            port=6379,
            env_var='REDIS_HOST',
            hosts_to_try=[
                ('redis', 'Docker Compose service'),
                ('localhost', 'Local Docker container'),
                ('127.0.0.1', 'Local Docker container (IP)'),
            ],
            fallback='redis'
        )
    
    @staticmethod
    def get_rabbitmq_host() -> str:
        """Auto-detect RabbitMQ host."""
        return ServiceDiscovery.discover_service(
            service_name='RabbitMQ',
            port=5672,
            env_var='RABBITMQ_HOST',
            hosts_to_try=[
                ('rabbitmq', 'Docker Compose service'),
                ('localhost', 'Local Docker container'),
                ('127.0.0.1', 'Local Docker container (IP)'),
            ]
        )
    
    @staticmethod
    def get_minio_host() -> str:
        """Auto-detect MinIO host."""
        return ServiceDiscovery.discover_service(
            service_name='MinIO',
            port=9000,
            env_var='MINIO_HOST',
            hosts_to_try=[
                ('minio', 'Docker Compose service'),
                ('localhost', 'Local Docker container'),
                ('127.0.0.1', 'Local Docker container (IP)'),
            ]
        )
    
    @staticmethod
    def get_postgres_host() -> str:
        """Auto-detect PostgreSQL host."""
        return ServiceDiscovery.discover_service(
            service_name='PostgreSQL',
            port=5432,
            env_var='POSTGRES_HOST',
            hosts_to_try=[
                ('postgres', 'Docker Compose service'),
                ('db', 'Docker Compose service (alternative)'),
                ('localhost', 'Local Docker container'),
                ('127.0.0.1', 'Local Docker container (IP)'),
            ]
        )
    
    @staticmethod
    def check_all_services() -> dict:
        """Check availability of all services."""
        services = {
            'redis': {
                'host': ServiceDiscovery.get_redis_host(),
                'port': 6379,
                'available': False
            },
            'rabbitmq': {
                'host': ServiceDiscovery.get_rabbitmq_host(),
                'port': 5672,
                'available': False
            },
            'minio': {
                'host': ServiceDiscovery.get_minio_host(),
                'port': 9000,
                'available': False
            },
            'postgres': {
                'host': ServiceDiscovery.get_postgres_host(),
                'port': 5432,
                'available': False
            }
        }
        
        for service_name, config in services.items():
            config['available'] = ServiceDiscovery.test_connection(
                config['host'], 
                config['port']
            )
            
            status = "✅ Available" if config['available'] else "❌ Not available"
            logger.info(f"{service_name.upper()}: {config['host']}:{config['port']} - {status}")
        
        return services
    
    @staticmethod
    def get_service_urls() -> dict:
        """Get URLs for all services."""
        redis_host = ServiceDiscovery.get_redis_host()
        rabbitmq_host = ServiceDiscovery.get_rabbitmq_host()
        minio_host = ServiceDiscovery.get_minio_host()
        
        return {
            'redis': f'redis://{redis_host}:6379',
            'rabbitmq': f'amqp://guest:guest@{rabbitmq_host}:5672/',
            'minio': f'http://{minio_host}:9000',
            'minio_console': f'http://{minio_host}:9001',
            'rabbitmq_management': f'http://{rabbitmq_host}:15672',
        }


# Convenience functions for direct use
def get_redis_host() -> str:
    """Get Redis host."""
    return ServiceDiscovery.get_redis_host()


def get_rabbitmq_host() -> str:
    """Get RabbitMQ host."""
    return ServiceDiscovery.get_rabbitmq_host()


def get_minio_host() -> str:
    """Get MinIO host."""
    return ServiceDiscovery.get_minio_host()


def check_services_health() -> dict:
    """Check health of all services."""
    return ServiceDiscovery.check_all_services()


def get_service_urls() -> dict:
    """Get service URLs."""
    return ServiceDiscovery.get_service_urls()
