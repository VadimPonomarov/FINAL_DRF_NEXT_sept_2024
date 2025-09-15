FROM python:3.11-slim

LABEL maintainer="ME <pvs.versia@gmail.com>"
LABEL description="Simple mailing service"

# Set environment variables to avoid interactive prompts and locale issues
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=1.8.2 \
    POETRY_NO_INTERACTION=1 \
    IS_DOCKER=true

WORKDIR /app

# Install Poetry
RUN pip install poetry==${POETRY_VERSION}

# Copy Docker-optimized dependency file
COPY pyproject.docker.toml ./pyproject.toml

# Install only production dependencies
RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --only=main

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
