"""
URLs for car reference data endpoints.
"""
from django.urls import path

from apps.ads.views.reference_views import (
    # Car Marks
    CarMarkListCreateView, CarMarkRetrieveUpdateDestroyView,
    car_marks_popular, car_marks_choices, car_marks_with_models,
    # Car Models
    CarModelListCreateView, CarModelRetrieveUpdateDestroyView,
    car_models_by_mark, car_models_popular, car_models_choices, car_models_with_generations,
    # Car Colors
    CarColorListCreateView, CarColorRetrieveUpdateDestroyView,
    car_colors_popular, car_colors_choices,
    # Car Generations
    CarGenerationListCreateView, CarGenerationRetrieveUpdateDestroyView,
    car_generations_by_model, car_generations_with_modifications,
    # Car Modifications
    CarModificationListCreateView, CarModificationRetrieveUpdateDestroyView,
    car_modifications_by_generation,

    # Regions and Cities
    RegionListView, CityListView,

    # Vehicle Types
    VehicleTypeListView, VehicleTypeChoicesView,
)

app_name = 'reference'

urlpatterns = [
    # Car Marks CRUD endpoints
    path('marks/', CarMarkListCreateView.as_view(), name='car-marks-list-create'),
    path('marks/<int:pk>/', CarMarkRetrieveUpdateDestroyView.as_view(), name='car-marks-detail'),

    # Car Marks additional endpoints
    path('marks/popular/', car_marks_popular, name='car-marks-popular'),
    path('marks/choices/', car_marks_choices, name='car-marks-choices'),
    path('marks/<int:pk>/with_models/', car_marks_with_models, name='car-marks-with-models'),

    # Car Models CRUD endpoints
    path('models/', CarModelListCreateView.as_view(), name='car-models-list-create'),
    path('models/<int:pk>/', CarModelRetrieveUpdateDestroyView.as_view(), name='car-models-detail'),

    # Car Models additional endpoints
    path('models/by_mark/', car_models_by_mark, name='car-models-by-mark'),
    path('models/popular/', car_models_popular, name='car-models-popular'),
    path('models/choices/', car_models_choices, name='car-models-choices'),
    path('models/<int:pk>/with_generations/', car_models_with_generations, name='car-models-with-generations'),

    # Car Colors CRUD endpoints
    path('colors/', CarColorListCreateView.as_view(), name='car-colors-list-create'),
    path('colors/<int:pk>/', CarColorRetrieveUpdateDestroyView.as_view(), name='car-colors-detail'),

    # Car Colors additional endpoints
    path('colors/popular/', car_colors_popular, name='car-colors-popular'),
    path('colors/choices/', car_colors_choices, name='car-colors-choices'),

    # Car Generations CRUD endpoints
    path('generations/', CarGenerationListCreateView.as_view(), name='car-generations-list-create'),
    path('generations/<int:pk>/', CarGenerationRetrieveUpdateDestroyView.as_view(), name='car-generations-detail'),

    # Car Generations additional endpoints
    path('generations/by_model/', car_generations_by_model, name='car-generations-by-model'),
    path('generations/<int:pk>/with_modifications/', car_generations_with_modifications, name='car-generations-with-modifications'),

    # Car Modifications CRUD endpoints
    path('modifications/', CarModificationListCreateView.as_view(), name='car-modifications-list-create'),
    path('modifications/<int:pk>/', CarModificationRetrieveUpdateDestroyView.as_view(), name='car-modifications-detail'),

    # Car Modifications additional endpoints
    path('modifications/by_generation/', car_modifications_by_generation, name='car-modifications-by-generation'),

    # Regions and Cities
    path('regions/', RegionListView.as_view(), name='region-list'),
    path('cities/', CityListView.as_view(), name='city-list'),

    # Vehicle Types
    path('vehicle-types/', VehicleTypeListView.as_view(), name='vehicle-type-list'),
    path('vehicle-types/choices/', VehicleTypeChoicesView.as_view(), name='vehicle-type-choices'),
]

# URL patterns summary:
# GET /api/ads/reference/marks/ - List all car marks
# GET /api/ads/reference/marks/{id}/ - Get specific car mark
# GET /api/ads/reference/marks/popular/ - Get popular car marks
# GET /api/ads/reference/marks/choices/ - Get mark choices for forms
# GET /api/ads/reference/marks/{id}/with_models/ - Get mark with all models

# GET /api/ads/reference/models/ - List all car models
# GET /api/ads/reference/models/{id}/ - Get specific car model
# GET /api/ads/reference/models/by_mark/?mark_id={id} - Get models by mark
# GET /api/ads/reference/models/popular/ - Get popular car models
# GET /api/ads/reference/models/choices/?mark_id={id} - Get model choices for forms
# GET /api/ads/reference/models/{id}/with_generations/ - Get model with all generations

# GET /api/ads/reference/generations/ - List all car generations
# GET /api/ads/reference/generations/{id}/ - Get specific car generation
# GET /api/ads/reference/generations/by_model/?model_id={id} - Get generations by model
# GET /api/ads/reference/generations/{id}/with_modifications/ - Get generation with all modifications

# GET /api/ads/reference/modifications/ - List all car modifications
# GET /api/ads/reference/modifications/{id}/ - Get specific car modification
# GET /api/ads/reference/modifications/by_generation/?generation_id={id} - Get modifications by generation

# GET /api/ads/reference/colors/ - List all car colors
# GET /api/ads/reference/colors/{id}/ - Get specific car color
# GET /api/ads/reference/colors/popular/ - Get popular car colors
# GET /api/ads/reference/colors/choices/ - Get color choices for forms
