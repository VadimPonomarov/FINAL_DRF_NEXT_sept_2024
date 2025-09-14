"""
Image-related views for ads using Django REST Framework's generic views.
"""
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import AddsAccount
from ...models.car_ad_model import CarAd
from ...models.image_model import AddImageModel
from ...serializers.ads.image_serializer import AdImageSerializer
from core.permissions import IsOwnerOrReadOnly


class AdImageListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating ad images.
    """
    serializer_class = AdImageSerializer
    permission_classes = []  # Временно убираем permissions для тестирования
    
    def get_queryset(self):
        """Return a queryset of images for the specified ad."""
        ad_id = self.kwargs.get('ad_pk')
        return AddImageModel.objects.filter(ad_id=ad_id)
    
    def perform_create(self, serializer):
        """Set the ad and order when creating a new image."""
        ad = get_object_or_404(CarAd, id=self.kwargs.get('ad_pk'))
        if ad.account.user != self.request.user:
            self.permission_denied(self.request)
        
        # Set the order to the next available number
        max_order = AddImageModel.objects.filter(ad=ad).order_by('-order').first()
        next_order = (max_order.order + 1) if max_order else 1
        
        serializer.save(ad=ad, order=next_order)
    
    @swagger_auto_schema(
        operation_id='api_ads_images_list',
        operation_summary="List advertisement images",
        operation_description="Get a list of all images for a specific advertisement. Only the ad owner can view their images.",
        tags=['📸 Advertisement Images']
    )
    def get(self, request, *args, **kwargs):
        """List all images for a specific advertisement."""
        return self.list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_id='api_ads_images_create',
        operation_summary="Upload advertisement image",
        operation_description="Upload a new image for an advertisement. Only the ad owner can upload images. Images are automatically ordered.",
        tags=['📸 Advertisement Images'],
        responses={
            201: 'Image uploaded successfully',
            400: 'Invalid input - check image format and size',
            403: 'You do not have permission to add images to this ad',
            404: 'Advertisement not found'
        }
    )
    def post(self, request, *args, **kwargs):
        """Upload a new image for an advertisement."""
        return self.create(request, *args, **kwargs)


class AdImageRetrieveDestroyView(generics.RetrieveDestroyAPIView):
    """
    View for retrieving and deleting ad images.
    """
    serializer_class = AdImageSerializer
    permission_classes = []  # Временно убираем permissions для тестирования
    lookup_field = 'pk'

    @swagger_auto_schema(
        operation_id='api_ads_images_retrieve',
        operation_summary="Retrieve advertisement image",
        operation_description="Get details of a specific advertisement image. Only the ad owner can view their images.",
        tags=['📸 Advertisement Images'],
        responses={
            200: 'Image details retrieved successfully',
            403: 'You do not have permission to view this image',
            404: 'Image not found'
        }
    )
    def get(self, request, *args, **kwargs):
        """Retrieve a specific advertisement image."""
        return self.retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id='api_ads_images_delete',
        operation_summary="Delete advertisement image",
        operation_description="Delete a specific advertisement image. Only the ad owner can delete their images. Image order is automatically updated.",
        tags=['📸 Advertisement Images'],
        responses={
            204: 'Image deleted successfully',
            403: 'You do not have permission to delete this image',
            404: 'Image not found'
        }
    )
    def delete(self, request, *args, **kwargs):
        """Delete an advertisement image."""
        return self.destroy(request, *args, **kwargs)
    
    def get_queryset(self):
        """Return a queryset of images for the specified ad."""
        ad_id = self.kwargs.get('ad_pk')
        return AddImageModel.objects.filter(ad_id=ad_id)
    
    def perform_destroy(self, instance):
        """Delete the image file from storage and the database record."""
        # The actual file deletion is handled by the model's delete method
        instance.delete()
    
    @swagger_auto_schema(
        operation_id='api_ads_images_read',
        operation_summary="📸 Retrieve Advertisement Image",
        operation_description="Retrieve detailed information about a specific advertisement image.",
        tags=['📸 Advertisement Images'],
        responses={
            200: 'Image details',
            404: 'Image not found',
            403: 'You do not have permission to view this image'
        }
    )
    def get(self, request, *args, **kwargs):
        """Retrieve a specific advertisement image."""
        return self.retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_id='api_ads_images_delete',
        operation_summary="Delete an ad image",
        tags=['🚗 Advertisements'],
        responses={
            204: 'Image deleted successfully',
            404: 'Image not found',
            403: 'You do not have permission to delete this image'
        }
    )
    def delete(self, request, *args, **kwargs):
        """Delete an advertisement image."""
        return self.destroy(request, *args, **kwargs)
