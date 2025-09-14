"""
Serializer for managing ad status - accessible only to superusers.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.ads.models.car_ad_model import CarAd
from core.enums.ads import AdStatusEnum

User = get_user_model()


class AdStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating ad status by superusers.
    
    This serializer allows superusers to manually change the status
    of advertisements and provide moderation reasons.
    """
    
    status = serializers.ChoiceField(
        choices=AdStatusEnum.choices,
        help_text="New status for the advertisement"
    )
    
    moderation_reason = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Reason for the status change"
    )
    
    notify_user = serializers.BooleanField(
        default=True,
        help_text="Whether to notify the user about the status change"
    )
    
    def validate_status(self, value):
        """Validate status transitions."""
        instance = self.instance
        current_status = instance.status if instance else None
        
        # Define valid status transitions
        valid_transitions = {
            AdStatusEnum.DRAFT: [AdStatusEnum.ACTIVE, AdStatusEnum.NEEDS_REVIEW, AdStatusEnum.REJECTED],
            AdStatusEnum.NEEDS_REVIEW: [AdStatusEnum.ACTIVE, AdStatusEnum.REJECTED, AdStatusEnum.INACTIVE],
            AdStatusEnum.ACTIVE: [AdStatusEnum.INACTIVE, AdStatusEnum.NEEDS_REVIEW, AdStatusEnum.REJECTED],
            AdStatusEnum.REJECTED: [AdStatusEnum.NEEDS_REVIEW, AdStatusEnum.ACTIVE],
            AdStatusEnum.INACTIVE: [AdStatusEnum.ACTIVE, AdStatusEnum.NEEDS_REVIEW]
        }
        
        if current_status and value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Invalid status transition from {current_status} to {value}"
            )
        
        return value
    
    def update(self, instance, validated_data):
        """Update the ad status and moderation fields."""
        request = self.context.get('request')
        user = request.user if request else None
        
        # Update status and moderation fields
        instance.status = validated_data['status']
        instance.moderated_by = user
        instance.moderated_at = timezone.now()
        instance.moderation_reason = validated_data.get('moderation_reason', '')
        
        # Update validation status based on new status
        instance.is_validated = validated_data['status'] == AdStatusEnum.ACTIVE
        
        instance.save(update_fields=[
            'status', 'moderated_by', 'moderated_at', 
            'moderation_reason', 'is_validated'
        ])
        
        # Send notification if requested
        if validated_data.get('notify_user', True):
            self._send_status_notification(instance, validated_data['status'])
        
        return instance
    
    def _send_status_notification(self, ad, new_status):
        """Send notification to user about status change."""
        from apps.ads.tasks import notify_ad_status_changed
        
        # Send async notification
        notify_ad_status_changed.delay(
            ad_id=ad.id,
            user_id=ad.account.user.id,
            new_status=new_status,
            reason=ad.moderation_reason
        )


class AdStatusDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for ad status information.
    
    Used to display comprehensive status information to superusers.
    """
    
    moderated_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    moderation_history = serializers.SerializerMethodField()
    
    class Meta:
        model = CarAd
        fields = [
            'id', 'title', 'status', 'status_display', 'is_validated',
            'moderated_by', 'moderated_by_name', 'moderated_at', 
            'moderation_reason', 'validation_errors', 'created_at',
            'updated_at', 'moderation_history'
        ]
        read_only_fields = [
            'id', 'status', 'moderated_by', 'moderated_by_name', 'moderation_comment',
            'created_at', 'updated_at', 'moderation_history'
        ]
    
    def get_moderated_by_name(self, obj):
        """Get the name of the moderator."""
        if obj.moderated_by:
            return obj.moderated_by.get_full_name() or obj.moderated_by.email
        return 'Auto-moderation'
    
    def get_status_display(self, obj):
        """Get human-readable status."""
        return obj.get_status_display()
    
    def get_moderation_history(self, obj):
        """Get moderation history from logs."""
        try:
            from apps.moderation.models import AdModerationLog
            logs = AdModerationLog.objects.filter(ad=obj).order_by('-created_at')[:10]
            
            return [
                {
                    'action': log.action,
                    'status': log.status,
                    'reason': log.reason,
                    'moderator': log.moderated_by.get_full_name() if log.moderated_by else 'Auto-moderation',
                    'timestamp': log.created_at,
                    'details': log.details
                }
                for log in logs
            ]
        except Exception:
            return []


class BulkStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk status updates.
    
    Allows superusers to update multiple ads at once.
    """
    
    ad_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100,
        help_text="List of ad IDs to update (max 100)"
    )
    
    status = serializers.ChoiceField(
        choices=AdStatusEnum.choices,
        help_text="New status for all selected advertisements"
    )
    
    moderation_reason = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Reason for the bulk status change"
    )
    
    notify_users = serializers.BooleanField(
        default=True,
        help_text="Whether to notify users about the status changes"
    )
    
    def validate_ad_ids(self, value):
        """Validate that all ad IDs exist."""
        existing_ids = set(CarAd.objects.filter(id__in=value).values_list('id', flat=True))
        missing_ids = set(value) - existing_ids
        
        if missing_ids:
            raise serializers.ValidationError(
                f"The following ad IDs do not exist: {list(missing_ids)}"
            )
        
        return value
    
    def update_ads(self):
        """Perform bulk update of ads."""
        request = self.context.get('request')
        user = request.user if request else None
        
        validated_data = self.validated_data
        ad_ids = validated_data['ad_ids']
        new_status = validated_data['status']
        reason = validated_data.get('moderation_reason', '')
        notify_users = validated_data.get('notify_users', True)
        
        # Update all ads
        updated_count = CarAd.objects.filter(id__in=ad_ids).update(
            status=new_status,
            moderated_by=user,
            moderated_at=timezone.now(),
            moderation_reason=reason,
            is_validated=(new_status == AdStatusEnum.ACTIVE)
        )
        
        # Send notifications if requested
        if notify_users:
            from apps.ads.tasks import notify_bulk_status_changed
            notify_bulk_status_changed.delay(
                ad_ids=ad_ids,
                new_status=new_status,
                reason=reason
            )
        
        return {
            'updated_count': updated_count,
            'ad_ids': ad_ids,
            'new_status': new_status,
            'reason': reason
        }
