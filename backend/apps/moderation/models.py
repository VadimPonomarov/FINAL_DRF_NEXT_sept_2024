"""
Models for moderation system.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class NotificationMethod(models.TextChoices):
    """Available notification methods for managers."""
    EMAIL = 'email', 'Email'
    INFO_TABLE = 'info_table', 'Information Table'
    BOTH = 'both', 'Email + Information Table'


class NotificationStatus(models.TextChoices):
    """Status of notifications."""
    PENDING = 'pending', 'Pending'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    FAILED = 'failed', 'Failed'
    READ = 'read', 'Read'


class ModerationAction(models.TextChoices):
    """Types of moderation actions."""
    AD_NEEDS_REVIEW = 'ad_needs_review', 'Ad Needs Review'
    AD_MAX_ATTEMPTS = 'ad_max_attempts', 'Ad Max Attempts Reached'
    AD_FLAGGED = 'ad_flagged', 'Ad Flagged'
    USER_BANNED = 'user_banned', 'User Banned'
    CONTENT_VIOLATION = 'content_violation', 'Content Violation'


class ManagerNotificationSettings(models.Model):
    """
    Settings for manager notifications.
    
    Defines which notification methods should be used for each manager.
    """
    manager = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'is_staff': True},
        related_name='notification_settings'
    )
    
    # Notification methods
    email_enabled = models.BooleanField(default=True, help_text="Send email notifications")
    info_table_enabled = models.BooleanField(default=True, help_text="Store in information table")
    
    # Email settings
    email_address = models.EmailField(blank=True, help_text="Override manager's email")
    
    # Filtering settings
    notify_for_actions = models.JSONField(
        default=list,
        help_text="List of actions to notify about. Empty = all actions"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'moderation_manager_notification_settings'
        verbose_name = 'Manager Notification Setting'
        verbose_name_plural = 'Manager Notification Settings'
    
    def __str__(self):
        return f"Notification settings for {self.manager.get_full_name() or self.manager.email}"
    
    def get_notification_email(self):
        """Get email address for notifications."""
        return self.email_address or self.manager.email
    
    def should_notify_for_action(self, action: str) -> bool:
        """Check if manager should be notified for specific action."""
        if not self.is_active:
            return False
        
        if not self.notify_for_actions:  # Empty list = notify for all
            return True
        
        return action in self.notify_for_actions


class ModerationNotification(models.Model):
    """
    Information table for moderation notifications.
    
    Stores notifications that managers can retrieve via API.
    """
    # Target manager
    manager = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'is_staff': True},
        related_name='moderation_notifications'
    )
    
    # Notification details
    action = models.CharField(max_length=50, choices=ModerationAction.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Related objects (stored as IDs for flexibility)
    ad_id = models.PositiveIntegerField(null=True, blank=True)
    user_id = models.PositiveIntegerField(null=True, blank=True)
    
    # Additional data
    data = models.JSONField(default=dict, help_text="Additional notification data")
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Priority (1-10, higher = more important)
    priority = models.PositiveSmallIntegerField(default=5)
    
    class Meta:
        db_table = 'moderation_notifications'
        verbose_name = 'Moderation Notification'
        verbose_name_plural = 'Moderation Notifications'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['manager', 'status']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['ad_id']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} for {self.manager.get_full_name() or self.manager.email}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if self.status == NotificationStatus.PENDING:
            self.status = NotificationStatus.READ
            self.read_at = timezone.now()
            self.save(update_fields=['status', 'read_at'])
    
    def get_admin_url(self):
        """Get admin URL for related ad."""
        if self.ad_id:
            return f"/admin/ads/caradmodel/{self.ad_id}/change/"
        return None


class NotificationTemplate(models.Model):
    """
    Email templates for different notification types.
    """
    action = models.CharField(
        max_length=50,
        choices=ModerationAction.choices,
        unique=True
    )
    
    # Template content
    subject_template = models.CharField(max_length=200)
    html_template = models.TextField(help_text="HTML email template")
    text_template = models.TextField(help_text="Plain text email template")
    
    # Template variables help
    available_variables = models.JSONField(
        default=list,
        help_text="List of available template variables"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'moderation_notification_templates'
        verbose_name = 'Notification Template'
        verbose_name_plural = 'Notification Templates'
    
    def __str__(self):
        return f"Template for {self.get_action_display()}"


class NotificationLog(models.Model):
    """
    Log of sent notifications for tracking and debugging.
    """
    # Reference to notification
    notification = models.ForeignKey(
        ModerationNotification,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    
    # Delivery details
    method = models.CharField(max_length=20, choices=NotificationMethod.choices)
    recipient = models.EmailField(blank=True)  # For email notifications
    
    # Status
    status = models.CharField(max_length=20, choices=NotificationStatus.choices)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    sent_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    external_id = models.CharField(max_length=100, blank=True)  # Email service ID
    
    class Meta:
        db_table = 'moderation_notification_logs'
        verbose_name = 'Notification Log'
        verbose_name_plural = 'Notification Logs'
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"{self.method} to {self.recipient or 'info_table'} - {self.status}"
