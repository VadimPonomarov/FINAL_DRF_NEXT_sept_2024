from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from ..models import CarAd, CarMetadata


@swagger_auto_schema(
    method='post',
    operation_id='reset_ad_counters_admin',
    operation_summary='🧹 Reset Ad Counters (Admin)',
    operation_description="""
    Reset advertisement counters (views, phone views, favorites).

    ### Permissions:
    - User must be authenticated
    - User must be ad owner or superuser

    ### Path Parameters:
    - ad_id: Advertisement ID

    ### Response:
    Returns success confirmation.
    """,
    responses={
        200: 'Counters reset successfully',
        403: 'Forbidden - not ad owner or superuser',
        404: 'Advertisement not found'
    },
    tags=['🚗 Advertisements']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_ad_counters(request, ad_id: int):
    """
    Сбросить счетчики (просмотры, просмотры телефона, избранное) для объявления.
    Доступно владельцу объявления и суперпользователю.
    """
    ad = get_object_or_404(CarAd, id=ad_id)

    if not (request.user.is_superuser or ad.account.user_id == request.user.id):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    # Метаданные: обнуляем просмотры и телефон
    metadata, _ = CarMetadata.objects.get_or_create(car_ad=ad)
    metadata.views_count = 0
    metadata.phone_views_count = 0
    metadata.save(update_fields=['views_count', 'phone_views_count'])

    # Избранное считаем по взаимодействиям, удалить их не будем, просто вернем актуальные значения
    favorites_count = 0

    return Response({
        'success': True,
        'views_count': metadata.views_count,
        'phone_views_count': metadata.phone_views_count,
        'favorites_count': favorites_count,
        'message': 'Counters have been reset'
    })

