#!/usr/bin/env python3
"""
Скрипт для синхронизации зависимостей между pyproject.toml и pyproject.docker.toml
"""

import toml
import sys
from pathlib import Path

def load_toml(file_path):
    """Загрузить TOML файл"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return toml.load(f)
    except FileNotFoundError:
        print(f"❌ Файл {file_path} не найден")
        return None
    except Exception as e:
        print(f"❌ Ошибка чтения {file_path}: {e}")
        return None

def save_toml(data, file_path):
    """Сохранить TOML файл"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            toml.dump(data, f)
        return True
    except Exception as e:
        print(f"❌ Ошибка записи {file_path}: {e}")
        return False

def get_production_dependencies():
    """Список зависимостей, которые нужны в продакшене"""
    return {
        # Django Core
        'django',
        'djangorestframework-simplejwt',
        'django-filter',
        'django-cors-headers',
        'drf-yasg',
        
        # Database
        'psycopg2',
        
        # WebSockets & Channels
        'channels',
        'channels-redis',
        'djangochannelsrestframework',
        'daphne',
        
        # Task Queue
        'celery',
        'django-celery-beat',
        'pika',
        
        # Configuration
        'python-dotenv',
        'pytz',
        
        # Validation & Serialization
        'pydantic',
        'orjson',
        
        # HTTP & Networking
        'requests',
        'httpx',
        
        # Security
        'cryptography',
        
        # File Processing
        'pillow',
        'lxml',
        'beautifulsoup4',
        'markdown',
        'chardet',
        'python-dateutil',
        'dateparser',
        
        # AI & LangChain (основные)
        'langchain',
        'langchain-core',
        'langchain-community',
        'langchain-tavily',
        'langchain-openai',
        'langgraph',
        'tavily-python',
        'g4f',
        
        # Translation
        'deep_translator',
        
        # Logging
        'loguru',
        
        # WSGI Server
        'gunicorn',
    }

def sync_dependencies():
    """Синхронизировать зависимости"""
    backend_dir = Path(__file__).parent.parent
    full_toml_path = backend_dir / 'pyproject.toml'
    docker_toml_path = backend_dir / 'pyproject.docker.toml'
    
    print("🔄 Синхронизация зависимостей...")
    print(f"📁 Полная версия: {full_toml_path}")
    print(f"🐳 Docker версия: {docker_toml_path}")
    
    # Загрузить файлы
    full_data = load_toml(full_toml_path)
    docker_data = load_toml(docker_toml_path)
    
    if not full_data or not docker_data:
        return False
    
    # Получить зависимости для продакшена
    prod_deps = get_production_dependencies()
    full_deps = full_data.get('tool', {}).get('poetry', {}).get('dependencies', {})
    
    # Обновить Docker зависимости
    docker_deps = {}
    
    # Добавить Python версию
    if 'python' in full_deps:
        docker_deps['python'] = full_deps['python']
    
    # Добавить продакшен зависимости
    added_count = 0
    skipped_count = 0
    
    for dep_name in sorted(prod_deps):
        if dep_name in full_deps:
            docker_deps[dep_name] = full_deps[dep_name]
            added_count += 1
        else:
            print(f"⚠️  Зависимость {dep_name} не найдена в полной версии")
            skipped_count += 1
    
    # Обновить Docker файл
    docker_data['tool']['poetry']['dependencies'] = docker_deps
    
    # Сохранить
    if save_toml(docker_data, docker_toml_path):
        print(f"✅ Синхронизация завершена!")
        print(f"📊 Добавлено зависимостей: {added_count}")
        print(f"⚠️  Пропущено: {skipped_count}")
        
        # Показать статистику
        total_full = len(full_deps) - 1  # -1 для python
        total_docker = len(docker_deps) - 1  # -1 для python
        reduction = ((total_full - total_docker) / total_full) * 100
        
        print(f"📈 Статистика:")
        print(f"   Полная версия: {total_full} зависимостей")
        print(f"   Docker версия: {total_docker} зависимостей")
        print(f"   Сокращение: {reduction:.1f}%")
        
        return True
    else:
        return False

def compare_dependencies():
    """Сравнить зависимости между файлами"""
    backend_dir = Path(__file__).parent.parent
    full_toml_path = backend_dir / 'pyproject.toml'
    docker_toml_path = backend_dir / 'pyproject.docker.toml'
    
    print("🔍 Сравнение зависимостей...")
    
    full_data = load_toml(full_toml_path)
    docker_data = load_toml(docker_toml_path)
    
    if not full_data or not docker_data:
        return False
    
    full_deps = set(full_data.get('tool', {}).get('poetry', {}).get('dependencies', {}).keys())
    docker_deps = set(docker_data.get('tool', {}).get('poetry', {}).get('dependencies', {}).keys())
    
    # Исключить python из сравнения
    full_deps.discard('python')
    docker_deps.discard('python')
    
    only_in_full = full_deps - docker_deps
    only_in_docker = docker_deps - full_deps
    common = full_deps & docker_deps
    
    print(f"📊 Результаты сравнения:")
    print(f"   Общие зависимости: {len(common)}")
    print(f"   Только в полной версии: {len(only_in_full)}")
    print(f"   Только в Docker версии: {len(only_in_docker)}")
    
    if only_in_full:
        print(f"\n📋 Исключены из Docker ({len(only_in_full)}):")
        for dep in sorted(only_in_full):
            print(f"   - {dep}")
    
    if only_in_docker:
        print(f"\n⚠️  Только в Docker ({len(only_in_docker)}):")
        for dep in sorted(only_in_docker):
            print(f"   - {dep}")
    
    return True

def main():
    """Главная функция"""
    if len(sys.argv) > 1 and sys.argv[1] == 'compare':
        compare_dependencies()
    else:
        sync_dependencies()

if __name__ == '__main__':
    main()
