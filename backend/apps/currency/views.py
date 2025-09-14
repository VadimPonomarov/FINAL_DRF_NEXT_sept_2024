"""
API views для работы с курсами валют
"""
import logging
from decimal import Decimal
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import CurrencyRate, CurrencyUpdateLog
from .services import CurrencyService
from .serializers import CurrencyRateSerializer, CurrencyUpdateLogSerializer
from core.schemas import CANONICAL_TAGS

logger = logging.getLogger(__name__)


class CurrencyRateListView(generics.ListAPIView):
    """
    Список актуальных курсов валют
    """
    serializer_class = CurrencyRateSerializer
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        tags=[CANONICAL_TAGS['CURRENCY']],
        operation_summary="Get current currency rates",
        operation_description="Get list of current exchange rates for all supported currencies",
        manual_parameters=[
            openapi.Parameter(
                'base_currency',
                openapi.IN_QUERY,
                description='Base currency code (default: UAH)',
                type=openapi.TYPE_STRING,
                default='UAH'
            )
        ],
        responses={
            200: openapi.Response(
                description="List of current currency rates",
                examples={
                    "application/json": {
                        "count": 3,
                        "base_currency": "UAH",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "rates": [
                            {
                                "id": 1,
                                "base_currency": "UAH",
                                "target_currency": "USD",
                                "rate": "36.5686",
                                "source": "NBU",
                                "fetched_at": "2024-01-15T10:00:00Z"
                            }
                        ]
                    }
                }
            )
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Возвращает последние курсы для каждой пары валют
        """
        base_currency = self.request.query_params.get('base_currency', 'UAH')

        # Получаем последние курсы для каждой валюты
        latest_rates = []
        currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]

        for currency in currencies:
            if currency != base_currency:
                try:
                    rate = CurrencyRate.get_latest_rate(base_currency, currency, auto_update=True)
                    if rate:
                        latest_rates.append(rate)
                except Exception as e:
                    logger.warning(f"⚠️ Could not get rate for {currency}: {e}")

        # Возвращаем QuerySet из найденных объектов
        if latest_rates:
            rate_ids = [rate.id for rate in latest_rates]
            return CurrencyRate.objects.filter(id__in=rate_ids)
        else:
            return CurrencyRate.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        Переопределяем для добавления метаданных
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': len(queryset),
            'base_currency': request.query_params.get('base_currency', 'UAH'),
            'updated_at': timezone.now().isoformat(),
            'rates': serializer.data
        })


@swagger_auto_schema(
    method='get',
    tags=[CANONICAL_TAGS['CURRENCY']],
    operation_summary="Get specific currency rate",
    operation_description="Get exchange rate for a specific currency pair",
    manual_parameters=[
        openapi.Parameter(
            'base_currency',
            openapi.IN_PATH,
            description='Base currency code',
            type=openapi.TYPE_STRING,
            required=True
        ),
        openapi.Parameter(
            'target_currency',
            openapi.IN_PATH,
            description='Target currency code',
            type=openapi.TYPE_STRING,
            required=True
        )
    ],
    responses={
        200: openapi.Response(
            description="Currency rate information",
            examples={
                "application/json": {
                    "base_currency": "UAH",
                    "target_currency": "USD",
                    "rate": "36.5686",
                    "source": "NBU",
                    "fetched_at": "2024-01-15T10:00:00Z",
                    "is_fresh": True,
                    "age_hours": 2.5
                }
            }
        ),
        404: openapi.Response(description="Rate not found")
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_currency_rate(request, base_currency='UAH', target_currency='USD'):
    """
    Получить курс для конкретной пары валют
    Автоматически обновляет при отсутствии данных
    """
    try:
        # Получаем курс с автообновлением
        rate = CurrencyService.get_rate(base_currency, target_currency)
        
        if rate:
            # Получаем объект курса для дополнительной информации
            rate_obj = CurrencyRate.get_latest_rate(base_currency, target_currency)
            
            return Response({
                'base_currency': base_currency,
                'target_currency': target_currency,
                'rate': str(rate),
                'source': rate_obj.source if rate_obj else 'unknown',
                'fetched_at': rate_obj.fetched_at.isoformat() if rate_obj else None,
                'is_fresh': rate_obj.is_fresh() if rate_obj else False,
                'age_hours': round(rate_obj.age_hours, 2) if rate_obj else None
            })
        else:
            return Response({
                'error': f'Rate not found for {target_currency}/{base_currency}',
                'base_currency': base_currency,
                'target_currency': target_currency,
                'rate': None
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error getting rate {target_currency}/{base_currency}: {str(e)}")
        return Response({
            'error': 'Failed to get currency rate',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    tags=[CANONICAL_TAGS['CURRENCY']],
    operation_summary="Convert currency amount",
    operation_description="Convert amount from one currency to another",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['amount'],
        properties={
            'amount': openapi.Schema(
                type=openapi.TYPE_NUMBER,
                description='Amount to convert'
            ),
            'from_currency': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Source currency code (default: UAH)',
                default='UAH'
            ),
            'to_currency': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Target currency code (default: USD)',
                default='USD'
            )
        },
        example={
            "amount": 1000,
            "from_currency": "UAH",
            "to_currency": "USD"
        }
    ),
    responses={
        200: openapi.Response(
            description="Conversion result",
            examples={
                "application/json": {
                    "original_amount": "1000",
                    "from_currency": "UAH",
                    "converted_amount": "27.35",
                    "to_currency": "USD",
                    "rate": "36.5686",
                    "converted_at": "2024-01-15T10:30:00Z"
                }
            }
        ),
        400: openapi.Response(description="Invalid request or conversion failed")
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def convert_currency(request):
    """
    Конвертировать сумму между валютами
    """
    try:
        amount = request.data.get('amount')
        from_currency = request.data.get('from_currency', 'UAH')
        to_currency = request.data.get('to_currency', 'USD')
        
        if not amount:
            return Response({
                'error': 'Amount is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Конвертируем сумму
        converted_amount = CurrencyService.convert_amount(
            amount=amount,
            from_currency=from_currency,
            to_currency=to_currency
        )
        
        if converted_amount is not None:
            # Получаем курс для информации
            rate = CurrencyService.get_rate(from_currency, to_currency)
            
            return Response({
                'original_amount': str(amount),
                'from_currency': from_currency,
                'converted_amount': str(converted_amount),
                'to_currency': to_currency,
                'rate': str(rate) if rate else None,
                'converted_at': timezone.now().isoformat()
            })
        else:
            return Response({
                'error': f'Cannot convert {from_currency} to {to_currency}',
                'original_amount': str(amount),
                'from_currency': from_currency,
                'to_currency': to_currency
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error converting currency: {str(e)}")
        return Response({
            'error': 'Currency conversion failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    tags=[CANONICAL_TAGS['CURRENCY']],
    operation_summary="Update currency rate",
    operation_description="Force update exchange rate for a specific currency pair",
    manual_parameters=[
        openapi.Parameter(
            'base_currency',
            openapi.IN_PATH,
            description='Base currency code',
            type=openapi.TYPE_STRING,
            required=True
        ),
        openapi.Parameter(
            'target_currency',
            openapi.IN_PATH,
            description='Target currency code',
            type=openapi.TYPE_STRING,
            required=True
        )
    ],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'source': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Data source (default: NBU)',
                default='NBU'
            )
        },
        example={"source": "NBU"}
    ),
    responses={
        200: openapi.Response(
            description="Rate updated successfully",
            examples={
                "application/json": {
                    "success": True,
                    "message": "Rate USD/UAH updated successfully",
                    "base_currency": "UAH",
                    "target_currency": "USD",
                    "rate": "36.5686",
                    "source": "NBU",
                    "updated_at": "2024-01-15T10:30:00Z"
                }
            }
        ),
        400: openapi.Response(description="Update failed")
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def update_currency_rate(request, base_currency='UAH', target_currency='USD'):
    """
    Принудительно обновить курс для пары валют
    """
    try:
        source = request.data.get('source', 'NBU')
        
        # Обновляем курс
        success = CurrencyService.update_single_rate(
            base_currency=base_currency,
            target_currency=target_currency,
            source=source
        )
        
        if success:
            # Получаем обновленный курс
            rate_obj = CurrencyRate.get_latest_rate(base_currency, target_currency)
            
            return Response({
                'success': True,
                'message': f'Rate {target_currency}/{base_currency} updated successfully',
                'base_currency': base_currency,
                'target_currency': target_currency,
                'rate': str(rate_obj.rate) if rate_obj else None,
                'source': source,
                'updated_at': rate_obj.fetched_at.isoformat() if rate_obj else None
            })
        else:
            return Response({
                'success': False,
                'error': f'Failed to update rate {target_currency}/{base_currency}',
                'source': source
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error updating rate {target_currency}/{base_currency}: {str(e)}")
        return Response({
            'success': False,
            'error': 'Rate update failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='get',
    tags=[CANONICAL_TAGS['CURRENCY']],
    operation_summary="Get currency system status",
    operation_description="Get status and statistics of the currency exchange system",
    manual_parameters=[
        openapi.Parameter(
            'base_currency',
            openapi.IN_QUERY,
            description='Base currency code (default: UAH)',
            type=openapi.TYPE_STRING,
            default='UAH'
        )
    ],
    responses={
        200: openapi.Response(
            description="Currency system status",
            examples={
                "application/json": {
                    "base_currency": "UAH",
                    "total_currencies": 3,
                    "fresh_rates": 2,
                    "stale_rates": 1,
                    "missing_rates": 0,
                    "rates": {
                        "USD": {
                            "rate": "36.5686",
                            "source": "NBU",
                            "fetched_at": "2024-01-15T10:00:00Z",
                            "is_fresh": True,
                            "age_hours": 2.5
                        }
                    },
                    "recent_updates": [],
                    "checked_at": "2024-01-15T10:30:00Z"
                }
            }
        )
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def currency_status(request):
    """
    Статус системы курсов валют
    """
    try:
        base_currency = request.query_params.get('base_currency', 'UAH')
        
        # Получаем все курсы
        rates_info = {}
        currencies = [choice[0] for choice in CurrencyRate.CURRENCY_CHOICES]
        
        for currency in currencies:
            if currency != base_currency:
                rate_obj = CurrencyRate.get_latest_rate(base_currency, currency, auto_update=False)
                if rate_obj:
                    rates_info[currency] = {
                        'rate': str(rate_obj.rate),
                        'source': rate_obj.source,
                        'fetched_at': rate_obj.fetched_at.isoformat(),
                        'is_fresh': rate_obj.is_fresh(),
                        'age_hours': round(rate_obj.age_hours, 2)
                    }
                else:
                    rates_info[currency] = {
                        'rate': None,
                        'source': None,
                        'fetched_at': None,
                        'is_fresh': False,
                        'age_hours': None
                    }
        
        # Статистика обновлений
        recent_updates = CurrencyUpdateLog.objects.filter(
            started_at__gte=timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        ).order_by('-started_at')[:5]
        
        update_stats = []
        for update in recent_updates:
            update_stats.append({
                'started_at': update.started_at.isoformat(),
                'status': update.status,
                'source': update.source,
                'currencies_updated': update.currencies_updated,
                'currencies_failed': update.currencies_failed,
                'duration_seconds': update.duration_seconds
            })
        
        return Response({
            'base_currency': base_currency,
            'total_currencies': len(rates_info),
            'fresh_rates': len([r for r in rates_info.values() if r['is_fresh']]),
            'stale_rates': len([r for r in rates_info.values() if not r['is_fresh'] and r['rate']]),
            'missing_rates': len([r for r in rates_info.values() if not r['rate']]),
            'rates': rates_info,
            'recent_updates': update_stats,
            'checked_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting currency status: {str(e)}")
        return Response({
            'error': 'Failed to get currency status',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CurrencyUpdateLogListView(generics.ListAPIView):
    """
    История обновлений курсов валют
    """
    serializer_class = CurrencyUpdateLogSerializer
    permission_classes = [AllowAny]
    queryset = CurrencyUpdateLog.objects.all().order_by('-started_at')

    @swagger_auto_schema(
        tags=[CANONICAL_TAGS['CURRENCY']],
        operation_summary="Get currency update logs",
        operation_description="Get history of currency rate updates",
        manual_parameters=[
            openapi.Parameter(
                'source',
                openapi.IN_QUERY,
                description='Filter by data source',
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'status',
                openapi.IN_QUERY,
                description='Filter by update status',
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'limit',
                openapi.IN_QUERY,
                description='Limit number of results (default: 50)',
                type=openapi.TYPE_INTEGER,
                default=50
            )
        ],
        responses={
            200: openapi.Response(
                description="List of currency update logs",
                schema=CurrencyUpdateLogSerializer(many=True)
            )
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтрация по источнику
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(source=source)
        
        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Ограничиваем количество записей
        limit = self.request.query_params.get('limit', 50)
        try:
            limit = int(limit)
            queryset = queryset[:limit]
        except (ValueError, TypeError):
            queryset = queryset[:50]
        
        return queryset
