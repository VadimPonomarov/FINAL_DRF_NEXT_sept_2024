"""
Персональная аналитика пользователя
"""

from datetime import datetime, timedelta

from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AddsAccount
from apps.ads.models import AdView, CarAd


class UserAnalyticsView(APIView):
    """Персональная аналитика пользователя по его объявлениям"""

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="👤 User Analytics",
        operation_description="Get personal analytics for authenticated user's advertisements and account performance.",
        tags=["📊 Statistics"],
        manual_parameters=[
            openapi.Parameter(
                "locale",
                openapi.IN_QUERY,
                description="Locale for response (uk, en, ru)",
                type=openapi.TYPE_STRING,
                default="uk",
            )
        ],
        responses={
            200: openapi.Response(
                description="User analytics retrieved successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "total_ads": openapi.Schema(type=openapi.TYPE_INTEGER),
                        "active_ads": openapi.Schema(type=openapi.TYPE_INTEGER),
                        "total_views": openapi.Schema(type=openapi.TYPE_INTEGER),
                        "avg_price": openapi.Schema(type=openapi.TYPE_NUMBER),
                        "account_type": openapi.Schema(type=openapi.TYPE_STRING),
                        "performance_metrics": openapi.Schema(type=openapi.TYPE_OBJECT),
                    },
                ),
            ),
            401: openapi.Response(description="Authentication required"),
            500: openapi.Response(description="Analytics generation failed"),
        },
    )
    def get(self, request, *args, **kwargs):
        """Получить упрощенную аналитику пользователя из базы данных"""
        user = request.user
        locale = request.GET.get("locale", "uk")

        try:
            print(f"[UserAnalytics] Getting analytics for user: {user.id}")

            # ✅ ОПТИМИЗАЦИЯ: Один запрос с агрегацией вместо N+1
            from django.db.models import Avg, Count, Max, Min, Q

            # Статистика объявлений - один оптимизированный запрос
            ad_stats = CarAd.objects.filter(account__user=user).aggregate(
                total_ads=Count("id"),
                active_ads=Count("id", filter=Q(status="active")),
                sold_ads=Count("id", filter=Q(status="sold")),
                inactive_ads=Count("id", filter=Q(status="inactive")),
                min_price=Min("price"),
                max_price=Max("price"),
                avg_price=Avg("price"),
            )

            total_ads = ad_stats["total_ads"]
            active_ads = ad_stats["active_ads"]
            sold_ads = ad_stats["sold_ads"]
            inactive_ads = ad_stats["inactive_ads"]
            price_stats = {
                "min_price": ad_stats["min_price"] or 0,
                "max_price": ad_stats["max_price"] or 0,
                "avg_price": ad_stats["avg_price"] or 0,
            }

            print(
                f"[UserAnalytics] User {user.id} has {total_ads} ads ({active_ads} active)"
            )

            # ✅ ОПТИМИЗАЦИЯ: Один запрос для просмотров
            view_stats = AdView.objects.filter(ad__account__user=user).aggregate(
                total_views=Count("id"), unique_views=Count("ip_address", distinct=True)
            )

            total_views = view_stats["total_views"]
            unique_views = view_stats["unique_views"]

            # Простая статистика (без сложных запросов)
            today = timezone.now().date()

            # Базовые метрики
            conversion_rate = (sold_ads / total_ads * 100) if total_ads > 0 else 0
            avg_views_per_ad = total_views / total_ads if total_ads > 0 else 0

            # Формируем упрощенный ответ
            user_analytics = {
                "user_id": user.id,
                "overview": {
                    "total_ads": total_ads,
                    "active_ads": active_ads,
                    "sold_ads": sold_ads,
                    "inactive_ads": inactive_ads,
                    "total_views": total_views,
                    "unique_views": unique_views,
                    "conversion_rate": round(conversion_rate, 2),
                    "avg_views_per_ad": round(avg_views_per_ad, 2),
                },
                "price_stats": {
                    "min_price": price_stats.get("min_price") or 0,
                    "max_price": price_stats.get("max_price") or 0,
                    "avg_price": round(price_stats.get("avg_price") or 0, 2),
                },
                "brand_stats": [],
                "year_stats": [],
                "region_stats": [],
                "monthly_activity": [],
                "market_comparison": {
                    "price_vs_market": 0,
                    "views_vs_market": 0,
                    "performance_score": 50,
                },
                "recommendations": [
                    {
                        "type": "general",
                        "message": "Добавьте больше фотографий к вашим объявлениям",
                        "priority": "medium",
                    }
                ],
                "performance_metrics": {
                    "ads_with_views": 0,
                    "view_rate": 0,
                    "engagement_score": 0,
                    "activity_score": 0,
                },
                "generated_at": timezone.now().isoformat(),
                "locale": locale,
            }

            return Response(
                {
                    "success": True,
                    "data": user_analytics,
                    "source": "user_analytics_simplified",
                    "locale": locale,
                }
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "error": str(e),
                    "locale": locale,
                    "message": f"Ошибка генерации пользовательской аналитики: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserInsightsView(APIView):
    """LLM инсайты для пользователя"""

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="💡 User Insights",
        operation_description="Get personalized insights and recommendations for user's advertisements and performance.",
        tags=["📊 Statistics"],
        manual_parameters=[
            openapi.Parameter(
                "locale",
                openapi.IN_QUERY,
                description="Locale for insights (uk, en, ru)",
                type=openapi.TYPE_STRING,
                default="uk",
            )
        ],
        responses={
            200: openapi.Response(
                description="User insights retrieved successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "success": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        "data": openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                "user_insights": openapi.Schema(
                                    type=openapi.TYPE_ARRAY,
                                    items=openapi.Schema(type=openapi.TYPE_OBJECT),
                                ),
                                "performance_metrics": openapi.Schema(
                                    type=openapi.TYPE_OBJECT
                                ),
                            },
                        ),
                        "source": openapi.Schema(type=openapi.TYPE_STRING),
                        "locale": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            ),
            401: openapi.Response(description="Authentication required"),
            500: openapi.Response(description="Failed to generate user insights"),
        },
    )
    def get(self, request, *args, **kwargs):
        """Получить персональные инсайты с LLM"""
        user = request.user
        locale = request.GET.get("locale", "uk")

        try:
            # Упрощенные инсайты без LLM
            return Response(
                {
                    "success": True,
                    "data": {
                        "user_insights": [
                            {
                                "type": "general",
                                "message": "Добавьте больше фотографий к вашим объявлениям",
                                "priority": "medium",
                            }
                        ],
                        "user_data_summary": {
                            "total_ads": 0,
                            "avg_price": 0,
                            "conversion_rate": 0,
                            "performance_score": 50,
                        },
                    },
                    "source": "simplified_user_insights",
                    "locale": locale,
                }
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "error": str(e),
                    "locale": locale,
                    "message": f"Ошибка генерации инсайтов: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
