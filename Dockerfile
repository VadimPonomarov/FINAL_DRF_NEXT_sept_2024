FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for G4F
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install wheel
RUN pip install --upgrade pip wheel setuptools

# Copy requirements first for better caching
COPY backend/requirements.txt requirements.txt

# Install Python dependencies with proper flags
RUN pip install --no-cache-dir --prefer-binary --upgrade -r requirements.txt

# Copy the rest of the application
COPY . .

# Create media directory
RUN mkdir -p media/avatars/generated

# Set environment variables
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=config.settings_railway

# Expose port
EXPOSE 8000

# Start command
CMD sh -c "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi_simple:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 --access-logfile -"
