from __future__ import annotations

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
from datetime import datetime
from typing import Any, Dict
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from ..services.llm_analytics import LLMAnalyticsService
from ..services.analytics_dashboard import AnalyticsDashboardService


class LLMMarketInsightsAPI(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_id='search_analytics_insights',
        operation_summary='🔍 LLM Market Insights',
        operation_description="""
        Get AI-powered market insights for current search selection.

        ### Permissions:
        - No authentication required (public endpoint)

        ### Query Parameters:
        Accepts any search filters to generate contextual insights.

        ### Response:
        Returns LLM-generated market analysis and insights.
        """,
        manual_parameters=[
            openapi.Parameter('locale', openapi.IN_QUERY, description="Language locale", type=openapi.TYPE_STRING, default='ru'),
        ],
        responses={
            200: 'Market insights generated successfully',
            500: 'Internal server error'
        },
        tags=['📊 Analytics']
    )
    def get(self, request, *args, **kwargs):
        """Return LLM-based market insights for current selection (lightweight)."""
        try:
            locale = request.GET.get("locale", "ru")
            svc = LLMAnalyticsService(locale=locale)

            # Minimal input data: summary of filters
            data = {
                k: v
                for k, v in request.GET.items()
                if v not in (None, "", "null")
            }
            result = svc.generate_market_insights(data)
            return JsonResponse(result)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)


class AnalyticsDashboardAPI(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_id='analytics_dashboard',
        operation_summary='📊 Analytics Dashboard',
        operation_description="""
        Get base64-encoded PNG charts for dashboard sections.

        ### Permissions:
        - No authentication required (public endpoint)

        ### Query Parameters:
        - locale: Language locale for chart labels

        ### Response:
        Returns dashboard charts as base64-encoded PNG images.
        """,
        manual_parameters=[
            openapi.Parameter('locale', openapi.IN_QUERY, description="Language locale", type=openapi.TYPE_STRING, default='ru'),
        ],
        responses={
            200: 'Dashboard charts generated successfully',
            500: 'Internal server error'
        },
        tags=['📊 Analytics']
    )
    def get(self, request, *args, **kwargs):
        """Return base64-encoded PNG charts for dashboard sections."""
        try:
            locale = request.GET.get("locale", "ru")
            svc = AnalyticsDashboardService(locale=locale)
            dfs = svc.get_platform_dataframes()

            charts = {
                "price_distribution": svc.create_price_distribution_chart(dfs["ads"]) if not dfs["ads"].empty else None,
                "brands": svc.create_brands_chart(dfs["ads"]) if not dfs["ads"].empty else None,
                "regional": svc.create_regional_chart(dfs["ads"], dfs["views"]) if not dfs["ads"].empty else None,
            }
            return Response({"success": True, "charts": charts})
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=500)


class ForecastSeriesAPI(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_id='analytics_forecast',
        operation_summary='📈 Analytics Forecast',
        operation_description="""
        Get simple moving-average forecast for daily counts.

        ### Permissions:
        - No authentication required (public endpoint)

        ### Response:
        Returns forecast data based on historical trends.
        """,
        responses={
            200: 'Forecast data generated successfully',
            500: 'Internal server error'
        },
        tags=['📊 Analytics']
    )
    def get(self, request, *args, **kwargs):
        """Very simple moving-average forecast for daily counts (no heavy deps)."""
        from collections import Counter
        import datetime as dt

        try:
            from apps.ads.models.car_ad_model import CarAd
            date_from = request.GET.get("date_from")
            date_to = request.GET.get("date_to")

            qs = CarAd.objects.all()
            if date_from:
                qs = qs.filter(created_at__date__gte=date_from)
            if date_to:
                qs = qs.filter(created_at__date__lte=date_to)

            days = [ad.created_at.date().isoformat() for ad in qs.only("created_at")]
            c = Counter(days)
            x = sorted(c.keys())
            y = [int(c[d]) for d in x]

            # 7-day moving average forecast for next 14 days
            def moving_avg(series, window=7):
                out = []
                for i in range(len(series)):
                    s = series[max(0, i - window + 1): i + 1]
                    out.append(sum(s) / max(1, len(s)))
                return out

            ma = moving_avg(y, 7) if y else []
            if x:
                last_date = dt.date.fromisoformat(x[-1])
                forecast_x = [(last_date + dt.timedelta(days=i + 1)).isoformat() for i in range(14)]
                last_avg = ma[-1] if ma else (sum(y) / len(y) if y else 0)
                forecast_y = [round(last_avg, 2)] * len(forecast_x)
            else:
                forecast_x, forecast_y = [], []

            return Response({
                "success": True,
                "series": {"x": x, "y": y},
                "forecast": {"x": forecast_x, "y": forecast_y}
            })
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=500)

