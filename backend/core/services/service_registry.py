"""
Service Registry - централизованная система регистрации сервисов в Redis.
Каждый сервис при старте регистрирует свои домен и порт в Redis.
"""
import os
import json
import logging
from typing import Dict, Optional, Any
from django.conf import settings
import redis

logger = logging.getLogger(__name__)


class ServiceRegistry:
    """Централизованный реестр сервисов в Redis с автоматической очисткой при крашах."""

    REDIS_KEY_PREFIX = "service_registry"
    DEFAULT_TTL = 60  # 1 минута TTL для быстрой очистки мертвых сервисов
    HEARTBEAT_INTERVAL = 30  # 30 секунд между heartbeat'ами
    HEALTH_CHECK_INTERVAL = 45  # 45 секунд между проверками здоровья
    
    def __init__(self):
        """
        Инициализация ServiceRegistry.
        Redis подключение создается лениво при первом использовании.
        """
        self.redis_client = None
        self._redis_config = {
            'host': getattr(settings, 'REDIS_HOST', 'redis'),
            'port': getattr(settings, 'REDIS_PORT', 6379),
            'db': getattr(settings, 'REDIS_DB', 0)
        }
        self._redis_initialized = False

    def _ensure_redis_connection(self):
        """
        Обеспечивает подключение к Redis при первом использовании.
        """
        if self._redis_initialized:
            return

        try:
            self.redis_client = redis.Redis(
                host=self._redis_config['host'],
                port=self._redis_config['port'],
                db=self._redis_config['db'],
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )

            # Проверяем подключение
            self.redis_client.ping()
            logger.info(f"ServiceRegistry connected to Redis at {self._redis_config['host']}:{self._redis_config['port']}")

            # Проверяем, пустой ли Redis после перезапуска
            self._check_redis_state()
            self._redis_initialized = True

        except Exception as e:
            logger.error(f"Failed to connect to Redis for ServiceRegistry: {e}")
            logger.warning("ServiceRegistry will work without Redis (limited functionality)")
            self.redis_client = None
            self._redis_initialized = True  # Помечаем как инициализированный, чтобы не пытаться снова

    def _check_redis_state(self):
        """
        Проверяет состояние Redis после подключения.
        Логирует информацию о том, пустой ли Redis.
        """
        try:
            if not self.redis_client:
                return

            # Проверяем количество ключей service_registry
            pattern = f"{self.REDIS_KEY_PREFIX}:*"
            keys = self.redis_client.keys(pattern)

            if keys:
                logger.warning(f"Found {len(keys)} existing service registry entries in Redis")
                logger.info("This may indicate Redis was not properly cleared on restart")

                # Логируем существующие сервисы
                for key in keys:
                    service_name = key.split(':', 1)[1]
                    ttl = self.redis_client.ttl(key)
                    logger.debug(f"Existing service: {service_name} (TTL: {ttl}s)")
            else:
                logger.info("Redis is clean - no existing service registry entries found")

        except Exception as e:
            logger.error(f"Error checking Redis state: {e}")
    
    def register_service(self, service_name: str, config: Dict[str, Any]) -> bool:
        """
        Регистрирует сервис в Redis. Только одна запись на сервис.
        Если сервис уже зарегистрирован, заменяет старую запись.

        Args:
            service_name: Имя сервиса (backend, frontend, minio, etc.)
            config: Конфигурация сервиса (host, port, protocol, etc.)

        Returns:
            bool: True если регистрация успешна
        """
        if not self.redis_client:
            logger.error("Redis client not available for service registration")
            return False

        try:
            key = f"{self.REDIS_KEY_PREFIX}:{service_name}"

            # Проверяем существующую запись
            existing_service = self._get_existing_service_info(service_name)
            if existing_service:
                logger.info(f"Service '{service_name}' already registered, replacing old registration")
                logger.debug(f"Old registration: PID={existing_service.get('pid')}, "
                           f"registered_at={existing_service.get('registered_at')}")

            # Добавляем метаданные для новой записи
            config.update({
                'registered_at': self._get_current_timestamp(),
                'environment': self._detect_environment(),
                'pid': os.getpid(),
                'hostname': os.getenv('HOSTNAME', 'unknown'),
                'instance_id': self._generate_instance_id(),
            })

            # Атомарно заменяем запись в Redis
            value = json.dumps(config)
            self.redis_client.setex(key, self.DEFAULT_TTL, value)

            logger.info(f"Service '{service_name}' registered successfully")
            logger.debug(f"New registration: PID={config['pid']}, "
                        f"instance_id={config['instance_id']}")
            return True

        except Exception as e:
            logger.error(f"Failed to register service '{service_name}': {e}")
            return False

    def _get_existing_service_info(self, service_name: str) -> Optional[Dict[str, Any]]:
        """
        Получает информацию о существующем сервисе для логирования.

        Args:
            service_name: Имя сервиса

        Returns:
            Dict с информацией о сервисе или None
        """
        try:
            key = f"{self.REDIS_KEY_PREFIX}:{service_name}"
            value = self.redis_client.get(key)

            if value:
                return json.loads(value)
            return None

        except Exception:
            return None

    def _generate_instance_id(self) -> str:
        """
        Генерирует уникальный ID экземпляра сервиса.

        Returns:
            Уникальный ID экземпляра
        """
        import uuid
        import time

        # Комбинируем PID, время и случайный UUID для уникальности
        pid = os.getpid()
        timestamp = int(time.time())
        random_part = str(uuid.uuid4())[:8]

        return f"{pid}-{timestamp}-{random_part}"
    
    def get_service(self, service_name: str) -> Optional[Dict[str, Any]]:
        """
        Получает конфигурацию сервиса из Redis.
        
        Args:
            service_name: Имя сервиса
            
        Returns:
            Dict с конфигурацией сервиса или None
        """
        if not self.redis_client:
            return None
        
        try:
            key = f"{self.REDIS_KEY_PREFIX}:{service_name}"
            value = self.redis_client.get(key)
            
            if value:
                return json.loads(value)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get service '{service_name}': {e}")
            return None
    
    def get_service_url(self, service_name: str, path: str = "") -> Optional[str]:
        """
        Формирует URL для сервиса.
        
        Args:
            service_name: Имя сервиса
            path: Путь (опционально)
            
        Returns:
            Полный URL или None
        """
        service_config = self.get_service(service_name)
        if not service_config:
            return None
        
        protocol = service_config.get('protocol', 'http')
        host = service_config.get('host', 'localhost')
        port = service_config.get('port', 80)
        
        # Формируем базовый URL
        if port in [80, 443]:
            base_url = f"{protocol}://{host}"
        else:
            base_url = f"{protocol}://{host}:{port}"
        
        # Добавляем путь если указан
        if path:
            path = path.lstrip('/')
            return f"{base_url}/{path}"
        
        return base_url
    
    def list_services(self) -> Dict[str, Dict[str, Any]]:
        """
        Возвращает список всех зарегистрированных сервисов.
        
        Returns:
            Dict с конфигурациями всех сервисов
        """
        if not self.redis_client:
            return {}
        
        try:
            pattern = f"{self.REDIS_KEY_PREFIX}:*"
            keys = self.redis_client.keys(pattern)
            
            services = {}
            for key in keys:
                service_name = key.split(':', 1)[1]
                value = self.redis_client.get(key)
                if value:
                    services[service_name] = json.loads(value)
            
            return services
            
        except Exception as e:
            logger.error(f"Failed to list services: {e}")
            return {}
    
    def unregister_service(self, service_name: str) -> bool:
        """
        Удаляет сервис из реестра.
        
        Args:
            service_name: Имя сервиса
            
        Returns:
            bool: True если удаление успешно
        """
        if not self.redis_client:
            return False
        
        try:
            key = f"{self.REDIS_KEY_PREFIX}:{service_name}"
            result = self.redis_client.delete(key)
            
            if result:
                logger.info(f"Service '{service_name}' unregistered")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to unregister service '{service_name}': {e}")
            return False
    
    def refresh_service_ttl(self, service_name: str, ttl: Optional[int] = None) -> bool:
        """
        Обновляет TTL для сервиса (heartbeat).

        Args:
            service_name: Имя сервиса
            ttl: TTL в секундах (по умолчанию DEFAULT_TTL)

        Returns:
            bool: True если обновление успешно
        """
        if not self.redis_client:
            return False

        try:
            key = f"{self.REDIS_KEY_PREFIX}:{service_name}"
            ttl_value = ttl or self.DEFAULT_TTL
            result = self.redis_client.expire(key, ttl_value)

            if result:
                logger.debug(f"TTL refreshed for service '{service_name}': {ttl_value}s")
            else:
                logger.warning(f"Service '{service_name}' not found for TTL refresh")

            return bool(result)

        except Exception as e:
            logger.error(f"Failed to refresh TTL for service '{service_name}': {e}")
            return False

    def start_heartbeat(self, service_name: str, interval: Optional[int] = None):
        """
        Запускает heartbeat для поддержания регистрации сервиса.

        Args:
            service_name: Имя сервиса
            interval: Интервал в секундах (по умолчанию HEARTBEAT_INTERVAL)
        """
        import threading
        import time

        interval = interval or self.HEARTBEAT_INTERVAL

        def heartbeat_worker():
            logger.info(f"Starting heartbeat for service '{service_name}' (interval: {interval}s)")

            while True:
                try:
                    time.sleep(interval)

                    success = self.refresh_service_ttl(service_name)
                    if success:
                        logger.debug(f"Heartbeat: '{service_name}' TTL refreshed")
                    else:
                        logger.warning(f"Heartbeat: Failed to refresh '{service_name}', attempting re-registration")
                        # Попытка повторной регистрации при неудаче heartbeat
                        self._attempt_reregistration(service_name)

                except Exception as e:
                    logger.error(f"Heartbeat error for '{service_name}': {e}")
                    time.sleep(interval)  # Продолжаем попытки даже при ошибках

        # Запускаем heartbeat в отдельном потоке
        heartbeat_thread = threading.Thread(target=heartbeat_worker, daemon=True)
        heartbeat_thread.start()

        return heartbeat_thread

    def register_with_heartbeat(self, service_name: str, config: Dict[str, Any]) -> bool:
        """
        Регистрирует сервис и автоматически запускает heartbeat.

        Args:
            service_name: Имя сервиса
            config: Конфигурация сервиса

        Returns:
            bool: True если регистрация успешна
        """
        success = self.register_service(service_name, config)
        if success:
            self.start_heartbeat(service_name)
            logger.info(f"Service '{service_name}' registered with automatic heartbeat")
        return success

    def cleanup_on_shutdown(self, service_name: str):
        """
        Очищает регистрацию сервиса при graceful shutdown.

        Args:
            service_name: Имя сервиса
        """
        try:
            success = self.unregister_service(service_name)
            if success:
                logger.info(f"Service '{service_name}' cleaned up on shutdown")
            else:
                logger.warning(f"Failed to cleanup service '{service_name}' on shutdown")
        except Exception as e:
            logger.error(f"Error during cleanup of service '{service_name}': {e}")

    def _attempt_reregistration(self, service_name: str):
        """
        Попытка повторной регистрации сервиса при неудаче heartbeat.

        Args:
            service_name: Имя сервиса
        """
        try:
            # Получаем последнюю конфигурацию сервиса
            current_config = self.get_service(service_name)
            if current_config:
                # Удаляем метаданные и перерегистрируем
                clean_config = {k: v for k, v in current_config.items()
                              if k not in ['registered_at', 'pid', 'ttl_remaining']}

                success = self.register_service(service_name, clean_config)
                if success:
                    logger.info(f"Service '{service_name}' successfully re-registered")
                else:
                    logger.error(f"Failed to re-register service '{service_name}'")
            else:
                logger.warning(f"Cannot re-register service '{service_name}': no config found")

        except Exception as e:
            logger.error(f"Error during re-registration of service '{service_name}': {e}")
    
    def _detect_environment(self) -> str:
        """Определяет среду выполнения."""
        if os.getenv('IS_DOCKER', 'false').lower() == 'true':
            return 'docker'
        return 'local'
    
    def _get_current_timestamp(self) -> str:
        """Возвращает текущую временную метку."""
        from datetime import datetime
        return datetime.now().isoformat()


