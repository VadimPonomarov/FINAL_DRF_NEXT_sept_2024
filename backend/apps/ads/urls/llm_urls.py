"""
LLM-related URL patterns for car advertisement content generation.
"""
from django.urls import path
from apps.ads.views.llm_views import (
    GenerateCarAdContentView,
    GenerateTitleView,
    GenerateDescriptionView
)

urlpatterns = [
    # Generate complete car ad content (title + description)
    path('generate-car-ad-content/', GenerateCarAdContentView.as_view(), name='generate-car-ad-content'),
    
    # Generate title only
    path('generate-title/', GenerateTitleView.as_view(), name='generate-title'),
    
    # Generate description only
    path('generate-description/', GenerateDescriptionView.as_view(), name='generate-description'),
]
