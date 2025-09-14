from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Tuple

from django.db.models import F, Q, Value
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.ads.models.car_ad_model import CarAd
from apps.ads.models.exchange_rates import ExchangeRate


class SearchAnalyticsSeriesAPI(APIView):
    """
    Returns simple analytics series for the current search selection.
    Endpoint: /api/ads/analytics/search/series/

    Query params (subset supported):
      - date_from, date_to (YYYY-MM-DD)
      - region_id, city_id
      - mark_id, model (icontains)
      - vehicle_type, fuel_type, transmission, body_type, condition (from dynamic_fields)
      - year_from, year_to (from dynamic_fields.year)
      - price_min, price_max
    """

    @swagger_auto_schema(
        operation_id='search_analytics_series',
        operation_summary='📈 Search Analytics Series',
        operation_description="""
        Get analytics series data for current search selection.

        ### Permissions:
        - No authentication required (public endpoint)

        ### Query Parameters:
        Supports various search filters to generate analytics series.

        ### Response:
        Returns time series, price histograms, and regional analytics.
        """,
        manual_parameters=[
            openapi.Parameter('date_from', openapi.IN_QUERY, description="Start date (YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('date_to', openapi.IN_QUERY, description="End date (YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('region_id', openapi.IN_QUERY, description="Region ID", type=openapi.TYPE_INTEGER),
            openapi.Parameter('city_id', openapi.IN_QUERY, description="City ID", type=openapi.TYPE_INTEGER),
            openapi.Parameter('mark_id', openapi.IN_QUERY, description="Car mark ID", type=openapi.TYPE_INTEGER),
            openapi.Parameter('price_min', openapi.IN_QUERY, description="Minimum price", type=openapi.TYPE_NUMBER),
            openapi.Parameter('price_max', openapi.IN_QUERY, description="Maximum price", type=openapi.TYPE_NUMBER),
        ],
        responses={
            200: 'Analytics series data retrieved successfully',
            500: 'Internal server error'
        },
        tags=['📊 Analytics']
    )
    def get(self, request, *args, **kwargs):
        params = request.query_params
        try:
            qs = CarAd.objects.all().select_related("mark", "region", "city")

            # Date filter by created_at
            date_from = params.get("date_from")
            date_to = params.get("date_to")
            if date_from:
                qs = qs.filter(created_at__date__gte=date_from)
            if date_to:
                qs = qs.filter(created_at__date__lte=date_to)

            # Region/City
            region_id = params.get("region_id")
            city_id = params.get("city_id")
            if region_id:
                qs = qs.filter(region_id=region_id)
            if city_id:
                qs = qs.filter(city_id=city_id)

            # Mark (brand)
            mark_id = params.get("mark_id") or params.get("mark")
            if mark_id and str(mark_id).isdigit():
                qs = qs.filter(mark_id=int(mark_id))

            # Year in dynamic_fields
            year_from = params.get("year_from")
            year_to = params.get("year_to")
            if year_from:
                qs = qs.filter(dynamic_fields__year__gte=int(year_from))
            if year_to:
                qs = qs.filter(dynamic_fields__year__lte=int(year_to))

            # Vehicle specs from dynamic_fields
            vehicle_type = params.get("vehicle_type")
            fuel_type = params.get("fuel_type")
            transmission = params.get("transmission")
            body_type = params.get("body_type")
            condition = params.get("condition")
            model = params.get("model")
            if vehicle_type:
                qs = qs.filter(dynamic_fields__vehicle_type=vehicle_type)
            if fuel_type:
                qs = qs.filter(dynamic_fields__fuel_type=fuel_type)
            if transmission:
                qs = qs.filter(dynamic_fields__transmission=transmission)
            if body_type:
                qs = qs.filter(dynamic_fields__body_type=body_type)
            if condition:
                qs = qs.filter(dynamic_fields__condition=condition)
            if model:
                qs = qs.filter(model__icontains=model)

            # Price filters
            price_min = params.get("price_min") or params.get("min_price")
            price_max = params.get("price_max") or params.get("max_price")
            if price_min:
                qs = qs.filter(price__gte=Decimal(price_min))
            if price_max:
                qs = qs.filter(price__lte=Decimal(price_max))

            # Pull minimal fields for analytics
            rows = list(
                qs.values(
                    "id",
                    "created_at",
                    "price",
                    "currency",
                    "dynamic_fields",
                    "mark__name",
                    "region__name",
                )
            )

            # Exchange rates for normalization to USD
            rates = ExchangeRate.get_latest_rates()
            usd_rate = Decimal(rates.usd_rate) if rates else Decimal("40")  # fallback
            eur_rate = Decimal(rates.eur_rate) if rates else Decimal("43")

            def to_usd(price: Any, currency: str | None) -> Decimal:
                if price is None:
                    return Decimal(0)
                p = Decimal(price)
                c = (currency or "USD").upper()
                if c == "USD":
                    return p
                if c == "EUR":
                    # EUR->UAH->USD
                    return (p * eur_rate) / usd_rate
                # UAH or other -> USD
                return p / usd_rate

            # Build feature arrays
            price_usd: List[Decimal] = []
            years: List[int] = []
            regions: List[str] = []
            brands: List[str] = []
            created_dates: List[str] = []

            for r in rows:
                p = to_usd(r.get("price"), r.get("currency"))
                price_usd.append(p)
                dyn = r.get("dynamic_fields") or {}
                y = dyn.get("year")
                if isinstance(y, int):
                    years.append(y)
                elif isinstance(y, str) and y.isdigit():
                    years.append(int(y))
                regions.append(r.get("region__name") or "—")
                brands.append(r.get("mark__name") or "—")
                created = r.get("created_at")
                if created:
                    created_dates.append(created.date().isoformat())

            # Timeseries by day
            ts_counter = Counter(created_dates)
            ts_x = sorted(ts_counter.keys())
            ts_y = [int(ts_counter[d]) for d in ts_x]

            # Histogram bins (10 bins) for price in USD
            numeric_prices = [float(p) for p in price_usd if p > 0]
            hist = {"bins_left": [], "bins_right": [], "counts": []}
            if numeric_prices:
                mn, mx = min(numeric_prices), max(numeric_prices)
                if mx == mn:
                    mn = max(0.0, mn - 1)
                    mx = mn + 2
                bins = 10
                step = (mx - mn) / bins
                edges = [mn + i * step for i in range(bins)] + [mx]
                counts = [0] * bins
                for v in numeric_prices:
                    # last bin inclusive
                    idx = min(int((v - mn) / step) if step else 0, bins - 1)
                    counts[idx] += 1
                hist = {
                    "bins_left": [round(edges[i], 2) for i in range(bins)],
                    "bins_right": [round(edges[i + 1], 2) if i + 1 < len(edges) else round(mx, 2) for i in range(bins)],
                    "counts": counts,
                }

            # Scatter price vs year
            pvy_x: List[int] = []
            pvy_y: List[float] = []
            pvy_text: List[str] = []
            for r, p in zip(rows, price_usd):
                dyn = (r.get("dynamic_fields") or {})
                y = dyn.get("year")
                try:
                    y_int = int(y) if y is not None else None
                except Exception:
                    y_int = None
                if y_int and p and p > 0:
                    pvy_x.append(y_int)
                    pvy_y.append(float(p))
                    pvy_text.append(str(r.get("mark__name") or ""))

            # By region & brand (top 12)
            def top_counts(labels: List[str]) -> Tuple[List[str], List[int]]:
                c = Counter([l or "—" for l in labels])
                top = c.most_common(12)
                return [k for k, _ in top], [int(v) for _, v in top]

            rg_labels, rg_counts = top_counts(regions)
            br_labels, br_counts = top_counts(brands)

            def avg_price_by(labels: List[str]) -> List[float]:
                sums: Dict[str, float] = defaultdict(float)
                cnts: Dict[str, int] = defaultdict(int)
                for label, p in zip(labels, price_usd):
                    if p and p > 0:
                        key = label or "—"
                        sums[key] += float(p)
                        cnts[key] += 1
                return [round((sums[l] / cnts[l]) if cnts[l] else 0.0, 2) for l in labels]

            rg_avg = avg_price_by(rg_labels)
            br_avg = avg_price_by(br_labels)

            avg_price = round(sum([float(p) for p in price_usd if p > 0]) / max(1, len([p for p in price_usd if p > 0])), 2) if price_usd else 0.0

            payload = {
                "success": True,
                "count": len(rows),
                "series": {
                    "timeseries": {"x": ts_x, "y": ts_y},
                    "price_hist": hist,
                    "price_vs_year": {"x": pvy_x, "y": pvy_y, "text": pvy_text},
                    "by_region": {"labels": rg_labels, "counts": rg_counts, "avg_price": rg_avg},
                    "by_brand": {"labels": br_labels, "counts": br_counts, "avg_price": br_avg},
                    "avg_price": avg_price,
                },
                "summary": None,
            }
            return JsonResponse(payload)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