# Глобальный экземпляр реестра сервисов
service_registry = ServiceRegistry()


def register_current_service():
    """
    Регистрирует текущий Django сервис в реестре.
    Вызывается при старте приложения.
    """
    try:
        # Определяем конфигурацию текущего сервиса
        is_docker = os.getenv('IS_DOCKER', 'false').lower() == 'true'
        
        if is_docker:
            # В Docker используем имена контейнеров
            host = os.getenv('BACKEND_HOST', 'backend')
            port = int(os.getenv('BACKEND_PORT', '8000'))
        else:
            # В локальной среде используем localhost
            host = 'localhost'
            port = 8000  # Django runserver по умолчанию
        
        config = {
            'host': host,
            'port': port,
            'protocol': 'http',
            'service_type': 'django_backend',
            'version': getattr(settings, 'VERSION', '1.0.0'),
            'debug': getattr(settings, 'DEBUG', False),
        }
        
        # Регистрируем сервис
        success = service_registry.register_service('backend', config)
        
        if success:
            logger.info(f"Backend service registered successfully: {config}")
        else:
            logger.error("Failed to register backend service")
            
    except Exception as e:
        logger.error(f"Error registering backend service: {e}")


def get_service_url(service_name: str, path: str = "") -> str:
    """
    Универсальная функция для получения URL сервиса с приоритетной системой.
    Использует принцип DRY.

    Args:
        service_name: Имя сервиса
        path: Путь (опционально)

    Returns:
        URL сервиса
    """
    resolver = ServiceUrlResolver()
    return resolver.resolve_url(service_name, path)


