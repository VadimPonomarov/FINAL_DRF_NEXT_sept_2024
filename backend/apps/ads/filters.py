"""
Django filters for AutoRia ads application.
Provides comprehensive filtering capabilities for car advertisements and related models.
"""

import django_filters
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.ads.models import (
    CarAd, CarMarkModel, CarColorModel, RegionModel, CityModel,
    CarModel, CarGenerationModel, CarModificationModel
)
from core.enums.cars import SellerType, ExchangeStatus, Currency
from core.enums.ads import AdStatusEnum


class CarAdFilter(django_filters.FilterSet):
    """
    Comprehensive filter for car advertisements.
    
    Supports filtering by:
    - Basic fields (price, year, mileage)
    - Location (region, city)
    - Car specifications (mark, model, color)
    - Status fields (validation, seller type)
    - Date ranges
    - Text search
    """
    
    # Price filters with currency support
    price_min = django_filters.NumberFilter(
        method='filter_price_min',
        help_text=_('Minimum price')
    )
    price_max = django_filters.NumberFilter(
        method='filter_price_max',
        help_text=_('Maximum price')
    )
    price_currency = django_filters.CharFilter(
        method='filter_price_currency',
        help_text=_('Price currency (USD, EUR, UAH)')
    )
    price_range = django_filters.RangeFilter(
        field_name='price',
        help_text=_('Price range (min,max)')
    )
    
    # Currency filter with dropdown
    currency = django_filters.ChoiceFilter(
        choices=[
            ('USD', 'US Dollar'),
            ('EUR', 'Euro'),
            ('UAH', 'Ukrainian Hryvnia'),
        ],
        help_text=_('Currency'),
        empty_label="Any currency"
    )

    # Seller type filter with dropdown
    seller_type = django_filters.ChoiceFilter(
        choices=[
            ('private', 'Private seller'),
            ('dealer', 'Car dealer'),
            ('company', 'Company'),
        ],
        help_text=_('Type of seller'),
        empty_label="Any seller type"
    )

    # Exchange status filter with dropdown
    exchange_status = django_filters.ChoiceFilter(
        choices=[
            ('no_exchange', 'No exchange'),
            ('possible', 'Exchange possible'),
            ('only_exchange', 'Only exchange'),
        ],
        help_text=_('Exchange status'),
        empty_label="Any exchange status"
    )

    # Ad status filter with dropdown
    status = django_filters.ChoiceFilter(
        choices=AdStatusEnum.choices,
        help_text=_('Advertisement status'),
        empty_label="Any status"
    )
    
    # Location filters - поддерживаем как ID, так и название
    region = django_filters.CharFilter(
        method='filter_region',
        help_text=_('Region (ID or name)')
    )
    city = django_filters.CharFilter(
        method='filter_city',
        help_text=_('City (ID or name)')
    )
    
    # Car specification filters with dropdowns
    mark = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Car mark/brand')
    )
    model = django_filters.CharFilter(
        field_name='model',
        lookup_expr='icontains',
        help_text=_('Car model'),
    )

    # Vehicle type filter (stored in dynamic_fields)
    vehicle_type = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Vehicle type')
    )
    
    # Dynamic fields filters (from JSON field) - синхронизируем с ViewSet
    year_from = django_filters.NumberFilter(
        method='filter_dynamic_field_gte',
        help_text=_('Minimum year')
    )
    year_to = django_filters.NumberFilter(
        method='filter_dynamic_field_lte',
        help_text=_('Maximum year')
    )
    mileage_from = django_filters.NumberFilter(
        method='filter_dynamic_field_gte',
        help_text=_('Minimum mileage')
    )
    mileage_to = django_filters.NumberFilter(
        method='filter_dynamic_field_lte',
        help_text=_('Maximum mileage')
    )
    engine_volume_min = django_filters.NumberFilter(
        method='filter_dynamic_field_gte',
        help_text=_('Minimum engine volume')
    )
    engine_volume_max = django_filters.NumberFilter(
        method='filter_dynamic_field_lte',
        help_text=_('Maximum engine volume')
    )
    
    fuel_type = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Fuel type')
    )
    transmission = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Transmission type')
    )
    body_type = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Body type')
    )
    color = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Car color')
    )
    condition = django_filters.CharFilter(
        method='filter_dynamic_field_exact',
        help_text=_('Car condition')
    )
    
    # Убираем дублированные фильтры - они уже определены выше (строки 61-80)
    is_validated = django_filters.BooleanFilter(
        help_text=_('Validation status')
    )
    
    # Date filters
    created_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        help_text=_('Created after date')
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        help_text=_('Created before date')
    )
    updated_after = django_filters.DateTimeFilter(
        field_name='updated_at',
        lookup_expr='gte',
        help_text=_('Updated after date')
    )
    
    # Text search filters
    search = django_filters.CharFilter(
        method='filter_search',
        help_text=_('Search in title and description')
    )
    title_contains = django_filters.CharFilter(
        field_name='title',
        lookup_expr='icontains',
        help_text=_('Title contains text')
    )
    description_contains = django_filters.CharFilter(
        field_name='description',
        lookup_expr='icontains',
        help_text=_('Description contains text')
    )

    # User and favorites filters
    user_id = django_filters.NumberFilter(
        field_name='account__user__id',
        help_text=_('Filter by user ID')
    )
    favorites_only = django_filters.BooleanFilter(
        method='filter_favorites_only',
        help_text=_('Show only favorite ads for authenticated user')
    )

    # Photo filter
    with_photos_only = django_filters.BooleanFilter(
        method='filter_with_photos_only',
        help_text=_('Show only ads with photos')
    )

    # My ads filter
    my_ads_only = django_filters.BooleanFilter(
        method='filter_my_ads_only',
        help_text=_('Show only ads created by authenticated user')
    )

    # Invert my ads filter
    invert_my_ads = django_filters.BooleanFilter(
        method='filter_invert_my_ads',
        help_text=_('Invert my ads filter - show all ads except user\'s own')
    )

    # Invert favorites filter
    invert_favorites = django_filters.BooleanFilter(
        method='filter_invert_favorites',
        help_text=_('Invert favorites filter - show all ads except favorites')
    )

    # Invert photos filter
    invert_photos = django_filters.BooleanFilter(
        method='filter_invert_photos',
        help_text=_('Invert photos filter - show only ads without photos')
    )
    
    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('created_at', 'created_at'),
            ('updated_at', 'updated_at'),
            ('price', 'price'),
            ('title', 'title'),
            ('year_sort', 'year_sort'),
            ('mileage_sort', 'mileage_sort'),
        ),
        field_labels={
            'created_at': _('Creation date'),
            'updated_at': _('Update date'),
            'price': _('Price'),
            'title': _('Title'),
            'year_sort': _('Year'),
            'mileage_sort': _('Mileage'),
        },
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = CarAd
        fields = {
            'id': ['exact', 'in'],
            'title': ['exact', 'icontains'],
            'description': ['icontains'],
            # 'price': ['exact', 'gte', 'lte', 'range'],  # Убираем, чтобы использовать кастомные методы
            'currency': ['exact'],
            # 'region': убираем, используем только кастомный метод filter_region
            # 'city': убираем, используем только кастомный метод filter_city
            'seller_type': ['exact'],
            'exchange_status': ['exact'],
            'status': ['exact'],
            'is_validated': ['exact'],
            'created_at': ['exact', 'gte', 'lte', 'date'],
            'updated_at': ['exact', 'gte', 'lte', 'date'],
            'account__user__id': ['exact'],  # Для фильтра user_id
        }
    
    def filter_dynamic_field_gte(self, queryset, name, value):
        """Filter dynamic field with greater than or equal (PostgreSQL JSON)."""
        # Обрабатываем новые названия параметров
        field_name = name.replace('_from', '').replace('_min', '')
        print(f"🔥 [DJANGO-FILTER] filter_dynamic_field_gte called: {name} = {value} -> field: {field_name}")
        # Используем raw SQL для PostgreSQL JSON операций
        return queryset.extra(
            where=["CAST((dynamic_fields->>%s) AS INTEGER) >= %s"],
            params=[field_name, value]
        )

    def filter_dynamic_field_lte(self, queryset, name, value):
        """Filter dynamic field with less than or equal (PostgreSQL JSON)."""
        # Обрабатываем новые названия параметров
        field_name = name.replace('_to', '').replace('_max', '')
        print(f"🔥 [DJANGO-FILTER] filter_dynamic_field_lte called: {name} = {value} -> field: {field_name}")
        # Используем raw SQL для PostgreSQL JSON операций
        return queryset.extra(
            where=["CAST((dynamic_fields->>%s) AS INTEGER) <= %s"],
            params=[field_name, value]
        )

    def filter_dynamic_field_exact(self, queryset, name, value):
        """Filter dynamic field with exact match (PostgreSQL JSON)."""
        # Используем raw SQL для PostgreSQL JSON операций
        return queryset.extra(
            where=["dynamic_fields->>%s = %s"],
            params=[name, value]
        )
    
    def filter_search(self, queryset, name, value):
        """Search in all visible content of the card (case insensitive partial match)."""
        if not value or not value.strip():
            return queryset

        search_term = value.strip()
        print(f"🔍 Search filter called with value: '{search_term}'")

        # Поиск по всему видимому контенту карточки
        search_query = (
            models.Q(title__icontains=search_term) |           # Заголовок
            models.Q(description__icontains=search_term) |     # Описание
            models.Q(mark__name__icontains=search_term) |          # Марка (Volkswagen)
            models.Q(model__icontains=search_term) |               # Модель (Golf)
            models.Q(city__name__icontains=search_term) |          # Город (Днепр) - через ForeignKey
            models.Q(region__name__icontains=search_term) |        # Регион - через ForeignKey
            models.Q(price__icontains=search_term) |               # Цена (18000)
            models.Q(dynamic_fields__icontains=search_term)        # JSON поля (год, пробег, etc)
        )

        result = queryset.filter(search_query)

        print(f"🔍 Search result count: {result.count()}")

        # Для отладки - покажем первые несколько результатов
        if result.exists():
            for ad in result[:3]:
                print(f"🔍 Found: '{ad.title}' (mark: {ad.mark.name if ad.mark else 'N/A'})")

        return result

    # Курсы валют к USD (сколько USD за 1 единицу валюты)
    CURRENCY_TO_USD_RATES = {
        'USD': 1.0,        # 1 USD = 1 USD
        'EUR': 1.18,       # 1 EUR = 1.18 USD (примерно)
        'UAH': 0.027,      # 1 UAH = 0.027 USD (примерно 1 USD = 37 UAH)
    }

    def convert_to_usd(self, amount, currency):
        """
        Конвертирует сумму из любой валюты в USD для сравнения в базе данных.

        Args:
            amount: сумма в исходной валюте
            currency: исходная валюта (USD/EUR/UAH)

        Returns:
            float: сумма в USD
        """
        if not amount or not currency:
            return amount

        currency = currency.upper()
        if currency not in self.CURRENCY_TO_USD_RATES:
            print(f"⚠️ Unknown currency: {currency}, using as USD")
            return float(amount)

        # Конвертируем в USD
        rate = self.CURRENCY_TO_USD_RATES[currency]
        usd_amount = float(amount) * rate

        print(f"💱 Currency conversion: {amount} {currency} × {rate} = {usd_amount} USD")
        return usd_amount

    def filter_price_min(self, queryset, name, value):
        """Фильтр минимальной цены с учетом валюты."""
        print(f"🚨🚨🚨 FILTER_PRICE_MIN CALLED! Value: {value}, Type: {type(value)}")

        if not value:
            print("🚨 No value provided, returning original queryset")
            return queryset

        try:
            # Простая фильтрация без сложной логики
            print(f"💰 Filtering by price >= {value}")
            filtered_queryset = queryset.filter(price__gte=value)

            print(f"💰 Original count: {queryset.count()}, Filtered count: {filtered_queryset.count()}")

            return filtered_queryset
        except Exception as e:
            print(f"🚨 Error in filter_price_min: {e}")
            return queryset

    def filter_price_max(self, queryset, name, value):
        """Фильтр максимальной цены с учетом валюты."""
        print(f"🚨🚨🚨 FILTER_PRICE_MAX CALLED! Value: {value}, Type: {type(value)}")

        if not value:
            print("🚨 No value provided, returning original queryset")
            return queryset

        try:
            # Простая фильтрация без сложной логики
            print(f"💰 Filtering by price <= {value}")
            filtered_queryset = queryset.filter(price__lte=value)

            print(f"💰 Original count: {queryset.count()}, Filtered count: {filtered_queryset.count()}")

            return filtered_queryset
        except Exception as e:
            print(f"🚨 Error in filter_price_max: {e}")
            return queryset

    def filter_price_currency(self, queryset, name, value):
        """Фильтр валюты (не фильтрует queryset, только сохраняет значение)."""
        # Этот фильтр не изменяет queryset, только сохраняет валюту для других фильтров
        return queryset

    # Курсы валют (примерные, в реальном проекте лучше получать из API)
    CURRENCY_RATES = {
        'USD': 1.0,      # Базовая валюта
        'EUR': 0.85,     # 1 USD = 0.85 EUR
        'UAH': 37.0,     # 1 USD = 37 UAH
    }

    def convert_to_usd(self, amount, currency):
        """Конвертирует сумму в USD для сравнения в базе данных."""
        if not amount or not currency:
            return amount

        currency = currency.upper()
        if currency not in self.CURRENCY_RATES:
            return amount

        # Конвертируем в USD
        rate = self.CURRENCY_RATES[currency]
        return float(amount) / rate



    def filter_favorites_only(self, queryset, name, value):
        """Filter to show only user's favorite ads (per-user based via FavoriteAd)."""
        if not value:
            return queryset
        try:
            request = self.request
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                return queryset.none()
            # Use relation from FavoriteAd.related_name='favorited_by'
            return queryset.filter(favorited_by__user=user).distinct()
        except Exception:
            return queryset.none()

    def filter_with_photos_only(self, queryset, name, value):
        """Filter to show only ads with photos."""
        if not value:
            return queryset

        # Фильтруем объявления, у которых есть хотя бы одно изображение
        # Проверяем как загруженные файлы (image), так и сгенерированные URL (image_url)
        return queryset.filter(
            models.Q(
                images__isnull=False,
                images__image__isnull=False
            ) |
            models.Q(
                images__isnull=False,
                images__image_url__isnull=False
            )
        ).exclude(
            models.Q(images__image='') & models.Q(images__image_url='')
        ).distinct()

    def filter_my_ads_only(self, queryset, name, value):
        """Filter to show only ads created by authenticated user."""
        if not value:
            return queryset

        # Получаем пользователя из request
        request = self.request
        if not request or not request.user.is_authenticated:
            return queryset.none()  # Если пользователь не авторизован, возвращаем пустой queryset

        # Фильтруем объявления по пользователю
        return queryset.filter(account__user=request.user)

    def filter_invert_my_ads(self, queryset, name, value):
        """Filter to show all ads except user's own ads."""
        if not value:
            return queryset

        # Получаем пользователя из request
        request = self.request
        if not request or not request.user.is_authenticated:
            return queryset  # Если пользователь не авторизован, показываем все объявления

        # Исключаем объявления пользователя
        return queryset.exclude(account__user=request.user)

    def filter_invert_favorites(self, queryset, name, value):
        """Filter to show all ads except the authenticated user's favorites (per-user)."""
        if not value:
            return queryset
        try:
            request = self.request
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                return queryset
            return queryset.exclude(favorited_by__user=user).distinct()
        except Exception:
            return queryset

    def filter_invert_photos(self, queryset, name, value):
        """Filter to show only ads without photos."""
        if not value:
            return queryset

        # Фильтруем объявления, у которых НЕТ изображений
        # Проверяем отсутствие как загруженных файлов, так и сгенерированных URL
        return queryset.filter(
            models.Q(images__isnull=True) |
            models.Q(
                images__image__isnull=True,
                images__image_url__isnull=True
            ) |
            models.Q(
                images__image='',
                images__image_url=''
            )
        ).distinct()

    def filter_year_min(self, queryset, name, value):
        """Filter by minimum year - search in dynamic_fields and title."""
        # Сначала пробуем фильтр по dynamic_fields
        try:
            dynamic_queryset = queryset.extra(
                where=["CAST((dynamic_fields->>%s) AS INTEGER) >= %s"],
                params=['year', value]
            )
        except:
            dynamic_queryset = queryset.none()

        # Ищем в заголовке (4-значные числа - годы)
        try:
            title_queryset = queryset.extra(
                where=["""
                    CAST(
                        SUBSTRING(title FROM '\\d{4}') AS INTEGER
                    ) >= %s
                """],
                params=[value]
            )
        except:
            title_queryset = queryset.none()

        # Объединяем результаты
        return (dynamic_queryset | title_queryset).distinct()

    def filter_year_max(self, queryset, name, value):
        """Filter by maximum year - search in dynamic_fields and title."""
        # Сначала пробуем фильтр по dynamic_fields
        try:
            dynamic_queryset = queryset.extra(
                where=["CAST((dynamic_fields->>%s) AS INTEGER) <= %s"],
                params=['year', value]
            )
        except:
            dynamic_queryset = queryset.none()

        # Ищем в заголовке
        try:
            title_queryset = queryset.extra(
                where=["""
                    CAST(
                        SUBSTRING(title FROM '\\d{4}') AS INTEGER
                    ) <= %s
                """],
                params=[value]
            )
        except:
            title_queryset = queryset.none()

        # Объединяем результаты
        return (dynamic_queryset | title_queryset).distinct()

    def filter_mark(self, queryset, name, value):
        """Filter by car mark - search in title and description (case insensitive)."""
        return queryset.filter(
            models.Q(title__icontains=value) |
            models.Q(description__icontains=value)
        )

    def filter_region(self, queryset, name, value):
        """Filter by region - supports both ID and name."""
        print(f"🌍 [REGION FILTER] Called with value: '{value}', type: {type(value)}")

        if not value:
            print("🌍 [REGION FILTER] Empty value, returning original queryset")
            return queryset

        # Пробуем как ID (число) - фильтруем напрямую по region_id
        try:
            region_id = int(value)
            print(f"🌍 [REGION FILTER] Filtering by region ID: {region_id}")
            result = queryset.filter(region_id=region_id)
            print(f"🌍 [REGION FILTER] Found {result.count()} ads by region ID")
            return result
        except (ValueError, TypeError):
            print(f"🌍 [REGION FILTER] Not a valid ID, trying by name")
            pass

        # Пробуем как название (строка) - ищем регион по названию и фильтруем по ID
        try:
            print(f"🌍 [REGION FILTER] Looking for region with name containing: '{value}'")
            region = RegionModel.objects.get(name__icontains=value)
            print(f"🌍 [REGION FILTER] Found region: {region.name} (ID: {region.id})")
            result = queryset.filter(region_id=region.id)
            print(f"🌍 [REGION FILTER] Found {result.count()} ads for region '{region.name}'")
            return result
        except RegionModel.DoesNotExist:
            print(f"🌍 [REGION FILTER] No region found with name containing: '{value}'")
            return queryset.none()

    def filter_city(self, queryset, name, value):
        """Filter by city - supports both ID and name."""
        print(f"🏙️ [CITY FILTER] Called with value: '{value}', type: {type(value)}")

        if not value:
            print("🏙️ [CITY FILTER] Empty value, returning original queryset")
            return queryset

        # Пробуем как ID (число) - фильтруем напрямую по city_id
        try:
            city_id = int(value)
            print(f"🏙️ [CITY FILTER] Filtering by city ID: {city_id}")
            result = queryset.filter(city_id=city_id)
            print(f"🏙️ [CITY FILTER] Found {result.count()} ads by city ID")
            return result
        except (ValueError, TypeError):
            print(f"🏙️ [CITY FILTER] Not a valid ID, trying by name")
            pass

        # Пробуем как название (строка) - ищем город по названию и фильтруем по ID
        try:
            print(f"🏙️ [CITY FILTER] Looking for city with name containing: '{value}'")
            city = CityModel.objects.get(name__icontains=value)
            print(f"🏙️ [CITY FILTER] Found city: {city.name} (ID: {city.id})")
            result = queryset.filter(city_id=city.id)
            print(f"🏙️ [CITY FILTER] Found {result.count()} ads for city '{city.name}'")
            return result
        except CityModel.DoesNotExist:
            print(f"🏙️ [CITY FILTER] No city found with name containing: '{value}'")
            return queryset.none()


