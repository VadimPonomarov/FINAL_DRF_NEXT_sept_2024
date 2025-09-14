#!/usr/bin/env python3
"""
Optimized Environment Loader
Автоматически выбирает правильные .env файлы без ветвлений в коде
Следует архитектуре из ENV_SETUP.md
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv


class OptimizedEnvironmentLoader:
    """
    Загрузчик окружения без ветвлений
    Манипулирует файлами вместо логики в коде
    """
    
    def __init__(self, service_name: str = None):
        self.project_root = Path(__file__).parent.parent
        self.env_config_dir = self.project_root / "env-config"
        self.service_name = service_name
        
    def get_environment_type(self) -> str:
        """
        Определяет тип среды по простым индикаторам
        Возвращает: 'docker' или 'local'
        """
        # Простая проверка без сложной логики
        docker_indicators = [
            os.getenv('IS_DOCKER') == 'true',
            os.path.exists('/.dockerenv'),
            'docker' in os.getenv('HOSTNAME', '').lower(),
        ]
        
        return 'docker' if any(docker_indicators) else 'local'
    
    def get_file_sequence(self, environment_type: str, service_name: str = None) -> list:
        """
        Возвращает последовательность файлов для загрузки
        Следует архитектуре: base → secrets → local → service-specific
        """
        files = []
        
        # 1. Базовые переменные (всегда)
        base_file = self.env_config_dir / ".env.base"
        if base_file.exists():
            files.append(base_file)
        
        # 2. Секреты (всегда)
        secrets_file = self.env_config_dir / ".env.secrets"
        if secrets_file.exists():
            files.append(secrets_file)
        
        # 3. Локальные перевизначения (всегда)
        local_file = self.env_config_dir / ".env.local"
        if local_file.exists():
            files.append(local_file)
        
        # 4. Сервис-специфичные переменные
        if service_name:
            service_file = self.project_root / service_name / ".env"
            if service_file.exists():
                files.append(service_file)
        
        return files
    
    def load_environment(self, service_name: str = None) -> dict:
        """
        Загружает окружение для указанного сервиса
        Без ветвлений - только последовательная загрузка файлов
        """
        environment_type = self.get_environment_type()
        service_name = service_name or self.service_name
        
        print(f"🔍 Environment type: {environment_type}")
        print(f"🎯 Service: {service_name or 'generic'}")
        
        # Получаем последовательность файлов
        files_to_load = self.get_file_sequence(environment_type, service_name)
        
        print(f"📁 Loading files in order:")
        loaded_vars = {}
        
        # Загружаем файлы по порядку
        for i, env_file in enumerate(files_to_load, 1):
            print(f"  {i}. {env_file.relative_to(self.project_root)}")
            
            # Загружаем переменные
            before_count = len(os.environ)
            load_dotenv(env_file, override=True)
            after_count = len(os.environ)
            
            print(f"     ✅ Loaded (+{after_count - before_count} vars)")
        
        print(f"🎉 Environment loaded successfully!")
        
        # Выводим ключевые переменные для проверки
        self._print_key_variables()
        
        return dict(os.environ)
    
    def _print_key_variables(self):
        """Выводит ключевые переменные для проверки"""
        key_vars = {
            'Environment': os.getenv('IS_DOCKER', 'false'),
            'Backend URL': os.getenv('BACKEND_URL', 'NOT_SET'),
            'Frontend URL': os.getenv('FRONTEND_URL', 'NOT_SET'),
            'WebSocket Host': os.getenv('NEXT_PUBLIC_WS_HOST', 'NOT_SET'),
            'Database Host': os.getenv('POSTGRES_HOST', 'NOT_SET'),
            'Redis Host': os.getenv('REDIS_HOST', 'NOT_SET'),
        }
        
        print(f"\n📋 Key variables:")
        for name, value in key_vars.items():
            print(f"   {name}: {value}")
        print()


def load_for_service(service_name: str) -> OptimizedEnvironmentLoader:
    """
    Загружает окружение для конкретного сервиса
    Единая точка входа для всех сервисов
    """
    loader = OptimizedEnvironmentLoader(service_name)
    loader.load_environment(service_name)
    return loader


def load_generic() -> OptimizedEnvironmentLoader:
    """
    Загружает общее окружение (без сервис-специфичных переменных)
    """
    loader = OptimizedEnvironmentLoader()
    loader.load_environment()
    return loader


if __name__ == "__main__":
    # Можно запустить как скрипт
    service = sys.argv[1] if len(sys.argv) > 1 else None
    
    if service:
        print(f"Loading environment for service: {service}")
        load_for_service(service)
    else:
        print("Loading generic environment")
        load_generic()