class ServiceUrlResolver:
    """
    Универсальный резолвер URL сервисов с приоритетной системой:
    1. Redis Service Registry (если доступен)
    2. Переменные окружения
    3. Значения по умолчанию
    """

    def __init__(self):
        self.environment = self._detect_environment()

    def resolve_url(self, service_name: str, path: str = "") -> str:
        """Разрешает URL сервиса с использованием приоритетной системы."""
        # Приоритет 1: Redis Service Registry (Docker среда)
        redis_url = self._get_from_redis(service_name, path)
        if redis_url:
            logger.debug(f"Service '{service_name}' URL from Redis (Docker): {redis_url}")
            return redis_url

        # Если сервиса нет в Redis, значит запуск в локальной среде
        logger.debug(f"Service '{service_name}' not found in Redis - using local environment")

        # Приоритет 2: Переменные окружения из backend/.env.local (локальная среда)
        env_url = self._get_from_environment(service_name, path)
        if env_url:
            logger.info(f"Service '{service_name}' URL from environment (backend/.env.local): {env_url}")
            return env_url

        # Приоритет 3: Fallback значения (localhost по умолчанию)
        default_url = self._get_from_defaults(service_name, path)
        logger.info(f"Service '{service_name}' URL from fallback (localhost): {default_url}")
        return default_url

    def get_service_info(self, service_name: str) -> Dict[str, Any]:
        """Возвращает подробную информацию о разрешении URL для отладки."""
        info = {
            'service_name': service_name,
            'environment': self.environment,
            'sources_checked': [],
            'final_url': None,
            'source_used': None
        }

        # Проверяем Redis
        redis_url = self._get_from_redis(service_name)
        if redis_url:
            info['sources_checked'].append('redis')
            info['final_url'] = redis_url
            info['source_used'] = 'redis'
            return info
        else:
            info['sources_checked'].append('redis (not available)')

        # Проверяем Environment
        env_url = self._get_from_environment(service_name)
        if env_url:
            info['sources_checked'].append('environment')
            info['final_url'] = env_url
            info['source_used'] = 'environment'
            return info
        else:
            info['sources_checked'].append('environment (not set)')

        # Используем defaults
        default_url = self._get_from_defaults(service_name)
        info['sources_checked'].append('defaults')
        info['final_url'] = default_url
        info['source_used'] = 'defaults'

        return info

    def _get_from_redis(self, service_name: str, path: str = "") -> Optional[str]:
        """Получает URL из Service Discovery в Redis."""
        try:
            import redis
            import json

            # Маппинг имен сервисов: Service Registry -> Service Discovery
            service_name_mapping = {
                'backend': 'app',  # Django backend запущен как 'app' контейнер
                'postgres': 'pg',  # PostgreSQL запущен как 'pg' контейнер
                'postgresql': 'pg',  # Альтернативное имя для PostgreSQL
            }

            # Используем маппинг если есть, иначе оригинальное имя
            discovery_service_name = service_name_mapping.get(service_name, service_name)

            # Подключаемся к Redis
            redis_host = os.getenv('REDIS_HOST', 'localhost')
            redis_port = int(os.getenv('REDIS_PORT', 6379))
            redis_db = int(os.getenv('REDIS_DB', 0))

            redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2
            )

            # Получаем данные сервиса из Service Discovery
            service_key = f"service_registry:{discovery_service_name}"
            service_data = redis_client.get(service_key)

            if not service_data:
                return None

            # Парсим JSON данные
            service_info = json.loads(service_data)

            # Пытаемся получить готовый URL
            base_url = service_info.get('url')

            # Если URL нет, собираем его из компонентов
            if not base_url:
                host = service_info.get('host')
                port = service_info.get('port')
                protocol = service_info.get('protocol', 'http')

                if not host:
                    return None

                # Формируем URL из компонентов
                if port and port not in [80, 443]:
                    base_url = f"{protocol}://{host}:{port}"
                else:
                    base_url = f"{protocol}://{host}"

            # Добавляем путь если указан
            if path:
                path = path.lstrip('/')
                return f"{base_url.rstrip('/')}/{path}"

            return base_url

        except Exception as e:
            logger.debug(f"Failed to get service '{service_name}' from Redis: {e}")
            return None

    def _get_from_environment(self, service_name: str, path: str = "") -> Optional[str]:
        """Получает URL из переменных окружения."""
        return _get_service_url_from_env(service_name, path)

    def _get_from_defaults(self, service_name: str, path: str = "") -> str:
        """Получает URL из значений по умолчанию."""
        return _get_service_url_default(service_name, path)

    def _detect_environment(self) -> str:
        """Определяет среду выполнения."""
        if os.getenv('IS_DOCKER', 'false').lower() == 'true':
            return 'docker'
        elif os.getenv('DJANGO_ENV') == 'production':
            return 'production'
        return 'local'


