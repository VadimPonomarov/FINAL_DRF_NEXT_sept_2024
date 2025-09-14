"""URL routing for the chat app."""
from django.urls import path
from .views.image_generation_views import generate_image, generate_car_images, generate_car_images_with_mock_algorithm

# We're using WebSocket routing from routing.py, but we also have HTTP endpoints
# for image generation

urlpatterns = [
    path('generate-image/', generate_image, name='generate_image'),
    path('generate-car-images/', generate_car_images, name='generate_car_images'),
    path('generate-car-images-mock/', generate_car_images_with_mock_algorithm, name='generate_car_images_mock'),
]
