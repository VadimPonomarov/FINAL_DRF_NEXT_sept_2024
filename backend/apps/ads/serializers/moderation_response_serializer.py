"""
Serializer for moderation response with censored content.
"""
from rest_framework import serializers


class ModerationResponseSerializer(serializers.Serializer):
    """
    Serializer for returning moderation results with censored content.
    
    When ad fails moderation, returns the original content with
    inappropriate words replaced by asterisks.
    """
    
    # Original ad data
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    
    # Moderation results
    moderation_passed = serializers.BooleanField(read_only=True)
    moderation_reason = serializers.CharField(read_only=True, allow_blank=True)
    
    # Censored content (with asterisks)
    censored_title = serializers.CharField(read_only=True, allow_blank=True)
    censored_description = serializers.CharField(read_only=True, allow_blank=True)
    
    # Additional moderation info
    inappropriate_words = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        default=list
    )
    suggestions = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        default=list
    )
    categories = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        default=list
    )
    
    # Attempt tracking
    moderation_attempts = serializers.IntegerField(read_only=True, default=0)
    max_attempts = serializers.IntegerField(read_only=True, default=3)
    remaining_attempts = serializers.IntegerField(read_only=True, default=3)
    
    def to_representation(self, instance):
        """
        Custom representation to include moderation data.
        """
        # Get base representation
        data = super().to_representation(instance)
        
        # Add moderation context if available
        moderation_context = self.context.get('moderation_result', {})
        
        if moderation_context:
            data.update({
                'moderation_passed': moderation_context.get('success', False),
                'moderation_reason': moderation_context.get('reason', ''),
                'censored_title': moderation_context.get('censored_title', instance.title),
                'censored_description': moderation_context.get('censored_description', instance.description),
                'inappropriate_words': moderation_context.get('inappropriate_words', []),
                'suggestions': moderation_context.get('suggestions', []),
                'categories': moderation_context.get('categories', []),
                'moderation_attempts': moderation_context.get('attempts', 0),
                'remaining_attempts': moderation_context.get('remaining_attempts', 3)
            })
        
        return data


class CensoredContentSerializer(serializers.Serializer):
    """
    Serializer specifically for returning censored content to client.
    
    Used when moderation fails and we need to show user what needs to be fixed.
    """
    
    # Status info
    success = serializers.BooleanField(default=False)
    message = serializers.CharField()
    
    # Original content
    original_title = serializers.CharField()
    original_description = serializers.CharField()
    
    # Censored content (what user should see)
    censored_title = serializers.CharField()
    censored_description = serializers.CharField()
    
    # Moderation details
    reason = serializers.CharField()
    inappropriate_words = serializers.ListField(child=serializers.CharField(), default=list)
    suggestions = serializers.ListField(child=serializers.CharField(), default=list)
    
    # Attempt tracking
    attempts_used = serializers.IntegerField()
    attempts_remaining = serializers.IntegerField()
    max_attempts = serializers.IntegerField(default=3)
    
    # Next steps
    can_edit = serializers.BooleanField(default=True)
    requires_manual_review = serializers.BooleanField(default=False)


def create_moderation_response(ad, success, message, details=None, attempts=0):
    """
    Helper function to create standardized moderation response.
    
    Args:
        ad: CarAd instance
        success: bool - whether moderation passed
        message: str - message to user
        details: dict - moderation details from LLM
        attempts: int - current attempt count
        
    Returns:
        dict: Standardized response for API
    """
    if details is None:
        details = {}
    
    response = {
        'id': ad.id,
        'title': ad.title,
        'description': ad.description,
        'status': ad.status,
        'success': success,
        'message': message,
        'attempts_used': attempts,
        'attempts_remaining': max(0, 3 - attempts),
        'max_attempts': 3,
        'can_edit': attempts < 3,
        'requires_manual_review': attempts >= 3
    }
    
    if not success and details:
        # Add censored content for failed moderation
        response.update({
            'reason': details.get('reason', ''),
            'censored_title': details.get('censored_title', ad.title),
            'censored_description': details.get('censored_description', ad.description),
            'inappropriate_words': details.get('inappropriate_words', []),
            'suggestions': details.get('suggestions', []),
            'categories': details.get('categories', [])
        })
    
    return response
