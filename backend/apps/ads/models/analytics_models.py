"""
Модели для детальной аналитики посещений и взаимодействий
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class VisitorSession(models.Model):
    """Сессия посетителя"""
    session_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Геолокация
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    
    # Источник трафика
    referrer = models.URLField(blank=True)
    utm_source = models.CharField(max_length=100, blank=True)
    utm_medium = models.CharField(max_length=100, blank=True)
    utm_campaign = models.CharField(max_length=100, blank=True)
    
    # Устройство
    device_type = models.CharField(max_length=50, choices=[
        ('desktop', 'Desktop'),
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
    ], blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    
    # Временные метки
    started_at = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Метрики сессии
    total_duration = models.DurationField(null=True, blank=True)
    pages_viewed = models.PositiveIntegerField(default=0)
    ads_viewed = models.PositiveIntegerField(default=0)
    interactions_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'ads_visitor_sessions'
        indexes = [
            models.Index(fields=['ip_address', 'started_at']),
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['started_at']),
        ]

    def __str__(self):
        return f"Session {self.session_id} - {self.ip_address}"


class PageView(models.Model):
    """Просмотр страницы"""
    session = models.ForeignKey(VisitorSession, on_delete=models.CASCADE, related_name='page_views')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Информация о странице
    url = models.URLField()
    page_type = models.CharField(max_length=50, choices=[
        ('home', 'Главная'),
        ('search', 'Поиск'),
        ('ad_detail', 'Карточка объявления'),
        ('user_profile', 'Профиль пользователя'),
        ('favorites', 'Избранное'),
        ('other', 'Другое'),
    ])
    page_title = models.CharField(max_length=200, blank=True)
    
    # Временные метрики
    viewed_at = models.DateTimeField(default=timezone.now)
    time_on_page = models.DurationField(null=True, blank=True)
    
    # Поведенческие метрики
    scroll_depth = models.FloatField(default=0.0)  # Процент прокрутки
    clicks_count = models.PositiveIntegerField(default=0)
    
    # Дополнительные данные
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'ads_page_views'
        indexes = [
            models.Index(fields=['session', 'viewed_at']),
            models.Index(fields=['user', 'viewed_at']),
            models.Index(fields=['page_type', 'viewed_at']),
        ]

    def __str__(self):
        return f"Page view: {self.url} at {self.viewed_at}"


class AdInteraction(models.Model):
    """Взаимодействие с объявлением"""
    session = models.ForeignKey(VisitorSession, on_delete=models.CASCADE, related_name='ad_interactions')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ad = models.ForeignKey('CarAd', on_delete=models.CASCADE, related_name='interactions')
    
    # Тип взаимодействия
    interaction_type = models.CharField(max_length=50, choices=[
        ('view', 'Просмотр'),
        ('phone_reveal', 'Показ телефона'),
        ('favorite_add', 'Добавление в избранное'),
        ('favorite_remove', 'Удаление из избранного'),
        ('contact_click', 'Клик по контакту'),
        ('photo_view', 'Просмотр фото'),
        ('share', 'Поделиться'),
        ('report', 'Пожаловаться'),
    ])
    
    # Временные метки
    created_at = models.DateTimeField(default=timezone.now)
    
    # Контекст взаимодействия
    source_page = models.CharField(max_length=100, blank=True)  # Откуда пришел
    position_in_list = models.PositiveIntegerField(null=True, blank=True)  # Позиция в списке
    
    # Дополнительные данные
    metadata = models.JSONField(default=dict, blank=True)

    # Флаг: действие совершено владельцем объявления (не учитывать в публичных счетчиках)
    owner_action = models.BooleanField(default=False)

    class Meta:
        db_table = 'ads_ad_interactions'
        indexes = [
            models.Index(fields=['ad', 'interaction_type', 'created_at']),
            models.Index(fields=['user', 'interaction_type', 'created_at']),
            models.Index(fields=['session', 'created_at']),
        ]
        unique_together = [
            ('session', 'ad', 'interaction_type', 'created_at'),
        ]

    def __str__(self):
        return f"{self.interaction_type} on ad {self.ad_id} at {self.created_at}"


class AdViewDetail(models.Model):
    """Детальная информация о просмотре объявления"""
    interaction = models.OneToOneField(
        AdInteraction, 
        on_delete=models.CASCADE, 
        related_name='view_detail',
        limit_choices_to={'interaction_type': 'view'}
    )
    
    # Временные метрики
    view_duration = models.DurationField(null=True, blank=True)
    time_to_first_scroll = models.DurationField(null=True, blank=True)
    time_to_phone_reveal = models.DurationField(null=True, blank=True)
    
    # Поведенческие метрики
    photos_viewed = models.PositiveIntegerField(default=0)
    photos_viewed_list = models.JSONField(default=list, blank=True)  # Какие фото смотрели
    scroll_depth = models.FloatField(default=0.0)
    clicks_on_elements = models.JSONField(default=dict, blank=True)  # Клики по элементам
    
    # Путь пользователя
    came_from = models.CharField(max_length=200, blank=True)
    went_to = models.CharField(max_length=200, blank=True)
    
    # Качество просмотра
    is_quality_view = models.BooleanField(default=False)  # Более 30 сек + скролл
    bounce = models.BooleanField(default=False)  # Ушел сразу
    
    class Meta:
        db_table = 'ads_ad_view_details'

    def __str__(self):
        return f"View detail for ad {self.interaction.ad_id}"


class SearchQuery(models.Model):
    """Поисковые запросы"""
    session = models.ForeignKey(VisitorSession, on_delete=models.CASCADE, related_name='search_queries')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Поисковый запрос
    query_text = models.TextField()
    filters_applied = models.JSONField(default=dict, blank=True)

    # Результаты
    results_count = models.PositiveIntegerField(default=0)
    clicked_results = models.JSONField(default=list, blank=True)  # ID объявлений, на которые кликнули
    
    # Временные метки
    searched_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'ads_search_queries'
        indexes = [
            models.Index(fields=['query_text', 'searched_at']),
            models.Index(fields=['user', 'searched_at']),
        ]

    def __str__(self):
        return f"Search: {self.query_text[:50]}"


class UserBehaviorSummary(models.Model):
    """Сводка поведения пользователя (обновляется периодически)"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='behavior_summary')
    
    # Общая активность
    total_sessions = models.PositiveIntegerField(default=0)
    total_page_views = models.PositiveIntegerField(default=0)
    total_ad_views = models.PositiveIntegerField(default=0)
    total_interactions = models.PositiveIntegerField(default=0)
    
    # Временные метрики
    avg_session_duration = models.DurationField(null=True, blank=True)
    avg_pages_per_session = models.FloatField(default=0.0)
    
    # Предпочтения
    favorite_brands = models.JSONField(default=list, blank=True)
    favorite_price_range = models.JSONField(default=dict, blank=True)
    favorite_regions = models.JSONField(default=list, blank=True)

    # Поведенческие паттерны
    most_active_hours = models.JSONField(default=list, blank=True)
    most_active_days = models.JSONField(default=list, blank=True)
    device_preferences = models.JSONField(default=dict, blank=True)
    
    # Конверсии
    phone_reveals_count = models.PositiveIntegerField(default=0)
    favorites_added_count = models.PositiveIntegerField(default=0)
    
    # Обновление
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ads_user_behavior_summaries'

    def __str__(self):
        return f"Behavior summary for {self.user}"
