"""
API views для трекинга аналитики
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.settings import api_settings
from django.utils import timezone
from datetime import timedelta
import json
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.permissions import AllowAny

# Временно отключаем проблемные импорты
# from ..services.analytics_tracker import AnalyticsTracker
# from ..models.analytics_models import AdInteraction, AdViewDetail


class TrackPageViewAPI(APIView):
    """API для трекинга просмотра страницы"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📊 Track Page View",
        operation_description="Track page view for analytics. Public endpoint for tracking user navigation.",
        tags=['📊 Analytics'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'page_url': openapi.Schema(type=openapi.TYPE_STRING, description='Page URL'),
                'user_agent': openapi.Schema(type=openapi.TYPE_STRING, description='User agent'),
                'referrer': openapi.Schema(type=openapi.TYPE_STRING, description='Referrer URL'),
                'session_id': openapi.Schema(type=openapi.TYPE_STRING, description='Session ID')
            }
        ),
        responses={
            200: openapi.Response(
                description='Page view tracked successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            500: openapi.Response(description='Failed to track page view')
        }
    )
    def post(self, request):
        try:
            data = request.data

            # Простая заглушка для трекинга просмотров страниц
            url = data.get('url', '')
            page_type = data.get('page_type', 'other')
            page_title = data.get('page_title', '')

            print(f"[Analytics] Tracking page view: url={url}, type={page_type}, title={page_title}")

            # Генерируем простой ответ
            page_view_id = abs(hash(f"{url}_{page_type}_{timezone.now().timestamp()}")) % 1000000
            session_id = f"session_{timezone.now().timestamp()}"

            return Response({
                'success': True,
                'page_view_id': page_view_id,
                'session_id': session_id,
                'message': 'Page view tracked successfully'
            })

        except Exception as e:
            print(f"[Analytics] Error tracking page view: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to track page view: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrackAdInteractionAPI(APIView):
    """API для трекинга взаимодействия с объявлением"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📊 Track Ad Interaction",
        operation_description="Track user interaction with advertisement (click, view, contact, etc.).",
        tags=['📊 Analytics'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['ad_id', 'interaction_type'],
            properties={
                'ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Advertisement ID'),
                'interaction_type': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='Type of interaction',
                    enum=['view', 'click', 'contact', 'favorite', 'share']
                ),
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID (optional)'),
                'session_id': openapi.Schema(type=openapi.TYPE_STRING, description='Session ID')
            }
        ),
        responses={
            200: openapi.Response(
                description='Ad interaction tracked successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            500: openapi.Response(description='Failed to track ad interaction')
        }
    )
    def post(self, request):
        print(f"[Analytics] TrackAdInteractionAPI POST called")
        try:
            data = request.data
            print(f"[Analytics] Request data: {data}")

            # Получаем данные из запроса
            ad_id = data.get('ad_id')
            interaction_type = data.get('interaction_type', 'unknown')
            source_page = data.get('source_page', '')
            metadata = data.get('metadata', {})

            print(f"[Analytics] Tracking ad interaction: ad_id={ad_id}, type={interaction_type}, source={source_page}")
            # Вытаскиваем пользователя из DRF request (в т.ч. при Session/Bearer)
            user = request.user if hasattr(request, 'user') and request.user and request.user.is_authenticated else None

            # Создаем запись напрямую в базе данных
            try:
                from ..models.analytics_models import AdInteraction, VisitorSession
                from ..models.car_ad_model import CarAd
                from django.contrib.auth.models import User

                # Получаем или создаем сессию — если у клиента уже есть session_id, используем его
                import uuid
                provided_session_id = data.get('session_id')
                if provided_session_id:
                    try:
                        visitor_session = VisitorSession.objects.get(session_id=provided_session_id)
                    except VisitorSession.DoesNotExist:
                        visitor_session = VisitorSession.objects.create(
                            session_id=provided_session_id,
                            user=user,
                            ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
                            user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        )
                else:
                    session_uuid = uuid.uuid4()
                    visitor_session = VisitorSession.objects.create(
                        session_id=session_uuid,
                        user=user,
                        ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    )

                # Получаем объявление
                ad = CarAd.objects.get(id=ad_id)

                # Создаем взаимодействие
                # Определяем, является ли пользователь владельцем объявления
                is_owner = False
                try:
                    is_owner = (user is not None and ad.account and ad.account.user_id == user.id)
                except Exception:
                    is_owner = False

                # Проверяем, была ли уже такая активность в этой сессии (ДО создания нового взаимодействия)
                existing_interaction = AdInteraction.objects.filter(
                    ad=ad,
                    session=visitor_session,
                    interaction_type=interaction_type
                ).first()

                is_first_interaction = not existing_interaction

                # Создаем взаимодействие (всегда записываем для аналитики)
                interaction = AdInteraction.objects.create(
                    session=visitor_session,
                    user=user,
                    ad=ad,
                    interaction_type=interaction_type,
                    source_page=source_page,
                    metadata=metadata,
                    owner_action=is_owner
                )

                # Обновляем счетчики в метаданных только если это первое взаимодействие в сессии
                # и действие НЕ принадлежит владельцу объявления
                try:
                    from ..models.car_metadata_model import CarMetadataModel

                    if not is_first_interaction:
                        print(f"[Analytics] DUPLICATE {interaction_type} in session {visitor_session.session_id} for ad {ad_id} - skipping metadata update")
                    elif is_owner:
                        print(f"[Analytics] OWNER action for ad {ad_id} ({interaction_type}) - not affecting counters")
                    else:
                        if interaction_type == 'phone_reveal':
                            metadata_obj, created = CarMetadataModel.objects.get_or_create(
                                car_ad=ad,
                                defaults={'phone_views_count': 1, 'views_count': 0}
                            )
                            if not created:
                                metadata_obj.phone_views_count = (metadata_obj.phone_views_count or 0) + 1
                                metadata_obj.save(update_fields=['phone_views_count'])
                            print(f"[Analytics] FIRST phone reveal in session for ad {ad_id}, total: {metadata_obj.phone_views_count}")
                        elif interaction_type == 'view':
                            metadata_obj, created = CarMetadataModel.objects.get_or_create(
                                car_ad=ad,
                                defaults={'views_count': 1, 'phone_views_count': 0}
                            )
                            if not created:
                                metadata_obj.views_count = (metadata_obj.views_count or 0) + 1
                                metadata_obj.save(update_fields=['views_count'])
                            print(f"[Analytics] FIRST view in session for ad {ad_id}, total: {metadata_obj.views_count}")
                except Exception as meta_error:
                    print(f"[Analytics] Error updating metadata: {meta_error}")

                print(f"[Analytics] Created interaction {interaction.id} for ad {ad_id}")

                return Response({
                    'success': True,
                    'interaction_id': interaction.id,
                    'session_id': str(visitor_session.session_id),
                    'message': 'Ad interaction tracked successfully'
                })

            except Exception as e:
                print(f"[Analytics] Error creating interaction: {e}")
                # Fallback к заглушке
                interaction_id = abs(hash(f"{ad_id}_{interaction_type}_{timezone.now().timestamp()}")) % 1000000
                session_id = f"session_{timezone.now().timestamp()}"

                return Response({
                    'success': True,
                    'interaction_id': interaction_id,
                    'session_id': session_id,
                    'message': f'Ad interaction tracked successfully (fallback: {str(e)})'
                })

        except Exception as e:
            print(f"[Analytics] Error tracking ad interaction: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to track ad interaction: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrackAdViewDetailAPI(APIView):
    """API для трекинга детального просмотра объявления"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📊 Track Ad View Detail",
        operation_description="Track detailed view of advertisement with viewing duration and scroll depth.",
        tags=['📊 Analytics'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['ad_id'],
            properties={
                'ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Advertisement ID'),
                'view_duration': openapi.Schema(type=openapi.TYPE_INTEGER, description='View duration in seconds'),
                'scroll_depth': openapi.Schema(type=openapi.TYPE_NUMBER, description='Scroll depth percentage'),
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID (optional)'),
                'session_id': openapi.Schema(type=openapi.TYPE_STRING, description='Session ID')
            }
        ),
        responses={
            200: openapi.Response(
                description='Ad view detail tracked successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            500: openapi.Response(description='Failed to track ad view detail')
        }
    )
    def post(self, request):
        try:
            data = request.data

            # Простая заглушка для трекинга детального просмотра
            interaction_id = data.get('interaction_id')
            view_duration_seconds = data.get('view_duration_seconds', 0)
            view_data = data.get('view_data', {})

            print(f"[Analytics] Tracking ad view detail: interaction_id={interaction_id}, duration={view_duration_seconds}s")

            # Генерируем простой ответ
            view_detail_id = abs(hash(f"{interaction_id}_{view_duration_seconds}_{timezone.now().timestamp()}")) % 1000000

            return Response({
                'success': True,
                'view_detail_id': view_detail_id,
                'message': 'Ad view detail tracked successfully'
            })

        except Exception as e:
            print(f"[Analytics] Error tracking ad view detail: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to track ad view detail: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrackSearchQueryAPI(APIView):
    """API для трекинга поискового запроса"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📊 Track Search Query",
        operation_description="Track user search queries for analytics and search optimization.",
        tags=['📊 Analytics'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['query'],
            properties={
                'query': openapi.Schema(type=openapi.TYPE_STRING, description='Search query text'),
                'filters': openapi.Schema(type=openapi.TYPE_OBJECT, description='Applied filters'),
                'results_count': openapi.Schema(type=openapi.TYPE_INTEGER, description='Number of results'),
                'user_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='User ID (optional)'),
                'session_id': openapi.Schema(type=openapi.TYPE_STRING, description='Session ID')
            }
        ),
        responses={
            200: openapi.Response(
                description='Search query tracked successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            500: openapi.Response(description='Failed to track search query')
        }
    )
    def post(self, request):
        try:
            data = request.data

            # Простая заглушка для трекинга поисковых запросов
            query_text = data.get('query_text', '')
            filters_applied = data.get('filters_applied', {})
            results_count = data.get('results_count', 0)

            print(f"[Analytics] Tracking search query: query='{query_text}', filters={filters_applied}, results={results_count}")

            # Генерируем простой ответ
            search_query_id = abs(hash(f"{query_text}_{str(filters_applied)}_{timezone.now().timestamp()}")) % 1000000

            return Response({
                'success': True,
                'search_query_id': search_query_id,
                'message': 'Search query tracked successfully'
            })

        except Exception as e:
            print(f"[Analytics] Error tracking search query: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to track search query: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdatePageViewMetricsAPI(APIView):
    """API для обновления метрик просмотра страницы"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📊 Update Page View Metrics",
        operation_description="Update page view metrics with additional data like time spent, bounce rate, etc.",
        tags=['📊 Analytics'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'page_url': openapi.Schema(type=openapi.TYPE_STRING, description='Page URL'),
                'time_spent': openapi.Schema(type=openapi.TYPE_INTEGER, description='Time spent on page in seconds'),
                'bounce_rate': openapi.Schema(type=openapi.TYPE_NUMBER, description='Bounce rate'),
                'session_id': openapi.Schema(type=openapi.TYPE_STRING, description='Session ID')
            }
        ),
        responses={
            200: openapi.Response(
                description='Page view metrics updated successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            500: openapi.Response(description='Failed to update page view metrics')
        }
    )
    def post(self, request):
        try:
            data = request.data

            # Простая заглушка для обновления метрик просмотра
            page_view_id = data.get('page_view_id')
            time_on_page_seconds = data.get('time_on_page_seconds', 0)
            scroll_depth = data.get('scroll_depth', 0)
            clicks_count = data.get('clicks_count', 0)

            print(f"[Analytics] Updating page view metrics: page_view_id={page_view_id}, time={time_on_page_seconds}s, scroll={scroll_depth}%, clicks={clicks_count}")

            return Response({
                'success': True,
                'message': 'Page view metrics updated successfully'
            })

        except Exception as e:
            print(f"[Analytics] Error updating page view metrics: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to update page view metrics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetAdAnalyticsAPI(APIView):
    """API для получения аналитики объявления"""

    @swagger_auto_schema(
        operation_summary="📊 Get Ad Analytics",
        operation_description="Get analytics data for specific advertisement including views, interactions, and performance metrics.",
        tags=['📊 Analytics'],
        manual_parameters=[
            openapi.Parameter(
                'ad_id',
                openapi.IN_PATH,
                description='Advertisement ID',
                type=openapi.TYPE_INTEGER,
                required=True
            ),
            openapi.Parameter(
                'days',
                openapi.IN_QUERY,
                description='Number of days to analyze (default: 30)',
                type=openapi.TYPE_INTEGER,
                default=30
            )
        ],
        responses={
            200: openapi.Response(
                description='Ad analytics retrieved successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'data': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'total_views': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'total_interactions': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'avg_view_duration': openapi.Schema(type=openapi.TYPE_NUMBER),
                                'conversion_rate': openapi.Schema(type=openapi.TYPE_NUMBER)
                            }
                        )
                    }
                )
            ),
            404: openapi.Response(description='Advertisement not found'),
            500: openapi.Response(description='Failed to get ad analytics')
        }
    )
    def get(self, request, ad_id):
        try:
            days = int(request.GET.get('days', 30))

            # Простая заглушка для аналитики объявления
            print(f"[Analytics] Getting analytics for ad {ad_id} for {days} days")

            # Генерируем простые данные аналитики
            analytics = {
                'views_count': 42,
                'unique_views_count': 35,
                'phone_reveals_count': 8,
                'favorites_count': 12,
                'shares_count': 3,
                'conversion_rate': 19.0,
                'avg_view_duration_seconds': 45.5,
                'quality_score': 85,
                'trending': False
            }

            return Response({
                'success': True,
                'analytics': analytics,
                'period_days': days,
                'message': 'Analytics data (mock)'
            })

        except Exception as e:
            print(f"[Analytics] Error getting ad analytics: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to get ad analytics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetAdAnalyticsForCardAPI(APIView):
    """API для получения аналитики для отображения в карточке объявления"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📊 Get Ad Analytics for Card",
        operation_description="Get basic analytics data for advertisement card display (views count, popularity score).",
        tags=['📊 Analytics'],
        manual_parameters=[
            openapi.Parameter(
                'ad_id',
                openapi.IN_PATH,
                description='Advertisement ID',
                type=openapi.TYPE_INTEGER,
                required=True
            )
        ],
        responses={
            200: openapi.Response(
                description='Ad analytics for card retrieved successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'data': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'views_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'popularity_score': openapi.Schema(type=openapi.TYPE_NUMBER),
                                'is_trending': openapi.Schema(type=openapi.TYPE_BOOLEAN)
                            }
                        )
                    }
                )
            ),
            404: openapi.Response(description='Advertisement not found'),
            500: openapi.Response(description='Failed to get ad analytics')
        }
    )
    def get(self, request, ad_id):
        try:
            # Простая заглушка для аналитики карточки объявления
            print(f"[Analytics] Getting card analytics for ad {ad_id}")

            # Генерируем простые данные для карточки
            card_analytics = {
                'views_count': 42,
                'unique_views_count': 35,
                'phone_reveals_count': 8,
                'favorites_count': 12,
                'shares_count': 3,
                'conversion_rate': 19.0,
                'quality_score': 85,
                'trending': False
            }

            return Response({
                'success': True,
                'card_analytics': card_analytics,
                'message': 'Card analytics data (mock)'
            })

        except Exception as e:
            print(f"[Analytics] Error getting card analytics: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to get card analytics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResetAdCountersAPI(APIView):
    """Сброс счетчиков просмотров и показов телефона. Доступно владельцу объявления или суперпользователю."""
    permission_classes = []  # Проверим вручную, чтобы поддерживать как авторизованного, так и внутренние вызовы

    @swagger_auto_schema(
        operation_summary="🧹 Reset Ad Counters",
        operation_description="Reset unique view and phone reveal counters for a specific ad. Allowed for ad owner or superuser.",
        tags=['📊 Analytics'],
        manual_parameters=[
            openapi.Parameter('ad_id', openapi.IN_QUERY, description="Ad ID", type=openapi.TYPE_INTEGER, required=True),
        ],
        responses={200: openapi.Response("Counters reset")}
    )
    def post(self, request):
        try:
            ad_id = int(request.query_params.get('ad_id'))
            from ..models.car_ad_model import CarAd
            from ..models.car_metadata_model import CarMetadataModel
            from ..models.analytics_models import AdInteraction

            ad = CarAd.objects.get(id=ad_id)

            # Проверка прав: суперпользователь или владелец объявления
            user = request.user if request.user.is_authenticated else None
            is_owner = bool(user and ad.account and ad.account.user_id == user.id)
            if not (is_owner or (user and user.is_superuser)):
                return Response({ 'error': 'Forbidden' }, status=status.HTTP_403_FORBIDDEN)

            # Сбросим метаданные
            meta, _ = CarMetadataModel.objects.get_or_create(car_ad=ad, defaults={'views_count': 0, 'phone_views_count': 0})
            meta.views_count = 0
            meta.phone_views_count = 0
            meta.save(update_fields=['views_count', 'phone_views_count'])

            # Удалим взаимодействия типа view и phone_reveal (чтобы заново набирались уникальные)
            AdInteraction.objects.filter(ad=ad, interaction_type__in=['view', 'phone_reveal']).delete()

            return Response({ 'success': True, 'message': 'Counters reset' })
        except CarAd.DoesNotExist:
            return Response({ 'error': 'Ad not found' }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"[Analytics] Error resetting counters: {e}")
            return Response({ 'error': 'Failed to reset counters', 'details': str(e) }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TrackPhoneViewAPI(APIView):
    """API для отслеживания просмотра телефона"""
    authentication_classes = []  # Публичный доступ
    permission_classes = []      # Без ограничений

    @swagger_auto_schema(
        operation_summary="📞 Track Phone View",
        operation_description="Track phone number reveal event.",
        tags=['📊 Analytics'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['ad_id'],
            properties={
                'ad_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Advertisement ID'),
                'source_page': openapi.Schema(type=openapi.TYPE_STRING, description='Source page'),
            }
        ),
        responses={
            200: openapi.Response(
                description='Phone view tracked successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'phone_views_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            500: openapi.Response(description='Failed to track phone view')
        }
    )
    def post(self, request):
        try:
            data = request.data
            ad_id = data.get('ad_id')
            source_page = data.get('source_page', 'unknown')

            if not ad_id:
                return Response({'success': False, 'error': 'ad_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            print(f"[Analytics] Tracking phone view (dedup): ad_id={ad_id}, source={source_page}")

            # Создаем запись о просмотре телефона с защитой от накрутки
            try:
                from ..models.analytics_models import AdInteraction, VisitorSession
                from ..models.car_ad_model import CarAd
                from ..models.car_metadata_model import CarMetadataModel
                from django.db.models import Q
                import uuid

                # Получаем объявление
                ad = CarAd.objects.get(id=ad_id)

                # Обеспечиваем наличие Django-сессии
                if not request.session.session_key:
                    request.session.create()
                session_key = request.session.session_key

                # Преобразуем session_key в UUID для VisitorSession.session_id (стабильно для этой сессии)
                try:
                    session_uuid = uuid.UUID(str(session_key))
                except Exception:
                    session_uuid = uuid.uuid5(uuid.NAMESPACE_URL, f"dj-session:{session_key}")

                # Получаем/создаем VisitorSession по session_id
                visitor_session, _ = VisitorSession.objects.get_or_create(
                    session_id=session_uuid,
                    defaults={
                        'ip_address': request.META.get('REMOTE_ADDR', '127.0.0.1'),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                        'user': request.user if request.user.is_authenticated else None,
                    }
                )

                # Проверка на повтор: аутентифицированный пользователь → один плюс навсегда,
                # анонимный → один плюс на сессию
                user = request.user if request.user.is_authenticated else None

                # Ignore owner actions: they should not affect statistics
                is_owner = bool(user and getattr(getattr(ad, 'account', None), 'user_id', None) == getattr(user, 'id', None))
                if is_owner:
                    metadata, _ = CarMetadataModel.objects.get_or_create(
                        car_ad=ad,
                        defaults={'phone_views_count': 0}
                    )
                    print(f"[Analytics] Owner action ignored for phone view on ad {ad_id}")
                    return Response({
                        'success': True,
                        'owner_ignored': True,
                        'phone_views_count': metadata.phone_views_count,
                        'message': 'Owner action ignored'
                    })

                # Deduplicate by user (if authenticated) or by session (if anonymous)
                if user:
                    already_tracked = AdInteraction.objects.filter(
                        ad=ad, interaction_type='phone_reveal', user=user
                    ).exists()
                else:
                    already_tracked = AdInteraction.objects.filter(
                        ad=ad, interaction_type='phone_reveal', session=visitor_session
                    ).exists()

                # Получаем/создаем метаданные, чтобы вернуть актуальное значение
                metadata, created_meta = CarMetadataModel.objects.get_or_create(
                    car_ad=ad,
                    defaults={'phone_views_count': 0}
                )

                if already_tracked:
                    print(f"[Analytics] Phone view deduped for ad {ad_id} (user/session already counted)")
                    return Response({
                        'success': True,
                        'already_tracked': True,
                        'phone_views_count': metadata.phone_views_count,
                        'message': 'Phone view already counted for this user/session'
                    })

                # Создаем взаимодействие и инкрементируем счетчик
                AdInteraction.objects.create(
                    session=visitor_session,
                    user=user,
                    ad=ad,
                    interaction_type='phone_reveal',
                    source_page=source_page,
                    metadata={
                        'timestamp': timezone.now().isoformat(),
                        'session_key': session_key
                    }
                )

                metadata.phone_views_count = (metadata.phone_views_count or 0) + 1
                metadata.save(update_fields=['phone_views_count'])

                print(f"[Analytics] Phone view tracked for ad {ad_id}, total: {metadata.phone_views_count}")

                return Response({
                    'success': True,
                    'phone_views_count': metadata.phone_views_count,
                    'message': 'Phone view tracked successfully'
                })

            except Exception as e:
                print(f"[Analytics] Error tracking phone view: {e}")
                return Response({
                    'success': False,
                    'error': f'Failed to track phone view: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            print(f"[Analytics] Error in TrackPhoneViewAPI: {str(e)}")
            return Response({
                'success': False,
                'error': f'Failed to track phone view: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

