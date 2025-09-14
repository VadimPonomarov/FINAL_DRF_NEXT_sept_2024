import os
import time
import datetime
from pathlib import Path

from celery import shared_task
from django.conf import settings

from config.extra_config.logger_config import logger


@shared_task(name="clean_generated_media")
def clean_generated_media(days=7):
    """
    Celery task to clean the generated_media directory by removing files older than a specified age.
    
    Args:
        days (int): Remove files older than this many days (default: 7)
    
    Returns:
        dict: Statistics about the cleanup operation
    """
    # Path to the generated_media directory
    media_dir = Path(settings.BASE_DIR) / 'generated_media'
    
    if not media_dir.exists():
        logger.info(f'Directory {media_dir} does not exist. Nothing to clean.')
        return {
            'status': 'skipped',
            'reason': 'directory_not_found',
            'directory': str(media_dir)
        }
    
    # Calculate the cutoff time (files older than this will be deleted)
    cutoff_time = time.time() - (days * 24 * 60 * 60)
    
    # Count statistics
    total_files = 0
    deleted_files = 0
    freed_space = 0
    errors = []
    
    logger.info(f"Cleaning files older than {days} days from {media_dir}")
    
    # Iterate through all files in the directory
    for file_path in media_dir.glob('*'):
        if file_path.is_file():
            total_files += 1
            file_stat = file_path.stat()
            
            # Check if the file is older than the cutoff time
            if file_stat.st_mtime < cutoff_time:
                file_size = file_stat.st_size
                file_age = datetime.datetime.fromtimestamp(file_stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                
                try:
                    file_path.unlink()
                    deleted_files += 1
                    freed_space += file_size
                    logger.debug(f"Deleted: {file_path.name} (Last modified: {file_age}, Size: {file_size/1024:.2f} KB)")
                except Exception as e:
                    error_msg = f"Error deleting {file_path}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
    
    # Log summary
    result = {
        'status': 'completed',
        'total_files': total_files,
        'deleted_files': deleted_files,
        'freed_space_kb': round(freed_space / 1024, 2),
        'freed_space_mb': round(freed_space / 1024 / 1024, 2),
        'errors': errors,
        'cutoff_date': datetime.datetime.fromtimestamp(cutoff_time).strftime('%Y-%m-%d %H:%M:%S'),
        'directory': str(media_dir)
    }
    
    logger.info(
        f"Generated media cleanup: Deleted {deleted_files} of {total_files} files, "
        f"freeing {freed_space/1024/1024:.2f} MB"
    )
    
    return result
