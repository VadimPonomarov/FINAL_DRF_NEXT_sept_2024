from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel


class SavedSearchModel(BaseModel):
    """
    Model for saved searches that users can create to get notifications
    about new ads matching their criteria.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_searches',
        help_text=_('User who created this saved search')
    )
    
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the saved search')
    )
    
    search_params = models.JSONField(
        help_text=_('JSON object containing search parameters')
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this saved search is active')
    )
    
    last_notified = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_('Last time user was notified about new matches')
    )
    
    class Meta:
        db_table = "saved_searches"
        ordering = ['-created_at']
        verbose_name = _('Saved Search')
        verbose_name_plural = _('Saved Searches')
    
    def __str__(self):
        return f"{self.user.email} - {self.name}"
