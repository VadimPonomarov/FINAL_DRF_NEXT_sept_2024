from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base import BaseModel
from core.enums.ads import ContactTypeEnum


class AdContact(BaseModel):
    """
    Contact information for car advertisements.
    Similar to AddsAccountContact but specific to individual ads.
    """
    
    # Связь с объявлением
    car_ad = models.ForeignKey(
        'CarAd',
        on_delete=models.CASCADE,
        related_name='contacts',
        help_text=_('Car advertisement this contact belongs to')
    )
    
    # Тип контакта
    type = models.CharField(
        max_length=32,
        choices=ContactTypeEnum.choices,
        help_text=_('Type of contact (phone, email, etc.)')
    )
    
    # Значение контакта
    value = models.CharField(
        max_length=256,
        help_text=_('Contact value (phone number, email address, etc.)')
    )
    
    # Видимость контакта
    is_visible = models.BooleanField(
        default=True,
        help_text=_('Whether this contact is visible in the advertisement')
    )
    
    # Основной контакт
    is_primary = models.BooleanField(
        default=False,
        help_text=_('Whether this is the primary contact for the advertisement')
    )
    
    # Примечание
    note = models.CharField(
        max_length=128,
        blank=True,
        help_text=_('Optional note about this contact')
    )

    class Meta:
        db_table = 'ad_contacts'
        ordering = ['type', '-is_primary']
        verbose_name = _('Advertisement Contact')
        verbose_name_plural = _('Advertisement Contacts')
        
        # Ограничения
        constraints = [
            # Только один основной контакт на объявление
            models.UniqueConstraint(
                fields=['car_ad'],
                condition=models.Q(is_primary=True),
                name='unique_primary_contact_per_ad'
            ),
        ]
        
        # Индексы для быстрого поиска
        indexes = [
            models.Index(fields=['car_ad', 'is_primary'], name='ad_contact_primary_idx'),
            models.Index(fields=['car_ad', 'is_visible'], name='ad_contact_visible_idx'),
            models.Index(fields=['type'], name='ad_contact_type_idx'),
        ]

    def __str__(self):
        primary_marker = " (Primary)" if self.is_primary else ""
        return f"{self.car_ad.title} - {self.get_type_display()}: {self.value}{primary_marker}"

    def save(self, *args, **kwargs):
        """
        Override save to ensure only one primary contact per ad.
        """
        if self.is_primary:
            # Убираем primary статус у других контактов этого объявления
            AdContact.objects.filter(
                car_ad=self.car_ad,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)

    @classmethod
    def get_primary_contact(cls, car_ad):
        """
        Get the primary contact for a car advertisement.
        """
        try:
            return cls.objects.get(car_ad=car_ad, is_primary=True)
        except cls.DoesNotExist:
            # Если нет основного контакта, возвращаем первый видимый
            return cls.objects.filter(car_ad=car_ad, is_visible=True).first()

    @classmethod
    def get_visible_contacts(cls, car_ad):
        """
        Get all visible contacts for a car advertisement.
        """
        return cls.objects.filter(car_ad=car_ad, is_visible=True).order_by('-is_primary', 'type')

    def clean(self):
        """
        Validate the contact data.
        """
        from django.core.exceptions import ValidationError
        
        # Базовая валидация значения в зависимости от типа
        if self.type == ContactTypeEnum.EMAIL:
            if '@' not in self.value:
                raise ValidationError({'value': _('Enter a valid email address.')})
        elif self.type == ContactTypeEnum.PHONE:
            # Простая валидация телефона
            cleaned_phone = self.value.replace(' ', '').replace('-', '').replace('+', '')
            if not cleaned_phone.isdigit():
                raise ValidationError({'value': _('Enter a valid phone number.')})
