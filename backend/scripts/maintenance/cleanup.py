#!/usr/bin/env python
"""
Скрипт для очистки временных файлов и директорий.
"""

import os
import shutil
import argparse
from datetime import datetime, timedelta


def format_size(size_bytes):
    """Форматировать размер в байтах в человекочитаемый формат"""
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024
        i += 1
    return f"{size_bytes:.2f} {size_name[i]}"


def get_dir_size(path):
    """Получить размер директории в байтах"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.exists(fp):
                total_size += os.path.getsize(fp)
    return total_size


def cleanup_temp_files(days=7, force=False, dry_run=False):
    """
    Очистка временных файлов и директорий.
    
    Args:
        days (int): Удалить файлы старше указанного количества дней
        force (bool): Удалять без подтверждения
        dry_run (bool): Только показать, что будет удалено, без фактического удаления
    """
    # Директории для очистки
    dirs_to_clean = [
        'backend/generated_media',
        'backend/har_and_cookies',
        'backend/test_upload.html',
    ]
    
    # Текущая дата
    now = datetime.now()
    cutoff_date = now - timedelta(days=days)
    
    print(f"Cleaning up files older than {days} days ({cutoff_date.strftime('%Y-%m-%d')})")
    if dry_run:
        print("DRY RUN: No files will be deleted")
    
    total_files = 0
    total_size = 0
    
    # Проверяем каждую директорию
    for directory in dirs_to_clean:
        if not os.path.exists(directory):
            print(f"Directory/file {directory} does not exist, skipping")
            continue
            
        print(f"Checking {directory}")
        
        # Если это файл, удаляем его
        if os.path.isfile(directory):
            file_time = datetime.fromtimestamp(os.path.getmtime(directory))
            if file_time < cutoff_date:
                file_size = os.path.getsize(directory)
                if not dry_run:
                    if force or input(f"Delete file {directory}? [y/N] ").lower() == 'y':
                        os.remove(directory)
                        print(f"Deleted file {directory} (modified: {file_time.strftime('%Y-%m-%d')}, size: {format_size(file_size)})")
                        total_files += 1
                        total_size += file_size
                else:
                    print(f"Would delete file {directory} (modified: {file_time.strftime('%Y-%m-%d')}, size: {format_size(file_size)})")
                    total_files += 1
                    total_size += file_size
            continue
        
        # Если это корневая директория, очищаем только файлы
        if directory in ['backend/generated_media', 'backend/har_and_cookies']:
            # Проверяем, пуста ли директория
            if not os.listdir(directory):
                print(f"Directory {directory} is empty")
                continue
                
            # Спрашиваем подтверждение
            if not dry_run:
                if not force:
                    confirm = input(f"Do you want to delete all files in {directory}? [y/N] ")
                    if confirm.lower() != 'y':
                        print(f"Skipping directory {directory}")
                        continue
                
                # Удаляем всю директорию и создаем заново
                try:
                    size = get_dir_size(directory)
                    shutil.rmtree(directory)
                    os.makedirs(directory, exist_ok=True)
                    print(f"Deleted directory {directory} ({format_size(size)})")
                    total_files += 1
                    total_size += size
                except Exception as e:
                    print(f"Error deleting directory {directory}: {str(e)}")
            else:
                size = get_dir_size(directory)
                print(f"Would delete directory {directory} ({format_size(size)})")
                total_files += 1
                total_size += size
    
    if dry_run:
        print(f"DRY RUN: Would delete {total_files} files/directories, freeing {format_size(total_size)}")
    else:
        print(f"Cleanup completed. Deleted {total_files} files/directories, freed {format_size(total_size)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up temporary files and directories")
    parser.add_argument("--days", type=int, default=7, help="Delete files older than this many days")
    parser.add_argument("--force", action="store_true", help="Force deletion without confirmation")
    parser.add_argument("--dry-run", action="store_true", help="Only show what would be deleted, without actually deleting")
    
    args = parser.parse_args()
    cleanup_temp_files(days=args.days, force=args.force, dry_run=args.dry_run)
