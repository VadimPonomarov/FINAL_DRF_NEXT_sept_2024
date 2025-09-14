"""
Views for managing ad status - accessible only to superusers.
"""
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.ads.models.car_ad_model import CarAd
from apps.ads.serializers.ad_status_serializer import (
    AdStatusUpdateSerializer, AdStatusDetailSerializer, BulkStatusUpdateSerializer
)
from core.permissions import IsSuperUser
from core.enums.ads import AdStatusEnum


class AdStatusDetailView(generics.RetrieveAPIView):
    """
    Retrieve detailed status information for an ad.

    Only accessible to superusers.
    """
    queryset = CarAd.objects.all()
    serializer_class = AdStatusDetailSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]

    @swagger_auto_schema(
        operation_summary="Retrieve detailed status information for an ad",
        operation_description="Get comprehensive status information for a specific advertisement.",
        tags=['🚗 Advertisements']
    )
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)


@swagger_auto_schema(
    method='patch',
    operation_summary="Update ad status",
    operation_description="""
    Update the status of a specific advertisement.
    
    Only accessible to superusers. This endpoint allows manual moderation
    and status management of advertisements.
    
    Valid status transitions:
    - DRAFT → ACTIVE, NEEDS_REVIEW, REJECTED
    - NEEDS_REVIEW → ACTIVE, REJECTED, INACTIVE
    - ACTIVE → INACTIVE, NEEDS_REVIEW, REJECTED
    - REJECTED → NEEDS_REVIEW, ACTIVE
    - INACTIVE → ACTIVE, NEEDS_REVIEW
    """,
    tags=['🚗 Advertisements'],
    request_body=AdStatusUpdateSerializer,
    responses={
        200: AdStatusDetailSerializer,
        400: "Invalid status transition or validation error",
        403: "Permission denied - superuser required",
        404: "Ad not found"
    }
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsSuperUser])
def update_ad_status(request, ad_id):
    """Update the status of a specific ad."""
    ad = get_object_or_404(CarAd, id=ad_id)
    
    serializer = AdStatusUpdateSerializer(
        instance=ad,
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        updated_ad = serializer.save()
        
        # Return detailed status information
        detail_serializer = AdStatusDetailSerializer(updated_ad)
        return Response(detail_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='post',
    operation_summary="📦 Bulk Status Update",
    operation_description="""
    Update the status of multiple advertisements at once.
    
    Only accessible to superusers. Useful for bulk moderation actions.
    Maximum 100 ads can be updated in a single request.
    """,
    tags=['🚗 Advertisements'],
    request_body=BulkStatusUpdateSerializer,
    responses={
        200: openapi.Response(
            description="Bulk update successful",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'updated_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'ad_ids': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_INTEGER)),
                    'new_status': openapi.Schema(type=openapi.TYPE_STRING),
                    'reason': openapi.Schema(type=openapi.TYPE_STRING),
                }
            )
        ),
        400: "Validation error",
        403: "Permission denied - superuser required"
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperUser])
def bulk_update_ad_status(request):
    """Bulk update the status of multiple ads."""
    serializer = BulkStatusUpdateSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        result = serializer.update_ads()
        return Response(result)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='get',
    operation_summary="📊 Moderation Dashboard",
    operation_description="""
    Get statistics for the moderation dashboard.
    
    Returns counts of ads by status and other useful metrics for moderators.
    """,
    tags=['🚗 Advertisements'],
    responses={
        200: openapi.Response(
            description="Moderation statistics",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'status_counts': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        additional_properties=openapi.Schema(type=openapi.TYPE_INTEGER)
                    ),
                    'recent_activity': openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(type=openapi.TYPE_OBJECT)
                    ),
                    'pending_review': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'total_ads': openapi.Schema(type=openapi.TYPE_INTEGER),
                }
            )
        ),
        403: "Permission denied - superuser required"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperUser])
