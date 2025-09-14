from rest_framework import serializers
from .car_ad_base_serializer import AdBaseSerializer
from ...models import CarAd
from apps.accounts.serializers.account_serializers import AddsAccountSerializer


class AdDetailSerializer(AdBaseSerializer):
    """
    Detailed serializer for a single ad with all related data.
    Used for retrieving a single ad's details.
    """
    account = serializers.SerializerMethodField()
    
    class Meta(AdBaseSerializer.Meta):
        model = CarAd
        fields = AdBaseSerializer.Meta.fields + [
            "account"  # Include the account field which uses get_account method
        ]
    
    def get_account(self, obj):
        """Get the account details for the ad."""
        return AddsAccountSerializer(obj.account).data
