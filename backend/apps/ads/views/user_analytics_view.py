"""
Персональная аналитика пользователя
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Min, Max, Q
from datetime import datetime, timedelta
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.ads.models import CarAd, AdView
from apps.accounts.models import AddsAccount


class UserAnalyticsView(APIView):
    """Персональная аналитика пользователя по его объявлениям"""
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="👤 User Analytics",
        operation_description="Get personal analytics for authenticated user's advertisements and account performance.",
        tags=['📊 Statistics'],
        manual_parameters=[
            openapi.Parameter(
                'locale',
                openapi.IN_QUERY,
                description='Locale for response (uk, en, ru)',
                type=openapi.TYPE_STRING,
                default='uk'
            )
        ],
        responses={
            200: openapi.Response(
                description='User analytics retrieved successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'total_ads': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'active_ads': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'total_views': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'avg_price': openapi.Schema(type=openapi.TYPE_NUMBER),
                        'account_type': openapi.Schema(type=openapi.TYPE_STRING),
                        'performance_metrics': openapi.Schema(type=openapi.TYPE_OBJECT)
                    }
                )
            ),
            401: openapi.Response(description='Authentication required'),
            500: openapi.Response(description='Analytics generation failed')
        }
    )
    def get(self, request, *args, **kwargs):
        """Получить упрощенную аналитику пользователя из базы данных"""
        user = request.user
        locale = request.GET.get('locale', 'uk')

        try:
            print(f"[UserAnalytics] Getting analytics for user: {user.id}")

            # Объявления пользователя
            user_ads = CarAd.objects.filter(account__user=user)

            # Основная статистика
            total_ads = user_ads.count()
            active_ads = user_ads.filter(status='active').count()
            sold_ads = user_ads.filter(status='sold').count()
            inactive_ads = user_ads.filter(status='inactive').count()

            print(f"[UserAnalytics] User {user.id} has {total_ads} ads ({active_ads} active)")
            
            # Просмотры объявлений пользователя (упрощенно)
            user_views = AdView.objects.filter(ad__account__user=user)
            total_views = user_views.count()
            unique_views = user_views.values('ip_address').distinct().count()

            # Простая статистика (без сложных запросов)
            today = timezone.now().date()
            
            # Базовые метрики
            conversion_rate = (sold_ads / total_ads * 100) if total_ads > 0 else 0
            avg_views_per_ad = total_views / total_ads if total_ads > 0 else 0
            
            # Ценовая статистика
            price_stats = {'min_price': 0, 'max_price': 0, 'avg_price': 0}
            try:
                price_stats = user_ads.aggregate(
                    min_price=Min('price'),
                    max_price=Max('price'),
                    avg_price=Avg('price')
                )
            except Exception:
                pass

            # Формируем упрощенный ответ
            user_analytics = {
                'user_id': user.id,
                'overview': {
                    'total_ads': total_ads,
                    'active_ads': active_ads,
                    'sold_ads': sold_ads,
                    'inactive_ads': inactive_ads,
                    'total_views': total_views,
                    'unique_views': unique_views,
                    'conversion_rate': round(conversion_rate, 2),
                    'avg_views_per_ad': round(avg_views_per_ad, 2)
                },
                'price_stats': {
                    'min_price': price_stats.get('min_price') or 0,
                    'max_price': price_stats.get('max_price') or 0,
                    'avg_price': round(price_stats.get('avg_price') or 0, 2)
                },
                'brand_stats': [],
                'year_stats': [],
                'region_stats': [],
                'monthly_activity': [],
                'market_comparison': {
                    'price_vs_market': 0,
                    'views_vs_market': 0,
                    'performance_score': 50
                },
                'recommendations': [
                    {
                        'type': 'general',
                        'message': 'Добавьте больше фотографий к вашим объявлениям',
                        'priority': 'medium'
                    }
                ],
                'performance_metrics': {
                    'ads_with_views': 0,
                    'view_rate': 0,
                    'engagement_score': 0,
                    'activity_score': 0
                },
                'generated_at': timezone.now().isoformat(),
                'locale': locale
            }

            return Response({
                'success': True,
                'data': user_analytics,
                'source': 'user_analytics_simplified',
                'locale': locale
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'locale': locale,
                'message': f'Ошибка генерации пользовательской аналитики: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserInsightsView(APIView):
    """LLM инсайты для пользователя"""
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="💡 User Insights",
        operation_description="Get personalized insights and recommendations for user's advertisements and performance.",
        tags=['📊 Statistics'],
        manual_parameters=[
            openapi.Parameter(
                'locale',
                openapi.IN_QUERY,
                description='Locale for insights (uk, en, ru)',
                type=openapi.TYPE_STRING,
                default='uk'
            )
        ],
        responses={
            200: openapi.Response(
                description='User insights retrieved successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'data': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'user_insights': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                                'performance_metrics': openapi.Schema(type=openapi.TYPE_OBJECT)
                            }
                        ),
                        'source': openapi.Schema(type=openapi.TYPE_STRING),
                        'locale': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            401: openapi.Response(description='Authentication required'),
            500: openapi.Response(description='Failed to generate user insights')
        }
    )
    def get(self, request, *args, **kwargs):
        """Получить персональные инсайты с LLM"""
        user = request.user
        locale = request.GET.get('locale', 'uk')
        
        try:
            # Упрощенные инсайты без LLM
            return Response({
                'success': True,
                'data': {
                    'user_insights': [
                        {
                            'type': 'general',
                            'message': 'Добавьте больше фотографий к вашим объявлениям',
                            'priority': 'medium'
                        }
                    ],
                    'user_data_summary': {
                        'total_ads': 0,
                        'avg_price': 0,
                        'conversion_rate': 0,
                        'performance_score': 50
                    }
                },
                'source': 'simplified_user_insights',
                'locale': locale
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'locale': locale,
                'message': f'Ошибка генерации инсайтов: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
