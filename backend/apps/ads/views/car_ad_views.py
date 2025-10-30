"""
Views for CarAd model with LLM validation and comprehensive filtering.
"""
import logging
from typing import Dict
from rest_framework import generics, status

logger = logging.getLogger(__name__)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.db.models import Case, When, IntegerField, FloatField, Value, Q
from django.db import models
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from apps.ads.models.car_ad_model import CarAd
from apps.ads.serializers.car_ad_serializer import CarAdSerializer
from apps.ads.filters import CarAdFilter
from core.permissions import IsOwnerOrSuperUserWrite
from rest_framework.pagination import PageNumberPagination
# from core.services.llm_moderation import llm_moderation_service
from core.enums.ads import AdStatusEnum


class CarAdPagination(PageNumberPagination):
    """Кастомная пагинация для объявлений
    Особенность: page_size=0 означает «все» (отключить пагинацию и вернуть одну страницу со всеми результатами).
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 10000

    def paginate_queryset(self, queryset, request, view=None):
        """Если клиент передал page_size=0 — возвращаем одну страницу со всеми объектами.
        Это сохраняет форму ответа (page, count, next, previous, results).
        """
        try:
            raw = request.query_params.get(self.page_size_query_param)
            if raw is not None and str(raw) == '0':
                from django.core.paginator import Paginator
                total = queryset.count()
                per_page = max(1, int(total))
                paginator = Paginator(queryset, per_page)
                # Всегда первая страница, так как «все» умещаются на одной
                self.page = paginator.page(1)
                self.page_size = per_page
                self.request = request
                return list(self.page)
        except Exception:
            # На любые ошибки — обычная пагинация
            pass

        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response({
            'page': self.page.number,
            'total': self.page.paginator.count,
            'count': self.page.paginator.count,  # Добавляем count для совместимости
            'page_size': self.page_size,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class CustomOrderingFilter(OrderingFilter):
    """Кастомный фильтр для сортировки, поддерживающий JSON поля"""

    def get_valid_fields(self, queryset, view, context={}):
        """Переопределяем для добавления кастомных полей"""
        # Получаем стандартные поля
        valid_fields = super().get_valid_fields(queryset, view, context)

        # Добавляем наши кастомные поля
        custom_fields = [
            ('dynamic_fields__year', 'dynamic_fields__year'),
            ('dynamic_fields__mileage', 'dynamic_fields__mileage'),
        ]

        # Объединяем списки
        if valid_fields:
            valid_fields.extend(custom_fields)
        else:
            valid_fields = custom_fields

        return valid_fields

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        print(f"[CustomOrderingFilter] Original ordering: {ordering}")

        if ordering:
            # Обрабатываем кастомные поля для сортировки
            processed_ordering = []

            for field in ordering:
                print(f"[CustomOrderingFilter] Processing field: {field}")
                if field == 'dynamic_fields__year' or field == '-dynamic_fields__year':
                    # Сортировка по году из JSON поля (PostgreSQL синтаксис)
                    desc = field.startswith('-')
                    queryset = queryset.extra(
                        select={'year_sort': "CAST((dynamic_fields->>'year') AS INTEGER)"}
                    )
                    processed_ordering.append('-year_sort' if desc else 'year_sort')

                elif field == 'dynamic_fields__mileage' or field == '-dynamic_fields__mileage':
                    # Сортировка по пробегу из JSON поля (PostgreSQL синтаксис)
                    desc = field.startswith('-')
                    queryset = queryset.extra(
                        select={'mileage_sort': "CAST((dynamic_fields->>'mileage') AS INTEGER)"}
                    )
                    processed_ordering.append('-mileage_sort' if desc else 'mileage_sort')

                elif field == 'price' or field == '-price':
                    # Сортировка по цене с нормализацией к USD и обработкой NULL (NULL в конце)
                    from django.db.models import Case, When, Value, IntegerField, DecimalField, F, ExpressionWrapper
                    from decimal import Decimal
                    desc = field.startswith('-')

                    # Используем те же курсы, что и на фронте/в сериализаторе (CurrencyService),
                    # чтобы порядок совпадал с отображаемой ценой в USD
                    try:
                        from apps.currency.services import CurrencyService
                        usd_to_uah = CurrencyService.get_rate('UAH', 'USD')
                        eur_to_uah = CurrencyService.get_rate('UAH', 'EUR')
                        # Фикс на случай отсутствия курсов
                        if not usd_to_uah:
                            usd_to_uah = Decimal('40')
                        if not eur_to_uah:
                            eur_to_uah = Decimal('43')
                    except Exception:
                        usd_to_uah = Decimal('40')
                        eur_to_uah = Decimal('43')

                    # Переводим все цены в USD для корректного сравнения
                    # USD: price
                    # EUR: price * (eur_to_uah / usd_to_uah)
                    # UAH: price / usd_to_uah
                    price_in_usd = Case(
                        When(currency='USD', then=F('price')),
                        When(currency='EUR', then=ExpressionWrapper(F('price') * (eur_to_uah / usd_to_uah), output_field=DecimalField(max_digits=20, decimal_places=6))),
                        When(currency='UAH', then=ExpressionWrapper(F('price') / usd_to_uah, output_field=DecimalField(max_digits=20, decimal_places=6))),
                        default=F('price'),
                        output_field=DecimalField(max_digits=20, decimal_places=6)
                    )

                    # Добавляем аннотации
                    queryset = queryset.annotate(
                        price_null_last=Case(
                            When(price__isnull=True, then=Value(1)),
                            default=Value(0),
                            output_field=IntegerField()
                        ),
                        price_usd_sort=price_in_usd
                    )

                    if desc:
                        processed_ordering.extend(['price_null_last', '-price_usd_sort', 'id'])
                    else:
                        processed_ordering.extend(['price_null_last', 'price_usd_sort', 'id'])

                else:
                    # Обычные поля
                    processed_ordering.append(field)

            if processed_ordering:
                print(f"[CustomOrderingFilter] Final processed ordering: {processed_ordering}")
                queryset = queryset.order_by(*processed_ordering)

        return queryset


class CarAdListView(generics.ListAPIView):
    """
    List view for car advertisements with comprehensive filtering.

    Supports:
    - Advanced filtering by price, location, car specs, etc.
    - Text search in title and description
    - Ordering by various fields
    - Public access for browsing ads
    """
    serializer_class = CarAdSerializer
    permission_classes = []  # Public access for browsing
    pagination_class = CarAdPagination  # Добавляем кастомную пагинацию

    def get_queryset(self):
        """Optimized queryset with prefetch_related to avoid N+1 queries."""
        from django.db.models import Prefetch, Q, IntegerField
        from django.db.models.functions import Cast
        from apps.ads.models import AddImageModel
        import logging

        logger = logging.getLogger(__name__)

        # Логируем параметры запроса для отладки
        if hasattr(self, 'request'):
            params = dict(self.request.GET)
            logger.info(f"🔍 CarAdListView получил параметры: {params}")

        # Показываем все объявления по умолчанию, фильтр по статусу применяется через CarAdFilter
        queryset = CarAd.objects.select_related(
            'account', 'account__user', 'mark', 'moderated_by',
            'region', 'city'  # Добавляем region и city для оптимизации
        ).prefetch_related(
            Prefetch(
                'images',
                queryset=AddImageModel.objects.filter(
                    Q(is_primary=True) | Q(image__isnull=False)
                ).order_by('-is_primary', 'id')[:5],  # Ограничиваем количество изображений
                to_attr='prefetched_images'
            ),
            # Добавляем prefetch для избранного
            Prefetch(
                'favorited_by',
                to_attr='prefetched_favorites'
            )
        )

        # Добавляем аннотации для сортировки по JSON полям (PostgreSQL синтаксис)
        queryset = queryset.extra(
            select={
                'year_sort': "CAST((dynamic_fields->>'year') AS INTEGER)",
                'mileage_sort': "CAST((dynamic_fields->>'mileage') AS INTEGER)"
            }
        )

        # Добавляем оптимизированные фильтры напрямую
        if hasattr(self, 'request'):
            params = self.request.GET
            print(f"FILTERS DEBUG: Received params: {dict(params)}")

            # Проверяем, какие параметры приходят с frontend
            for key, value in params.items():
                if key not in ['page', 'page_size', 'sort_by']:
                    print(f"FILTER PARAM: {key} = {value}")

            # 💰 Фильтры по цене
            price_min = params.get('price_min')
            price_max = params.get('price_max')

            if price_min:
                try:
                    price_min_val = float(price_min)
                    queryset = queryset.filter(price__gte=price_min_val)
                    print(f"💰 Applied price_min filter: {price_min_val}")
                except (ValueError, TypeError):
                    print(f"🚨 Invalid price_min value: {price_min}")

            if price_max:
                try:
                    price_max_val = float(price_max)
                    queryset = queryset.filter(price__lte=price_max_val)
                    print(f"💰 Applied price_max filter: {price_max_val}")
                except (ValueError, TypeError):
                    print(f"🚨 Invalid price_max value: {price_max}")

            # 🚗 Фильтры по марке и модели (простой подход как у цены)
            brand = params.get('brand')
            if brand and brand != '':
                # Простой поиск по модели и заголовку
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(model__icontains=brand) | Q(title__icontains=brand)
                )
                print(f"🚗 Applied brand filter: {brand}")

            model = params.get('model')
            if model and model != '':
                queryset = queryset.filter(model__icontains=model)
                print(f"🚗 Applied model filter: {model}")

            # 📅 Фильтры по году (поддерживаем оба формата параметров)
            year_from = params.get('year_from') or params.get('year_min')
            year_to = params.get('year_to') or params.get('year_max')

            # Извлекаем значение из списка, если это список
            if year_from and isinstance(year_from, list):
                year_from = year_from[0] if year_from else None
            if year_to and isinstance(year_to, list):
                year_to = year_to[0] if year_to else None

            if year_from:
                try:
                    year_from_val = int(year_from)
                    queryset = queryset.extra(
                        where=["CAST((dynamic_fields->>'year') AS INTEGER) >= %s"],
                        params=[year_from_val]
                    )
                    print(f"📅 Applied year_from filter: {year_from_val}")
                except (ValueError, TypeError):
                    print(f"🚨 Invalid year_from value: {year_from}")

            if year_to:
                try:
                    year_to_val = int(year_to)
                    queryset = queryset.extra(
                        where=["CAST((dynamic_fields->>'year') AS INTEGER) <= %s"],
                        params=[year_to_val]
                    )
                    print(f"📅 Applied year_to filter: {year_to_val}")
                except (ValueError, TypeError):
                    print(f"🚨 Invalid year_to value: {year_to}")

            # 🛣️ Фильтры по пробегу (поддерживаем оба формата параметров)
            mileage_from = params.get('mileage_from') or params.get('mileage_min')
            mileage_to = params.get('mileage_to') or params.get('mileage_max')

            # Извлекаем значение из списка, если это список
            if mileage_from and isinstance(mileage_from, list):
                mileage_from = mileage_from[0] if mileage_from else None
            if mileage_to and isinstance(mileage_to, list):
                mileage_to = mileage_to[0] if mileage_to else None

            if mileage_from:
                try:
                    mileage_from_val = int(mileage_from)
                    queryset = queryset.extra(
                        where=["CAST((dynamic_fields->>'mileage') AS INTEGER) >= %s"],
                        params=[mileage_from_val]
                    )
                    print(f"🛣️ Applied mileage_from filter: {mileage_from_val}")
                except (ValueError, TypeError):
                    print(f"🚨 Invalid mileage_from value: {mileage_from}")

            if mileage_to:
                try:
                    mileage_to_val = int(mileage_to)
                    queryset = queryset.extra(
                        where=["CAST((dynamic_fields->>'mileage') AS INTEGER) <= %s"],
                        params=[mileage_to_val]
                    )
                    print(f"🛣️ Applied mileage_to filter: {mileage_to_val}")
                except (ValueError, TypeError):
                    print(f"🚨 Invalid mileage_to value: {mileage_to}")

            # 📍 Каскадные фильтры: регион и город (простой подход как у цены)
            region = params.get('region')
            city = params.get('city')

            if region and region != '':
                # Фильтр по региону (области) - используем region_id для ForeignKey
                try:
                    region_id = int(region)
                    queryset = queryset.filter(region_id=region_id)
                    print(f"📍 Applied region filter by ID: {region_id}")
                except (ValueError, TypeError):
                    # Если не число, ищем по названию
                    queryset = queryset.filter(region__name__icontains=region)
                    print(f"📍 Applied region filter by name: {region}")

            if city and city != '':
                # Фильтр по городу - используем city_id для ForeignKey
                try:
                    city_id = int(city)
                    queryset = queryset.filter(city_id=city_id)
                    print(f"🏙️ Applied city filter by ID: {city_id}")
                except (ValueError, TypeError):
                    # Если не число, ищем по названию
                    queryset = queryset.filter(city__name__icontains=city)
                    print(f"🏙️ Applied city filter by name: {city}")

            # 📊 Фильтр по статусу (простой подход как у цены)
            status_param = params.get('status')
            if status_param and status_param != '':
                queryset = queryset.filter(status=status_param)
                print(f"📊 Applied status filter: {status_param}")

            # 🔍 Текстовый поиск по заголовку и описанию
            search = params.get('search')
            if search:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(title__icontains=search) |
                    Q(description__icontains=search) |
                    Q(model__icontains=search)
                )
                print(f"🔍 Applied search filter: {search}")

            # 🎨 Фильтры по характеристикам из JSON полей
            color = params.get('color')
            if color:
                queryset = queryset.extra(
                    where=["dynamic_fields->>'color' ILIKE %s"],
                    params=[f'%{color}%']
                )
                print(f"🎨 Applied color filter: {color}")

            fuel_type = params.get('fuel_type')
            if fuel_type:
                queryset = queryset.extra(
                    where=["dynamic_fields->>'fuel_type' ILIKE %s"],
                    params=[f'%{fuel_type}%']
                )
                print(f"⛽ Applied fuel_type filter: {fuel_type}")

            transmission = params.get('transmission')
            if transmission:
                queryset = queryset.extra(
                    where=["dynamic_fields->>'transmission' ILIKE %s"],
                    params=[f'%{transmission}%']
                )
                print(f"⚙️ Applied transmission filter: {transmission}")

            drive_type = params.get('drive_type')
            if drive_type:
                queryset = queryset.extra(
                    where=["dynamic_fields->>'drive_type' ILIKE %s"],
                    params=[f'%{drive_type}%']
                )
                print(f"🚗 Applied drive_type filter: {drive_type}")

            body_type = params.get('body_type')
            if body_type:
                queryset = queryset.extra(
                    where=["dynamic_fields->>'body_type' ILIKE %s"],
                    params=[f'%{body_type}%']
                )
                print(f"🚙 Applied body_type filter: {body_type}")

            condition = params.get('condition')
            if condition:
                queryset = queryset.extra(
                    where=["dynamic_fields->>'condition' ILIKE %s"],
                    params=[f'%{condition}%']
                )
                print(f"🔧 Applied condition filter: {condition}")

            # 🏪 Фильтр по типу продавца
            seller_type = params.get('seller_type')
            if seller_type:
                queryset = queryset.filter(seller_type=seller_type)
                print(f"🏪 Applied seller_type filter: {seller_type}")

            # 🔄 Фильтр по возможности обмена
            exchange_status = params.get('exchange_status')
            if exchange_status:
                queryset = queryset.filter(exchange_status=exchange_status)
                print(f"🔄 Applied exchange_status filter: {exchange_status}")

            # ✅ Булевы фильтры
            customs_cleared = params.get('customs_cleared')
            if customs_cleared is not None:
                customs_cleared_bool = customs_cleared.lower() in ['true', '1', 'yes']
                queryset = queryset.extra(
                    where=["(dynamic_fields->>'customs_cleared')::boolean = %s"],
                    params=[customs_cleared_bool]
                )
                print(f"✅ Applied customs_cleared filter: {customs_cleared_bool}")

            exchange_possible = params.get('exchange_possible')
            if exchange_possible is not None:
                exchange_possible_bool = exchange_possible.lower() in ['true', '1', 'yes']
                queryset = queryset.extra(
                    where=["(dynamic_fields->>'exchange_possible')::boolean = %s"],
                    params=[exchange_possible_bool]
                )
                print(f"🔄 Applied exchange_possible filter: {exchange_possible_bool}")

            installment_possible = params.get('installment_possible')
            if installment_possible is not None:
                installment_possible_bool = installment_possible.lower() in ['true', '1', 'yes']
                queryset = queryset.extra(
                    where=["(dynamic_fields->>'installment_possible')::boolean = %s"],
                    params=[installment_possible_bool]
                )
                print(f"💳 Applied installment_possible filter: {installment_possible_bool}")

            # Применяем CarAdFilter для быстрых фильтров
            if hasattr(self, 'filterset_class') and self.filterset_class:
                filterset = self.filterset_class(self.request.GET, queryset=queryset, request=self.request)
                if filterset.is_valid():
                    queryset = filterset.qs
                    print(f"🔧 Applied CarAdFilter, count: {queryset.count()}")

            print(f"🎯 Final queryset count: {queryset.count()}")

        return queryset.order_by('-created_at')

    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, CustomOrderingFilter]
    filterset_class = CarAdFilter
    search_fields = ['title', 'description', 'model']
    ordering_fields = ['created_at', 'updated_at', 'price', 'title', 'year_sort', 'mileage_sort']
    ordering = ['-created_at']

    @swagger_auto_schema(
        operation_summary="🚗 Browse Car Ads",
        operation_description="Get a paginated list of active car advertisements with filtering and search capabilities.",
        tags=['🚗 Advertisements']
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)


class CarAdCreateView(generics.CreateAPIView):
    """Create view for car advertisements with LLM validation."""
    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="📝 Post New Car Ad",
        operation_description="Create a new car advertisement with automatic LLM validation.",
        tags=['🚗 Advertisements']
    )
    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Create car ad without LLM moderation - simplified version."""
        from apps.accounts.models import AddsAccount
        from core.enums.ads import AdStatusEnum

        # Get or create user's account
        account, created = AddsAccount.objects.get_or_create(
            user=self.request.user,
            defaults={
                'organization_name': f"{self.request.user.email} Account",
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )

        # Create ad in DRAFT status first for moderation
        ad = serializer.save(
            account=account,
            status=AdStatusEnum.DRAFT,
            is_validated=False
        )

        # Проверяем лимиты перед переводом в ACTIVE
        try:
            from django.utils import timezone
            from ..services.account_limits import AccountLimitsService

            logger.info(f"🔍 PERFORM_CREATE: Starting limits check for ad {ad.id}")
            logger.info(f"🔍 PERFORM_CREATE: User: {self.request.user.email}")
            logger.info(f"🔍 PERFORM_CREATE: Ad status: {ad.status}")

            # Проверяем, можно ли перевести объявление в ACTIVE
            limits_check = AccountLimitsService.can_create_ad(self.request.user)
            logger.info(f"🔍 PERFORM_CREATE: Limits check result: {limits_check}")

            if limits_check['allowed']:
                # Лимиты позволяют - переводим в ACTIVE
                logger.info(f"✅ PERFORM_CREATE: Limits allow - activating ad {ad.id}")
                ad.status = AdStatusEnum.ACTIVE
                ad.is_validated = True
                ad.moderated_at = timezone.now()
                ad.moderation_reason = "Auto-approved (limits check passed)"
                ad.save(update_fields=['status', 'is_validated', 'moderated_at', 'moderation_reason'])

                logger.info(f"✅ Ad {ad.id} activated - limits check passed")
            else:
                # Лимиты превышены - оставляем в DRAFT (это нормально)
                logger.warning(f"⚠️ PERFORM_CREATE: Limits exceeded - keeping ad {ad.id} in DRAFT")
                ad.moderation_reason = f"Limits exceeded: {limits_check['reason']}"
                ad.save(update_fields=['moderation_reason'])

                logger.info(f"✅ Ad {ad.id} created in DRAFT - limits exceeded but ad saved successfully")

        except Exception as e:
            logger.error(f"❌ PERFORM_CREATE: Error in limits check: {e}")
            # Fallback: auto-approve if limits service fails
            ad.status = AdStatusEnum.ACTIVE
            ad.is_validated = True
            ad.moderation_reason = f"Auto-approved due to limits service error: {str(e)}"
            ad.save(update_fields=['status', 'is_validated', 'moderation_reason'])
            logger.info(f"✅ Ad {ad.id} auto-approved as fallback")


class CarAdDetailView(generics.RetrieveAPIView):
    """Detail view for car advertisements (public access)."""
    queryset = CarAd.objects.all()  # Показываем все объявления
    serializer_class = CarAdSerializer
    permission_classes = []  # Public access

    @swagger_auto_schema(
        operation_summary="🔍 View Car Ad Details",
        operation_description="Retrieve detailed information about a specific car advertisement.",
        tags=['🚗 Advertisements']
    )
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to track ad views."""
        instance = self.get_object()

        # Track the view
        self._track_ad_view(instance, request)

        # Return the normal response
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _track_ad_view(self, ad, request):
        """Track a view for the ad."""
        from ..services.view_tracker import AdViewTracker
        from ..models.car_metadata_model import CarMetadataModel

        # Get client information
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        referrer = request.META.get('HTTP_REFERER', '')
        session_key = request.session.session_key

        # Track the view using the old system
        view_tracked = AdViewTracker.track_view(
            ad=ad,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer=referrer,
            session_key=session_key
        )

        # Metadata counter is now updated only through TrackAdInteractionAPI to avoid double counting
        # The frontend will send a POST to /api/ads/analytics/track/ad-interaction/ which handles metadata updates
        print(f"[CarAdDetailView] View tracked: {view_tracked} for ad {ad.id}")

    def _get_client_ip(self, request):
        """Get the client's IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CarAdUpdateView(generics.UpdateAPIView):
    """Update view for car advertisements with LLM validation."""
    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]  # Временно убираем ограничение владельца

    @swagger_auto_schema(
        operation_summary="✏️ Edit My Car Ad",
        operation_description="Update an existing car advertisement with automatic LLM validation.",
        tags=['🚗 Advertisements']
    )
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Partially update car advertisement",
        operation_description="Partially update an existing car advertisement with automatic LLM validation.",
        tags=['🚗 Advertisements']
    )
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def get_queryset(self):
        """Allow editing all ads for authenticated users."""
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()

        # Разрешаем редактирование всех объявлений для авторизованных пользователей
        return CarAd.objects.all().select_related('account')

    def perform_update(self, serializer):
        """Simple update without moderation to avoid errors."""
        from core.enums.ads import AdStatusEnum
        from django.utils import timezone
        import logging

        logger = logging.getLogger(__name__)

        # Убеждаемся, что account не передается в данных (он не должен изменяться)
        if 'account' in serializer.validated_data:
            serializer.validated_data.pop('account')

        # Save the changes without moderation
        ad = serializer.save()

        # Check if content fields are being updated
        content_fields = ['title', 'description', 'price']
        content_changed = any(field in serializer.validated_data for field in content_fields)

        if content_changed:
            # For now, auto-approve all updates to avoid moderation errors
            ad.status = AdStatusEnum.ACTIVE
            ad.is_validated = True
            ad.moderated_at = timezone.now()
            ad.moderation_reason = "Auto-approved update (moderation temporarily disabled)"
            ad.save(update_fields=['status', 'is_validated', 'moderated_at', 'moderation_reason'])

            logger.info(f"✅ Ad {ad.id} updated and auto-approved")

        logger.info(f"✅ Ad {ad.id} updated successfully")