def _get_service_url_from_env(service_name: str, path: str = "") -> Optional[str]:
    """
    Получает URL сервиса из переменных окружения.

    Поддерживаемые переменные:
    - {SERVICE_NAME}_HOST
    - {SERVICE_NAME}_PORT
    - {SERVICE_NAME}_PROTOCOL
    - {SERVICE_NAME}_URL (полный URL, имеет приоритет)
    """
    service_upper = service_name.upper()

    # Проверяем полный URL
    full_url_var = f"{service_upper}_URL"
    full_url = os.getenv(full_url_var)
    if full_url:
        if path:
            path = path.lstrip('/')
            return f"{full_url.rstrip('/')}/{path}"
        return full_url

    # Собираем URL из компонентов
    host_var = f"{service_upper}_HOST"
    port_var = f"{service_upper}_PORT"
    protocol_var = f"{service_upper}_PROTOCOL"

    host = os.getenv(host_var)
    port = os.getenv(port_var)

    # Для RabbitMQ используем amqp по умолчанию
    if service_name.lower() == 'rabbitmq':
        protocol = os.getenv(protocol_var, 'amqp')
    else:
        protocol = os.getenv(protocol_var, 'http')

    if not host:
        return None

    # Формируем URL
    if port and port not in ['80', '443']:
        base_url = f"{protocol}://{host}:{port}"
    else:
        base_url = f"{protocol}://{host}"

    if path:
        path = path.lstrip('/')
        return f"{base_url}/{path}"

    return base_url


