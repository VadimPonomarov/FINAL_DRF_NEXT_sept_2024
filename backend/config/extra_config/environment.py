"""
Environment loading configuration.
Handles loading of environment variables from different sources.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend directory
ROOT_DIR = BASE_DIR.parent  # project root directory

def load_environment():
    """
    Optimized environment loading without branching logic
    Uses file manipulation instead of complex conditionals
    """
    # Определяем последовательность файлов согласно ENV_SETUP.md
    # Порядок: base → secrets → local → service-specific
    env_files = [
        ROOT_DIR / "env-config" / ".env.base",      # 1. Базовые переменные
        ROOT_DIR / "env-config" / ".env.secrets",   # 2. Секреты
        ROOT_DIR / "env-config" / ".env.local",     # 3. Локальные перевизначения
        BASE_DIR / ".env"                           # 4. Backend-специфичные
    ]

    print("Loading Django environment...")

    # Загружаем файлы по порядку (без ветвлений!)
    for i, env_file in enumerate(env_files, 1):
        if env_file.exists():
            load_dotenv(env_file, override=True)
            print(f"  {i}. [OK] {env_file.relative_to(ROOT_DIR)}")
        else:
            print(f"  {i}. [MISSING] {env_file.relative_to(ROOT_DIR)} (not found)")

    print("Django environment loaded!")

# Load environment variables when module is imported
load_environment()

# Export environment info
__all__ = [
    'load_environment',
    'BASE_DIR',
    'ROOT_DIR',
]
