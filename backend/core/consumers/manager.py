"""
Consumer manager for automatic startup and management.
"""
import logging
import threading
import time
import signal
import sys
from typing import Dict
from django.conf import settings

logger = logging.getLogger(__name__)


class ConsumerManager:
    """
    Manager for RabbitMQ consumers.
    
    Handles automatic startup, monitoring, and graceful shutdown of consumers.
    """
    
    def __init__(self):
        self.consumers: Dict[str, Dict] = {}
        self.threads: Dict[str, threading.Thread] = {}
        self.running = False
        self.shutdown_event = threading.Event()
    
    def register_consumer(
        self,
        name: str,
        consumer_class,
        enabled: bool = True,
        auto_restart: bool = True,
        restart_delay: int = 5
    ):
        """
        Register a consumer for management.
        
        Args:
            name: Consumer name
            consumer_class: Consumer class to instantiate
            enabled: Whether consumer is enabled
            auto_restart: Whether to auto-restart on failure
            restart_delay: Delay before restart (seconds)
        """
        self.consumers[name] = {
            'class': consumer_class,
            'enabled': enabled,
            'auto_restart': auto_restart,
            'restart_delay': restart_delay,
            'instance': None,
            'thread': None,
            'last_restart': None,
            'restart_count': 0
        }
        logger.info(f"📋 Registered consumer: {name}")
    
    def start_all(self):
        """Start all enabled consumers."""
        if self.running:
            logger.warning("Consumer manager is already running")
            return
        
        self.running = True
        logger.info("🚀 Starting consumer manager...")
        
        for name, config in self.consumers.items():
            if config['enabled']:
                self.start_consumer(name)
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self._monitor_consumers, daemon=True)
        monitor_thread.start()
        
        logger.info("✅ Consumer manager started")
    
    def start_consumer(self, name: str):
        """Start a specific consumer."""
        if name not in self.consumers:
            logger.error(f"Consumer {name} not registered")
            return False
        
        config = self.consumers[name]
        
        if config['thread'] and config['thread'].is_alive():
            logger.warning(f"Consumer {name} is already running")
            return False
        
        try:
            # Create consumer instance
            config['instance'] = config['class']()
            
            # Create and start thread
            thread = threading.Thread(
                target=self._run_consumer,
                args=(name, config['instance']),
                daemon=True,
                name=f"Consumer-{name}"
            )
            
            config['thread'] = thread
            thread.start()
            
            logger.info(f"🐰 Started consumer: {name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start consumer {name}: {e}")
            return False
    
    def stop_consumer(self, name: str):
        """Stop a specific consumer."""
        if name not in self.consumers:
            logger.error(f"Consumer {name} not registered")
            return False
        
        config = self.consumers[name]
        
        if not config['thread'] or not config['thread'].is_alive():
            logger.warning(f"Consumer {name} is not running")
            return False
        
        try:
            # Stop consumer instance
            if config['instance'] and hasattr(config['instance'], 'stop'):
                config['instance'].stop()
            
            # Wait for thread to finish
            config['thread'].join(timeout=10)
            
            if config['thread'].is_alive():
                logger.warning(f"Consumer {name} thread did not stop gracefully")
            else:
                logger.info(f"🛑 Stopped consumer: {name}")
            
            config['thread'] = None
            config['instance'] = None
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to stop consumer {name}: {e}")
            return False
    
    def stop_all(self):
        """Stop all consumers."""
        if not self.running:
            logger.warning("Consumer manager is not running")
            return
        
        logger.info("🛑 Stopping consumer manager...")
        self.running = False
        self.shutdown_event.set()
        
        for name in list(self.consumers.keys()):
            self.stop_consumer(name)
        
        logger.info("✅ Consumer manager stopped")
    
    def restart_consumer(self, name: str):
        """Restart a specific consumer."""
        logger.info(f"🔄 Restarting consumer: {name}")
        
        self.stop_consumer(name)
        time.sleep(1)  # Brief pause
        return self.start_consumer(name)
    
    def get_status(self) -> Dict[str, Dict]:
        """Get status of all consumers."""
        status = {}
        
        for name, config in self.consumers.items():
            is_alive = config['thread'] and config['thread'].is_alive()
            
            status[name] = {
                'enabled': config['enabled'],
                'running': is_alive,
                'auto_restart': config['auto_restart'],
                'restart_count': config['restart_count'],
                'last_restart': config['last_restart']
            }
        
        return status
    
    def _run_consumer(self, name: str, consumer_instance):
        """Run consumer in thread."""
        try:
            logger.info(f"🏃 Running consumer: {name}")
            consumer_instance.start_consuming()
        except Exception as e:
            logger.error(f"❌ Consumer {name} crashed: {e}")
        finally:
            logger.info(f"🏁 Consumer {name} finished")
    
    def _monitor_consumers(self):
        """Monitor consumers and restart if needed."""
        logger.info("👁️ Starting consumer monitor")
        
        while self.running and not self.shutdown_event.is_set():
            try:
                for name, config in self.consumers.items():
                    if not config['enabled'] or not config['auto_restart']:
                        continue
                    
                    # Check if consumer thread is alive
                    if not config['thread'] or not config['thread'].is_alive():
                        # Check restart delay
                        if config['last_restart']:
                            time_since_restart = time.time() - config['last_restart']
                            if time_since_restart < config['restart_delay']:
                                continue
                        
                        logger.warning(f"🔄 Consumer {name} is down, restarting...")
                        
                        if self.start_consumer(name):
                            config['restart_count'] += 1
                            config['last_restart'] = time.time()
                        else:
                            logger.error(f"❌ Failed to restart consumer {name}")
                
                # Sleep before next check
                self.shutdown_event.wait(timeout=10)
                
            except Exception as e:
                logger.error(f"❌ Error in consumer monitor: {e}")
                self.shutdown_event.wait(timeout=5)
        
        logger.info("👁️ Consumer monitor stopped")


# Global consumer manager instance
consumer_manager = ConsumerManager()


def setup_consumers():
    """Setup and register all consumers."""
    from apps.moderation.services.notification_consumer import ModerationNotificationConsumer

    # Register moderation consumer
    consumer_manager.register_consumer(
        name='moderation_notifications',
        consumer_class=ModerationNotificationConsumer,
        enabled=getattr(settings, 'ENABLE_RABBITMQ_CONSUMERS', True),
        auto_restart=True,
        restart_delay=5
    )

    logger.info("📋 All consumers registered")


def start_consumers():
    """Start all consumers."""
    setup_consumers()
    consumer_manager.start_all()


def stop_consumers():
    """Stop all consumers."""
    consumer_manager.stop_all()
