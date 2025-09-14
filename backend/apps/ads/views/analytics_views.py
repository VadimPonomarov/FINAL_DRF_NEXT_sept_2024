"""
API для аналитики и отслеживания событий
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from ..models import CarAd, AdInteraction, VisitorSession
from ..models.car_metadata_model import CarMetadataModel


def get_client_ip(request):
    """Получить IP адрес клиента"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_or_create_session(request):
    """Получить или создать сессию посетителя"""
    session_key = request.session.session_key
    if not session_key:
        request.session.create()
        session_key = request.session.session_key
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    session, created = VisitorSession.objects.get_or_create(
        session_key=session_key,
        defaults={
            'ip_address': ip_address,
            'user_agent': user_agent,
            'user': request.user if request.user.is_authenticated else None,
        }
    )
    
    # Обновляем последнюю активность
    session.last_activity = timezone.now()
    session.save(update_fields=['last_activity'])
    
    return session


@swagger_auto_schema(
    method='post',
    operation_description="Отследить просмотр телефона",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='ID объявления'),
        },
        required=['ad_id']
    ),
    responses={
        200: openapi.Response(
            description="Событие записано",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'phone_views_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'message': openapi.Schema(type=openapi.TYPE_STRING),
                }
            )
        ),
        404: openapi.Response(description="Объявление не найдено"),
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def track_phone_view(request):
    """
    Отследить просмотр телефона
    """
    ad_id = request.data.get('ad_id')
    
    if not ad_id:
        return Response(
            {'error': 'ad_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        car_ad = get_object_or_404(CarAd, id=ad_id)
        session = get_or_create_session(request)
        
        with transaction.atomic():
            # Создаем запись о взаимодействии
            interaction = AdInteraction.objects.create(
                session=session,
                user=request.user if request.user.is_authenticated else None,
                ad=car_ad,
                interaction_type='phone_reveal',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=request.META.get('HTTP_REFERER', ''),
                additional_data={
                    'timestamp': timezone.now().isoformat(),
                    'user_authenticated': request.user.is_authenticated,
                }
            )
            
            # Обновляем счетчик в метаданных
            metadata, created = CarMetadataModel.objects.get_or_create(
                car_ad=car_ad,
                defaults={
                    'views_count': 0,
                    'phone_views_count': 1,
                    'is_active': True,
                    'is_verified': False,
                    'is_vip': False,
                    'is_premium': False,
                    'is_highlighted': False,
                    'is_urgent': False,
                    'refreshed_at': timezone.now(),
                    'expires_at': timezone.now() + timezone.timedelta(days=30),
                }
            )
            
            if not created:
                metadata.phone_views_count += 1
                metadata.save(update_fields=['phone_views_count'])
        
        print(f"[Analytics] Phone view tracked for ad {ad_id}, total views: {metadata.phone_views_count}")
        
        return Response({
            'success': True,
            'phone_views_count': metadata.phone_views_count,
            'message': 'Phone view tracked successfully'
        })
        
    except Exception as e:
        print(f"[Analytics] Error tracking phone view for ad {ad_id}: {str(e)}")
        return Response(
            {'error': 'Failed to track phone view'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@swagger_auto_schema(
    method='post',
    operation_description="Отследить добавление/удаление из избранного",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='ID объявления'),
            'action': openapi.Schema(type=openapi.TYPE_STRING, description='add или remove'),
        },
        required=['ad_id', 'action']
    ),
    responses={
        200: openapi.Response(
            description="Событие записано",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'favorites_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'message': openapi.Schema(type=openapi.TYPE_STRING),
                }
            )
        ),
        404: openapi.Response(description="Объявление не найдено"),
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def track_favorite_action(request):
    """
    Отследить добавление/удаление из избранного
    """
    ad_id = request.data.get('ad_id')
    action = request.data.get('action')  # 'add' или 'remove'
    
    if not ad_id or not action:
        return Response(
            {'error': 'ad_id and action are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if action not in ['add', 'remove']:
        return Response(
            {'error': 'action must be "add" or "remove"'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        car_ad = get_object_or_404(CarAd, id=ad_id)
        session = get_or_create_session(request)
        
        with transaction.atomic():
            # Создаем запись о взаимодействии
            interaction_type = 'favorite_add' if action == 'add' else 'favorite_remove'
            
            interaction = AdInteraction.objects.create(
                session=session,
                user=request.user if request.user.is_authenticated else None,
                ad=car_ad,
                interaction_type=interaction_type,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=request.META.get('HTTP_REFERER', ''),
                additional_data={
                    'timestamp': timezone.now().isoformat(),
                    'action': action,
                    'user_authenticated': request.user.is_authenticated,
                }
            )
            
            # Подсчитываем общее количество добавлений в избранное для этого объявления
            favorites_count = AdInteraction.objects.filter(
                ad=car_ad,
                interaction_type='favorite_add'
            ).count()
            
            # Вычитаем количество удалений
            unfavorites_count = AdInteraction.objects.filter(
                ad=car_ad,
                interaction_type='favorite_remove'
            ).count()
            
            total_favorites = max(0, favorites_count - unfavorites_count)
        
        print(f"[Analytics] Favorite {action} tracked for ad {ad_id}, total favorites: {total_favorites}")
        
        return Response({
            'success': True,
            'favorites_count': total_favorites,
            'message': f'Favorite {action} tracked successfully'
        })
        
    except Exception as e:
        print(f"[Analytics] Error tracking favorite {action} for ad {ad_id}: {str(e)}")
        return Response(
            {'error': 'Failed to track favorite action'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@swagger_auto_schema(
    method='get',
    operation_description="Получить счетчики для объявления",
    responses={
        200: openapi.Response(
            description="Счетчики объявления",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'phone_views_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'favorites_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                    'views_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                }
            )
        ),
        404: openapi.Response(description="Объявление не найдено"),
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_ad_counters(request, ad_id):
    """
    Получить счетчики для объявления
    """
    try:
        car_ad = get_object_or_404(CarAd, id=ad_id)
        
        # Получаем метаданные
        try:
            metadata = car_ad.metadata
            phone_views_count = metadata.phone_views_count
            views_count = metadata.views_count
        except CarMetadataModel.DoesNotExist:
            phone_views_count = 0
            views_count = 0
        
        # Подсчитываем избранное из взаимодействий
        favorites_count = AdInteraction.objects.filter(
            ad=car_ad,
            interaction_type='favorite_add'
        ).count()
        
        unfavorites_count = AdInteraction.objects.filter(
            ad=car_ad,
            interaction_type='favorite_remove'
        ).count()
        
        total_favorites = max(0, favorites_count - unfavorites_count)
        
        return Response({
            'phone_views_count': phone_views_count,
            'favorites_count': total_favorites,
            'views_count': views_count,
        })
        
    except Exception as e:
        print(f"[Analytics] Error getting counters for ad {ad_id}: {str(e)}")
        return Response(
            {'error': 'Failed to get ad counters'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
