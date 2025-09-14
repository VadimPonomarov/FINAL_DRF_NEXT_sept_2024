FROM python:3.12-slim

LABEL maintainer="ME <pvs.versia@gmail.com>"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=1.8.2 \
    POETRY_HOME=/usr/local/poetry \
    POETRY_NO_INTERACTION=1 \
    PATH="/usr/local/poetry/bin:$PATH"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    libfreetype6-dev \
    libjpeg-dev \
    zlib1g-dev \
    tk-dev \
    tcl-dev \
    libopenblas-dev \
    gfortran \
    liblapack-dev \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg62-turbo-dev \
    liblcms2-dev \
    libwebp-dev \
    tcl8.6-dev \
    tk8.6-dev \
    python3-tk \
    && rm -rf /var/lib/apt/lists/*

# Install latest Poetry
RUN curl -sSL https://install.python-poetry.org | POETRY_VERSION=1.8.3 python3 -

# Add Poetry to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Configure Poetry and install ALL dependencies (full installation)
RUN poetry config repositories.pypi https://pypi.org/simple && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

# Copy the entire application (this ensures all files are available)
COPY . .

# Copy and make entrypoint executable
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Set entrypoint (temporarily disabled)
# ENTRYPOINT ["./entrypoint.sh"]

# Run the application with Gunicorn and Daphne worker
CMD ["gunicorn", "config.asgi:application", "--bind", "0.0.0.0:8000", "--worker-class", "daphne.worker.DaphneWorker", "--threads", "4"]