def _get_service_url_default(service_name: str, path: str = "") -> str:
    """
    Возвращает URL сервиса по умолчанию для локальной среды.
    Если мы дошли до этой функции, значит сервиса нет в Docker Registry,
    поэтому используем только localhost значения.
    """
    # Всегда используем localhost конфигурацию для локальной среды (внешние порты)
    default_configs = {
        'backend': {'host': 'localhost', 'port': 8888, 'protocol': 'http'},  # Внешний порт Django
        'app': {'host': 'localhost', 'port': 8888, 'protocol': 'http'},  # Внешний порт Django
        'frontend': {'host': 'localhost', 'port': 3000, 'protocol': 'http'},
        'postgres': {'host': 'localhost', 'port': 5432, 'protocol': 'postgresql'},
        'redis': {'host': 'localhost', 'port': 6379, 'protocol': 'redis'},
        'rabbitmq': {'host': 'localhost', 'port': 5672, 'protocol': 'amqp'},
        'minio': {'host': 'localhost', 'port': 9000, 'protocol': 'http'},
        'mailing': {'host': 'localhost', 'port': 8001, 'protocol': 'http'},  # Внешний порт mailing
        'flower': {'host': 'localhost', 'port': 5555, 'protocol': 'http'},
        'celery': {'host': 'localhost', 'port': None, 'protocol': 'celery'},
    }

    config = default_configs.get(service_name, {
        'host': 'localhost',
        'port': 80,
        'protocol': 'http'
    })

    # Формируем URL
    protocol = config['protocol']
    host = config['host']
    port = config['port']

    # Для RabbitMQ используем специальный формат
    if service_name.lower() == 'rabbitmq':
        if port and port != 5672:  # Стандартный порт AMQP
            base_url = f"{protocol}://{host}:{port}"
        else:
            base_url = f"{protocol}://{host}"
    else:
        if port and port not in [80, 443]:
            base_url = f"{protocol}://{host}:{port}"
        else:
            base_url = f"{protocol}://{host}"

    if path:
        path = path.lstrip('/')
        return f"{base_url}/{path}"

    return base_url
