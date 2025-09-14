"""
API для работы с избранными объявлениями
"""

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.utils import timezone
from django.db import transaction

from ..models import CarAd
from ..models.analytics_models import AdInteraction, VisitorSession
from ..serializers.cars.ad_serializer import CarAdListSerializer
from ..filters import CarAdFilter


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
    operation_summary="❤️ Toggle Favorite Status",
    operation_description="Добавить или удалить объявление из избранного. Переключает статус избранного для указанного объявления.",
    tags=['❤️ Favorites'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['car_ad_id'],
        properties={
            'car_ad_id': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='ID объявления для переключения статуса избранного',
                example=1
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Статус избранного успешно переключен',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'is_favorite': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Новый статус избранного'),
                    'message': openapi.Schema(type=openapi.TYPE_STRING, description='Сообщение о результате операции'),
                    'car_ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='ID объявления')
                }
            )
        ),
        400: openapi.Response(description='car_ad_id is required'),
        401: openapi.Response(description='Authentication required'),
        404: openapi.Response(description='Объявление не найдено')
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite(request):
    """
    Переключить статус избранного для объявления
    """
    car_ad_id = request.data.get('car_ad_id')

    if not car_ad_id:
        return Response(
            {'error': 'car_ad_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Проверяем, что объявление существует
    car_ad = get_object_or_404(CarAd, id=car_ad_id)
    user = request.user

    # Используем персональную модель FavoriteAd вместо глобального поля
    from ..models.favorite_ad_model import FavoriteAd

    # Проверяем текущий статус для этого пользователя
    favorite_exists = FavoriteAd.objects.filter(user=user, car_ad=car_ad).exists()

    with transaction.atomic():
        if favorite_exists:
            # Удаляем из избранного
            FavoriteAd.objects.filter(user=user, car_ad=car_ad).delete()
            new_favorite_status = False
        else:
            # Добавляем в избранное
            FavoriteAd.objects.create(user=user, car_ad=car_ad)
            new_favorite_status = True

        # Записываем событие в аналитику
        try:
            session = get_or_create_session(request)
            interaction_type = 'favorite_add' if new_favorite_status else 'favorite_remove'

            AdInteraction.objects.create(
                session=session,
                user=user,
                ad=car_ad,
                interaction_type=interaction_type,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=request.META.get('HTTP_REFERER', ''),
                additional_data={
                    'timestamp': timezone.now().isoformat(),
                    'action': 'add' if new_favorite_status else 'remove',
                    'user_authenticated': True,
                }
            )
        except Exception as e:
            print(f"[Favorites] Error recording interaction: {str(e)}")

    # Подсчитываем общее количество пользователей, у которых это объявление в избранном
    total_favorites = FavoriteAd.objects.filter(car_ad=car_ad).count()

    message = 'Добавлено в избранное' if new_favorite_status else 'Удалено из избранного'

    print(f"[Favorites] User {user.id} toggled favorite for ad {car_ad_id}: {favorite_exists} → {new_favorite_status}, total favorites: {total_favorites}")

    return Response({
        'is_favorite': new_favorite_status,
        'favorites_count': total_favorites,
        'message': message,
        'car_ad_id': car_ad_id
    })


@swagger_auto_schema(
    method='get',
    operation_summary="❤️ Check Favorite Status",
    operation_description="Проверить, находится ли указанное объявление в избранном у текущего пользователя.",
    tags=['❤️ Favorites'],
    manual_parameters=[
        openapi.Parameter(
            'car_ad_id',
            openapi.IN_PATH,
            description='ID объявления для проверки',
            type=openapi.TYPE_INTEGER,
            required=True
        )
    ],
    responses={
        200: openapi.Response(
            description='Статус избранного получен',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'is_favorite': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Находится ли в избранном'),
                    'car_ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='ID объявления')
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        404: openapi.Response(description='Объявление не найдено')
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_favorite(request, car_ad_id):
    """
    Проверить, находится ли объявление в избранном
    """
    try:
        car_ad = CarAd.objects.get(id=car_ad_id)
        user = request.user

        # Проверяем персональный статус избранного для этого пользователя
        from ..models.favorite_ad_model import FavoriteAd
        is_favorite = FavoriteAd.objects.filter(user=user, car_ad=car_ad).exists()

        print(f"[Favorites] User {user.id} checking favorite for ad {car_ad_id}: {is_favorite}")

    except CarAd.DoesNotExist:
        is_favorite = False

    return Response({
        'is_favorite': is_favorite,
        'car_ad_id': car_ad_id
    })


class FavoritesListView(generics.ListAPIView):
    """
    Получить список избранных объявлений
    """
    serializer_class = CarAdListSerializer
    permission_classes = [IsAuthenticated]

    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarAdFilter
    search_fields = ['title', 'description', 'model']
    ordering_fields = ['created_at', 'updated_at', 'price', 'title']
    ordering = ['-created_at']

    @swagger_auto_schema(
        operation_summary="❤️ Get Favorite Ads",
        operation_description="Получить список избранных объявлений текущего пользователя с возможностью фильтрации и поиска.",
        tags=['❤️ Favorites'],
        responses={
            200: openapi.Response(
                description='Список избранных объявлений',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'count': openapi.Schema(type=openapi.TYPE_INTEGER, description='Общее количество избранных'),
                        'next': openapi.Schema(type=openapi.TYPE_STRING, description='Ссылка на следующую страницу'),
                        'previous': openapi.Schema(type=openapi.TYPE_STRING, description='Ссылка на предыдущую страницу'),
                        'results': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT))
                    }
                )
            ),
            401: openapi.Response(description='Authentication required')
        }
    )
    def get(self, request, *args, **kwargs):
        """Переопределяем get для обработки ошибок"""
        try:
            return self.list(request, *args, **kwargs)
        except Exception as e:
            print(f"[Favorites] Error in get: {e}")
            # Возвращаем пустой список в случае ошибки
            return Response({
                'count': 0,
                'next': None,
                'previous': None,
                'results': []
            })

    def get_queryset(self):
        """
        Возвращает избранные объявления текущего пользователя через связь FavoriteAd
        """
        try:
            user = self.request.user
            print(f"[Favorites] Getting favorites for user {user.id}")

            from ..models.favorite_ad_model import FavoriteAd
            favorite_ids = FavoriteAd.objects.filter(user=user).values_list('car_ad_id', flat=True)

            qs = CarAd.objects.filter(id__in=favorite_ids).order_by('-created_at')
            print(f"[Favorites] User {user.id} favorites count: {qs.count()}")
            return qs

        except Exception as e:
            print(f"[Favorites] Error in get_queryset: {e}")
            # В случае ошибки возвращаем пустой queryset
            return CarAd.objects.none()
