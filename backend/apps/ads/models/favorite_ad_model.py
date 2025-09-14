"""
Model for storing user-specific favorite ads
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from core.models.base import BaseModel

User = get_user_model()


class FavoriteAd(BaseModel):
    """
    Model to store which users have which ads in their favorites.
    This replaces the global is_favorite field with per-user favorites.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_ads',
        help_text=_('User who favorited this ad')
    )
    
    car_ad = models.ForeignKey(
        'CarAd',
        on_delete=models.CASCADE,
        related_name='favorited_by',
        help_text=_('The car ad that was favorited')
    )
    
    # When the user added this to favorites
    favorited_at = models.DateTimeField(
        auto_now_add=True,
        help_text=_('When this ad was added to favorites')
    )
    
    class Meta:
        db_table = 'ads_favorite_ads'
        unique_together = ['user', 'car_ad']  # One favorite per user per ad
        indexes = [
            models.Index(fields=['user', 'favorited_at']),
            models.Index(fields=['car_ad', 'favorited_at']),
        ]
        verbose_name = _('Favorite Ad')
        verbose_name_plural = _('Favorite Ads')
    
    def __str__(self):
        return f"User {self.user_id} favorited ad {self.car_ad_id}"
