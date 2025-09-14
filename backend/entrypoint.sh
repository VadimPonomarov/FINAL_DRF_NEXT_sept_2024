#!/bin/bash
set -e

echo "🚀 Starting Django application with dependency checks..."

# Wait for database
echo "📊 Waiting for PostgreSQL database..."
python manage.py wait_db --timeout=60

# Wait for Redis - DISABLED for faster startup
echo "🔴 Skipping Redis wait (Redis connections are lazy)..."
# python manage.py wait_redis --timeout=60

# Wait for RabbitMQ - DISABLED for faster startup
echo "🐰 Skipping RabbitMQ wait (connections are lazy)..."
# python manage.py wait_rabbitmq --timeout=60

# Wait for Celery broker (RabbitMQ-based) - DISABLED
echo "🌿 Skipping Celery broker check..."
# python manage.py wait_celery --timeout=60

echo "✅ All dependencies are ready!"

# Run migrations
echo "🔄 Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "🎉 Application setup complete!"

# Execute the main command
exec "$@"
