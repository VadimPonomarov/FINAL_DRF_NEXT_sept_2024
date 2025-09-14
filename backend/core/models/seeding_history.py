"""
Seeding history model for tracking completed seeding operations.
"""
from django.db import models
from django.utils import timezone


class SeedingHistory(models.Model):
    """
    Track completed seeding operations to prevent duplicates.
    Similar to django_migrations table but for seeding operations.
    """
    
    # Unique identifier for the seeding operation
    seed_name = models.CharField(
        max_length=255, 
        unique=True,
        help_text="Unique name of the seeding operation (e.g., 'reference_data', 'test_users')"
    )
    
    # Version/checksum to detect changes in seed data
    seed_version = models.CharField(
        max_length=100,
        default="1.0.0",
        help_text="Version of the seed data to detect changes"
    )
    
    # Execution details
    executed_at = models.DateTimeField(
        default=timezone.now,
        help_text="When the seeding was executed"
    )
    
    execution_time = models.FloatField(
        null=True, 
        blank=True,
        help_text="Execution time in seconds"
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('running', 'Running'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
            ('skipped', 'Skipped'),
        ],
        default='pending'
    )
    
    # Additional metadata
    records_created = models.IntegerField(
        default=0,
        help_text="Number of records created during seeding"
    )
    
    records_updated = models.IntegerField(
        default=0,
        help_text="Number of records updated during seeding"
    )
    
    error_message = models.TextField(
        blank=True,
        help_text="Error message if seeding failed"
    )
    
    # Environment info
    environment = models.CharField(
        max_length=50,
        default='unknown',
        help_text="Environment where seeding was executed (docker, local, etc.)"
    )
    
    # Force flag tracking
    forced = models.BooleanField(
        default=False,
        help_text="Whether this seeding was forced (FORCE_RESEED=true)"
    )

    class Meta:
        db_table = 'core_seeding_history'
        ordering = ['-executed_at']
        verbose_name = 'Seeding History'
        verbose_name_plural = 'Seeding History'
        indexes = [
            models.Index(fields=['seed_name']),
            models.Index(fields=['status']),
            models.Index(fields=['executed_at']),
        ]

    def __str__(self):
        return f"{self.seed_name} v{self.seed_version} ({self.status})"

    @classmethod
    def is_seeding_completed(cls, seed_name: str, seed_version: str = "1.0.0") -> bool:
        """Check if a specific seeding operation has been completed."""
        return cls.objects.filter(
            seed_name=seed_name,
            seed_version=seed_version,
            status='completed'
        ).exists()

    @classmethod
    def mark_seeding_started(cls, seed_name: str, seed_version: str = "1.0.0", 
                           environment: str = "unknown", forced: bool = False):
        """Mark a seeding operation as started."""
        obj, created = cls.objects.update_or_create(
            seed_name=seed_name,
            defaults={
                'seed_version': seed_version,
                'status': 'running',
                'executed_at': timezone.now(),
                'environment': environment,
                'forced': forced,
                'error_message': '',
                'records_created': 0,
                'records_updated': 0,
            }
        )
        return obj

    @classmethod
    def mark_seeding_completed(cls, seed_name: str, seed_version: str = "1.0.0",
                             records_created: int = 0, records_updated: int = 0,
                             execution_time: float = None):
        """Mark a seeding operation as completed."""
        cls.objects.filter(seed_name=seed_name).update(
            status='completed',
            records_created=records_created,
            records_updated=records_updated,
            execution_time=execution_time,
            error_message=''
        )

    @classmethod
    def mark_seeding_failed(cls, seed_name: str, error_message: str):
        """Mark a seeding operation as failed."""
        cls.objects.filter(seed_name=seed_name).update(
            status='failed',
            error_message=error_message
        )

    @classmethod
    def clear_seeding_history(cls, seed_name: str = None):
        """Clear seeding history. If seed_name provided, clear only that seed."""
        if seed_name:
            cls.objects.filter(seed_name=seed_name).delete()
        else:
            cls.objects.all().delete()

    @classmethod
    def get_seeding_status(cls):
        """Get overview of all seeding operations."""
        return {
            'total': cls.objects.count(),
            'completed': cls.objects.filter(status='completed').count(),
            'failed': cls.objects.filter(status='failed').count(),
            'running': cls.objects.filter(status='running').count(),
            'pending': cls.objects.filter(status='pending').count(),
        }
