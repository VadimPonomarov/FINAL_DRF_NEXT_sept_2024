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
    environment_type = "docker" if os.getenv("IS_DOCKER", "").lower() == "true" or Path('/.dockerenv').exists() else "local"
    env_specific = ".env.docker" if environment_type == "docker" else ".env.local"
    # Определяем последовательность файлов согласно ENV_SETUP.md
    # Порядок: base → secrets → local → service-specific
    env_files = [
        ROOT_DIR / "env-config" / ".env.base",      # 1. Базовые переменные
        ROOT_DIR / "env-config" / ".env.secrets",   # 2. Секреты
        ROOT_DIR / "env-config" / env_specific,       # 3. Перевизначення середовища
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

# Configure g4f for Railway compatibility
os.environ.setdefault('G4F_PROVIDER', 'pollinations')
os.environ.setdefault('G4F_MODEL', 'flux')
os.environ.setdefault('G4F_CAR_MODEL', 'dall-e-3')
os.environ.setdefault('G4F_TIMEOUT', '30')
os.environ.setdefault('G4F_VERIFY_SSL', 'false')
os.environ.setdefault('G4F_RETRY_COUNT', '3')

# Configure async HTTP clients for g4f
os.environ.setdefault('AIOHTTP_TIMEOUT', '30')
os.environ.setdefault('HTTPX_TIMEOUT', '30')

# Export environment info
__all__ = [
    'load_environment',
    'BASE_DIR',
    'ROOT_DIR',
]
