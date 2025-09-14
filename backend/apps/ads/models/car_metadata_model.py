from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class CarMetadataModel(BaseModel):
    """
    Model for storing additional metadata and flags for car ads.
    All business logic is handled in serializers.
    """
    car_ad = models.OneToOneField('CarAd',
        on_delete=models.CASCADE,
        related_name='metadata',
        help_text=_('The car advertisement this metadata belongs to')
    )
    
    # Status flags
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_('Whether the ad is currently active and visible')
    )
    
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Whether the ad has been verified by staff')
    )
    
    is_vip = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Whether this is a VIP/featured ad')
    )
    
    is_premium = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Whether this is a premium ad with additional features')
    )
    
    is_highlighted = models.BooleanField(
        default=False,
        help_text=_('Whether this ad is highlighted in search results')
    )
    
    is_urgent = models.BooleanField(
        default=False,
        help_text=_('Whether this is marked as an urgent sale')
    )
    
    # Tracking
    views_count = models.PositiveIntegerField(
        default=0,
        help_text=_('Number of times the ad has been viewed')
    )
    
    phone_views_count = models.PositiveIntegerField(
        default=0,
        help_text=_('Number of times the phone number has been viewed')
    )
    
    refreshed_at = models.DateTimeField(
        auto_now=True,
        help_text=_('When the ad was last refreshed/bumped')
    )
    
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('When the ad will expire')
    )
    
    # SEO and sharing
    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        help_text=_('URL-friendly version of the title')
    )
    
    meta_title = models.CharField(
        max_length=70,
        blank=True,
        null=True,
        help_text=_('SEO title (max 70 characters)')
    )
    
    meta_description = models.CharField(
        max_length=160,
        blank=True,
        null=True,
        help_text=_('SEO description (max 160 characters)')
    )
    
    class Meta:
        db_table = 'car_metadata'
    
    def __str__(self):
        return f"Metadata for {self.car_ad_id}"
