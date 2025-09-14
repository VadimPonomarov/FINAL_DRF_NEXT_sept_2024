"""
Сериализаторы для курсов валют
"""
from rest_framework import serializers
from .models import CurrencyRate, CurrencyUpdateLog


class CurrencyRateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для курсов валют
    """
    age_hours = serializers.SerializerMethodField()
    is_fresh = serializers.SerializerMethodField()
    
    class Meta:
        model = CurrencyRate
        fields = [
            'id',
            'base_currency',
            'target_currency', 
            'rate',
            'source',
            'fetched_at',
            'is_active',
            'age_hours',
            'is_fresh',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'age_hours', 'is_fresh']
    
    def get_age_hours(self, obj):
        """Возраст курса в часах"""
        return round(obj.age_hours, 2)
    
    def get_is_fresh(self, obj):
        """Свежий ли курс"""
        return obj.is_fresh()


class CurrencyUpdateLogSerializer(serializers.ModelSerializer):
    """
    Сериализатор для логов обновления курсов
    """
    duration_minutes = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = CurrencyUpdateLog
        fields = [
            'id',
            'started_at',
            'completed_at',
            'status',
            'source',
            'currencies_updated',
            'currencies_failed',
            'duration_seconds',
            'duration_minutes',
            'success_rate',
            'triggered_by',
            'success_details',
            'error_details',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'duration_minutes', 'success_rate']
    
    def get_duration_minutes(self, obj):
        """Длительность в минутах"""
        if obj.duration_seconds:
            return round(obj.duration_seconds / 60, 2)
        return None
    
    def get_success_rate(self, obj):
        """Процент успешных обновлений"""
        total = obj.currencies_updated + obj.currencies_failed
        if total > 0:
            return round((obj.currencies_updated / total) * 100, 1)
        return None


class CurrencyConversionSerializer(serializers.Serializer):
    """
    Сериализатор для конвертации валют
    """
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    from_currency = serializers.CharField(max_length=3, default='UAH')
    to_currency = serializers.CharField(max_length=3, default='USD')
    
    def validate_from_currency(self, value):
        """Валидация исходной валюты"""
        supported_currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
        if value not in supported_currencies:
            raise serializers.ValidationError(f"Currency {value} is not supported")
        return value
    
    def validate_to_currency(self, value):
        """Валидация целевой валюты"""
        supported_currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
        if value not in supported_currencies:
            raise serializers.ValidationError(f"Currency {value} is not supported")
        return value
    
    def validate_amount(self, value):
        """Валидация суммы"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive")
        return value