def moderation_dashboard(request):
    """Get moderation dashboard statistics."""
    # Count ads by status
    status_counts = {}
    for status_choice in AdStatusEnum.choices:
        status_value = status_choice[0]
        count = CarAd.objects.filter(status=status_value).count()
        status_counts[status_value] = count
    
    # Get recent activity (last 24 hours)
    from django.utils import timezone
    from datetime import timedelta
    
    yesterday = timezone.now() - timedelta(days=1)
    recent_ads = CarAd.objects.filter(
        moderated_at__gte=yesterday
    ).select_related('moderated_by', 'account__user').order_by('-moderated_at')[:20]
    
    recent_activity = [
        {
            'ad_id': ad.id,
            'title': ad.title,
            'status': ad.status,
            'moderated_by': ad.moderated_by.get_full_name() if ad.moderated_by else 'Auto-moderation',
            'moderated_at': ad.moderated_at,
            'owner': ad.account.user.email
        }
        for ad in recent_ads
    ]
    
    # Count ads needing review
    pending_review = CarAd.objects.filter(status=AdStatusEnum.NEEDS_REVIEW).count()
    
    # Total ads count
    total_ads = CarAd.objects.count()
    
    return Response({
        'status_counts': status_counts,
        'recent_activity': recent_activity,
        'pending_review': pending_review,
        'total_ads': total_ads,
        'dashboard_updated_at': timezone.now()
    })


class AdModerationListView(generics.ListAPIView):
    """
    List view for ads requiring moderation.

    Filters ads by status and provides search/filtering capabilities for moderators.
    """
    serializer_class = AdStatusDetailSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]

    @swagger_auto_schema(
        operation_summary="📋 Ads Pending Review",
        operation_description="Get a filtered list of advertisements for moderation purposes.",
        tags=['🚗 Advertisements']
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)
    
    def get_queryset(self):
        """Get ads filtered by status and search parameters."""
        queryset = CarAd.objects.select_related('account__user', 'moderated_by')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by moderation requirement
        needs_review = self.request.query_params.get('needs_review')
        if needs_review == 'true':
            queryset = queryset.filter(status=AdStatusEnum.NEEDS_REVIEW)
        
        # Search in title and description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        # Filter by user
        user_email = self.request.query_params.get('user_email')
        if user_email:
            queryset = queryset.filter(account__user__email__icontains=user_email)
        
        # Order by priority (needs review first, then by creation date)
        return queryset.order_by(
            '-status',  # NEEDS_REVIEW will come first
            '-created_at'
        )


@swagger_auto_schema(
    method='post',
    operation_summary="✅ Approve Advertisement",
    operation_description="Quick approve action for an ad",
    tags=['🚗 Advertisements'],
    responses={200: AdStatusDetailSerializer, 404: "Ad not found"}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperUser])
def approve_ad(request, ad_id):
    """Quick approve action for an ad."""
    ad = get_object_or_404(CarAd, id=ad_id)
    
    serializer = AdStatusUpdateSerializer(
        instance=ad,
        data={
            'status': AdStatusEnum.ACTIVE,
            'moderation_reason': 'Approved by moderator',
            'notify_user': True
        },
        context={'request': request}
    )
    
    if serializer.is_valid():
        updated_ad = serializer.save()
        detail_serializer = AdStatusDetailSerializer(updated_ad)
        return Response(detail_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='post',
    operation_summary="❌ Reject Advertisement",
    operation_description="Quick reject action for an ad",
    tags=['🚗 Advertisements'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'reason': openapi.Schema(type=openapi.TYPE_STRING, description="Rejection reason")
        },
        required=['reason']
    ),
    responses={200: AdStatusDetailSerializer, 404: "Ad not found"}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperUser])
def reject_ad(request, ad_id):
    """Quick reject action for an ad."""
    ad = get_object_or_404(CarAd, id=ad_id)
    reason = request.data.get('reason', 'Rejected by moderator')
    
    serializer = AdStatusUpdateSerializer(
        instance=ad,
        data={
            'status': AdStatusEnum.REJECTED,
            'moderation_reason': reason,
            'notify_user': True
        },
        context={'request': request}
    )
    
    if serializer.is_valid():
        updated_ad = serializer.save()
        detail_serializer = AdStatusDetailSerializer(updated_ad)
        return Response(detail_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
