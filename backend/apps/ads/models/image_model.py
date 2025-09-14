"""
Model for storing images related to car advertisements.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel
from core.validators import validate_image_file


class AddImageModel(BaseModel):
    """
    Model for storing images related to car advertisements.
    """
    ad = models.ForeignKey('CarAd',
        on_delete=models.CASCADE,
        related_name='images',
        help_text=_('The advertisement this image belongs to')
    )
    
    image = models.ImageField(
        upload_to='ads/images/',
        validators=[validate_image_file],
        help_text=_('The image file'),
        blank=True,
        null=True
    )

    # URL для сгенерированных изображений (аналогично avatar_url в профиле)
    image_url = models.TextField(
        blank=True,
        null=True,
        help_text=_('URL for generated images (no length restrictions)')
    )
    
    order = models.PositiveIntegerField(
        default=0,
        help_text=_('The order of the image in the gallery')
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text=_('Whether this is the primary image for the ad')
    )
    
    caption = models.CharField(
        max_length=255,
        blank=True,
        help_text=_('Optional caption for the image')
    )
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = _('Ad Image')
        verbose_name_plural = _('Ad Images')
    
    def __str__(self):
        return f"Image {self.id} for Ad {self.ad_id}"

    def get_image_url(self):
        """
        Return image URL - prioritize image_url (generated) over image (uploaded file).
        Same logic as ProfileModel.get_avatar().
        """
        if self.image_url:
            return self.image_url  # Приоритет сгенерированному URL
        elif self.image:
            return self.image.url  # Fallback на загруженный файл
        return None

    @property
    def image_display_url(self):
        """
        Возвращает URL для отображения изображения.
        Приоритет: image_url > image.url
        """
        return self.get_image_url()
