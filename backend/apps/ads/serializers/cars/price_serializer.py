from rest_framework import serializers
from decimal import Decimal
from core.enums.cars import Currency
from core.serializers.base import BaseModelSerializer
from ...models import CarAd, ExchangeRate
from ...services.exchange_rates import ExchangeRateService


class PriceField(serializers.DecimalField):
    """Custom field to handle price input with validation"""
    def to_internal_value(self, data):
        try:
            value = super().to_internal_value(data)
            if value <= 0:
                raise serializers.ValidationError("Price must be greater than zero.")
            return value
        except (TypeError, ValueError):
            raise serializers.ValidationError("A valid number is required.")


class CarAdPriceSerializer(BaseModelSerializer):
    """
    Serializer for handling car ad prices with currency conversion.
    Users can provide a price in one of USD, EUR, or UAH.
    The system will automatically convert and store prices in all three currencies.
    """
    price_usd = PriceField(
        max_digits=12, 
        decimal_places=2, 
        required=False, 
        allow_null=True,
        min_value=Decimal('0.01'),
        help_text="Price in USD. Only one price field should be set."
    )
    price_eur = PriceField(
        max_digits=12, 
        decimal_places=2, 
        required=False, 
        allow_null=True,
        min_value=Decimal('0.01'),
        help_text="Price in EUR. Only one price field should be set."
    )
    price_uah = PriceField(
        max_digits=15, 
        decimal_places=2, 
        required=False, 
        allow_null=True,
        min_value=Decimal('0.01'),
        help_text="Price in UAH. Only one price field should be set."
    )
    
    class Meta:
        model = CarAd
        fields = ['price_usd', 'price_eur', 'price_uah']
    
    def validate(self, attrs):
        """
        Validate that exactly one price field is provided and update other prices.
        """
        price_fields = {
            'USD': attrs.get('price_usd'),
            'EUR': attrs.get('price_eur'),
            'UAH': attrs.get('price_uah')
        }
        
        # Get non-null price fields
        non_null_prices = {k: v for k, v in price_fields.items() if v is not None}
        
        if not non_null_prices:
            if self.instance is None:  # Only require price on create
                raise serializers.ValidationError({
                    'price': 'At least one price field (USD, EUR, or UAH) must be set.'
                })
            return attrs
            
        if len(non_null_prices) > 1:
            raise serializers.ValidationError({
                'price': 'Only one price field (USD, EUR, or UAH) should be set.'
            })
            
        # Get the currency and amount that was set
        currency, amount = next(iter(non_null_prices.items()))
        
        # Get or create exchange rate record
        exchange_rate = ExchangeRateService.update_exchange_rates()
        
        if not exchange_rate:
            raise serializers.ValidationError({
                'price': 'Could not get exchange rates. Please try again later.'
            })
        
        # Store the original price and currency
        attrs['original_price'] = amount
        attrs['original_currency'] = currency
        attrs['exchange_rate'] = exchange_rate
        
        # Convert to all currencies
        for target_currency in ['USD', 'EUR', 'UAH']:
            if target_currency == currency:
                continue
                
            try:
                converted = ExchangeRateService.convert_currency(
                    amount,
                    currency,
                    target_currency
                )
                attrs[f'price_{target_currency.lower()}'] = converted
            except (ValueError, AttributeError) as e:
                attrs[f'price_{target_currency.lower()}'] = None
        
        return attrs
    
    def update(self, instance, validated_data):
        """Update only the price fields"""
        # Only update price-related fields
        price_fields = ['price_usd', 'price_eur', 'price_uah', 'original_price', 'original_currency', 'exchange_rate']
        for field in price_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        
        # Save will trigger price history creation if needed
        instance.save(update_fields=price_fields)
        return instance


class ExchangeRateSerializer(serializers.ModelSerializer):
    """Serializer for exchange rates"""
    date = serializers.DateField(format='%Y-%m-%d')
    
    class Meta:
        model = ExchangeRate
        fields = ['id', 'base_currency', 'usd_rate', 'eur_rate', 'date', 'created_at']
        read_only_fields = ['id', 'price', 'currency', 'created_at', 'updated_at']
