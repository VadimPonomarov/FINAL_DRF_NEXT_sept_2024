"""
Модели для работы с курсами валют
"""
from django.db import models
from django.utils import timezone
from decimal import Decimal


class CurrencyRate(models.Model):
    """
    Модель для хранения курсов валют
    """
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('UAH', 'Ukrainian Hryvnia'),
        ('PLN', 'Polish Zloty'),
        ('GBP', 'British Pound'),
    ]
    
    SOURCE_CHOICES = [
        ('NBU', 'National Bank of Ukraine'),
        ('PRIVATBANK', 'PrivatBank API'),
        ('EXCHANGERATE_API', 'ExchangeRate-API'),
        ('FIXER_IO', 'Fixer.io'),
        ('MANUAL', 'Manual Entry'),
    ]
    
    # Основные поля
    base_currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='UAH',
        help_text="Базовая валюта (к которой приводятся курсы)"
    )
    
    target_currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        help_text="Целевая валюта"
    )
    
    rate = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        help_text="Курс валюты (сколько базовой валюты за 1 единицу целевой)"
    )
    
    # Метаданные
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='NBU',
        help_text="Источник курса"
    )
    
    fetched_at = models.DateTimeField(
        default=timezone.now,
        help_text="Время получения курса"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Активен ли курс"
    )
    
    # Дополнительные данные
    raw_data = models.JSONField(
        blank=True,
        null=True,
        help_text="Сырые данные от API"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'currency_rates'
        verbose_name = 'Currency Rate'
        verbose_name_plural = 'Currency Rates'
        
        # Уникальность по паре валют и дате
        unique_together = ['base_currency', 'target_currency', 'fetched_at']
        
        # Индексы для быстрого поиска
        indexes = [
            models.Index(fields=['base_currency', 'target_currency', '-fetched_at']),
            models.Index(fields=['source', '-fetched_at']),
            models.Index(fields=['is_active', '-fetched_at']),
        ]
        
        # Сортировка по умолчанию
        ordering = ['-fetched_at', 'target_currency']
    
    def __str__(self):
        return f"{self.target_currency}/{self.base_currency}: {self.rate} ({self.source})"
    
    @classmethod
    def get_latest_rate(cls, base_currency='UAH', target_currency='USD', auto_update=True):
        """
        Получить последний актуальный курс для пары валют
        Если курс не найден или устарел - автоматически обновляет

        Args:
            base_currency: Базовая валюта
            target_currency: Целевая валюта
            auto_update: Автоматически обновлять при отсутствии данных
        """
        try:
            rate = cls.objects.filter(
                base_currency=base_currency,
                target_currency=target_currency,
                is_active=True
            ).latest('fetched_at')

            # Проверяем свежесть курса (не старше 24 часов)
            if auto_update and not rate.is_fresh():
                from .services import CurrencyService
                CurrencyService.update_single_rate(base_currency, target_currency)
                # Получаем обновленный курс
                rate = cls.objects.filter(
                    base_currency=base_currency,
                    target_currency=target_currency,
                    is_active=True
                ).latest('fetched_at')

            return rate

        except cls.DoesNotExist:
            if auto_update:
                # Курс не найден - запускаем обновление
                from .services import CurrencyService
                CurrencyService.update_single_rate(base_currency, target_currency)

                # Пытаемся получить курс еще раз
                try:
                    return cls.objects.filter(
                        base_currency=base_currency,
                        target_currency=target_currency,
                        is_active=True
                    ).latest('fetched_at')
                except cls.DoesNotExist:
                    return None
            return None
    
    @classmethod
    def get_all_latest_rates(cls, base_currency='UAH'):
        """
        Получить все последние курсы для базовой валюты
        """
        rates = {}
        for currency_code, _ in cls.CURRENCY_CHOICES:
            if currency_code != base_currency:
                rate = cls.get_latest_rate(base_currency, currency_code)
                if rate:
                    rates[currency_code] = rate.rate
        return rates
    
    def convert_amount(self, amount):
        """
        Конвертировать сумму по текущему курсу
        """
        return Decimal(str(amount)) * self.rate
    
    @property
    def age_hours(self):
        """
        Возраст курса в часах
        """
        return (timezone.now() - self.fetched_at).total_seconds() / 3600
    
    def is_fresh(self, max_age_hours=24):
        """
        Проверить, свежий ли курс (не старше указанного времени)
        """
        return self.age_hours <= max_age_hours


class CurrencyUpdateLog(models.Model):
    """
    Лог обновлений курсов валют
    """
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('PARTIAL', 'Partial Success'),
        ('FAILED', 'Failed'),
        ('SKIPPED', 'Skipped'),
    ]
    
    # Основные поля
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='SUCCESS'
    )
    
    source = models.CharField(
        max_length=20,
        choices=CurrencyRate.SOURCE_CHOICES,
        help_text="Источник обновления"
    )
    
    # Статистика
    currencies_updated = models.PositiveIntegerField(default=0)
    currencies_failed = models.PositiveIntegerField(default=0)
    
    # Детали
    success_details = models.JSONField(
        blank=True,
        null=True,
        help_text="Детали успешных обновлений"
    )
    
    error_details = models.JSONField(
        blank=True,
        null=True,
        help_text="Детали ошибок"
    )
    
    # Метаданные
    triggered_by = models.CharField(
        max_length=50,
        default='celery_beat',
        help_text="Кто/что запустило обновление"
    )
    
    duration_seconds = models.FloatField(
        null=True,
        blank=True,
        help_text="Длительность обновления в секундах"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'currency_update_logs'
        verbose_name = 'Currency Update Log'
        verbose_name_plural = 'Currency Update Logs'
        ordering = ['-started_at']
    
    def __str__(self):
        return f"Currency Update {self.started_at.strftime('%Y-%m-%d %H:%M')} - {self.status}"
    
    def mark_completed(self, status='SUCCESS'):
        """
        Отметить обновление как завершенное
        """
        self.completed_at = timezone.now()
        self.status = status
        if self.started_at:
            self.duration_seconds = (self.completed_at - self.started_at).total_seconds()
        self.save()
    
    @property
    def is_running(self):
        """
        Проверить, выполняется ли обновление
        """
        return self.completed_at is None