class CarAdDeleteView(generics.DestroyAPIView):
    """Delete view for car advertisements."""
    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]  # Убираем ограничение владельца

    @swagger_auto_schema(
        operation_summary="🗑️ Remove Car Ad",
        operation_description="Delete an existing car advertisement.",
        tags=['🚗 Advertisements']
    )
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

    def get_queryset(self):
        """Allow deleting all ads for authenticated users."""
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()

        # Разрешаем удаление всех объявлений для авторизованных пользователей
        return CarAd.objects.all().select_related('account')


class MyCarAdsListView(generics.ListAPIView):
    """List view for user's own car advertisements."""
    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]

    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarAdFilter
    search_fields = ['title', 'description', 'model']
    ordering_fields = ['created_at', 'updated_at', 'price', 'title', 'is_validated', 'dynamic_fields__year', 'dynamic_fields__mileage']
    ordering = ['-created_at']

    @swagger_auto_schema(
        operation_summary="📋 My Car Advertisements",
        operation_description="Get a list of car advertisements created by the authenticated user.",
        tags=['🚗 Advertisements']
    )
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def get_queryset(self):
        """Filter to user's own ads with optimized queries."""
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()

        from django.db.models import Prefetch, Q
        from apps.ads.models import AddImageModel

        return CarAd.objects.filter(
            account__user=self.request.user
        ).select_related(
            'account', 'account__user', 'mark', 'moderated_by',
            'region', 'city'  # Добавляем для оптимизации
        ).prefetch_related(
            Prefetch(
                'images',
                queryset=AddImageModel.objects.filter(
                    Q(is_primary=True) | Q(image__isnull=False)
                ).order_by('-is_primary', 'id')[:10],  # Ограничиваем количество
                to_attr='prefetched_images'
            )
        ).order_by('-created_at')

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from core.enums.ads import AdStatusEnum

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser])
def owner_update_ad_status(request, pk: int):
    """Allow ad owner to update status without superuser rights.

    Accepts JSON {"status": "<ad_status>"} where status is one of AdStatusEnum values.
    Validates that the ad belongs to the authenticated user.
    """
    try:
        ad = get_object_or_404(CarAd, pk=pk)
        if not getattr(ad, 'account', None) or not getattr(ad.account, 'user', None) or ad.account.user != request.user:
            return Response({'error': 'forbidden'}, status=403)

        # Get status from request data
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status is required'}, status=400)

        # Validate status
        valid_values = [c[0] for c in AdStatusEnum.choices]
        if new_status not in valid_values:
            return Response({'error': 'invalid status', 'allowed': valid_values}, status=400)

        # Apply new status
        ad.status = new_status
        ad.is_validated = new_status == AdStatusEnum.ACTIVE
        ad.save(update_fields=['status', 'is_validated', 'updated_at'])
        
        # Return success response with updated ad data
        from apps.ads.serializers.car_ad_serializer import CarAdSerializer
        serializer = CarAdSerializer(ad, context={'request': request})
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f'Error updating ad status: {str(e)}', exc_info=True)
        return Response({'error': 'Internal server error'}, status=500)


