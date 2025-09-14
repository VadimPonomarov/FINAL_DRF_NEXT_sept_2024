#!/usr/bin/env python
"""
Скрипт для проверки наличия файлов в директории /media.
"""

import os
import argparse
from datetime import datetime


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


def list_files(directory, recursive=False):
    """
    Вывести список файлов в директории.
    
    Args:
        directory (str): Путь к директории
        recursive (bool): Рекурсивно обходить поддиректории
    """
    if not os.path.exists(directory):
        print(f"Directory {directory} does not exist")
        return
    
    print(f"Files in {directory}:")
    
    if recursive:
        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                file_size = os.path.getsize(file_path)
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                print(f"  {file_path} ({format_size(file_size)}, modified: {file_time.strftime('%Y-%m-%d %H:%M:%S')})")
    else:
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            if os.path.isfile(item_path):
                file_size = os.path.getsize(item_path)
                file_time = datetime.fromtimestamp(os.path.getmtime(item_path))
                print(f"  {item} ({format_size(file_size)}, modified: {file_time.strftime('%Y-%m-%d %H:%M:%S')})")
            else:
                print(f"  {item}/ (directory)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check files in media directory")
    parser.add_argument("--dir", type=str, default="/media", help="Directory to check")
    parser.add_argument("--recursive", action="store_true", help="Recursively list files in subdirectories")
    
    args = parser.parse_args()
    list_files(args.dir, args.recursive)
