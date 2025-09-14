#!/usr/bin/env python
"""
Script to initialize MinIO buckets directly without using Django commands.
This is used in Docker to ensure MinIO buckets are created before the app starts.
"""

import os
import sys
import logging
from minio import Minio
from minio.error import S3Error

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def init_minio():
    """Initialize MinIO buckets."""
    try:
        # Check if running in Docker
        is_docker = os.environ.get('IS_DOCKER', 'false').lower() == 'true'
        
        if is_docker:
            minio_host = 'minio:9000'
            logger.info(f"Running in Docker, using MinIO at {minio_host}")
        else:
            minio_host = 'localhost:9000'
            logger.info(f"Running locally, using MinIO at {minio_host}")
        
        # Get MinIO credentials from environment variables
        minio_access_key = os.environ.get('MINIO_ROOT_USER', 'root')
        minio_secret_key = os.environ.get('MINIO_ROOT_PASSWORD', 'password')
        
        logger.info(f"Using MinIO credentials: {minio_access_key}/{minio_secret_key[:3]}{'*' * (len(minio_secret_key) - 3)}")
        
        # Create MinIO client
        client = Minio(
            minio_host,
            access_key=minio_access_key,
            secret_key=minio_secret_key,
            secure=False
        )
        
        # Define buckets to create
        buckets = ['media-bucket', 'static-bucket']
        
        # Create buckets if they don't exist
        for bucket in buckets:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info(f"Created bucket: {bucket}")
                
                # Set bucket policy to allow public read access
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": "*"},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{bucket}/*"]
                        }
                    ]
                }
                client.set_bucket_policy(bucket, policy)
                logger.info(f"Set public read policy for bucket: {bucket}")
            else:
                logger.info(f"Bucket already exists: {bucket}")
        
        logger.info("MinIO initialization completed successfully")
        return True
    
    except S3Error as e:
        logger.error(f"MinIO S3 error: {e}")
        return False
    except Exception as e:
        logger.error(f"Error initializing MinIO: {e}")
        return False

if __name__ == "__main__":
    # Set media URL for Django
    media_url = f"http://{'minio' if os.environ.get('IS_DOCKER', 'false').lower() == 'true' else 'localhost'}:9000/media-bucket/"
    logger.info(f"Using MEDIA_URL: {media_url}")
    
    # Initialize MinIO
    success = init_minio()
    
    # Exit with appropriate status code
    sys.exit(0 if success else 1)
