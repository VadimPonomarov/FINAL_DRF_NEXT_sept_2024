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
    # System utilities
    wget \
    gnupg \
    ca-certificates \
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
    poetry install --no-interaction --no-ansi --no-root

# Install Playwright browsers for crawl4ai dynamic content parsing
# First install chromium browser
RUN playwright install chromium

# Install minimal system dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcb-dri3-0 \
    libxcb-sync1 \
    libxcb-xfixes0 \
    libxcb-shape0 \
    libxcb-randr0 \
    libxcb-render0 \
    libxcb-present0 \
    libxcb-glx0 \
    libxcb-keysyms1 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-util1 \
    libxcb-xinerama0 \
    libxcb-xkb1 \
    libxcb-cursor0 \
    libxcb-xrm0 \
    libxcb-xtest0 \
    libxcb-xv0 \
    libxcb-shm0 \
    libxcb-xf86dri0 \
    libxcb-dri2-0 \
    libxcb-ewmh2 \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire application (this ensures all files are available)
COPY . .

# Entry point removed - commands are now in docker-compose.yml

# Run the application with Gunicorn and Daphne worker
CMD ["gunicorn", "config.asgi:application", "--bind", "0.0.0.0:8000", "--worker-class", "daphne.worker.DaphneWorker", "--threads", "4"]