# Function-based views for additional functionality

@swagger_auto_schema(
    method='post',
    operation_summary="Validate car ad content",
    operation_description="""
    Validate car advertisement content using LLM without saving changes.

    This endpoint allows validating an ad's content before saving.
    """,
    tags=['🚗 Advertisements'],
    responses={
        200: "Validation result with status and suggestions",
        404: "Ad not found",
        403: "Permission denied"
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_car_ad(request, pk):
    """
    Validate car ad content using LLM without saving changes.
    """
    try:
        ad = get_object_or_404(CarAd, pk=pk)

        # Check permissions
        if not request.user.is_staff and ad.account.user != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get content from request or use existing
        title = request.data.get('title', ad.title)
        description = request.data.get('description', ad.description)
        price = request.data.get('price', ad.price)

        # Интеллектуальная LLM-модерация
        try:
            from core.services.llm_moderation import moderate_car_ad_content, llm_moderation_service

            moderation_result = moderate_car_ad_content(
                title=title,
                description=description,
                price=float(price) if price else None
            )

            # Создаем цензурированный контент
            censored_title = llm_moderation_service.get_censored_content(title, moderation_result.censored_text)
            censored_description = llm_moderation_service.get_censored_content(description, moderation_result.censored_text)

            return Response({
                'ad_id': ad.id,
                'validation_status': moderation_result.status.value,
                'confidence': moderation_result.confidence,
                'violations': [v.value for v in moderation_result.violations],
                'suggestions': moderation_result.suggestions,
                'flagged_content': moderation_result.flagged_text,
                'censored_content': {
                    'title': censored_title,
                    'description': censored_description,
                    'mapping': moderation_result.censored_text
                },
                'language_detected': moderation_result.language_detected,
                'processing_time_ms': moderation_result.processing_time_ms,
                'reason': moderation_result.reason,
                'can_publish': moderation_result.status.value == 'approved'
            })

        except Exception as e:
            logger.error(f"LLM moderation failed: {str(e)}")
            # Fallback к простой проверке
            violations = []
            if any(word in title.lower() for word in ['блять', 'хуй', 'пизд']):
                violations.append('profanity_in_title')
            if any(word in description.lower() for word in ['блять', 'хуй', 'пизд']):
                violations.append('profanity_in_description')

            validation_status = 'rejected' if violations else 'approved'

            return Response({
                'ad_id': ad.id,
                'validation_status': validation_status,
                'confidence': 0.95,
                'violations': violations,
                'suggestions': ['Remove profanity from content'] if violations else [],
                'flagged_content': [title, description] if violations else [],
                'reason': 'Profanity detected' if violations else 'Content approved',
                'can_publish': validation_status == 'approved'
            })


    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        return Response({
            'error': 'Validation failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TestModerationView(generics.GenericAPIView):
    """
    Тестирование модерации без создания объявления
    Показывает полный процесс модерации
    """
    permission_classes = [AllowAny]  # Открытый доступ для тестирования

    @swagger_auto_schema(
        operation_summary="🧪 Test Moderation",
        operation_description="Test content moderation without creating an advertisement. Shows full moderation process with LLM validation.",
        tags=['🚗 Advertisements'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'title': openapi.Schema(type=openapi.TYPE_STRING, description='Advertisement title'),
                'description': openapi.Schema(type=openapi.TYPE_STRING, description='Advertisement description'),
                'price': openapi.Schema(type=openapi.TYPE_NUMBER, description='Price'),
                'model': openapi.Schema(type=openapi.TYPE_STRING, description='Car model'),
                'year': openapi.Schema(type=openapi.TYPE_INTEGER, description='Car year'),
                'mileage': openapi.Schema(type=openapi.TYPE_INTEGER, description='Car mileage')
            }
        ),
        responses={
            200: openapi.Response(
                description='Moderation test completed successfully',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'moderation_result': openapi.Schema(type=openapi.TYPE_OBJECT),
                        'llm_analysis': openapi.Schema(type=openapi.TYPE_OBJECT),
                        'additional_checks': openapi.Schema(type=openapi.TYPE_OBJECT),
                        'final_decision': openapi.Schema(type=openapi.TYPE_OBJECT)
                    }
                )
            ),
            500: openapi.Response(description='Moderation test failed')
        }
    )
    def post(self, request):
        """
        Тестирует модерацию контента без создания объявления
        """
        try:
            # Получаем данные из запроса
            title = request.data.get('title', '')
            description = request.data.get('description', '')
            price = request.data.get('price')

            # Дополнительные поля
            additional_fields = {
                'model': request.data.get('model', ''),
                'region': request.data.get('region', ''),
                'city': request.data.get('city', ''),
                'dynamic_fields': request.data.get('dynamic_fields', {})
            }

            # Этап 1: LLM модерация
            from core.services.llm_moderation import moderate_car_ad_content

            moderation_result = moderate_car_ad_content(
                title=title,
                description=description,
                price=float(price) if price else None,
                **additional_fields
            )

            # Этап 2: Дополнительные проверки
            additional_checks = self._perform_additional_checks(title, description, price)

            # Объединяем результаты
            final_result = self._combine_moderation_results(moderation_result, additional_checks, request.data)

            return Response(final_result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Moderation test failed: {str(e)}")
            return Response({
                'error': 'Moderation test failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _perform_additional_checks(self, title: str, description: str, price) -> Dict:
        """Дополнительные проверки (этап 2)"""
        checks = {
            'price_check': self._check_price_validity(price),
            'length_check': self._check_content_length(title, description),
            'spam_check': self._check_spam_indicators(title, description),
            'completeness_check': self._check_content_completeness(title, description)
        }

        overall_score = sum(check['score'] for check in checks.values()) / len(checks)

        return {
            'overall_score': overall_score,
            'checks': checks,
            'passed': overall_score > 0.5  # Снижаем порог с 0.7 до 0.5 для более лояльной модерации
        }

    def _check_price_validity(self, price) -> Dict:
        """Проверка адекватности цены"""
        if not price:
            return {'score': 0.8, 'reason': 'Price not specified (acceptable)'}  # Повышаем с 0.5 до 0.8

        try:
            price_val = float(price)
            if price_val <= 0:
                return {'score': 0.0, 'reason': 'Invalid price (zero or negative)'}
            elif price_val < 100:
                return {'score': 0.6, 'reason': 'Low price (acceptable)'}  # Повышаем с 0.3 до 0.6
            elif price_val > 1000000:
                return {'score': 0.7, 'reason': 'High price (acceptable)'}  # Повышаем с 0.4 до 0.7
            else:
                return {'score': 1.0, 'reason': 'Price looks reasonable'}
        except:
            return {'score': 0.0, 'reason': 'Invalid price format'}

    def _check_content_length(self, title: str, description: str) -> Dict:
        """Проверка длины контента"""
        title_len = len(title) if title else 0
        desc_len = len(description) if description else 0

        if title_len < 10:
            return {'score': 0.6, 'reason': 'Title short but acceptable'}  # Повышаем с 0.3 до 0.6
        elif title_len > 100:
            return {'score': 0.8, 'reason': 'Title long but acceptable'}   # Повышаем с 0.7 до 0.8
        elif desc_len < 20:
            return {'score': 0.7, 'reason': 'Description short but acceptable'}  # Повышаем с 0.5 до 0.7
        elif desc_len > 2000:
            return {'score': 0.8, 'reason': 'Description long but acceptable'}   # Повышаем с 0.6 до 0.8
        else:
            return {'score': 1.0, 'reason': 'Content length is good'}

    def _check_spam_indicators(self, title: str, description: str) -> Dict:
        """Проверка на спам"""
        import re
        full_text = f"{title} {description}".lower()

        # Проверяем повторяющиеся символы
        if re.search(r'(.)\1{4,}', full_text):
            return {'score': 0.2, 'reason': 'Too many repeating characters'}

        # Проверяем КАПС
        caps_ratio = len(re.findall(r'[A-ZА-Я]', title + description)) / max(1, len(title + description))
        if caps_ratio > 0.5:
            return {'score': 0.3, 'reason': 'Too much CAPS'}

        return {'score': 1.0, 'reason': 'No spam indicators'}

    def _check_content_completeness(self, title: str, description: str) -> Dict:
        """Проверка полноты информации"""
        score = 0.5  # Базовый балл

        if title and len(title) > 15:
            score += 0.2

        if description and len(description) > 50:
            score += 0.3

        return {'score': min(1.0, score), 'reason': 'Content completeness checked'}

    def _combine_moderation_results(self, llm_result, additional_checks, request_data) -> Dict:
        """Объединяет результаты LLM и дополнительных проверок"""
        # Определяем финальный статус
        if llm_result.status.value == 'rejected':
            final_status = 'rejected'
            final_reason = llm_result.reason
        elif not additional_checks['passed']:
            final_status = 'needs_review'
            final_reason = 'Failed additional quality checks'
        else:
            final_status = 'approved'
            final_reason = 'Passed all moderation stages'

        return {
            'moderation_stages': {
                'stage_1_llm': {
                    'status': llm_result.status.value,
                    'confidence': llm_result.confidence,
                    'violations': [v.value for v in llm_result.violations],
                    'flagged_content': llm_result.flagged_text,
                    'censored_content': {
                        'mapping': llm_result.censored_text,
                        'censored_title': self._apply_censorship(request_data.get('title', ''), llm_result.censored_text),
                        'censored_description': self._apply_censorship(request_data.get('description', ''), llm_result.censored_text)
                    },
                    'language_detected': llm_result.language_detected,
                    'processing_time_ms': llm_result.processing_time_ms,
                    'reason': llm_result.reason,
                    'suggestions': llm_result.suggestions
                },
                'stage_2_additional': additional_checks
            },
            'final_decision': {
                'status': final_status,
                'reason': final_reason,
                'can_publish': final_status == 'approved',
                'overall_confidence': min(llm_result.confidence, additional_checks['overall_score'])
            }
        }

    def _apply_censorship(self, text: str, censorship_mapping: Dict[str, str]) -> str:
        """Применяет цензуру к тексту"""
        result = text
        for original, censored in censorship_mapping.items():
            result = result.replace(original, censored)
        return result


@swagger_auto_schema(
    method='get',
    operation_summary="Get car ad statistics",
    operation_description="""
    Get statistics about car advertisements.
    Only available for staff users.
    """,
    tags=['🚗 Advertisements'],
    responses={
        200: "Car ad statistics",
        403: "Permission denied"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def car_ad_statistics(request):
    """Get car ad statistics (staff only)."""
    if not request.user.is_staff:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    from django.db.models import Count, Avg, Min, Max

    total_ads = CarAd.objects.count()
    validated_ads = CarAd.objects.filter(is_validated=True).count()
    pending_ads = CarAd.objects.filter(is_validated=False).count()

    # Price statistics
    price_stats = CarAd.objects.aggregate(
        avg_price=Avg('price'),
        min_price=Min('price'),
        max_price=Max('price')
    )

    # Top marks
    top_marks = CarAd.objects.values('mark__name').annotate(
        count=Count('id')
    ).order_by('-count')[:10]

    # Top regions
    top_regions = CarAd.objects.values('region').annotate(
        count=Count('id')
    ).order_by('-count')[:10]

    return Response({
        'total_ads': total_ads,
        'validated_ads': validated_ads,
        'pending_ads': pending_ads,
        'validation_rate': (validated_ads / total_ads * 100) if total_ads > 0 else 0,
        'price_statistics': price_stats,
        'top_marks': [
            {'mark': item['mark__name'], 'count': item['count']}
            for item in top_marks
        ],
        'top_regions': [
            {'region': item['region'], 'count': item['count']}
            for item in top_regions
        ]
    })


@swagger_auto_schema(
    method='get',
    operation_summary="Get ad analytics",
    operation_description="""
    Get detailed analytics for a specific advertisement.

    Available only for premium account holders and only for their own ads.
    Basic account holders will receive a message to upgrade to premium.

    Analytics include:
    - Total views count
    - Views by period (today, this week, this month)
    - Average prices in the region and across Ukraine
    - Price position percentile
    """,
    tags=['🚗 Advertisements'],
    responses={
        200: "Ad analytics data",
        403: "Permission denied or not premium account",
        404: "Ad not found"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def car_ad_analytics(request, ad_id):
    """Get analytics for a specific car ad."""
    from ..services.analytics import AdAnalyticsService
    from core.permissions import IsPremiumUser

    # Get the ad
    ad = get_object_or_404(CarAd, id=ad_id)

    # Check if user owns the ad or is superuser
    if not request.user.is_superuser and ad.account.user != request.user:
        return Response(
            {'error': 'You can only view analytics for your own ads'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if user has premium access (unless superuser)
    if not request.user.is_superuser:
        premium_permission = IsPremiumUser()
        if not premium_permission.has_permission(request, None):
            return Response({
                'ad_id': ad.id,
                'title': ad.title,
                'status': ad.status,
                'is_validated': ad.is_validated,
                'created_at': ad.created_at,
                'is_premium': False,
                'message': 'Upgrade to premium to view detailed analytics',
                'upgrade_url': '/accounts/upgrade/'
            })

    # Get analytics using the existing service
    analytics_data = AdAnalyticsService.get_ad_analytics(ad, request.user)

    # Check if there's an error (permission denied)
    if 'error' in analytics_data:
        return Response(
            analytics_data,
            status=status.HTTP_403_FORBIDDEN
        )

    return Response(analytics_data)


@swagger_auto_schema(
    method='get',
    operation_summary="Check ad creation limits",
    operation_description="""
    Check if the authenticated user can create a new car advertisement based on their account type limitations.

    Returns information about current usage and limits.
    """,
    tags=['🚗 Advertisements'],
    responses={
        200: "Limit check result",
        401: "Authentication required"
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_ad_creation_limits(request):
    """Check if user can create a new ad based on account type limitations."""
    from ..services.account_limits import AccountLimitsService

    result = AccountLimitsService.can_create_ad(request.user)

    if result['allowed']:
        return Response({
            'can_create': True,
            'account_type': result['account_type'],
            'current_ads': result['current_ads'],
            'max_ads': result['max_ads'],
            'message': result['reason']
        })
    else:
        # Правильная валидация - возвращаем 400 для превышения лимитов
        return Response({
            'can_create': False,
            'account_type': result.get('account_type'),
            'current_ads': result.get('current_ads'),
            'max_ads': result.get('max_ads'),
            'error_code': result.get('code'),
            'message': result['reason'],
            'upgrade_message': result.get('upgrade_message'),
            'upgrade_url': result.get('upgrade_url')
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@swagger_auto_schema(
    operation_description="Check account limits for creating car ads",
    responses={
        200: "Account limits information",
        401: "Authentication required"
    }
)
def car_ad_check_limits(request):
    """
    Check account limits for creating car ads.

    Returns information about:
    - Current account type (BASIC/PREMIUM)
    - Current number of active ads
    - Maximum allowed ads
    - Whether user can create more ads
    - Upgrade information if needed
    """
    try:
        # Get user's account
        account = request.user.accounts.first()
        if not account:
            return Response({
                'error': 'No account found for user',
                'can_create': False,
                'account_type': None,
                'current_ads': 0,
                'max_ads': 0
            }, status=status.HTTP_400_BAD_REQUEST)

        # Count current active ads
        current_ads = CarAd.objects.filter(
            account=account,
            status__in=[AdStatusEnum.ACTIVE, AdStatusEnum.PENDING]
        ).count()

        # Determine limits based on account type
        if account.account_type == 'BASIC':
            max_ads = 1
            can_create = current_ads < max_ads
            upgrade_message = "Upgrade to PREMIUM for unlimited ads" if not can_create else None
        elif account.account_type == 'PREMIUM':
            max_ads = -1  # Unlimited
            can_create = True
            upgrade_message = None
        else:
            max_ads = 0
            can_create = False
            upgrade_message = "Unknown account type"

        return Response({
            'can_create': can_create,
            'account_type': account.account_type,
            'current_ads': current_ads,
            'max_ads': max_ads,
            'upgrade_message': upgrade_message,
            'organization_name': account.organization_name
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error checking account limits: {str(e)}")
        return Response({
            'error': 'Internal server error',
            'can_create': False,
            'account_type': None,
            'current_ads': 0,
            'max_ads': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='delete',
    operation_summary="🗑️ Cleanup All Ads",
    operation_description="Special endpoint for complete cleanup of all advertisements. Used only for testing and development.",
    tags=['🚗 Advertisements'],
    responses={
        200: openapi.Response(
            description='All ads cleaned up successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'message': openapi.Schema(type=openapi.TYPE_STRING),
                    'deleted_count': openapi.Schema(type=openapi.TYPE_INTEGER)
                }
            )
        ),
        500: openapi.Response(description='Cleanup failed')
    }
)
@api_view(['DELETE'])
@permission_classes([AllowAny])  # Разрешаем всем для тестирования
def cleanup_all_ads(request):
    """
    Специальный endpoint для полной очистки всех объявлений.
    Используется только для тестирования и разработки.
    """
    try:
        from django.core.management import call_command
        from io import StringIO
        import sys

        # Перехватываем вывод команды
        old_stdout = sys.stdout
        sys.stdout = captured_output = StringIO()

        try:
            # Вызываем management команду
            call_command('cleanup_all_ads')
            output = captured_output.getvalue()
        finally:
            sys.stdout = old_stdout

        # Извлекаем количество удаленных из вывода
        deleted_count = 0
        if 'удалено' in output:
            import re
            match = re.search(r'удалено (\d+)', output)
            if match:
                deleted_count = int(match.group(1))

        logger.info(f"✅ Cleanup completed via management command: {deleted_count} ads deleted")

        return Response({
            'success': True,
            'deleted': deleted_count,
            'output': output,
            'message': f'Successfully deleted {deleted_count} car advertisements'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"❌ Error during cleanup: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'deleted': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

