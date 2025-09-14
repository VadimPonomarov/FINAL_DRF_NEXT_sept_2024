"""
Views for managing account types - accessible only to superusers.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.accounts.models import AddsAccount
from core.permissions import IsSuperUser
from core.enums.ads import AccountTypeEnum


@swagger_auto_schema(
    method='patch',
    operation_summary="🔧 Change Account Type",
    operation_description="""
    Change the type of a user account.

    Only accessible to superusers. This endpoint allows manual management
    of account types (BASIC/PREMIUM).

    Available account types:
    - BASIC: Default account type with limited features
    - PREMIUM: Premium account with access to analytics and advanced features
    """,
    tags=['👑 Admin'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'account_type': openapi.Schema(
                type=openapi.TYPE_STRING,
                enum=['BASIC', 'PREMIUM'],
                description="New account type"
            ),
            'reason': openapi.Schema(
                type=openapi.TYPE_STRING,
                description="Reason for the account type change"
            ),
            'notify_user': openapi.Schema(
                type=openapi.TYPE_BOOLEAN,
                default=True,
                description="Whether to notify the user about the change"
            ),
            'valid_until': openapi.Schema(
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATETIME,
                description="Expiration date for premium accounts (optional)"
            )
        },
        required=['account_type']
    ),
    responses={
        200: openapi.Response(
            description="Account type updated successfully",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'account_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'user_email': openapi.Schema(type=openapi.TYPE_STRING),
                    'old_type': openapi.Schema(type=openapi.TYPE_STRING),
                    'new_type': openapi.Schema(type=openapi.TYPE_STRING),
                    'changed_by': openapi.Schema(type=openapi.TYPE_STRING),
                    'changed_at': openapi.Schema(type=openapi.TYPE_STRING),
                    'reason': openapi.Schema(type=openapi.TYPE_STRING),
                    'valid_until': openapi.Schema(type=openapi.TYPE_STRING),
                }
            )
        ),
        400: "Invalid account type or validation error",
        403: "Permission denied - superuser required",
        404: "Account not found"
    }
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsSuperUser])
def change_account_type(request, account_id):
    """Change the type of a user account."""
    account = get_object_or_404(AddsAccount, id=account_id)
    
    # Get request data
    new_type = request.data.get('account_type')
    reason = request.data.get('reason', '')
    notify_user = request.data.get('notify_user', True)
    valid_until = request.data.get('valid_until')
    
    # Validate account type
    if new_type not in [choice[0] for choice in AccountTypeEnum.choices]:
        return Response(
            {'error': f'Invalid account type. Must be one of: {[choice[0] for choice in AccountTypeEnum.choices]}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Store old type for logging
    old_type = account.account_type
    
    # Update account type
    account.account_type = new_type
    account.save(update_fields=['account_type', 'updated_at'])
    
    # Log the change
    change_log = {
        'account_id': account.id,
        'user_email': account.user.email,
        'old_type': old_type,
        'new_type': new_type,
        'changed_by': request.user.email,
        'changed_at': timezone.now(),
        'reason': reason,
        'valid_until': valid_until
    }
    
    # Send notification if requested
    if notify_user:
        _send_account_type_notification(account, old_type, new_type, reason)
    
    return Response(change_log)


@swagger_auto_schema(
    method='post',
    operation_summary="Bulk change account types",
    operation_description="""
    Change the type of multiple user accounts at once.
    
    Only accessible to superusers. Useful for bulk operations like
    promotional upgrades or downgrades.
    
    Maximum 100 accounts can be updated in a single request.
    """,
    tags=['👑 Admin'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'account_ids': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(type=openapi.TYPE_INTEGER),
                description="List of account IDs to update (max 100)"
            ),
            'account_type': openapi.Schema(
                type=openapi.TYPE_STRING,
                enum=['BASIC', 'PREMIUM'],
                description="New account type for all selected accounts"
            ),
            'reason': openapi.Schema(
                type=openapi.TYPE_STRING,
                description="Reason for the bulk account type change"
            ),
            'notify_users': openapi.Schema(
                type=openapi.TYPE_BOOLEAN,
                default=True,
                description="Whether to notify users about the changes"
            ),
            'valid_until': openapi.Schema(
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATETIME,
                description="Expiration date for premium accounts (optional)"
            )
        },
        required=['account_ids', 'account_type']
    ),
    responses={
        200: openapi.Response(
            description="Bulk update successful",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'updated_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'account_ids': openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(type=openapi.TYPE_INTEGER)
                    ),
                    'new_type': openapi.Schema(type=openapi.TYPE_STRING),
                    'reason': openapi.Schema(type=openapi.TYPE_STRING),
                    'changed_by': openapi.Schema(type=openapi.TYPE_STRING),
                    'changed_at': openapi.Schema(type=openapi.TYPE_STRING),
                }
            )
        ),
        400: "Validation error",
        403: "Permission denied - superuser required"
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperUser])
def bulk_change_account_type(request):
    """Bulk change the type of multiple user accounts."""
    # Get request data
    account_ids = request.data.get('account_ids', [])
    new_type = request.data.get('account_type')
    reason = request.data.get('reason', '')
    notify_users = request.data.get('notify_users', True)
    valid_until = request.data.get('valid_until')
    
    # Validate input
    if not account_ids:
        return Response(
            {'error': 'account_ids is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(account_ids) > 100:
        return Response(
            {'error': 'Maximum 100 accounts can be updated at once'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_type not in [choice[0] for choice in AccountTypeEnum.choices]:
        return Response(
            {'error': f'Invalid account type. Must be one of: {[choice[0] for choice in AccountTypeEnum.choices]}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate that all accounts exist
    existing_accounts = AddsAccount.objects.filter(id__in=account_ids)
    existing_ids = set(existing_accounts.values_list('id', flat=True))
    missing_ids = set(account_ids) - existing_ids
    
    if missing_ids:
        return Response(
            {'error': f'The following account IDs do not exist: {list(missing_ids)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Update all accounts
    updated_count = existing_accounts.update(
        account_type=new_type,
        updated_at=timezone.now()
    )
    
    # Send notifications if requested
    if notify_users:
        for account in existing_accounts:
            _send_account_type_notification(account, account.account_type, new_type, reason)
    
    return Response({
        'updated_count': updated_count,
        'account_ids': account_ids,
        'new_type': new_type,
        'reason': reason,
        'changed_by': request.user.email,
        'changed_at': timezone.now(),
        'valid_until': valid_until
    })


@swagger_auto_schema(
    method='get',
    operation_summary="Get account type statistics",
    operation_description="""
    Get statistics about account types in the system.
    
    Returns counts by type, recent changes, and other useful metrics.
    """,
    tags=['👑 Admin'],
    responses={
        200: openapi.Response(
            description="Account type statistics",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'account_types': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        additional_properties=openapi.Schema(type=openapi.TYPE_INTEGER)
                    ),
                    'recent_changes': openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(type=openapi.TYPE_OBJECT)
                    ),
                    'total_accounts': openapi.Schema(type=openapi.TYPE_INTEGER),
                }
            )
        ),
        403: "Permission denied - superuser required"
    }
)
@api_view(['GET'])
@permission_classes([])  # Публичная статистика для всех
def account_type_statistics(request):
    """Get public statistics about account types."""
    from django.db.models import Count
    from datetime import timedelta
    
    # Count accounts by type
    type_counts = {}
    for type_choice in AccountTypeEnum.choices:
        type_value = type_choice[0]
        count = AddsAccount.objects.filter(account_type=type_value).count()
        type_counts[type_value] = count
    
    # Для публичной статистики не показываем детальную информацию о пользователях
    recent_activity = []
    
    # Total accounts count
    total_accounts = AddsAccount.objects.count()
    
    return Response({
        'account_types': type_counts,
        'recent_changes': recent_activity,
        'total_accounts': total_accounts,
        'statistics_updated_at': timezone.now()
    })


def _send_account_type_notification(account, old_type, new_type, reason):
    """Send notification to user about account type change."""
    # This would integrate with your notification system
    # For now, we'll just log it
    import logging
    
    logger = logging.getLogger('account_changes')
    logger.info(
        f"Account type changed for {account.user.email}: "
        f"{old_type} -> {new_type}. Reason: {reason}"
    )
    
    # TODO: Integrate with Celery task for actual notifications
    # from apps.accounts.tasks import notify_account_type_changed
    # notify_account_type_changed.delay(
    #     account_id=account.id,
    #     old_type=old_type,
    #     new_type=new_type,
    #     reason=reason
    # )
