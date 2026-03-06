"""
Environment Detection Utility
Определяет окружение по косвенным признакам, а не по переменным окружения.
"""

import os
import socket
import subprocess
from pathlib import Path
from typing import Dict, Any
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)


class EnvironmentDetector:
    """
    Определяет окружение выполнения по косвенным признакам.
    """
    
    _cache: Dict[str, Any] = {}
    
    @classmethod
    def is_docker(cls) -> bool:
        """
        Определяет, запущено ли приложение в Docker контейнере.
        Использует переменную IS_DOCKER, которая устанавливается только в docker-compose.yml
        """
        if 'is_docker' in cls._cache:
            return cls._cache['is_docker']

        # Основной индикатор: переменная IS_DOCKER из docker-compose.yml
        is_docker_env = os.environ.get('IS_DOCKER', '').lower() == 'true'

        # Дополнительные проверки для надежности
        additional_checks = []

        # Проверка файла /.dockerenv
        dockerenv_exists = os.path.exists('/.dockerenv')
        additional_checks.append(('dockerenv_file', dockerenv_exists))

        # Проверка hostname (Docker контейнеры часто имеют короткие hex имена)
        hostname_docker = False
        try:
            hostname = socket.gethostname()
            if len(hostname) == 12 and all(c in '0123456789abcdef' for c in hostname.lower()):
                hostname_docker = True
        except:
            pass
        additional_checks.append(('hostname_pattern', hostname_docker))

        # Итоговое решение
        is_docker = is_docker_env or dockerenv_exists  # IS_DOCKER или /.dockerenv

        cls._cache['is_docker'] = is_docker

        logger.info(f"Environment detection:")
        logger.info(f"  IS_DOCKER env var: {is_docker_env}")
        logger.info(f"  Additional checks: {additional_checks}")
        logger.info(f"  Final result: {'🐳 Docker' if is_docker else '💻 Local'}")

        return is_docker
    
    @classmethod
    def get_database_config(cls) -> Dict[str, str]:
        """
        Возвращает конфигурацию базы данных на основе окружения.
        Supports DATABASE_URL (Render/cloud) and individual vars (Docker/local).
        """
        database_url = os.environ.get('DATABASE_URL', '')
        if database_url:
            parsed = urlparse(database_url)
            return {
                'HOST': parsed.hostname or 'localhost',
                'PORT': str(parsed.port or 5432),
                'NAME': (parsed.path or '/db').lstrip('/'),
                'USER': parsed.username or 'user',
                'PASSWORD': parsed.password or '',
            }
        if cls.is_docker():
            return {
                'HOST': 'pg',
                'PORT': '5432',
                'NAME': os.environ.get('POSTGRES_DB', os.environ.get('POSTGRES_NAME', 'db')),
                'USER': os.environ.get('POSTGRES_USER', 'user'),
                'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'password'),
            }
        return {
            'HOST': 'localhost',
            'PORT': '5432',
            'NAME': os.environ.get('POSTGRES_DB', 'db'),
            'USER': os.environ.get('POSTGRES_USER', 'user'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'password'),
        }
    
    @classmethod
    def get_redis_config(cls) -> Dict[str, str]:
        """
        Возвращает конфигурацию Redis на основе окружения.
        Supports REDIS_URL (Render/cloud) and individual vars (Docker/local).
        """
        redis_url = os.environ.get('REDIS_URL', '')
        if redis_url:
            parsed = urlparse(redis_url)
            return {
                'HOST': parsed.hostname or 'localhost',
                'PORT': str(parsed.port or 6379),
                'DB': (parsed.path or '/0').lstrip('/') or '0',
            }
        if cls.is_docker():
            return {
                'HOST': 'redis',
                'PORT': '6379',
                'DB': '0',
            }
        return {
            'HOST': 'localhost',
            'PORT': '6379',
            'DB': '0',
        }
    
    @classmethod
    def should_run_seeds(cls) -> bool:
        """
        Определяет, нужно ли запускать seeds на основе окружения.
        """
        # В Docker seeds обычно не нужны при каждом запуске
        if cls.is_docker():
            # В Docker запускаем seeds только если явно указано
            return os.environ.get('RUN_SEEDS', 'false').lower() == 'true'
        else:
            # Локально запускаем seeds по умолчанию
            return os.environ.get('RUN_SEEDS', 'true').lower() == 'true'
    
    @classmethod
    def get_allowed_hosts(cls) -> list:
        """
        Возвращает список разрешенных хостов на основе окружения.
        """
        if cls.is_docker():
            return ['*']  # В Docker разрешаем все хосты
        else:
            return ['localhost', '127.0.0.1', '0.0.0.0']
    
    @classmethod
    def get_cors_origins(cls) -> list:
        """
        Возвращает список разрешенных CORS origins на основе окружения.
        """
        if cls.is_docker():
            return [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://frontend:3000',  # Имя сервиса в Docker
            ]
        else:
            return [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
            ]
    
    @classmethod
    def print_environment_info(cls):
        """
        Выводит информацию об определенном окружении.
        """
        is_docker = cls.is_docker()
        db_config = cls.get_database_config()
        redis_config = cls.get_redis_config()
        
        print("🔍 ENVIRONMENT DETECTION RESULTS:")
        print("=" * 50)
        print(f"Environment: {'🐳 Docker Container' if is_docker else '💻 Local Development'}")
        print(f"Database Host: {db_config['HOST']}")
        print(f"Redis Host: {redis_config['HOST']}")
        print(f"Run Seeds: {cls.should_run_seeds()}")
        print(f"Allowed Hosts: {cls.get_allowed_hosts()}")
        print("=" * 50)


# Создаем глобальный экземпляр для использования в настройках
env_detector = EnvironmentDetector()
