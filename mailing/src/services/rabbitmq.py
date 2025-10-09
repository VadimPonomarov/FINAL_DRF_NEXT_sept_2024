"""
Simplified RabbitMQ connection helper.
"""

import json
import logging
import os
import time
from typing import Callable

import pika
from pika.adapters.blocking_connection import BlockingChannel

logger = logging.getLogger(__name__)


class ConnectionFactory:
    """Simplified RabbitMQ connection factory with automatic fallback."""

    def __init__(
        self,
        parameters: pika.ConnectionParameters,
        queue_name: str,
        callback: Callable = None,
    ):
        """
        Initialize connection factory.

        Args:
            parameters: RabbitMQ connection parameters
            queue_name: Queue name to work with
            callback: Callback function for message processing
        """
        self.parameters = parameters
        self.queue_name = queue_name
        self.callback = callback
        self.connection = None
        self.channel = None
        self.original_host = parameters.host

        self._setup_connection_with_fallback()

    def _get_hosts_from_service_registry(self):
        """Get RabbitMQ host from Service Registry."""
        try:
            import redis
            import json

            # Use environment-aware Redis host
            redis_host = os.getenv('REDIS_HOST', 'redis')
            redis_client = redis.Redis(
                host=redis_host,
                port=6379,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )

            service_data = redis_client.get('service_registry:rabbitmq')
            if service_data:
                data = json.loads(service_data)
                host = data.get('host')
                if host:
                    return [host]

        except Exception:
            pass

        return []

    def _setup_connection_with_fallback(self):
        """Setup RabbitMQ connection with Service Registry and automatic fallback."""
        # Get hosts from Service Registry first
        registry_hosts = self._get_hosts_from_service_registry()

        # Start with registry hosts, then original host
        hosts_to_try = registry_hosts + [self.original_host]

        # Add alternative host
        alternative_host = (
            "rabbitmq" if self.original_host == "localhost" else "localhost"
        )
        if alternative_host not in hosts_to_try:
            hosts_to_try.append(alternative_host)

        # Remove duplicates while preserving order
        unique_hosts = []
        for host in hosts_to_try:
            if host not in unique_hosts:
                unique_hosts.append(host)

        hosts_to_try = unique_hosts
        last_error = None

        for host in hosts_to_try:
            try:
                logger.info(f"Attempting to connect to RabbitMQ at {host}...")

                # Update parameters with current host
                self.parameters.host = host

                self.connection = pika.BlockingConnection(self.parameters)
                self.channel = self.connection.channel()

                # Declare queue
                self.channel.queue_declare(queue=self.queue_name, durable=True)

                # Set QoS
                self.channel.basic_qos(prefetch_count=1)

                logger.info(
                    f"✅ Connected to RabbitMQ at {host}, queue: {self.queue_name}"
                )
                return

            except Exception as e:
                last_error = e
                logger.warning(f"❌ Failed to connect to RabbitMQ at {host}: {e}")

                # Clean up failed connection
                if self.connection and not self.connection.is_closed:
                    try:
                        self.connection.close()
                    except:
                        pass
                self.connection = None
                self.channel = None

        # If we get here, all hosts failed
        logger.error(f"Failed to connect to RabbitMQ on any host: {hosts_to_try}")
        raise last_error or Exception("No RabbitMQ hosts available")

    def _setup_connection(self):
        """Setup RabbitMQ connection and channel (legacy method)."""
        try:
            logger.info(f"🔌 Establishing connection to RabbitMQ at {self.parameters.host}:{self.parameters.port}")
            self.connection = pika.BlockingConnection(self.parameters)
            logger.info("✅ RabbitMQ connection established")

            self.channel = self.connection.channel()
            logger.info("📡 RabbitMQ channel created")

            # Declare queue
            self.channel.queue_declare(queue=self.queue_name, durable=True)
            logger.info(f"📋 Queue '{self.queue_name}' declared (durable=True)")

            # Set QoS
            self.channel.basic_qos(prefetch_count=1)
            logger.info("⚙️ QoS configured (prefetch_count=1)")

            logger.info(f"✅ Connected to RabbitMQ at {self.parameters.host}, queue: {self.queue_name}")

        except Exception as e:
            logger.error(f"Failed to setup RabbitMQ connection: {e}")
            raise

    def publish(self, message_data: dict):
        """
        Publish message to queue.

        Args:
            message_data: Message data to publish
        """
        try:
            message = json.dumps(message_data)

            self.channel.basic_publish(
                exchange="",
                routing_key=self.queue_name,
                body=message,
                properties=pika.BasicProperties(
                    delivery_mode=2
                ),  # Make message persistent
            )

            logger.info(f"Message published to {self.queue_name}")

        except Exception as e:
            logger.error(f"Failed to publish message: {e}")
            raise

    def get_callback(self, channel: BlockingChannel, method, properties, body: bytes):
        """
        Process received message.

        Args:
            channel: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body
        """
        try:
            # Parse message
            message_data = json.loads(body.decode("utf-8"))
            logger.info(f"📨 Received message: {message_data}")

            # Call callback if provided
            if self.callback:
                logger.info("🔄 Processing message with callback...")
                self.callback(**message_data)
                logger.info("✅ Message processed successfully")

            # Acknowledge message
            channel.basic_ack(delivery_tag=method.delivery_tag)
            logger.info("✅ Message acknowledged")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message JSON: {e}")
            # Reject message without requeue
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            # Reject message and requeue for retry
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def consume(self):
        """Start consuming messages from queue with automatic reconnection."""
        max_reconnect_attempts = 10
        reconnect_delay = 5  # seconds

        while max_reconnect_attempts > 0:
            try:
                logger.info(f"🔧 Initializing consumer for queue: {self.queue_name}")

                if not self.callback:
                    raise ValueError("Callback function is required for consuming")

                self.channel.basic_consume(
                    queue=self.queue_name, on_message_callback=self.get_callback
                )

                logger.info(f"🎧 Consumer registered for queue: {self.queue_name}")
                logger.info(f"🚀 Starting active consumption from {self.queue_name}...")
                self.channel.start_consuming()
                logger.info(f"✅ Consumer is now ACTIVELY LISTENING to {self.queue_name}")

                # If we get here, it means start_consuming() returned (unlikely)
                return

            except pika.exceptions.AMQPConnectionError as e:
                logger.error(f"🔌 Connection lost: {e}")
                max_reconnect_attempts -= 1
                if max_reconnect_attempts <= 0:
                    logger.error("💥 Maximum reconnection attempts reached")
                    raise

                logger.info(f"⏳ Reconnecting in {reconnect_delay} seconds...")
                time.sleep(reconnect_delay)

                # Re-establish connection
                try:
                    logger.info("🔄 Re-establishing RabbitMQ connection...")
                    self._setup_connection_with_fallback()
                    logger.info("✅ RabbitMQ connection re-established")
                except Exception as reconnect_error:
                    logger.error(f"❌ Failed to reconnect: {reconnect_error}")
                    time.sleep(reconnect_delay)

            except Exception as e:
                logger.error(f"Error in consume: {e}")
                raise

    def close(self):
        """Close connection."""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.close()
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("RabbitMQ connection closed")
        except Exception as e:
            logger.error(f"Error closing connection: {e}")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
