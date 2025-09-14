"""
Enhanced file validation for secure file uploads.
"""

import os
import mimetypes
from typing import List, Optional
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from django.conf import settings


class FileValidator:
    """Enhanced file validator with security checks."""
    
    # Allowed MIME types for different file categories
    ALLOWED_IMAGE_TYPES = [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif',
    ]
    
    ALLOWED_DOCUMENT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ]
    
    # Allowed file extensions
    ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']
    
    # File size limits (in bytes)
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Dangerous file extensions to block
    DANGEROUS_EXTENSIONS = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
        '.sh', '.bash', '.ps1', '.msi', '.deb', '.rpm'
    ]
    
    def __init__(self, 
                 allowed_types: Optional[List[str]] = None,
                 allowed_extensions: Optional[List[str]] = None,
                 max_size: Optional[int] = None,
                 check_content: bool = True):
        """
        Initialize file validator.
        
        Args:
            allowed_types: List of allowed MIME types
            allowed_extensions: List of allowed file extensions
            max_size: Maximum file size in bytes
            check_content: Whether to check file content vs extension
        """
        self.allowed_types = allowed_types or self.ALLOWED_IMAGE_TYPES
        self.allowed_extensions = allowed_extensions or self.ALLOWED_IMAGE_EXTENSIONS
        self.max_size = max_size or self.MAX_IMAGE_SIZE
        self.check_content = check_content
    
    def __call__(self, file: UploadedFile) -> None:
        """Validate uploaded file."""
        self.validate_file_size(file)
        self.validate_file_extension(file)
        self.validate_file_type(file)
        if self.check_content:
            self.validate_file_content(file)
        self.validate_file_name(file)
    
    def validate_file_size(self, file: UploadedFile) -> None:
        """Validate file size."""
        if file.size > self.max_size:
            size_mb = self.max_size / (1024 * 1024)
            raise ValidationError(
                f'File size cannot exceed {size_mb:.1f}MB. '
                f'Current file size: {file.size / (1024 * 1024):.1f}MB'
            )
    
    def validate_file_extension(self, file: UploadedFile) -> None:
        """Validate file extension."""
        if not file.name:
            raise ValidationError('File name is required.')
        
        # Get file extension
        _, ext = os.path.splitext(file.name.lower())
        
        # Check for dangerous extensions
        if ext in self.DANGEROUS_EXTENSIONS:
            raise ValidationError(f'File type {ext} is not allowed for security reasons.')
        
        # Check if extension is in allowed list
        if ext not in [e.lower() for e in self.allowed_extensions]:
            allowed_str = ', '.join(self.allowed_extensions)
            raise ValidationError(
                f'File extension {ext} is not allowed. '
                f'Allowed extensions: {allowed_str}'
            )
    
    def validate_file_type(self, file: UploadedFile) -> None:
        """Validate MIME type."""
        # Get MIME type from file content
        file.seek(0)
        content_start = file.read(1024)
        file.seek(0)
        
        # Guess MIME type from content
        mime_type = None
        if content_start:
            # Basic MIME type detection
            if content_start.startswith(b'\xff\xd8\xff'):
                mime_type = 'image/jpeg'
            elif content_start.startswith(b'\x89PNG\r\n\x1a\n'):
                mime_type = 'image/png'
            elif content_start.startswith(b'RIFF') and b'WEBP' in content_start[:12]:
                mime_type = 'image/webp'
            elif content_start.startswith(b'GIF8'):
                mime_type = 'image/gif'
            elif content_start.startswith(b'%PDF'):
                mime_type = 'application/pdf'
        
        # Fallback to guessing from filename
        if not mime_type and file.name:
            mime_type, _ = mimetypes.guess_type(file.name)
        
        # Check if MIME type is allowed
        if mime_type not in self.allowed_types:
            allowed_str = ', '.join(self.allowed_types)
            raise ValidationError(
                f'File type {mime_type} is not allowed. '
                f'Allowed types: {allowed_str}'
            )
    
    def validate_file_content(self, file: UploadedFile) -> None:
        """Validate file content matches extension."""
        if not file.name:
            return
        
        _, ext = os.path.splitext(file.name.lower())
        
        # Read file header
        file.seek(0)
        header = file.read(32)
        file.seek(0)
        
        # Check if content matches extension
        content_type = None
        if header.startswith(b'\xff\xd8\xff'):
            content_type = 'jpeg'
        elif header.startswith(b'\x89PNG\r\n\x1a\n'):
            content_type = 'png'
        elif header.startswith(b'RIFF') and b'WEBP' in header:
            content_type = 'webp'
        elif header.startswith(b'GIF8'):
            content_type = 'gif'
        elif header.startswith(b'%PDF'):
            content_type = 'pdf'
        
        # Validate content vs extension
        if content_type:
            expected_extensions = {
                'jpeg': ['.jpg', '.jpeg'],
                'png': ['.png'],
                'webp': ['.webp'],
                'gif': ['.gif'],
                'pdf': ['.pdf']
            }
            
            if ext not in expected_extensions.get(content_type, []):
                raise ValidationError(
                    f'File content ({content_type}) does not match extension ({ext}). '
                    'This may indicate a security risk.'
                )
    
    def validate_file_name(self, file: UploadedFile) -> None:
        """Validate file name for security."""
        if not file.name:
            raise ValidationError('File name is required.')
        
        # Check for path traversal attempts
        if '..' in file.name or '/' in file.name or '\\' in file.name:
            raise ValidationError('File name contains invalid characters.')
        
        # Check for excessively long names
        if len(file.name) > 255:
            raise ValidationError('File name is too long (max 255 characters).')
        
        # Check for null bytes
        if '\x00' in file.name:
            raise ValidationError('File name contains null bytes.')


# Predefined validators for common use cases
def validate_image_file(file: UploadedFile) -> None:
    """Validate image file uploads."""
    validator = FileValidator(
        allowed_types=FileValidator.ALLOWED_IMAGE_TYPES,
        allowed_extensions=FileValidator.ALLOWED_IMAGE_EXTENSIONS,
        max_size=FileValidator.MAX_IMAGE_SIZE,
        check_content=True
    )
    validator(file)


def validate_document_file(file: UploadedFile) -> None:
    """Validate document file uploads."""
    validator = FileValidator(
        allowed_types=FileValidator.ALLOWED_DOCUMENT_TYPES,
        allowed_extensions=FileValidator.ALLOWED_DOCUMENT_EXTENSIONS,
        max_size=FileValidator.MAX_DOCUMENT_SIZE,
        check_content=True
    )
    validator(file)


def validate_avatar_file(file: UploadedFile) -> None:
    """Validate avatar image uploads (smaller size limit)."""
    validator = FileValidator(
        allowed_types=['image/jpeg', 'image/png', 'image/webp'],
        allowed_extensions=['.jpg', '.jpeg', '.png', '.webp'],
        max_size=2 * 1024 * 1024,  # 2MB for avatars
        check_content=True
    )
    validator(file)
