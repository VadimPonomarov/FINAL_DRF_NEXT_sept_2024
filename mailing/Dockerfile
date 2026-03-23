FROM python:3.11-slim

LABEL maintainer="ME <pvs.versia@gmail.com>"
LABEL description="Simple mailing service"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_NO_CACHE=1 \
    IS_DOCKER=true

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN uv pip install --system --no-cache \
    "fastapi>=0.115.5" \
    "uvicorn[standard]>=0.32.1" \
    "pydantic[email]>=2.10.5" \
    "pydantic-settings>=2.6.1" \
    "celery>=5.3.6" \
    "pika>=1.3.2" \
    "jinja2>=3.1.3" \
    "python-dotenv>=1.0.0" \
    "cryptography>=42.0.0"

# Copy source code
COPY ./src /app/src

# Create directories
RUN mkdir -p /app/logs /app/src/media

# Health check using urllib instead of requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

# Expose port
EXPOSE 8001

# Run the application directly
CMD ["python", "src/app.py"]
