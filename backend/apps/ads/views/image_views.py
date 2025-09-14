from django.shortcuts import get_object_or_404
from django.db import models
from drf_yasg.utils import swagger_auto_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import logging

from apps.accounts.models import AddsAccount
from ..models.car_ad_model import CarAd
from ..models.image_model import AddImageModel
from ..serializers.ads.image_serializer import AdImageSerializer
from core.permissions import IsOwnerOrSuperUserWrite
from core.services.image_service import ImageService, process_image_async

logger = logging.getLogger(__name__)
# Removed old schema imports - now using @swagger_auto_schema decorators directly


class AddImageListCreateView(generics.ListCreateAPIView):
    """
    List all images for a specific advertisement or upload a new image.
    """
    serializer_class = AdImageSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperUserWrite]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    @swagger_auto_schema(
        operation_summary="List advertisement images",
        operation_description="Get a list of all images for a specific advertisement. Only the ad owner can view their images.",
        tags=['📸 Advertisement Images'],
        responses={
            200: 'List of images retrieved successfully',
            403: 'You do not have permission to view images for this ad',
            404: 'Advertisement not found'
        }
    )
    def get(self, request, *args, **kwargs):
        """
        List all images for a specific advertisement.
        """
        return self.list(request, *args, **kwargs)

    @swagger_auto_schema(
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
        """
        Upload a new image for an advertisement.
        """
        return self.create(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Return images for the specified ad. Superuser can see all, owner sees own.
        """
        ad_id = self.kwargs.get('ad_pk')
        qs = AddImageModel.objects.filter(ad_id=ad_id)
        if not (self.request.user and self.request.user.is_superuser):
            qs = qs.filter(ad__account__user=self.request.user)
        return qs.order_by('order', 'created_at')
    
    def perform_create(self, serializer):
        """
        Save the new image with the specified ad.
        """
        ad_id = self.kwargs.get('ad_pk')
        if self.request.user.is_superuser:
            ad = get_object_or_404(CarAd, pk=ad_id)
        else:
            ad = get_object_or_404(
                CarAd,
                pk=ad_id,
                account__user=self.request.user
            )
        
        # Set the order to be the next available number
        max_order = ad.images.aggregate(
            max_order=models.Max('order')
        )['max_order'] or 0
        
        serializer.save(ad=ad, order=max_order + 1)


class AddImageRetrieveDestroyView(generics.RetrieveDestroyAPIView):
    """
    Retrieve, update or delete a specific advertisement image.
    """
    serializer_class = AdImageSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperUserWrite]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    # Use DRF conventional "pk" in both URL kwarg and lookup to avoid KeyError
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    http_method_names = ['get', 'delete', 'patch']  # Allow GET, DELETE and PATCH

    @swagger_auto_schema(
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
        """
        Retrieve a specific advertisement image.
        """
        return self.retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Update advertisement image",
        operation_description="Partially update image fields (e.g., order, is_primary, caption). Only the ad owner can update their images.",
        tags=['📸 Advertisement Images'],
        responses={
            200: 'Image updated successfully',
            403: 'You do not have permission to update this image',
            404: 'Image not found'
        }
    )
    def patch(self, request, *args, **kwargs):
        """
        Partially update an advertisement image (order, is_primary, caption).
        """
        return self.partial_update(request, *args, **kwargs)

    @swagger_auto_schema(
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
        """
        Delete an advertisement image.
        """
        return self.destroy(request, *args, **kwargs)
    
    # For Swagger documentation: must be False by default; drf_yasg sets it to True only during schema generation
    swagger_fake_view = False
    
    def get_queryset(self):
        """
        Return the image queryset. Superuser sees all images of the ad, owner sees own.
        Handle unauthenticated users during schema generation.
        """
        # Return empty queryset during schema generation or if user is not authenticated
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return AddImageModel.objects.none()

        ad_id = self.kwargs.get('ad_pk')
        qs = AddImageModel.objects.filter(ad_id=ad_id)
        if not self.request.user.is_superuser:
            qs = qs.filter(ad__account__user=self.request.user)
        return qs
    
    def perform_destroy(self, instance):
        """
        Delete the image file from storage and the database record.
        """
        # Delete the image file from storage
        if instance.image:
            instance.image.delete(save=False)
        
        # Delete the database record
        instance.delete()
        
        # Update the order of remaining images
        ad = instance.ad
        for index, image in enumerate(ad.images.order_by('order'), start=1):
            if image.order != index:
                image.order = index
                image.save(update_fields=['order'])
    
    def get_object(self):
        """
        Get the image object and check permissions.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Perform the lookup filtering.
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        
        # Check object permissions
        self.check_object_permissions(self.request, obj)
        
        return obj


# Новые методы с интеграцией ImageService
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_image_with_processing(request, ad_id):
    """
    Загрузка изображения с автоматической обработкой и созданием миниатюр
    """
    try:
        # Проверяем, что объявление принадлежит пользователю
        car_ad = get_object_or_404(CarAd, id=ad_id, user=request.user)

        # Проверяем лимит изображений
        current_images_count = AddImageModel.objects.filter(car_ad=car_ad).count()
        max_images = 10  # Максимум 10 изображений на объявление

        if current_images_count >= max_images:
            return Response({
                'error': f'Максимальное количество изображений: {max_images}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Получаем файл изображения
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({
                'error': 'Файл изображения не найден'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Загружаем изображение через ImageService
        image_service = ImageService()
        upload_result = image_service.upload_image(image_file, folder=f'ads/{ad_id}')

        if not upload_result['success']:
            return Response({
                'error': 'Ошибка загрузки изображения',
                'details': upload_result['errors']
            }, status=status.HTTP_400_BAD_REQUEST)

        # Создаем запись в базе данных
        ad_image = AddImageModel.objects.create(
            car_ad=car_ad,
            image=upload_result['file_path'],
            is_main=(current_images_count == 0),  # Первое изображение - главное
            order=current_images_count
        )

        # Запускаем асинхронную обработку (создание миниатюр)
        process_image_async.delay(upload_result['file_path'])

        logger.info(f"✅ Изображение загружено для объявления {ad_id}: {upload_result['filename']}")

        return Response({
            'success': True,
            'image': {
                'id': ad_image.id,
                'url': ad_image.image.url if ad_image.image else None,
                'is_main': ad_image.is_main,
                'order': ad_image.order
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"❌ Ошибка загрузки изображения: {e}")
        return Response({
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_image_with_cleanup(request, ad_id, image_id):
    """
    Удаление изображения с очисткой файлов и миниатюр
    """
    try:
        # Проверяем, что объявление принадлежит пользователю
        car_ad = get_object_or_404(CarAd, id=ad_id, user=request.user)

        # Находим изображение
        ad_image = get_object_or_404(AddImageModel, id=image_id, car_ad=car_ad)

        # Удаляем файл с диска через ImageService
        if ad_image.image:
            image_service = ImageService()
            image_service.delete_image(ad_image.image.path)

        # Если удаляем главное изображение, назначаем новое главное
        if ad_image.is_main:
            next_image = AddImageModel.objects.filter(
                car_ad=car_ad
            ).exclude(id=image_id).first()

            if next_image:
                next_image.is_main = True
                next_image.save()

        # Удаляем запись из базы данных
        ad_image.delete()

        logger.info(f"✅ Изображение удалено: {image_id}")

        return Response({
            'success': True,
            'message': 'Изображение удалено'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"❌ Ошибка удаления изображения: {e}")
        return Response({
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
