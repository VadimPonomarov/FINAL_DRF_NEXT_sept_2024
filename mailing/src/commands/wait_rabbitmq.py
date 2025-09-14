#!/usr/bin/env python3
"""
Wait for RabbitMQ to become available for mailing service.
"""
import sys
import time
import socket
import pika
import logging
import os

# Add the src directory to Python path
sys.path.insert(0, '/app/src')
sys.path.insert(0, '/app')

try:
    from config import settings
except ImportError:
    from src.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_socket_connection(host, port, timeout=5):
    """Test if port is accessible via socket."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        logger.debug(f"Socket test failed: {e}")
        return False


def test_rabbitmq_connection(host, port, user, password, timeout=5):
    """Test actual RabbitMQ connection."""
    try:
        connection_params = pika.ConnectionParameters(
            host=host,
            port=port,
            credentials=pika.PlainCredentials(user, password),
            connection_attempts=1,
            retry_delay=0,
            socket_timeout=timeout
        )
        
        connection = pika.BlockingConnection(connection_params)
        channel = connection.channel()
        
        # Test that we can declare a queue
        channel.queue_declare(queue='health_check_mailing', durable=False, auto_delete=True)
        
        connection.close()
        return True
        
    except Exception as e:
        logger.debug(f"RabbitMQ connection test failed: {e}")
        return False


def wait_for_rabbitmq(timeout=60, interval=3):
    """Wait for RabbitMQ to become available."""
    logger.info("🐰 Waiting for RabbitMQ to become available...")
    
    # Get RabbitMQ connection parameters
    rabbitmq_host = settings.rabbitmq_host
    rabbitmq_port = settings.rabbitmq_port
    rabbitmq_user = settings.rabbitmq_user
    rabbitmq_password = settings.rabbitmq_password
    
    logger.info(f"🔍 Checking RabbitMQ at {rabbitmq_host}:{rabbitmq_port}")
    
    start_time = time.time()
    connected = False
    
    while not connected and (time.time() - start_time) < timeout:
        try:
            # First check if port is open
            if not test_socket_connection(rabbitmq_host, rabbitmq_port, timeout=2):
                raise ConnectionError(f"Port {rabbitmq_port} not accessible")
            
            # Then try actual RabbitMQ connection
            if test_rabbitmq_connection(rabbitmq_host, rabbitmq_port, rabbitmq_user, rabbitmq_password):
                connected = True
            else:
                raise ConnectionError("RabbitMQ connection test failed")
                
        except Exception as e:
            elapsed = int(time.time() - start_time)
            logger.info(f"⏳ RabbitMQ unavailable ({elapsed}s/{timeout}s): {e}")
            time.sleep(interval)
    
    if connected:
        elapsed = int(time.time() - start_time)
        logger.info(f"✅ RabbitMQ is available! (took {elapsed}s)")
        return True
    else:
        logger.error(f"❌ RabbitMQ connection timeout after {timeout}s")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Wait for RabbitMQ to become available')
    parser.add_argument('--timeout', type=int, default=60, help='Maximum time to wait in seconds')
    parser.add_argument('--interval', type=int, default=3, help='Check interval in seconds')
    
    args = parser.parse_args()
    
    success = wait_for_rabbitmq(timeout=args.timeout, interval=args.interval)
    sys.exit(0 if success else 1)
