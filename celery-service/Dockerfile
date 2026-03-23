# Autonomous Celery Microservice Dockerfile
# Completely independent queue management service

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_NO_CACHE=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN uv pip install --system --no-cache \
    "celery>=5.4.0" \
    "redis>=5.2.0" \
    "pika>=1.3.2" \
    "psycopg2-binary>=2.9.10" \
    "python-dotenv>=1.1.1" \
    "loguru>=0.7.2" \
    "httpx>=0.28.1" \
    "requests>=2.32.3" \
    "flower>=2.0.1" \
    "orjson>=3.10.12"

COPY config/ ./config/
COPY tasks/ ./tasks/

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
