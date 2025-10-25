"""
Views for car reference data (marks, models, generations, etc.).
All endpoints organized by tags for API documentation.
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from core.permissions import ReadOnlyOrStaffWrite
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# Import swagger schemas
from apps.ads.schemas.reference_schemas import (
    # Car Generations schemas
    car_generations_list_schema, car_generations_retrieve_schema,
    car_generations_create_schema, car_generations_update_schema, car_generations_delete_schema,

    # Car Modifications schemas
    car_modifications_list_schema, car_modifications_retrieve_schema,
    car_modifications_create_schema, car_modifications_update_schema, car_modifications_delete_schema,
)

from apps.ads.models.reference import (
    CarMarkModel, CarModel, CarGenerationModel, CarModificationModel, CarColorModel
)
from apps.ads.serializers.reference_serializers import (
    CarMarkListSerializer, CarMarkDetailSerializer, CarMarkWithModelsSerializer,
    CarModelListSerializer, CarModelDetailSerializer, CarModelWithGenerationsSerializer,
    CarGenerationListSerializer, CarGenerationDetailSerializer, CarGenerationWithModificationsSerializer,
    CarModificationListSerializer, CarModificationDetailSerializer,
    CarColorListSerializer, CarColorDetailSerializer,
    CarMarkChoiceSerializer, CarModelChoiceSerializer, CarColorChoiceSerializer
)
from apps.ads.filters import CarMarkFilter, CarModelFilter
from core.pagination import StandardResultsSetPagination, ReferenceDataPagination


# Car Marks Views
class CarMarkListCreateView(generics.ListCreateAPIView):
    """
    List all car marks or create a new car mark.
    """
    queryset = CarMarkModel.objects.all().order_by('name').annotate(models_count=Count('models'))
    permission_classes = [ReadOnlyOrStaffWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_popular', 'vehicle_type']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'is_popular']
    ordering = ['name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CarMarkDetailSerializer
        return CarMarkListSerializer

    @swagger_auto_schema(
        operation_summary="List car marks",
        operation_description="Get a paginated list of all car marks with filtering and search options. Supports filtering by popularity and searching by name.",
        tags=['🏷️ Car Marks'],
        responses={
            200: openapi.Response(
                description="List of car marks",
                schema=CarMarkListSerializer(many=True)
            )
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Create car mark",
        operation_description="Create a new car mark (brand). Requires staff permissions. Automatically validates uniqueness and required fields.",
        tags=['🏷️ Car Marks'],
        request_body=CarMarkDetailSerializer,
        responses={
            201: openapi.Response(
                description="Car mark created successfully",
                schema=CarMarkDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required"
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CarMarkRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a car mark.
    """
    queryset = CarMarkModel.objects.all().prefetch_related('models').annotate(models_count=Count('models'))
    serializer_class = CarMarkDetailSerializer
    permission_classes = [ReadOnlyOrStaffWrite]

    @swagger_auto_schema(
        operation_summary="Get car mark details",
        operation_description="Retrieve detailed information about a specific car mark including associated models count.",
        tags=['🏷️ Car Marks'],
        responses={
            200: openapi.Response(
                description="Car mark details",
                schema=CarMarkDetailSerializer
            ),
            404: "Car mark not found"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Update car mark",
        operation_description="Update all fields of a car mark. Requires staff permissions.",
        tags=['🏷️ Car Marks'],
        request_body=CarMarkDetailSerializer,
        responses={
            200: openapi.Response(
                description="Car mark updated successfully",
                schema=CarMarkDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required",
            404: "Car mark not found"
        }
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Partially update car mark",
        operation_description="Update specific fields of a car mark. Requires staff permissions.",
        tags=['🏷️ Car Marks'],
        request_body=CarMarkDetailSerializer,
        responses={
            200: openapi.Response(
                description="Car mark updated successfully",
                schema=CarMarkDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required",
            404: "Car mark not found"
        }
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Delete car mark",
        operation_description="Delete a car mark. Requires staff permissions. Cannot delete marks with associated models.",
        tags=['🏷️ Car Marks'],
        responses={
            204: "Car mark deleted successfully",
            403: "Forbidden - staff permissions required",
            404: "Car mark not found",
            409: "Conflict - cannot delete mark with associated models"
        }
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


# Car Marks Additional Views
@swagger_auto_schema(
    method='get',
    operation_summary="Get popular car marks",
    operation_description="Get a paginated list of popular car marks only. These are commonly used brands marked as popular by administrators.",
    tags=['🏷️ Car Marks'],
    security=[],
    responses={
        200: openapi.Response(
            description="List of popular car marks",
            schema=CarMarkListSerializer(many=True)
        )
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_marks_popular(request):
    """Get only popular car marks."""
    queryset = CarMarkModel.objects.filter(is_popular=True).order_by('name').annotate(models_count=Count('models'))

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = CarMarkListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CarMarkListSerializer(queryset, many=True)
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get car marks choices",
    operation_description="Get simplified car marks list for dropdown/select forms. Returns only id and name fields for better performance.",
    tags=['🏷️ Car Marks'],
    security=[],
    responses={
        200: openapi.Response(
            description="Simplified list of car marks for forms",
            schema=CarMarkChoiceSerializer(many=True)
        )
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_marks_choices(request):
    """Get simplified mark choices for forms - CACHED for performance."""
    from django.core.cache import cache
    
    # Каскадная фильтрация: Тип → Марка → Модель
    vehicle_type_id = request.query_params.get('vehicle_type_id')
    
    # Cache key depends on vehicle_type_id
    cache_key = f'car_marks_choices_vt_{vehicle_type_id or "all"}'
    cached_data = cache.get(cache_key)
    
    if cached_data is not None:
        return Response(cached_data)
    
    # Cache miss - fetch from DB
    queryset = CarMarkModel.objects.all().only('id', 'name', 'vehicle_type_id').select_related('vehicle_type').order_by('name')

    if vehicle_type_id:
        queryset = queryset.filter(vehicle_type_id=vehicle_type_id)

    serializer = CarMarkChoiceSerializer(queryset, many=True)
    
    # Cache for 1 hour
    cache.set(cache_key, serializer.data, 3600)
    
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get car mark with models",
    operation_description="Get detailed information about a car mark including all its associated models. Useful for cascading dropdowns.",
    tags=['🏷️ Car Marks'],
    responses={
        200: openapi.Response(
            description="Car mark with all associated models",
            schema=CarMarkWithModelsSerializer
        ),
        404: "Car mark not found"
    }
)
@api_view(['GET'])
def car_marks_with_models(request, pk):
    """Get mark with all its models."""
    try:
        mark = CarMarkModel.objects.prefetch_related('models').get(pk=pk)
    except CarMarkModel.DoesNotExist:
        return Response({'error': 'Car mark not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CarMarkWithModelsSerializer(mark)
    return Response(serializer.data)


# Car Models Views
class CarModelListCreateView(generics.ListCreateAPIView):
    """
    🚗 Car Models Management

    Manage car models with comprehensive filtering and search capabilities.
    Staff users can create new models, all users can view existing models.
    """
    queryset = CarModel.objects.all().select_related('mark').order_by('mark__name', 'name').annotate(generations_count=Count('generations'))
    permission_classes = [ReadOnlyOrStaffWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['mark', 'is_popular']
    search_fields = ['name', 'mark__name']
    ordering_fields = ['name', 'mark__name', 'created_at', 'is_popular']
    ordering = ['mark__name', 'name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CarModelDetailSerializer
        return CarModelListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by mark if provided in query params
        mark_id = self.request.query_params.get('mark_id')
        if mark_id:
            queryset = queryset.filter(mark_id=mark_id)
        return queryset

    @swagger_auto_schema(
        operation_summary="List car models",
        operation_description="Get a paginated list of all car models with filtering and search options. Supports filtering by mark and popularity.",
        tags=['🚗 Car Models'],
        responses={
            200: openapi.Response(
                description="List of car models",
                schema=CarModelListSerializer(many=True)
            )
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Create car model",
        operation_description="Create a new car model. Requires staff permissions. Must be associated with an existing car mark.",
        tags=['🚗 Car Models'],
        request_body=CarModelDetailSerializer,
        responses={
            201: openapi.Response(
                description="Car model created successfully",
                schema=CarModelDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required"
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CarModelRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a car model.
    """
    queryset = CarModel.objects.all().select_related('mark').prefetch_related('generations').annotate(generations_count=Count('generations'))
    serializer_class = CarModelDetailSerializer
    permission_classes = [ReadOnlyOrStaffWrite]

    @swagger_auto_schema(
        operation_summary="Get car model details",
        operation_description="Retrieve detailed information about a specific car model including associated generations count.",
        tags=['🚗 Car Models'],
        responses={
            200: openapi.Response(
                description="Car model details",
                schema=CarModelDetailSerializer
            ),
            404: "Car model not found"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Update car model",
        operation_description="Update all fields of a car model. Requires staff permissions.",
        tags=['🚗 Car Models'],
        request_body=CarModelDetailSerializer,
        responses={
            200: openapi.Response(
                description="Car model updated successfully",
                schema=CarModelDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required",
            404: "Car model not found"
        }
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Partially update car model",
        operation_description="Update specific fields of a car model. Requires staff permissions.",
        tags=['🚗 Car Models'],
        request_body=CarModelDetailSerializer,
        responses={
            200: openapi.Response(
                description="Car model updated successfully",
                schema=CarModelDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required",
            404: "Car model not found"
        }
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Delete car model",
        operation_description="Delete a car model. Requires staff permissions. Cannot delete models with associated generations.",
        tags=['🚗 Car Models'],
        responses={
            204: "Car model deleted successfully",
            403: "Forbidden - staff permissions required",
            404: "Car model not found",
            409: "Conflict - cannot delete model with associated generations"
        }
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


# Car Models Additional Views
@swagger_auto_schema(
    method='get',
    operation_summary="Get car models by mark",
    operation_description="Retrieve car models filtered by car mark ID. Used for cascading dropdowns.",
    tags=['🚗 Car Models'],
    responses={
        200: "Success response with models data",
        404: "Car mark not found"
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_models_by_mark(request):
    """Get models filtered by mark ID."""
    mark_id = request.query_params.get('mark_id')
    if not mark_id:
        return Response(
            {'error': 'mark_id parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    queryset = CarModel.objects.filter(mark_id=mark_id).select_related('mark').order_by('name').annotate(generations_count=Count('generations'))

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = CarModelListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CarModelListSerializer(queryset, many=True)
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get popular car models",
    operation_description="Get a paginated list of popular car models only. These are commonly used models marked as popular by administrators.",
    tags=['🚗 Car Models'],
    responses={
        200: "Success response with popular models data",
        404: "Not found"
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_models_popular(request):
    """Get only popular car models."""
    queryset = CarModel.objects.filter(is_popular=True).select_related('mark').order_by('mark__name', 'name').annotate(generations_count=Count('generations'))

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = CarModelListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CarModelListSerializer(queryset, many=True)
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get car models choices",
    operation_description="Get simplified car models list for dropdown/select forms. Returns only id and name fields for better performance.",
    tags=['🚗 Car Models'],
    responses={
        200: "Success response with models choices data",
        404: "Not found"
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_models_choices(request):
    """Get simplified model choices for forms - CACHED for performance."""
    from django.core.cache import cache
    
    # Filter by mark if provided
    mark_id = request.query_params.get('mark_id')
    
    # Cache key depends on mark_id
    cache_key = f'car_models_choices_mark_{mark_id or "all"}'
    cached_data = cache.get(cache_key)
    
    if cached_data is not None:
        return Response(cached_data)
    
    # Cache miss - fetch from DB
    queryset = CarModel.objects.all().only('id', 'name', 'mark_id').select_related('mark').order_by('mark__name', 'name')

    if mark_id:
        queryset = queryset.filter(mark_id=mark_id)

    serializer = CarModelChoiceSerializer(queryset, many=True)
    
    # Cache for 1 hour
    cache.set(cache_key, serializer.data, 3600)
    
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get random car models for test data generation",
    operation_description="Get random selection of car models with full cascade data (vehicle_type, brand, model). Optimized for test data generation - returns only requested count instead of all models.",
    tags=['🚗 Car Models'],
    manual_parameters=[
        openapi.Parameter('count', openapi.IN_QUERY, description="Number of random models to return (default: 10, max: 100)", type=openapi.TYPE_INTEGER),
    ],
    responses={
        200: "Success response with random models including cascade data",
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_models_random(request):
    """Get random car models with full cascade data for test generation."""
    try:
        count = int(request.query_params.get('count', 10))
        count = min(count, 100)  # Limit to 100 max
    except (ValueError, TypeError):
        count = 10

    # Get random models with related data
    models = CarModel.objects.select_related('mark', 'mark__vehicle_type').order_by('?')[:count]

    # Transform to format with full cascade data
    data = [
        {
            'id': model.id,
            'name': model.name,
            'brand_id': model.mark_id,
            'brand_name': model.mark.name,
            'vehicle_type_id': model.mark.vehicle_type_id,
            'vehicle_type_name': model.mark.vehicle_type.name,
        }
        for model in models
    ]

    return Response(data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get random location (region + city) for test data generation",
    operation_description="Get random selection of locations with region and city. Optimized for test data generation.",
    tags=['📍 Locations'],
    manual_parameters=[
        openapi.Parameter('count', openapi.IN_QUERY, description="Number of random locations to return (default: 1, max: 50)", type=openapi.TYPE_INTEGER),
    ],
    responses={
        200: "Success response with random locations including region and city data",
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def locations_random(request):
    """Get random locations with region and city for test generation."""
    from apps.ads.models.reference import RegionModel, CityModel

    try:
        count = int(request.query_params.get('count', 1))
        count = min(count, 50)  # Limit to 50 max
    except (ValueError, TypeError):
        count = 1

    # Get random regions
    regions = list(RegionModel.objects.order_by('?')[:count])

    data = []
    for region in regions:
        # Get random city for this region
        city = CityModel.objects.filter(region=region).order_by('?').first()

        if city:
            data.append({
                'region_id': region.id,
                'region_name': region.name,
                'city_id': city.id,
                'city_name': city.name,
            })

    return Response(data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get car models with generations",
    operation_description="Get detailed information about a car model including all its associated generations. Useful for cascading dropdowns.",
    tags=['🚗 Car Models'],
    responses={
        200: "Success response with model and generations data",
        404: "Car model not found"
    }
)
@api_view(['GET'])
def car_models_with_generations(request, pk):
    """Get model with all its generations."""
    try:
        model = CarModel.objects.select_related('mark').prefetch_related('generations').get(pk=pk)
    except CarModel.DoesNotExist:
        return Response({'error': 'Car model not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CarModelWithGenerationsSerializer(model)
    return Response(serializer.data)


# Car Colors Views
class CarColorListCreateView(generics.ListCreateAPIView):
    """
    List all car colors or create a new car color.
    """
    queryset = CarColorModel.objects.all().order_by('name')
    permission_classes = [ReadOnlyOrStaffWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_popular', 'is_metallic', 'is_pearlescent']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'is_popular']
    ordering = ['name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CarColorDetailSerializer
        return CarColorListSerializer

    @swagger_auto_schema(
    operation_summary="Get colors",
    operation_description="Retrieve colors data with filtering and search capabilities.",
    tags=['🎨 Colors'],
    responses={
        200: "Success response with data",
        404: "Not found"
    }
)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Create car color",
        operation_description="Create a new car color. Requires staff permissions. Automatically validates uniqueness and required fields.",
        tags=['🎨 Colors'],
        request_body=CarColorDetailSerializer,
        responses={
            201: openapi.Response(
                description="Car color created successfully",
                schema=CarColorDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required"
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CarColorRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a car color.
    """
    queryset = CarColorModel.objects.all()
    serializer_class = CarColorDetailSerializer
    permission_classes = [ReadOnlyOrStaffWrite]

    @swagger_auto_schema(
        operation_summary="Get car color details",
        operation_description="Retrieve detailed information about a specific car color.",
        tags=['🎨 Colors'],
        responses={
            200: openapi.Response(
                description="Car color details",
                schema=CarColorDetailSerializer
            ),
            404: "Car color not found"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Update car color",
        operation_description="Update all fields of a car color. Requires staff permissions.",
        tags=['🎨 Colors'],
        request_body=CarColorDetailSerializer,
        responses={
            200: openapi.Response(
                description="Car color updated successfully",
                schema=CarColorDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required",
            404: "Car color not found"
        }
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Partially update car color",
        operation_description="Update specific fields of a car color. Requires staff permissions.",
        tags=['🎨 Colors'],
        request_body=CarColorDetailSerializer,
        responses={
            200: openapi.Response(
                description="Car color updated successfully",
                schema=CarColorDetailSerializer
            ),
            400: "Bad request - validation errors",
            403: "Forbidden - staff permissions required",
            404: "Car color not found"
        }
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Delete car color",
        operation_description="Delete a car color. Requires staff permissions.",
        tags=['🎨 Colors'],
        responses={
            204: "Car color deleted successfully",
            403: "Forbidden - staff permissions required",
            404: "Car color not found"
        }
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


# Car Colors Additional Views
@swagger_auto_schema(
    method='get',
    operation_summary="🎨 Get Popular Colors",
    operation_description="Get a paginated list of popular car colors only. These are commonly used colors marked as popular by administrators.",
    tags=['🎨 Colors'],
    responses={
        200: "Success response with popular colors data",
        404: "Not found"
    },
    security=[]
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_colors_popular(request):
    """Get only popular car colors."""
    queryset = CarColorModel.objects.filter(is_popular=True).order_by('name')

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = CarColorListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CarColorListSerializer(queryset, many=True)
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="🎨 Get Colors Choices",
    operation_description="Get simplified car colors list for dropdown/select forms. Returns only id and name fields for better performance.",
    tags=['🎨 Colors'],
    responses={
        200: "Success response with colors choices data",
        404: "Not found"
    },
    security=[]
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_colors_choices(request):
    """Get simplified color choices for forms."""
    colors = CarColorModel.objects.all().order_by('name')
    serializer = CarColorChoiceSerializer(colors, many=True)
    return Response(serializer.data)


# Car Generations Views
class CarGenerationListCreateView(generics.ListCreateAPIView):
    """
    List all car generations or create a new car generation.
    """
    queryset = CarGenerationModel.objects.all().select_related('model__mark').order_by('model__mark__name', 'model__name', 'year_start').annotate(modifications_count=Count('modifications'))
    permission_classes = [ReadOnlyOrStaffWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['model', 'year_start', 'year_end']
    search_fields = ['name', 'model__name', 'model__mark__name']
    ordering_fields = ['name', 'year_start', 'year_end', 'created_at']
    ordering = ['model__mark__name', 'model__name', 'year_start']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CarGenerationDetailSerializer
        return CarGenerationListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by model if provided in query params
        model_id = self.request.query_params.get('model_id')
        if model_id:
            queryset = queryset.filter(model_id=model_id)
        return queryset

    @car_generations_list_schema
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @car_generations_create_schema
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CarGenerationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a car generation.
    """
    queryset = CarGenerationModel.objects.all().select_related('model__mark').prefetch_related('modifications').annotate(modifications_count=Count('modifications'))
    serializer_class = CarGenerationDetailSerializer
    permission_classes = [ReadOnlyOrStaffWrite]

    @car_generations_retrieve_schema
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @car_generations_update_schema
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @car_generations_update_schema
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @car_generations_delete_schema
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


# Car Generations Additional Views
@swagger_auto_schema(
    method='get',
    operation_summary="Get car generations by model",
    operation_description="Retrieve car generations data with filtering and search capabilities.",
    tags=['📅 Car Generations'],
    responses={
        200: "Success response with data",
        404: "Not found"
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_generations_by_model(request):
    """Get generations filtered by model ID."""
    model_id = request.query_params.get('model_id')
    if not model_id:
        return Response(
            {'error': 'model_id parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    queryset = CarGenerationModel.objects.filter(model_id=model_id).select_related('model__mark').order_by('year_start').annotate(modifications_count=Count('modifications'))

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = CarGenerationListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CarGenerationListSerializer(queryset, many=True)
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Get car generations with modifications",
    operation_description="Retrieve car generations data with filtering and search capabilities.",
    tags=['📅 Car Generations'],
    responses={
        200: "Success response with data",
        404: "Not found"
    }
)
@api_view(['GET'])
def car_generations_with_modifications(request, pk):
    """Get generation with all its modifications."""
    try:
        generation = CarGenerationModel.objects.select_related('model__mark').prefetch_related('modifications').get(pk=pk)
    except CarGenerationModel.DoesNotExist:
        return Response({'error': 'Car generation not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CarGenerationWithModificationsSerializer(generation)
    return Response(serializer.data)


# Car Modifications Views
class CarModificationListCreateView(generics.ListCreateAPIView):
    """
    List all car modifications or create a new car modification.
    """
    queryset = CarModificationModel.objects.all().select_related('generation__model__mark').order_by('generation__model__mark__name', 'generation__model__name', 'name')
    permission_classes = [ReadOnlyOrStaffWrite]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['generation', 'engine_type', 'transmission', 'drive_type']
    search_fields = ['name', 'generation__name', 'generation__model__name', 'generation__model__mark__name']
    ordering_fields = ['name', 'engine_volume', 'power_hp', 'created_at']
    ordering = ['generation__model__mark__name', 'generation__model__name', 'name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CarModificationDetailSerializer
        return CarModificationListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by generation if provided in query params
        generation_id = self.request.query_params.get('generation_id')
        if generation_id:
            queryset = queryset.filter(generation_id=generation_id)
        return queryset

    @swagger_auto_schema(
    operation_summary="Get car modifications",
    operation_description="Retrieve car modifications data with filtering and search capabilities.",
    tags=['⚙️ Car Modifications'],
    responses={
        200: "Success response with data",
        404: "Not found"
    }
)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
    operation_summary="Get car modifications",
    operation_description="Retrieve car modifications data with filtering and search capabilities.",
    tags=['⚙️ Car Modifications'],
    responses={
        200: "Success response with data",
        404: "Not found"
    }
)
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class CarModificationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a car modification.
    """
    queryset = CarModificationModel.objects.all().select_related('generation__model__mark')
    serializer_class = CarModificationDetailSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @car_modifications_retrieve_schema
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @car_modifications_update_schema
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @car_modifications_update_schema
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @car_modifications_delete_schema
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


# Car Modifications Additional Views
@swagger_auto_schema(
    method='get',
    operation_summary="Get car modifications by generation",
    operation_description="Retrieve car modifications data with filtering and search capabilities.",
    tags=['⚙️ Car Modifications'],
    responses={
        200: "Success response with data",
        404: "Not found"
    }
)
@api_view(['GET'])
@permission_classes([])  # Public access
def car_modifications_by_generation(request):
    """Get modifications filtered by generation ID."""
    generation_id = request.query_params.get('generation_id')
    if not generation_id:
        return Response(
            {'error': 'generation_id parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    queryset = CarModificationModel.objects.filter(generation_id=generation_id).select_related('generation__model__mark').order_by('name')

    # Apply pagination
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = CarModificationListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = CarModificationListSerializer(queryset, many=True)
    return Response(serializer.data)


# =============================================================================
# РЕГИОНЫ И ГОРОДА
# =============================================================================

class RegionListView(generics.ListAPIView):
    """
    Список всех регионов Украины.
    Используется для выбора региона при создании объявления.
    """
    from apps.ads.models.reference import RegionModel

    permission_classes = []  # Публичный доступ
    pagination_class = None  # Без пагинации для справочников

    def get_queryset(self):
        """
        Возвращает уникальные активные регионы, отфильтрованные от дубликатов.
        Приоритет отдается украинским названиям.
        Поддерживает поиск по названию.
        """
        from apps.ads.models.reference import RegionModel

        # Получаем параметр поиска
        search = self.request.query_params.get('search', '').strip()
        print(f"🌍 RegionListView: search parameter = '{search}'")

        # Получаем все активные регионы
        queryset = RegionModel.objects.filter(is_active=True)

        # Применяем поиск, если есть
        if search:
            queryset = queryset.filter(name__icontains=search)
            print(f"🌍 RegionListView: Applied search filter, found {queryset.count()} regions")

        all_regions = queryset.order_by('name')

        # Группируем по нормализованным названиям
        seen_normalized = {}
        unique_regions = []

        for region in all_regions:
            # Нормализуем название для поиска дубликатов
            normalized = region.name.lower()
            # Убираем различия между украинским и русским
            normalized = normalized.replace('ська', 'ская').replace('цька', 'цкая')
            normalized = normalized.replace('івська', 'овская').replace('ївська', 'евская')
            normalized = normalized.replace('область', '').replace('обл', '').strip()

            if normalized not in seen_normalized:
                # Первое вхождение - добавляем
                seen_normalized[normalized] = region
                unique_regions.append(region)
            else:
                # Дубликат - проверяем приоритет (украинский > русский)
                existing = seen_normalized[normalized]
                if ('ська' in region.name or 'цька' in region.name or 'івська' in region.name) and \
                   ('ская' in existing.name or 'цкая' in existing.name or 'овская' in existing.name):
                    # Заменяем русское на украинское
                    unique_regions.remove(existing)
                    unique_regions.append(region)
                    seen_normalized[normalized] = region

        # Возвращаем queryset с уникальными ID
        unique_ids = [r.id for r in unique_regions]
        print(f"🌍 RegionListView: Returning {len(unique_regions)} unique regions (search: '{search}')")
        return RegionModel.objects.filter(id__in=unique_ids).order_by('name')

    def get_serializer_class(self):
        from apps.ads.serializers.cars.region import RegionSerializer
        return RegionSerializer

    @swagger_auto_schema(
        operation_summary="Get regions list",
        operation_description="Get a complete list of all regions in Ukraine. Used for region selection in forms.",
        tags=['🌍 Regions'],
        responses={
            200: "List of all regions"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class CityListView(generics.ListAPIView):
    """
    Список городов с возможностью фильтрации по региону.
    """
    from apps.ads.models.reference import CityModel

    queryset = CityModel.objects.filter(is_active=True).order_by('name')
    permission_classes = []  # Публичный доступ
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['region_id']  # Исправлено: используем region_id вместо region
    search_fields = ['name']  # Поддержка поиска по названию города

    def get_serializer_class(self):
        from apps.ads.serializers.cars.region import CitySerializer
        return CitySerializer

    @swagger_auto_schema(
        operation_summary="Get cities list",
        operation_description="Get a list of all cities with optional filtering by region. Supports region_id parameter for filtering.",
        tags=['🏙️ Cities'],
        responses={
            200: "List of cities with region information"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@swagger_auto_schema(
    method='get',
    operation_summary="Get cities by region",
    operation_description="Get cities filtered by region ID. Used for dynamic loading of cities when region is selected. Requires region_id parameter.",
    tags=['🏙️ Cities'],
    responses={
        200: "Cities list with region information",
        400: "Bad request - region_id parameter required",
        404: "Region not found"
    }
)
@api_view(['GET'])
def cities_by_region(request):
    """
    Получение городов по ID региона.
    Используется для динамической загрузки городов при выборе региона.

    Query params:
    - region_id: ID региона
    """
    from apps.ads.models.reference import CityModel, RegionModel
    from apps.ads.serializers.cars.region import CitySerializer

    region_id = request.GET.get('region_id')
    if not region_id:
        return Response({
            'error': 'Параметр region_id обязателен'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        region = RegionModel.objects.get(id=region_id)
        cities = CityModel.objects.filter(region=region).order_by('name')
        serializer = CitySerializer(cities, many=True)

        return Response({
            'region': {
                'id': region.id,
                'name': region.name
            },
            'cities': serializer.data,
            'count': cities.count()
        })

    except RegionModel.DoesNotExist:
        return Response({
            'error': 'Регион не найден'
        }, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# ТИПЫ ТРАНСПОРТНЫХ СРЕДСТВ
# =============================================================================

class VehicleTypeListView(generics.ListAPIView):
    """
    Список всех типов транспортных средств.
    """
    from apps.ads.models.reference import VehicleTypeModel

    queryset = VehicleTypeModel.objects.all().order_by('name')
    permission_classes = []  # Публичный доступ
    pagination_class = None  # Без пагинации для справочников

    def get_serializer_class(self):
        from apps.ads.serializers.reference_serializers import VehicleTypeSerializer
        return VehicleTypeSerializer

    @swagger_auto_schema(
        operation_summary="Get vehicle types list",
        operation_description="Get a complete list of all vehicle types (car, truck, motorcycle, etc.). Used for vehicle type selection in forms.",
        tags=['🚙 Vehicle Types'],
        responses={
            200: "List of all vehicle types"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class VehicleTypeChoicesView(generics.ListAPIView):
    """
    Типы транспортных средств в формате choices для форм.
    """
    from apps.ads.models.reference import VehicleTypeModel

    queryset = VehicleTypeModel.objects.all().order_by('name')
    permission_classes = []  # Публичный доступ
    pagination_class = None

    def get_serializer_class(self):
        from apps.ads.serializers.reference_serializers import VehicleTypeChoiceSerializer
        return VehicleTypeChoiceSerializer

    @swagger_auto_schema(
        operation_summary="Get vehicle types choices",
        operation_description="Get simplified vehicle types list for dropdown/select forms. Returns only id and name fields for better performance.",
        tags=['🚙 Vehicle Types'],
        responses={
            200: "Simplified list of vehicle types for forms"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
