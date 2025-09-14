# Autonomous Celery Microservice Dockerfile
# Completely independent queue management service

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal set for Celery)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Install dependencies
RUN poetry config repositories.pypi https://pypi.org/simple && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --no-root

# Copy application code
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

# Health check for Celery worker
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD celery -A config.celery_app inspect ping || exit 1

# Default command
CMD ["celery", "-A", "config.celery_app", "worker", "--loglevel=info", "--pool=solo"]
