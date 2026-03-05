"""Django settings entry point delegating configuration to extra_config modules."""

from __future__ import annotations

import os
from typing import List

from .extra_config.environment import BASE_DIR as _ENV_BASE_DIR, ROOT_DIR  # noqa: F401

# =============================================================================
# CORE DJANGO SETTINGS
# =============================================================================

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = _ENV_BASE_DIR

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-fallback-key-for-development")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DJANGO_DEBUG", os.getenv("DEBUG", "True")).lower() in {"true", "1", "yes", "on"}

def _parse_hosts(raw: str) -> List[str]:
    return [host.strip() for host in raw.split(",") if host.strip()]

ALLOWED_HOSTS = _parse_hosts(
    os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1,0.0.0.0",
    )
)

if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

if not DEBUG and "*" not in ALLOWED_HOSTS:
    # Ensure Docker-based deployments remain accessible when explicit hosts are omitted
    candidate_host = os.getenv("HOSTNAME", "").strip()
    if candidate_host:
        ALLOWED_HOSTS.append(candidate_host)

# Import all modular configurations early to avoid AppRegistryNotReady errors
from . import extra_config as _extra_config  # noqa: F401
from .extra_config import *  # noqa

__all__ = [
    "BASE_DIR",
    "ROOT_DIR",
    "SECRET_KEY",
    "DEBUG",
    "ALLOWED_HOSTS",
] + getattr(_extra_config, "__all__", [])
