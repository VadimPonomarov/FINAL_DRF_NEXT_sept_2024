from django.db.models import Prefetch
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AddsAccount
from core.permissions import IsOwnerOrReadOnly

from ..models import CarAd
from ..serializers.ad_serializers import (
    AdDetailSerializer,
    AddSerializer,
    AdListSerializer,
)


class AdListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating advertisements.
    """

    permission_classes: list = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        """Return the appropriate serializer class based on the request method."""
        if self.request.method == "POST":
            return AddSerializer
        return AdListSerializer

    @swagger_auto_schema(
        operation_id="api_ads_list",
        operation_summary="List all ads",
        tags=["🚗 Advertisements"],
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="api_ads_create",
        operation_summary="Create a new ad",
        tags=["🚗 Advertisements"],
    )
    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def get_queryset(self):
        """
        Return ads that belong to the current user's account.
        Prefetch related data to optimize database queries.
        Handle unauthenticated users during schema generation.
        """
        # Return empty queryset during schema generation or if user is not authenticated
        if (
            getattr(self, "swagger_fake_view", False)
            or not self.request.user.is_authenticated
        ):
            return CarAd.objects.none()

        from django.db.models import Prefetch, Q

        from apps.ads.models import AddImageModel

        queryset = (
            CarAd.objects.filter(account__user=self.request.user)
            .select_related(
                "account", "account__user", "mark", "moderated_by", "region", "city"
            )
            .prefetch_related(
                Prefetch(
                    "images",
                    queryset=AddImageModel.objects.filter(
                        Q(is_primary=True) | Q(image__isnull=False)
                    ).order_by("-is_primary", "id")[:5],
                    to_attr="prefetched_images",
                ),
                Prefetch("account__contacts", to_attr="account_contacts"),
            )
            .order_by("-created_at")
        )

        # Filter by account if account_id is provided
        account_id = self.request.query_params.get("account_id")
        if account_id is not None:
            queryset = queryset.filter(account_id=account_id)

        return queryset

    def perform_create(self, serializer):
        """
        Create a new ad with the current user's account.
        """
        account = AddsAccount.objects.get(
            pk=serializer.validated_data["account"].id, user=self.request.user
        )
        serializer.save(account=account)


class AdRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating and deleting a specific advertisement.
    """

    permission_classes: list = [IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field: str = "id"

    def get_serializer_class(self):
        """Return the appropriate serializer class based on the request method."""
        if self.request.method == "GET":
            return AdDetailSerializer
        return AddSerializer

    @swagger_auto_schema(
        operation_id="api_ads_read",
        operation_summary="Retrieve a specific ad",
        tags=["🚗 Advertisements"],
    )
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="api_ads_update",
        operation_summary="Update a specific ad (full update)",
        tags=["🚗 Advertisements"],
    )
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="api_ads_partial_update",
        operation_summary="Partially update a specific ad",
        tags=["🚗 Advertisements"],
    )
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id="api_ads_delete",
        operation_summary="Delete a specific ad",
        tags=["🚗 Advertisements"],
    )
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

    def get_queryset(self):
        """
        Return ads that belong to the current user's account.
        Prefetch related data to optimize database queries.
        Handle unauthenticated users during schema generation.
        """
        # Return empty queryset during schema generation or if user is not authenticated
        if (
            getattr(self, "swagger_fake_view", False)
            or not self.request.user.is_authenticated
        ):
            return CarAd.objects.none()

        from django.db.models import Prefetch, Q

        from apps.ads.models import AddImageModel

        queryset = (
            CarAd.objects.filter(account__user=self.request.user)
            .select_related(
                "account", "account__user", "mark", "moderated_by", "region", "city"
            )
            .prefetch_related(
                Prefetch(
                    "images",
                    queryset=AddImageModel.objects.filter(
                        Q(is_primary=True) | Q(image__isnull=False)
                    ).order_by("-is_primary", "id")[:5],
                    to_attr="prefetched_images",
                ),
                Prefetch("account__contacts", to_attr="account_contacts"),
            )
            .order_by("-created_at")
        )

        # Filter by account if account_id is provided
        account_id = self.request.query_params.get("account_id")
        if account_id is not None:
            queryset = queryset.filter(account_id=account_id)

        return queryset


class AdPublishView(APIView):
    """
    View for publishing/unpublishing an ad.
    """

    permission_classes: list = [IsAuthenticated, IsOwnerOrReadOnly]

    @swagger_auto_schema(
        operation_id="api_ads_publish",
        operation_summary="Publish/Unpublish an ad",
        tags=["🚗 Advertisements"],
        responses={
            200: "Ad published/unpublished successfully",
            404: "Ad not found or access denied",
        },
    )
    def post(self, request, ad_id):
        try:
            ad = CarAd.objects.get(id=ad_id, account__user=request.user)
            ad.is_active = not ad.is_active
            ad.save()

            status_msg = "published" if ad.is_active else "unpublished"
            return Response(
                {"detail": f"Ad successfully {status_msg}."}, status=status.HTTP_200_OK
            )
        except CarAd.DoesNotExist:
            return Response(
                {"detail": "Ad not found or you do not have permission to modify it."},
                status=status.HTTP_404_NOT_FOUND,
            )
