#!/bin/bash
set -e

echo "📧 Starting Mailing service with dependency checks..."

# Change to the app directory
cd /app

# Wait for RabbitMQ
echo "🐰 Waiting for RabbitMQ..."
python src/commands/wait_rabbitmq.py --timeout=60

echo "✅ All dependencies are ready!"

echo "🎉 Mailing service setup complete!"

# Execute the main command
exec "$@"
