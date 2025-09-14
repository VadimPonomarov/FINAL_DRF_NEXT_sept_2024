"""
Сервис для загрузки и обработки изображений
"""

import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from PIL import Image, ImageOps
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.core.files.storage import default_storage
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)


class ImageService:
    """Сервис для работы с изображениями"""
    
    # Настройки изображений
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_FORMATS = ['JPEG', 'JPG', 'PNG', 'WEBP']
    THUMBNAIL_SIZES = {
        'small': (150, 150),
        'medium': (400, 300),
        'large': (800, 600)
    }
    
    def __init__(self):
        self.upload_path = getattr(settings, 'MEDIA_ROOT', 'media/')
        self.base_url = getattr(settings, 'MEDIA_URL', '/media/')
    
    def validate_image(self, image_file) -> Dict[str, Any]:
        """
        Валидация загружаемого изображения
        
        Returns:
            Dict с результатом валидации
        """
        errors = []
        
        # Проверка размера файла
        if hasattr(image_file, 'size') and image_file.size > self.MAX_FILE_SIZE:
            errors.append(f"Файл слишком большой. Максимум {self.MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Проверка формата
        try:
            with Image.open(image_file) as img:
                if img.format not in self.ALLOWED_FORMATS:
                    errors.append(f"Неподдерживаемый формат. Разрешены: {', '.join(self.ALLOWED_FORMATS)}")
                
                # Проверка разрешения
                width, height = img.size
                if width < 100 or height < 100:
                    errors.append("Минимальное разрешение: 100x100 пикселей")
                
                if width > 4000 or height > 4000:
                    errors.append("Максимальное разрешение: 4000x4000 пикселей")
                    
        except Exception as e:
            errors.append(f"Ошибка обработки изображения: {str(e)}")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors
        }
    
    def generate_filename(self, original_filename: str, prefix: str = '') -> str:
        """Генерация уникального имени файла"""
        ext = os.path.splitext(original_filename)[1].lower()
        unique_id = str(uuid.uuid4())
        return f"{prefix}{unique_id}{ext}" if prefix else f"{unique_id}{ext}"
    
    def upload_image(self, image_file, folder: str = 'ads') -> Dict[str, Any]:
        """
        Загрузка изображения с валидацией
        
        Args:
            image_file: Файл изображения
            folder: Папка для сохранения
            
        Returns:
            Dict с информацией о загруженном файле
        """
        # Валидация
        validation = self.validate_image(image_file)
        if not validation['is_valid']:
            return {
                'success': False,
                'errors': validation['errors']
            }
        
        try:
            # Генерация имени файла
            filename = self.generate_filename(image_file.name)
            file_path = f"{folder}/{filename}"
            
            # Сохранение файла
            saved_path = default_storage.save(file_path, image_file)
            file_url = default_storage.url(saved_path)
            
            # Получение информации об изображении
            with Image.open(default_storage.path(saved_path)) as img:
                width, height = img.size
                format_name = img.format
            
            logger.info(f"✅ Изображение загружено: {saved_path}")
            
            return {
                'success': True,
                'file_path': saved_path,
                'file_url': file_url,
                'filename': filename,
                'width': width,
                'height': height,
                'format': format_name,
                'size': image_file.size
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки изображения: {e}")
            return {
                'success': False,
                'errors': [f"Ошибка загрузки: {str(e)}"]
            }
    
    def create_thumbnails(self, image_path: str) -> Dict[str, str]:
        """
        Создание миниатюр изображения
        
        Args:
            image_path: Путь к оригинальному изображению
            
        Returns:
            Dict с путями к миниатюрам
        """
        thumbnails = {}
        
        try:
            with Image.open(default_storage.path(image_path)) as img:
                # Автоповорот по EXIF
                img = ImageOps.exif_transpose(img)
                
                for size_name, (width, height) in self.THUMBNAIL_SIZES.items():
                    # Создание миниатюры с сохранением пропорций
                    thumbnail = img.copy()
                    thumbnail.thumbnail((width, height), Image.Resampling.LANCZOS)
                    
                    # Генерация имени файла миниатюры
                    base_name = os.path.splitext(image_path)[0]
                    ext = os.path.splitext(image_path)[1]
                    thumbnail_path = f"{base_name}_{size_name}{ext}"
                    
                    # Сохранение миниатюры
                    with default_storage.open(thumbnail_path, 'wb') as f:
                        thumbnail.save(f, format=img.format, quality=85, optimize=True)
                    
                    thumbnails[size_name] = {
                        'path': thumbnail_path,
                        'url': default_storage.url(thumbnail_path),
                        'width': thumbnail.width,
                        'height': thumbnail.height
                    }
            
            logger.info(f"✅ Миниатюры созданы: {len(thumbnails)}")
            return thumbnails
            
        except Exception as e:
            logger.error(f"❌ Ошибка создания миниатюр: {e}")
            return {}
    
    def delete_image(self, image_path: str) -> bool:
        """Удаление изображения и его миниатюр"""
        try:
            # Удаление оригинала
            if default_storage.exists(image_path):
                default_storage.delete(image_path)
            
            # Удаление миниатюр
            base_name = os.path.splitext(image_path)[0]
            ext = os.path.splitext(image_path)[1]
            
            for size_name in self.THUMBNAIL_SIZES.keys():
                thumbnail_path = f"{base_name}_{size_name}{ext}"
                if default_storage.exists(thumbnail_path):
                    default_storage.delete(thumbnail_path)
            
            logger.info(f"✅ Изображение удалено: {image_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка удаления изображения: {e}")
            return False


# Celery задачи для асинхронной обработки изображений
@shared_task(bind=True)
def process_image_async(self, image_path: str):
    """Асинхронная обработка изображения (создание миниатюр)"""
    try:
        image_service = ImageService()
        thumbnails = image_service.create_thumbnails(image_path)
        
        logger.info(f"✅ Изображение обработано: {image_path}")
        return {
            'success': True,
            'image_path': image_path,
            'thumbnails': thumbnails
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки изображения: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True)
def optimize_image_async(self, image_path: str, quality: int = 85):
    """Асинхронная оптимизация изображения"""
    try:
        full_path = default_storage.path(image_path)
        
        with Image.open(full_path) as img:
            # Автоповорот по EXIF
            img = ImageOps.exif_transpose(img)
            
            # Оптимизация и сжатие
            img.save(full_path, format=img.format, quality=quality, optimize=True)
        
        logger.info(f"✅ Изображение оптимизировано: {image_path}")
        return {'success': True, 'image_path': image_path}
        
    except Exception as e:
        logger.error(f"❌ Ошибка оптимизации изображения: {e}")
        return {'success': False, 'error': str(e)}


# Экспорт основных классов и функций
__all__ = [
    'ImageService',
    'process_image_async',
    'optimize_image_async'
]
