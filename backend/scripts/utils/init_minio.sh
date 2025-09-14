#!/bin/bash

# Ждем, пока MinIO станет доступен
echo "Waiting for MinIO to be ready..."
for i in {1..60}; do
    if curl -s http://minio:9000/minio/health/live; then
        echo "MinIO is ready!"
        break
    fi
    echo "Waiting for MinIO... ($i/60)"
    sleep 2
done

# Проверяем, что MinIO действительно доступен
if ! curl -s http://minio:9000/minio/health/live; then
    echo "ERROR: MinIO is not available after waiting. Continuing anyway..."
fi

# Инициализируем бакеты MinIO
echo "Initializing MinIO buckets..."
python scripts/utils/init_minio.py

# Запускаем основное приложение
echo "Starting main application..."
exec "$@"
