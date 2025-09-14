#!/usr/bin/env python
"""
Скрипт для инициализации бакетов MinIO при запуске приложения.
"""

from minio import Minio
from minio.error import S3Error
import os
import time
import json
import logging

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("minio-init")

# Добавляем вывод в консоль
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def init_minio_buckets():
    """
    Инициализация бакетов MinIO.
    """
    # Получаем параметры подключения из переменных окружения
    is_docker = os.environ.get("IS_DOCKER", "False").lower() in ("true", "1", "t")

    if is_docker:
        endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
        logger.info(f"Running in Docker, using MinIO at {endpoint}")
    else:
        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        logger.info(f"Running locally, using MinIO at {endpoint}")

    access_key = os.getenv("MINIO_ROOT_USER", "root")
    secret_key = os.getenv("MINIO_ROOT_PASSWORD", "password")

    # Список бакетов для создания
    buckets = ["media-bucket", "static-bucket", "chat-files", "chat-results"]

    # Ждем, пока MinIO станет доступен
    max_retries = 30
    retry_interval = 2

    logger.info("Waiting for MinIO to be ready...")

    # Создаем объект клиента
    client = None

    for i in range(max_retries):
        try:
            client = Minio(
                endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=False  # Используем HTTP без TLS
            )

            # Проверяем соединение
            buckets = client.list_buckets()
            logger.info(f"Successfully connected to MinIO! Found {len(buckets)} existing buckets.")

            # Выводим информацию о версии MinIO
            try:
                admin_info = client._admin_info()
                logger.info(f"MinIO version: {admin_info.version}")
            except Exception as e:
                logger.warning(f"Could not get MinIO version: {str(e)}")

            break
        except Exception as e:
            logger.warning(f"Attempt {i+1}/{max_retries}: MinIO is not ready yet. Error: {str(e)}")
            time.sleep(retry_interval)

    if client is None:
        logger.error("Failed to connect to MinIO after multiple attempts")
        return

    # Создаем бакеты
    for bucket in buckets:
        try:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info(f"Bucket '{bucket}' successfully created!")

                # Устанавливаем политику доступа (публичный доступ)
                try:
                    # Сначала пробуем установить политику "public"
                    client.set_bucket_policy(bucket, 'public')
                    logger.info(f"Set 'public' policy for bucket '{bucket}'")
                except Exception as e:
                    logger.warning(f"Could not set 'public' policy for bucket '{bucket}': {str(e)}")

                    # Если не удалось, пробуем установить политику "read-write"
                    try:
                        client.set_bucket_policy(bucket, 'read-write')
                        logger.info(f"Set 'read-write' policy for bucket '{bucket}'")
                    except Exception as e2:
                        logger.warning(f"Could not set 'read-write' policy for bucket '{bucket}': {str(e2)}")

                        # Если и это не удалось, пробуем установить политику вручную
                        try:
                            policy = {
                                "Version": "2012-10-17",
                                "Statement": [
                                    {
                                        "Effect": "Allow",
                                        "Principal": {"AWS": "*"},
                                        "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                                        "Resource": [f"arn:aws:s3:::{bucket}/*"]
                                    }
                                ]
                            }

                            # Преобразуем политику в JSON строку
                            policy_str = json.dumps(policy)

                            # Устанавливаем политику
                            client.set_bucket_policy(bucket, policy_str)
                            logger.info(f"Set custom policy for bucket '{bucket}'")
                        except Exception as e3:
                            logger.error(f"Could not set any policy for bucket '{bucket}': {str(e3)}")
                logger.info(f"Public access policy set for bucket '{bucket}'")
            else:
                logger.info(f"Bucket '{bucket}' already exists")

                # Обновляем политику доступа
                try:
                    # Сначала пробуем установить политику "public"
                    client.set_bucket_policy(bucket, 'public')
                    logger.info(f"Set 'public' policy for bucket '{bucket}'")
                except Exception as e:
                    logger.warning(f"Could not set 'public' policy for bucket '{bucket}': {str(e)}")

                    # Если не удалось, пробуем установить политику "read-write"
                    try:
                        client.set_bucket_policy(bucket, 'read-write')
                        logger.info(f"Set 'read-write' policy for bucket '{bucket}'")
                    except Exception as e2:
                        logger.warning(f"Could not set 'read-write' policy for bucket '{bucket}': {str(e2)}")

                        # Если и это не удалось, пробуем установить политику вручную
                        try:
                            policy = {
                                "Version": "2012-10-17",
                                "Statement": [
                                    {
                                        "Effect": "Allow",
                                        "Principal": {"AWS": "*"},
                                        "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                                        "Resource": [f"arn:aws:s3:::{bucket}/*"]
                                    }
                                ]
                            }

                            # Преобразуем политику в JSON строку
                            policy_str = json.dumps(policy)

                            # Устанавливаем политику
                            client.set_bucket_policy(bucket, policy_str)
                            logger.info(f"Set custom policy for bucket '{bucket}'")
                        except Exception as e3:
                            logger.error(f"Could not set any policy for bucket '{bucket}': {str(e3)}")
        except S3Error as err:
            logger.error(f"Error initializing bucket '{bucket}': {str(err)}")
        except Exception as e:
            logger.error(f"Unexpected error with bucket '{bucket}': {str(e)}")

    logger.info("MinIO bucket initialization completed")

if __name__ == "__main__":
    init_minio_buckets()
