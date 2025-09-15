# Autonomous Celery Microservice Dockerfile
# Completely independent queue management service

FROM python:3.12-slim

# Set environment variables to avoid interactive prompts and locale issues
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Set working directory
WORKDIR /app

# Install system dependencies (minimal set for Celery)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Install Poetry
RUN pip install --upgrade pip poetry poetry-plugin-export

# Configure Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# Copy dependency files and required directories (required by pyproject.toml)
COPY pyproject.toml poetry.lock* ./
COPY config/ ./config/
COPY tasks/ ./tasks/

# Install dependencies with Poetry (default group only) and ensure in-project venv is created
RUN poetry export -f requirements.txt --without dev --output requirements.txt \
    && pip install --no-cache-dir -r requirements.txt \
    && rm -rf $POETRY_CACHE_DIR

# Copy remaining application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1


# Create non-root user for security
RUN useradd --create-home --shell /bin/bash celery

# Create directories that will be mounted as volumes and set permissions
RUN mkdir -p /app/logs /app/celerybeat-schedule
RUN chown -R celery:celery /app
USER celery

# Health check for Celery worker via Poetry to ensure venv usage
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -m celery -A config.celery_app inspect ping || exit 1

# Default command: run Celery via Poetry to avoid PATH/console-script issues across OS images
CMD ["python", "-m", "celery", "-A", "config.celery_app", "worker", "--loglevel=info", "--pool=solo"]
