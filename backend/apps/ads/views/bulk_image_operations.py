"""
Bulk операции с изображениями объявлений
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import logging

from apps.ads.models import CarAd, AddImageModel

logger = logging.getLogger(__name__)


@swagger_auto_schema(
    method='delete',
    operation_summary="🗑️ Bulk Delete Images",
    operation_description="Массовое удаление изображений из объявления",
    tags=['🖼️ Image Management'],
    manual_parameters=[
        openapi.Parameter(
            'ad_id',
            openapi.IN_PATH,
            description="ID объявления",
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'image_ids': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(type=openapi.TYPE_INTEGER),
                description='Список ID изображений для удаления',
                example=[1, 2, 3]
            ),
            'delete_all': openapi.Schema(
                type=openapi.TYPE_BOOLEAN,
                default=False,
                description='Удалить все изображения объявления'
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Images deleted successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'deleted_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'remaining_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'message': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )
        ),
        400: openapi.Response(description='Bad request'),
        403: openapi.Response(description='Permission denied'),
        404: openapi.Response(description='Ad not found')
    }
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def bulk_delete_images(request, ad_id):
    """
    Массовое удаление изображений из объявления
    """
    try:
        # Проверяем существование объявления
        try:
            car_ad = CarAd.objects.get(id=ad_id)
        except CarAd.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Ad not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Проверяем права пользователя
        if car_ad.account.user != request.user:
            return Response({
                'success': False,
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        image_ids = data.get('image_ids', [])
        delete_all = data.get('delete_all', False)
        
        logger.info(f"🗑️ Bulk delete request for ad {ad_id}: delete_all={delete_all}, image_ids={image_ids}")
        
        # Получаем изображения для удаления
        if delete_all:
            # Удаляем все изображения
            images_to_delete = AddImageModel.objects.filter(ad=car_ad)
            operation_type = "all images"
        elif image_ids:
            # Удаляем конкретные изображения
            images_to_delete = AddImageModel.objects.filter(ad=car_ad, id__in=image_ids)
            operation_type = f"{len(image_ids)} specific images"
        else:
            return Response({
                'success': False,
                'error': 'Either image_ids or delete_all must be specified'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Подсчитываем количество до удаления
        total_before = AddImageModel.objects.filter(ad=car_ad).count()
        to_delete_count = images_to_delete.count()
        
        if to_delete_count == 0:
            return Response({
                'success': True,
                'deleted_count': 0,
                'remaining_count': total_before,
                'message': 'No images found to delete'
            })
        
        # Выполняем удаление
        deleted_count, _ = images_to_delete.delete()
        remaining_count = AddImageModel.objects.filter(ad=car_ad).count()
        
        logger.info(f"🗑️ Successfully deleted {deleted_count} images from ad {ad_id}")
        
        return Response({
            'success': True,
            'deleted_count': deleted_count,
            'remaining_count': remaining_count,
            'message': f'Successfully deleted {operation_type}',
            'ad_id': ad_id
        })
        
    except Exception as e:
        logger.error(f"❌ Error in bulk_delete_images: {str(e)}")
        return Response({
            'success': False,
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_summary="🔄 Replace All Images",
    operation_description="Заменить все изображения объявления новыми сгенерированными",
    tags=['🖼️ Image Management'],
    manual_parameters=[
        openapi.Parameter(
            'ad_id',
            openapi.IN_PATH,
            description="ID объявления",
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['car_data'],
        properties={
            'car_data': openapi.Schema(
                type=openapi.TYPE_OBJECT,
                required=['brand', 'model', 'year'],
                properties={
                    'brand': openapi.Schema(type=openapi.TYPE_STRING, example='BMW'),
                    'model': openapi.Schema(type=openapi.TYPE_STRING, example='X5'),
                    'year': openapi.Schema(type=openapi.TYPE_INTEGER, example=2020),
                    'color': openapi.Schema(type=openapi.TYPE_STRING, example='black'),
                    'body_type': openapi.Schema(type=openapi.TYPE_STRING, example='suv')
                }
            ),
            'angles': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(type=openapi.TYPE_STRING),
                default=['front', 'side', 'rear', 'interior'],
                example=['front', 'side', 'rear', 'interior']
            ),
            'style': openapi.Schema(
                type=openapi.TYPE_STRING,
                default='realistic',
                example='realistic'
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Images replaced successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'deleted_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'generated_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'saved_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'message': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )
        ),
        400: openapi.Response(description='Bad request'),
        403: openapi.Response(description='Permission denied'),
        404: openapi.Response(description='Ad not found')
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def replace_all_images(request, ad_id):
    """
    Заменить все изображения объявления новыми сгенерированными
    Это удобный endpoint, который объединяет удаление старых и создание новых изображений
    """
    try:
        # Проверяем существование объявления
        try:
            car_ad = CarAd.objects.get(id=ad_id)
        except CarAd.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Ad not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Проверяем права пользователя
        if car_ad.account.user != request.user:
            return Response({
                'success': False,
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        car_data = data.get('car_data', {})
        angles = data.get('angles', ['front', 'side', 'rear', 'interior'])
        style = data.get('style', 'realistic')
        
        # Валидация обязательных полей
        required_fields = ['brand', 'model', 'year']
        for field in required_fields:
            if not car_data.get(field):
                return Response({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"🔄 Replace all images for ad {ad_id} with {len(angles)} new images")
        
        # Используем существующий endpoint генерации с флагом replace_existing=True
        from apps.chat.views.image_generation_views import generate_car_images
        
        # Подготавливаем данные для генератора
        generation_request_data = {
            'car_data': car_data,
            'angles': angles,
            'style': style,
            'ad_id': ad_id,
            'save_to_db': True,
            'replace_existing': True
        }
        
        # Создаем временный request объект для передачи в generate_car_images
        from django.http import HttpRequest
        from rest_framework.request import Request
        
        temp_request = Request(HttpRequest())
        temp_request.user = request.user
        temp_request._full_data = generation_request_data
        
        # Вызываем функцию генерации
        generation_response = generate_car_images(temp_request)
        
        if generation_response.status_code == 200:
            result_data = generation_response.data
            
            return Response({
                'success': True,
                'deleted_count': result_data.get('deleted_existing', 0),
                'generated_count': result_data.get('total_generated', 0),
                'saved_count': result_data.get('saved_to_db', 0),
                'message': f'Successfully replaced all images with {result_data.get("saved_to_db", 0)} new ones',
                'ad_id': ad_id
            })
        else:
            return Response({
                'success': False,
                'error': 'Failed to generate new images'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"❌ Error in replace_all_images: {str(e)}")
        return Response({
            'success': False,
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
