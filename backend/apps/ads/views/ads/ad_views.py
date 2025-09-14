"""
Ad-related views using Django REST Framework's generic views.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import AddsAccount
from apps.ads.models.car_ad_model import CarAd
from ...serializers.ads.list_serializer import AdListSerializer
from ...serializers.ads.detail_serializer import AdDetailSerializer
from core.permissions import IsOwnerOrReadOnly
from ...docs.swagger_schemas import (
    ads_list_schema, ads_create_schema, ads_retrieve_schema,
    ads_update_schema, ads_partial_update_schema, ads_delete_schema,
    ads_publish_schema
)


class AdListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating ads.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = AdListSerializer
    
    def get_queryset(self):
        """Return a queryset of ads filtered by the current user's account."""
        # Handle case when user is not authenticated (e.g., during Swagger schema generation)
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()
        return CarAd.objects.filter(account__user=self.request.user)
    
    def perform_create(self, serializer):
        """Set the account to the current user's account when creating an ad."""
        account = AddsAccount.objects.get(user=self.request.user)
        serializer.save(account=account)
    
    @ads_list_schema
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    @ads_create_schema
    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AdRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating and deleting a specific ad.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return a queryset of ads filtered by the current user's account."""
        # Handle case when user is not authenticated (e.g., during Swagger schema generation)
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()
        return CarAd.objects.filter(account__user=self.request.user)
    
    def get_serializer_class(self):
        """Return the appropriate serializer class based on the request method."""
        if self.request.method == 'GET':
            return AdDetailSerializer
        return AdListSerializer
    
    @ads_retrieve_schema
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    @ads_update_schema
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)
    
    @ads_partial_update_schema
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @ads_delete_schema
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class AdPublishView(APIView):
    """
    View for publishing/unpublishing an ad.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    @ads_publish_schema
    def post(self, request, ad_id):
        try:
            ad = CarAd.objects.get(id=ad_id, account__user=request.user)
            ad.is_active = not ad.is_active
            ad.save()
            
            status_msg = 'published' if ad.is_active else 'unpublished'
            return Response(
                {'detail': f'Ad successfully {status_msg}.'},
                status=status.HTTP_200_OK
            )
        except CarAd.DoesNotExist:
            return Response(
                {'detail': 'Ad not found or you do not have permission to modify it.'},
                status=status.HTTP_404_NOT_FOUND
            )
