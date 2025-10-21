"""
Views for advertisement moderation system.
Available only for staff and superuser roles.
"""

from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.ads.filters import CarAdFilter
from apps.ads.models import CarAd
from apps.ads.permissions import IsStaffOrSuperUser, IsSuperUser
from apps.ads.serializers.car_ad_serializer import CarAdSerializer
from core.enums.ads import AdStatusEnum


class ModerationQueueView(generics.ListAPIView):
    """
    List view for advertisements pending moderation.
    Available only for staff and superuser.
    """

    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated, IsStaffOrSuperUser]

    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarAdFilter
    search_fields = ["title", "description", "model", "account__user__email"]
    ordering_fields = ["created_at", "updated_at", "price", "title", "status", "brand", "year"]
    ordering = ["-created_at"]

    @swagger_auto_schema(
        operation_summary="🔍 Moderation Queue",
        operation_description="Get list of advertisements pending moderation (staff/superuser only).",
        tags=["🛡️ Moderation"],
        manual_parameters=[
            openapi.Parameter(
                "status",
                openapi.IN_QUERY,
                description="Filter by status (pending, needs_review, rejected)",
                type=openapi.TYPE_STRING,
                enum=["pending", "needs_review", "rejected"],
            ),
            openapi.Parameter(
                "search",
                openapi.IN_QUERY,
                description="Search in title, description, model, or user email",
                type=openapi.TYPE_STRING,
            ),
        ],
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def get_queryset(self):
        """Get ads that need moderation or are in moderation-related states."""
        queryset = CarAd.objects.select_related(
            "account", "account__user", "mark", "moderated_by"
        ).order_by("-created_at")

        # Если статус не указан, возвращаем все объявления для модерации
        status_filter = self.request.GET.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        else:
            # По умолчанию показываем все объявления, которые могут быть отмодерированы
            queryset = queryset.filter(
                status__in=[
                    AdStatusEnum.PENDING,
                    AdStatusEnum.NEEDS_REVIEW,
                    AdStatusEnum.REJECTED,
                    AdStatusEnum.BLOCKED,
                    AdStatusEnum.ACTIVE,
                ]
            )

        return queryset


@swagger_auto_schema(
    method="post",
    operation_summary="✅ Approve Advertisement",
    operation_description="Approve an advertisement (staff/superuser only).",
    tags=["🛡️ Moderation"],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "reason": openapi.Schema(
                type=openapi.TYPE_STRING, description="Optional reason for approval"
            )
        },
    ),
    responses={
        200: openapi.Response(
            description="Advertisement approved successfully", schema=CarAdSerializer
        ),
        403: openapi.Response(description="Permission denied"),
        404: openapi.Response(description="Advertisement not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaffOrSuperUser])
def approve_advertisement(request, ad_id):
    """Approve an advertisement."""
    try:
        ad = CarAd.objects.get(id=ad_id)
    except CarAd.DoesNotExist:
        return Response(
            {"error": "Advertisement not found"}, status=status.HTTP_404_NOT_FOUND
        )

    # Update ad status
    ad.status = AdStatusEnum.ACTIVE
    ad.is_validated = True
    ad.moderated_by = request.user
    ad.moderation_reason = request.data.get("reason", "Approved by moderator")
    ad.save()

    serializer = CarAdSerializer(ad)
    return Response(
        {"message": "Advertisement approved successfully", "ad": serializer.data}
    )


@swagger_auto_schema(
    method="post",
    operation_summary="🚫 Block Advertisement",
    operation_description="Block an advertisement (superuser only).",
    tags=["🛡️ Moderation"],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "reason": openapi.Schema(
                type=openapi.TYPE_STRING, description="Reason for blocking (required)"
            ),
            "moderator_notes": openapi.Schema(
                type=openapi.TYPE_STRING, description="Additional moderator notes"
            ),
        },
        required=["reason"],
    ),
    responses={
        200: openapi.Response(
            description="Advertisement blocked successfully", schema=CarAdSerializer
        ),
        403: openapi.Response(description="Permission denied"),
        404: openapi.Response(description="Advertisement not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsSuperUser])
def block_advertisement(request, ad_id):
    """Block an advertisement (superuser only)."""
    try:
        ad = CarAd.objects.get(id=ad_id)
    except CarAd.DoesNotExist:
        return Response(
            {"error": "Advertisement not found"}, status=status.HTTP_404_NOT_FOUND
        )

    reason = request.data.get("reason")
    if not reason:
        return Response(
            {"error": "Reason is required for blocking"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update ad status
    ad.status = AdStatusEnum.BLOCKED
    ad.is_validated = False
    ad.moderated_by = request.user
    ad.moderation_reason = reason
    ad.moderator_notes = request.data.get("moderator_notes", "")
    ad.save()

    serializer = CarAdSerializer(ad)
    return Response(
        {"message": "Advertisement blocked successfully", "ad": serializer.data}
    )


@swagger_auto_schema(
    method="post",
    operation_summary="✅ Activate Advertisement",
    operation_description="Activate a blocked advertisement (superuser only).",
    tags=["🛡️ Moderation"],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "moderator_notes": openapi.Schema(
                type=openapi.TYPE_STRING, description="Additional moderator notes"
            )
        },
    ),
    responses={
        200: openapi.Response(
            description="Advertisement activated successfully", schema=CarAdSerializer
        ),
        403: openapi.Response(description="Permission denied"),
        404: openapi.Response(description="Advertisement not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsSuperUser])
def activate_advertisement(request, ad_id):
    """Activate a blocked advertisement (superuser only)."""
    try:
        ad = CarAd.objects.get(id=ad_id)
    except CarAd.DoesNotExist:
        return Response(
            {"error": "Advertisement not found"}, status=status.HTTP_404_NOT_FOUND
        )

    # Update ad status
    ad.status = AdStatusEnum.ACTIVE
    ad.is_validated = True
    ad.moderated_by = request.user
    ad.moderation_reason = "Activated by superuser"
    ad.moderator_notes = request.data.get("moderator_notes", "")
    ad.save()

    serializer = CarAdSerializer(ad)
    return Response(
        {"message": "Advertisement activated successfully", "ad": serializer.data}
    )


@swagger_auto_schema(
    method="post",
    operation_summary="❌ Reject Advertisement",
    operation_description="Reject an advertisement (staff/superuser only).",
    tags=["🛡️ Moderation"],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=["reason"],
        properties={
            "reason": openapi.Schema(
                type=openapi.TYPE_STRING, description="Reason for rejection"
            )
        },
    ),
    responses={
        200: openapi.Response(
            description="Advertisement rejected successfully", schema=CarAdSerializer
        ),
        400: openapi.Response(description="Reason is required"),
        403: openapi.Response(description="Permission denied"),
        404: openapi.Response(description="Advertisement not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaffOrSuperUser])
def reject_advertisement(request, ad_id):
    """Reject an advertisement."""
    try:
        ad = CarAd.objects.get(id=ad_id)
    except CarAd.DoesNotExist:
        return Response(
            {"error": "Advertisement not found"}, status=status.HTTP_404_NOT_FOUND
        )

    reason = request.data.get("reason")
    if not reason:
        return Response(
            {"error": "Rejection reason is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update ad status
    ad.status = AdStatusEnum.REJECTED
    ad.is_validated = False
    ad.moderated_by = request.user
    ad.moderation_reason = reason
    ad.save()

    serializer = CarAdSerializer(ad)
    return Response(
        {"message": "Advertisement rejected successfully", "ad": serializer.data}
    )


@swagger_auto_schema(
    method="post",
    operation_summary="🔄 Request Review",
    operation_description="Mark advertisement as needing review (staff/superuser only).",
    tags=["🛡️ Moderation"],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "reason": openapi.Schema(
                type=openapi.TYPE_STRING, description="Reason for requesting review"
            )
        },
    ),
    responses={
        200: openapi.Response(
            description="Advertisement marked for review", schema=CarAdSerializer
        ),
        403: openapi.Response(description="Permission denied"),
        404: openapi.Response(description="Advertisement not found"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsStaffOrSuperUser])
def request_review(request, ad_id):
    """Mark advertisement as needing review."""
    try:
        ad = CarAd.objects.get(id=ad_id)
    except CarAd.DoesNotExist:
        return Response(
            {"error": "Advertisement not found"}, status=status.HTTP_404_NOT_FOUND
        )

    # Update ad status
    ad.status = AdStatusEnum.NEEDS_REVIEW
    ad.moderated_by = request.user
    ad.moderation_reason = request.data.get("reason", "Marked for review by moderator")
    ad.save()

    serializer = CarAdSerializer(ad)
    return Response(
        {"message": "Advertisement marked for review", "ad": serializer.data}
    )


@swagger_auto_schema(
    method="get",
    operation_summary="📊 Moderation Statistics",
    operation_description="Get moderation statistics (staff/superuser only).",
    tags=["🛡️ Moderation"],
    responses={
        200: openapi.Response(
            description="Moderation statistics",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "total_ads": openapi.Schema(type=openapi.TYPE_INTEGER),
                    "pending_moderation": openapi.Schema(type=openapi.TYPE_INTEGER),
                    "needs_review": openapi.Schema(type=openapi.TYPE_INTEGER),
                    "rejected": openapi.Schema(type=openapi.TYPE_INTEGER),
                    "active": openapi.Schema(type=openapi.TYPE_INTEGER),
                    "today_moderated": openapi.Schema(type=openapi.TYPE_INTEGER),
                },
            ),
        )
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffOrSuperUser])
def moderation_statistics(request):
    """Get moderation statistics."""
    from datetime import timedelta

    from django.utils import timezone

    today = timezone.now().date()

    stats = {
        "total_ads": CarAd.objects.count(),
        "pending_moderation": CarAd.objects.filter(status=AdStatusEnum.PENDING).count(),
        "needs_review": CarAd.objects.filter(status=AdStatusEnum.NEEDS_REVIEW).count(),
        "rejected": CarAd.objects.filter(status=AdStatusEnum.REJECTED).count(),
        "blocked": CarAd.objects.filter(status=AdStatusEnum.BLOCKED).count(),
        "active": CarAd.objects.filter(status=AdStatusEnum.ACTIVE).count(),
        "today_moderated": CarAd.objects.filter(moderated_at__date=today).count(),
    }

    return Response(stats)
