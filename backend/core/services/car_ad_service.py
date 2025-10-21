"""
Car advertisement service for business logic.
Handles all business logic related to car advertisements.
"""

from typing import Any, Dict, List, Optional

from apps.ads.enums import AdStatusEnum
from django.core.exceptions import ValidationError
from django.db import models, transaction
from rest_framework import status
from rest_framework.response import Response

from apps.ads.models import CarAd

from .base_crud_service import BaseCRUDService


class CarAdService(BaseCRUDService):
    """
    Service class for car advertisement business logic.
    Handles all operations related to car advertisements.
    """

    def __init__(self):
        super().__init__(model=CarAd)

    def create_ad(self, data: Dict[str, Any], user_id: int) -> Response:
        """
        Create a new car advertisement.

        Args:
            data: Advertisement data
            user_id: ID of the user creating the ad

        Returns:
            Response with created ad or error
        """
        try:
            self.log_operation("create_ad", user_id, {"data": data})

            # Validate required fields
            required_fields = ["title", "description", "price", "currency"]
            validated_data = self.validate_data(data, required_fields)

            # Set default status if not provided
            if "status" not in validated_data:
                validated_data["status"] = AdStatusEnum.PENDING

            # Create advertisement
            with transaction.atomic():
                ad = CarAd.objects.create(
                    title=validated_data["title"],
                    description=validated_data["description"],
                    price=validated_data["price"],
                    currency=validated_data["currency"],
                    status=validated_data["status"],
                    created_by_id=user_id,
                )

                # Add additional fields if provided
                for field in ["brand", "model", "year", "mileage", "fuel_type"]:
                    if field in validated_data:
                        setattr(ad, field, validated_data[field])

                ad.save()

            return self.create_response(
                data={
                    "id": ad.id,
                    "title": ad.title,
                    "status": ad.status,
                    "created_at": ad.created_at.isoformat(),
                },
                message="Advertisement created successfully",
                status_code=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return self.handle_errors("create_ad", e)

    def approve_ad(self, ad_id: int, user_id: int, reason: str = None) -> Response:
        """
        Approve an advertisement.

        Args:
            ad_id: ID of the advertisement to approve
            user_id: ID of the user approving the ad
            reason: Optional reason for approval

        Returns:
            Response with approval confirmation or error
        """
        try:
            self.log_operation(
                "approve_ad", user_id, {"ad_id": ad_id, "reason": reason}
            )

            with transaction.atomic():
                ad = CarAd.objects.get(id=ad_id)
                ad.status = AdStatusEnum.APPROVED
                ad.moderated_by_id = user_id
                if reason:
                    ad.moderator_notes = reason
                ad.save()

            return self.create_response(
                data={
                    "id": ad.id,
                    "status": ad.status,
                    "moderated_by": user_id,
                    "moderated_at": ad.updated_at.isoformat(),
                },
                message="Advertisement approved successfully",
            )

        except CarAd.DoesNotExist:
            return self.create_response(
                message="Advertisement not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("approve_ad", e)

    def reject_ad(self, ad_id: int, user_id: int, reason: str) -> Response:
        """
        Reject an advertisement.

        Args:
            ad_id: ID of the advertisement to reject
            user_id: ID of the user rejecting the ad
            reason: Reason for rejection

        Returns:
            Response with rejection confirmation or error
        """
        try:
            self.log_operation("reject_ad", user_id, {"ad_id": ad_id, "reason": reason})

            if not reason:
                raise ValidationError("Rejection reason is required")

            with transaction.atomic():
                ad = CarAd.objects.get(id=ad_id)
                ad.status = AdStatusEnum.REJECTED
                ad.moderated_by_id = user_id
                ad.moderator_notes = reason
                ad.save()

            return self.create_response(
                data={
                    "id": ad.id,
                    "status": ad.status,
                    "moderated_by": user_id,
                    "moderated_at": ad.updated_at.isoformat(),
                    "reason": reason,
                },
                message="Advertisement rejected successfully",
            )

        except CarAd.DoesNotExist:
            return self.create_response(
                message="Advertisement not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("reject_ad", e)

    def block_ad(self, ad_id: int, user_id: int, reason: str) -> Response:
        """
        Block an advertisement.

        Args:
            ad_id: ID of the advertisement to block
            user_id: ID of the user blocking the ad
            reason: Reason for blocking

        Returns:
            Response with blocking confirmation or error
        """
        try:
            self.log_operation("block_ad", user_id, {"ad_id": ad_id, "reason": reason})

            if not reason:
                raise ValidationError("Blocking reason is required")

            with transaction.atomic():
                ad = CarAd.objects.get(id=ad_id)
                ad.status = AdStatusEnum.BLOCKED
                ad.moderated_by_id = user_id
                ad.moderator_notes = reason
                ad.save()

            return self.create_response(
                data={
                    "id": ad.id,
                    "status": ad.status,
                    "moderated_by": user_id,
                    "moderated_at": ad.updated_at.isoformat(),
                    "reason": reason,
                },
                message="Advertisement blocked successfully",
            )

        except CarAd.DoesNotExist:
            return self.create_response(
                message="Advertisement not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("block_ad", e)

    def activate_ad(self, ad_id: int, user_id: int) -> Response:
        """
        Activate an advertisement.

        Args:
            ad_id: ID of the advertisement to activate
            user_id: ID of the user activating the ad

        Returns:
            Response with activation confirmation or error
        """
        try:
            self.log_operation("activate_ad", user_id, {"ad_id": ad_id})

            with transaction.atomic():
                ad = CarAd.objects.get(id=ad_id)
                ad.status = AdStatusEnum.ACTIVE
                ad.moderated_by_id = user_id
                ad.save()

            return self.create_response(
                data={
                    "id": ad.id,
                    "status": ad.status,
                    "moderated_by": user_id,
                    "moderated_at": ad.updated_at.isoformat(),
                },
                message="Advertisement activated successfully",
            )

        except CarAd.DoesNotExist:
            return self.create_response(
                message="Advertisement not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("activate_ad", e)

    def send_for_review(self, ad_id: int, user_id: int, reason: str = None) -> Response:
        """
        Send an advertisement for review.

        Args:
            ad_id: ID of the advertisement to send for review
            user_id: ID of the user sending for review
            reason: Optional reason for review

        Returns:
            Response with review confirmation or error
        """
        try:
            self.log_operation(
                "send_for_review", user_id, {"ad_id": ad_id, "reason": reason}
            )

            with transaction.atomic():
                ad = CarAd.objects.get(id=ad_id)
                ad.status = AdStatusEnum.NEEDS_REVIEW
                ad.moderated_by_id = user_id
                if reason:
                    ad.moderator_notes = reason
                ad.save()

            return self.create_response(
                data={
                    "id": ad.id,
                    "status": ad.status,
                    "moderated_by": user_id,
                    "moderated_at": ad.updated_at.isoformat(),
                    "reason": reason,
                },
                message="Advertisement sent for review successfully",
            )

        except CarAd.DoesNotExist:
            return self.create_response(
                message="Advertisement not found", status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return self.handle_errors("send_for_review", e)

    def get_moderation_queue(
        self, status_filter: str = None, user_id: int = None
    ) -> Response:
        """
        Get advertisements for moderation queue.

        Args:
            status_filter: Optional status filter
            user_id: ID of the user requesting the queue

        Returns:
            Response with moderation queue or error
        """
        try:
            self.log_operation(
                "get_moderation_queue", user_id, {"status_filter": status_filter}
            )

            # Base queryset for moderation-related statuses
            queryset = CarAd.objects.filter(
                status__in=[
                    AdStatusEnum.PENDING,
                    AdStatusEnum.NEEDS_REVIEW,
                    AdStatusEnum.REJECTED,
                    AdStatusEnum.BLOCKED,
                    AdStatusEnum.ACTIVE,
                ]
            )

            # Apply status filter if provided
            if status_filter and status_filter != "all":
                queryset = queryset.filter(status=status_filter)

            # Convert to list of dicts
            ads = []
            for ad in queryset:
                ads.append(
                    {
                        "id": ad.id,
                        "title": ad.title,
                        "status": ad.status,
                        "price": ad.price,
                        "currency": ad.currency,
                        "created_at": ad.created_at.isoformat(),
                        "moderated_by": ad.moderated_by.username
                        if ad.moderated_by
                        else None,
                        "moderator_notes": ad.moderator_notes,
                    }
                )

            return self.create_response(
                data={"ads": ads, "count": len(ads)},
                message="Moderation queue retrieved successfully",
            )

        except Exception as e:
            return self.handle_errors("get_moderation_queue", e)
