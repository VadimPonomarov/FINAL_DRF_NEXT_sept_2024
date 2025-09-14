import os
import time
import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings

from config.extra_config.logger_config import logger


class Command(BaseCommand):
    help = 'Cleans the generated_media directory by removing files older than a specified age'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Remove files older than this many days (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        # Path to the generated_media directory
        media_dir = Path(settings.BASE_DIR) / 'generated_media'
        
        if not media_dir.exists():
            self.stdout.write(self.style.WARNING(f'Directory {media_dir} does not exist. Nothing to clean.'))
            return
        
        # Calculate the cutoff time (files older than this will be deleted)
        cutoff_time = time.time() - (days * 24 * 60 * 60)
        
        # Count statistics
        total_files = 0
        deleted_files = 0
        freed_space = 0
        
        self.stdout.write(f"Cleaning files older than {days} days from {media_dir}")
        
        # Iterate through all files in the directory
        for file_path in media_dir.glob('*'):
            if file_path.is_file():
                total_files += 1
                file_stat = file_path.stat()
                
                # Check if the file is older than the cutoff time
                if file_stat.st_mtime < cutoff_time:
                    file_size = file_stat.st_size
                    file_age = datetime.datetime.fromtimestamp(file_stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    
                    if dry_run:
                        self.stdout.write(f"Would delete: {file_path.name} (Last modified: {file_age}, Size: {file_size/1024:.2f} KB)")
                    else:
                        try:
                            file_path.unlink()
                            deleted_files += 1
                            freed_space += file_size
                            self.stdout.write(f"Deleted: {file_path.name} (Last modified: {file_age}, Size: {file_size/1024:.2f} KB)")
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f"Error deleting {file_path}: {e}"))
        
        # Log summary
        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f"Dry run completed. Would have deleted {deleted_files} of {total_files} files, "
                f"freeing approximately {freed_space/1024/1024:.2f} MB"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Cleanup completed. Deleted {deleted_files} of {total_files} files, "
                f"freeing approximately {freed_space/1024/1024:.2f} MB"
            ))
            
            # Log to application logger as well
            logger.info(
                f"Generated media cleanup: Deleted {deleted_files} of {total_files} files, "
                f"freeing {freed_space/1024/1024:.2f} MB"
            )