class CarMarkFilter(django_filters.FilterSet):
    """Filter for car marks/brands."""
    
    name = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Mark name (partial match)')
    )
    

    
    ordering = django_filters.OrderingFilter(
        fields=(
            ('name', 'name'),
            ('created_at', 'created_at'),
        ),
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = CarMarkModel
        fields = {
            'id': ['exact', 'in'],
            'name': ['exact', 'icontains'],
        }


class CarModelFilter(django_filters.FilterSet):
    """Filter for car models."""
    
    name = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Model name (partial match)')
    )
    
    mark = django_filters.ModelChoiceFilter(
        queryset=CarMarkModel.objects.all(),
        help_text=_('Car mark')
    )
    
    ordering = django_filters.OrderingFilter(
        fields=(
            ('name', 'name'),
            ('mark__name', 'mark_name'),
        ),
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = CarModel
        fields = {
            'id': ['exact', 'in'],
            'name': ['exact', 'icontains'],
            'mark': ['exact'],
        }


class RegionFilter(django_filters.FilterSet):
    """Filter for regions."""
    
    name = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('Region name (partial match)')
    )
    
    ordering = django_filters.OrderingFilter(
        fields=(
            ('name', 'name'),
            ('code', 'code'),
        ),
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = RegionModel
        fields = {
            'id': ['exact', 'in'],
            'name': ['exact', 'icontains'],
            'code': ['exact', 'icontains'],
        }


class CityFilter(django_filters.FilterSet):
    """Filter for cities."""
    
    name = django_filters.CharFilter(
        lookup_expr='icontains',
        help_text=_('City name (partial match)')
    )
    
    region = django_filters.ModelChoiceFilter(
        queryset=RegionModel.objects.all(),
        help_text=_('Region')
    )
    
    is_regional_center = django_filters.BooleanFilter(
        help_text=_('Is regional center')
    )
    
    ordering = django_filters.OrderingFilter(
        fields=(
            ('name', 'name'),
            ('region__name', 'region_name'),
        ),
        help_text=_('Ordering field')
    )
    
    class Meta:
        model = CityModel
        fields = {
            'id': ['exact', 'in'],
            'name': ['exact', 'icontains'],
            'region': ['exact'],
            'is_regional_center': ['exact'],
        }
