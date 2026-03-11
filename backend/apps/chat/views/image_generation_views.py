"""
Views for AI image generation using g4f and Pollinations.ai
"""
import logging
import requests
from typing import Optional, List, Dict
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import json
import hashlib
import urllib.parse

logger = logging.getLogger(__name__)

# Safe imports with comprehensive fallbacks
try:
    from g4f.client import Client
    G4F_AVAILABLE = True
    logger.info("g4f client imported successfully - FREE models available")
except ImportError as e:
    G4F_AVAILABLE = False
    logger.warning(f"g4f not available: {e}. Using fallbacks.")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
    logger.info("OpenAI client imported successfully")
except ImportError as e:
    OPENAI_AVAILABLE = False
    logger.warning(f"OpenAI not available: {e}. Using fallbacks.")


def create_car_image_prompt(car_data: dict, angle: str, style: str, session_id: str) -> str:
    """Create optimized prompt for car image generation"""
    brand = car_data.get('brand', 'Unknown')
    model = car_data.get('model', 'Unknown')
    year = car_data.get('year', 2020)
    color = car_data.get('color', 'silver')
    body_type = car_data.get('body_type', 'sedan')
    
    # Create professional automotive photography prompt
    base_prompt = f"Professional automotive photography of {brand} {model} {year}"
    
    angle_descriptions = {
        'front': 'front view, showing grille, headlights and bumper',
        'side': 'side profile view, showing wheels and body lines',
        'rear': 'rear view, showing taillights and trunk',
        'interior': 'interior view, dashboard and seats',
        'engine': 'engine bay view',
        'dashboard': 'dashboard and steering wheel view'
    }
    
    angle_desc = angle_descriptions.get(angle, f'{angle} view')
    
    prompt = f"{base_prompt} - {angle_desc}. {color} color, {body_type} style, realistic, high quality, professional lighting, clean background, automotive photography"
    
    return prompt


def get_angle_title(angle, car_data):
    """Get title for specific angle"""
    car_info = f"{car_data.get('brand', '')} {car_data.get('model', '')} {car_data.get('year', '')}"

    angle_titles = {
        'front': f"{car_info} - Front View",
        'side': f"{car_info} - Side View",
        'rear': f"{car_info} - Rear View",
        'interior': f"{car_info} - Interior",
        'engine': f"{car_info} - Engine",
        'dashboard': f"{car_info} - Dashboard"
    }

    return angle_titles.get(angle, f"{car_info} - {angle}")


def generate_placeholder_url(prompt):
    """Generate placeholder image URL"""
    hash_value = hash(prompt) % 1000000
    colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F']
    color = colors[abs(hash_value) % len(colors)]
    encoded_prompt = urllib.parse.quote(prompt)[:50]
    return f"https://via.placeholder.com/800x600/{color}/FFFFFF?text={encoded_prompt}"


@swagger_auto_schema(
    method='post',
    operation_summary="🎨 Generate AI Image",
    operation_description="Generate image using AI models (g4f FLUX - FREE models).",
    tags=['🤖 AI Services'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['prompt'],
        properties={
            'prompt': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Image generation prompt',
                example='A red BMW X5 2020 in a modern city setting'
            ),
            'model': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='AI model to use',
                default='flux',
                example='flux'
            ),
            'quality': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Image quality',
                default='standard',
                enum=['standard', 'high']
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Image generated successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'image_url': openapi.Schema(type=openapi.TYPE_STRING),
                    'model_used': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )
        ),
        400: openapi.Response(description='Prompt is required'),
        500: openapi.Response(description='Image generation failed')
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def generate_image(request):
    """
    Generate image using g4f FLUX model (FREE)
    """
    try:
        data = request.data
        prompt = data.get('prompt')
        model = data.get('model', 'flux')  # Use FLUX for free generation
        quality = data.get('quality', 'standard')

        if not prompt:
            return Response({
                'success': False,
                'error': 'Prompt is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"🎨 Generating FREE image with prompt: {prompt[:100]}...")

        if not G4F_AVAILABLE:
            logger.warning("g4f not available, returning placeholder")
            return Response({
                'success': True,
                'image_url': generate_placeholder_url(prompt),
                'fallback': True,
                'message': 'g4f not available, using placeholder'
            })

        try:
            # Initialize g4f client for FREE model access
            client = Client()

            # Generate image using FREE FLUX model
            response = client.images.generate(
                model=model,
                prompt=prompt,
                response_format="url"
            )

            if response and hasattr(response, 'data') and response.data:
                image_url = response.data[0].url
                logger.info(f"✅ FREE image generated successfully: {image_url}")

                return Response({
                    'success': True,
                    'image_url': image_url,
                    'model': model,
                    'prompt': prompt,
                    'free_model': True
                })
            else:
                logger.warning("No image data in g4f response, using placeholder")
                return Response({
                    'success': True,
                    'image_url': generate_placeholder_url(prompt),
                    'fallback': True,
                    'message': 'g4f response empty, using placeholder'
                })

        except Exception as g4f_error:
            logger.error(f"g4f generation failed: {g4f_error}")
            return Response({
                'success': True,
                'image_url': generate_placeholder_url(prompt),
                'fallback': True,
                'message': f'g4f failed: {str(g4f_error)}'
            })

    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_summary="🚗 Generate Car Images",
    operation_description="Generate multiple car images for different angles using FREE AI models.",
    tags=['📸 Advertisement Images'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['car_data'],
        properties={
            'car_data': openapi.Schema(
                type=openapi.TYPE_OBJECT,
                required=['brand', 'model', 'year'],
                properties={
                    'brand': openapi.Schema(type=openapi.TYPE_STRING, example='BMW'),
                    'model': openapi.Schema(type=openapi.TYPE_STRING, example='X5'),
                    'year': openapi.Schema(type=openapi.TYPE_INTEGER, example=2020),
                    'color': openapi.Schema(type=openapi.TYPE_STRING, example='black'),
                    'body_type': openapi.Schema(type=openapi.TYPE_STRING, example='suv'),
                    'vehicle_type_name': openapi.Schema(type=openapi.TYPE_STRING, example='Легкові')
                }
            ),
            'angles': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(type=openapi.TYPE_STRING),
                default=['front', 'side', 'rear', 'interior'],
                example=['front', 'side', 'rear', 'interior']
            ),
            'style': openapi.Schema(
                type=openapi.TYPE_STRING,
                default='realistic',
                example='realistic'
            ),
            'use_mock_algorithm': openapi.Schema(
                type=openapi.TYPE_BOOLEAN,
                default=True,
                description='Use safe Pollinations.ai algorithm'
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Car images generated successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'images': openapi.Schema(
                        type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'url': openapi.Schema(type=openapi.TYPE_STRING),
                                'angle': openapi.Schema(type=openapi.TYPE_STRING),
                                'title': openapi.Schema(type=openapi.TYPE_STRING)
                            }
                        )
                    ),
                    'total_generated': openapi.Schema(type=openapi.TYPE_INTEGER)
                }
            )
        ),
        400: openapi.Response(description='Car data is required'),
        500: openapi.Response(description='Image generation failed')
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def generate_car_images(request):
    """
    Generate multiple car images using FREE AI models
    """
    try:
        data = request.data
        car_data = data.get('car_data', {})
        angles = data.get('angles', ['front', 'side', 'rear'])
        style = data.get('style', 'realistic')
        use_mock_algorithm = data.get('use_mock_algorithm', True)

        logger.info(f"🎯 [generate_car_images] Received angles: {angles}")
        logger.info(f"🚗 [generate_car_images] Car data: {car_data}")
        logger.info(f"🔧 [generate_car_images] Use mock algorithm: {use_mock_algorithm}")

        # Use the safe mock algorithm if requested
        if use_mock_algorithm:
            django_request = getattr(request, '_request', request)
            return generate_car_images_with_mock_algorithm(django_request, car_data, angles, style)

        # Validate required car data
        required_fields = ['brand', 'model', 'year']
        for field in required_fields:
            if not car_data.get(field):
                return Response({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"🚗 Generating car images for {car_data['brand']} {car_data['model']}")

        # Create session ID for consistency
        session_data = f"{car_data.get('brand', '')}_{car_data.get('model', '')}_{car_data.get('year', '')}_{car_data.get('color', '')}_{car_data.get('body_type', '')}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]

        logger.info(f"🔗 Car session ID for consistency: CAR-{car_session_id}")

        # Generate images using g4f (FREE models)
        generated_images = []
        
        for i, angle in enumerate(angles):
            try:
                prompt = create_car_image_prompt(car_data, angle, style, car_session_id)
                
                if G4F_AVAILABLE:
                    try:
                        client = Client()
                        response = client.images.generate(
                            model="flux",
                            prompt=prompt,
                            response_format="url"
                        )

                        if response and hasattr(response, 'data') and response.data:
                            image_url = response.data[0].url
                        else:
                            image_url = generate_placeholder_url(prompt)
                    except Exception as e:
                        logger.warning(f"G4F generation failed for {angle}: {e}")
                        image_url = generate_placeholder_url(prompt)
                else:
                    image_url = generate_placeholder_url(prompt)

                generated_images.append({
                    'url': image_url,
                    'angle': angle,
                    'title': get_angle_title(angle, car_data),
                    'isMain': i == 0,
                    'prompt': prompt,
                    'success': True,
                    'free_model': G4F_AVAILABLE
                })

            except Exception as e:
                logger.error(f"Failed to generate image for angle {angle}: {e}")
                generated_images.append({
                    'url': generate_placeholder_url(f"Error generating {angle} view"),
                    'angle': angle,
                    'title': get_angle_title(angle, car_data),
                    'isMain': i == 0,
                    'prompt': f"Error: {str(e)}",
                    'success': False
                })

        logger.info(f"🎯 Generated {len(generated_images)} images using FREE models")

        return Response({
            'success': True,
            'images': generated_images,
            'total_generated': len(generated_images),
            'free_models_used': G4F_AVAILABLE
        })

    except Exception as e:
        logger.error(f"Car images generation error: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_id='generate_car_images_mock',
    operation_summary='🚗 Generate Car Images (Safe Algorithm)',
    operation_description="Generate car images using Pollinations.ai with FLUX model (always works).",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'car_data': openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'brand': openapi.Schema(type=openapi.TYPE_STRING, example='BMW'),
                    'model': openapi.Schema(type=openapi.TYPE_STRING, example='X5'),
                    'year': openapi.Schema(type=openapi.TYPE_INTEGER, example=2020),
                    'color': openapi.Schema(type=openapi.TYPE_STRING, example='black'),
                    'vehicle_type_name': openapi.Schema(type=openapi.TYPE_STRING, example='Легкові')
                }
            ),
            'angles': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(type=openapi.TYPE_STRING),
                default=['front', 'side', 'rear']
            ),
            'style': openapi.Schema(type=openapi.TYPE_STRING, default='realistic')
        }
    ),
    responses={
        200: 'Car images generated successfully',
        400: 'Invalid car data',
        500: 'Image generation failed'
    },
    tags=['🤖 AI Services']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def generate_car_images_with_mock_algorithm(request, car_data=None, angles=None, style='realistic'):
    """
    Generate car images using g4f Client (FREE model access)
    """
    try:
        # Extract data from request if needed
        if car_data is None and request is not None:
            data = request.data
            car_data = data.get('car_data', {})
            angles = data.get('angles', ['front', 'side', 'rear'])
            style = data.get('style', 'realistic')
        elif car_data is None:
            car_data = {}
            angles = angles or ['front', 'side', 'rear']
            style = style or 'realistic'

        logger.info(f"🎨 [g4f_algorithm] Generating images with g4f Client")
        logger.info(f"🚗 [g4f_algorithm] Car data: {car_data}")
        logger.info(f"📐 [g4f_algorithm] Angles: {angles}")

        # Create session ID for consistency
        session_data = f"{car_data.get('brand', '')}_{car_data.get('model', '')}_{car_data.get('year', '')}_{car_data.get('color', '')}_{car_data.get('body_type', '')}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]
        session_id = f"CAR-{car_session_id}"

        logger.info(f"🔗 Session ID: {session_id}")

        # Generate images using g4f Client (FREE FLUX model)
        generated_images = []
        
        for i, angle in enumerate(angles):
            try:
                logger.info(f"🔄 Generating image for angle: {angle} ({i + 1}/{len(angles)})")

                # Create prompt for g4f
                car_info = f"{car_data.get('brand', '')} {car_data.get('model', '')} {car_data.get('year', '')}"
                vehicle_type = car_data.get('body_type', 'sedan')
                prompt = f"Professional automotive photography of {vehicle_type} {car_info} - {angle} view. {car_data.get('color', 'silver')} color, {vehicle_type} body type, realistic, high quality, clean background"

                # Use g4f Client for FREE FLUX model
                try:
                    from g4f.client import Client
                    client = Client()

                    response = client.images.generate(
                        model="flux",
                        prompt=prompt,
                        response_format="url"
                    )

                    if response and hasattr(response, 'data') and response.data:
                        image_url = response.data[0].url
                        logger.info(f"✅ g4f image generated: {image_url}")
                        
                        generated_images.append({
                            'url': image_url,
                            'angle': angle,
                            'title': f"{car_info} - {angle.title()} View",
                            'isMain': (i == 0),
                            'prompt': prompt,
                            'seed': int(hashlib.md5(f"{session_id}_{angle}".encode()).hexdigest()[:8], 16) % 1000000,
                            'session_id': session_id,
                            'success': True
                        })
                    else:
                        logger.warning(f"No image data in g4f response for {angle}")
                        # Fallback to placeholder
                        placeholder_url = f"https://picsum.photos/1024/768?random={hashlib.md5(f'{session_id}_{angle}'.encode()).hexdigest()[:8]}"
                        generated_images.append({
                            'url': placeholder_url,
                            'angle': angle,
                            'title': f"{car_info} - {angle.title()} View (Placeholder)",
                            'isMain': (i == 0),
                            'prompt': prompt,
                            'seed': int(hashlib.md5(f"{session_id}_{angle}".encode()).hexdigest()[:8], 16) % 1000000,
                            'session_id': session_id,
                            'success': False,
                            'fallback': True
                        })

                except Exception as g4f_error:
                    logger.error(f"g4f generation failed for {angle}: {g4f_error}")
                    # Fallback to placeholder
                    placeholder_url = f"https://picsum.photos/1024/768?random={hashlib.md5(f'{session_id}_{angle}'.encode()).hexdigest()[:8]}"
                    generated_images.append({
                        'url': placeholder_url,
                        'angle': angle,
                        'title': f"{car_info} - {angle.title()} View (Fallback)",
                        'isMain': (i == 0),
                        'prompt': prompt,
                        'seed': int(hashlib.md5(f"{session_id}_{angle}".encode()).hexdigest()[:8], 16) % 1000000,
                        'session_id': session_id,
                        'success': False,
                        'fallback': True,
                        'error': str(g4f_error)
                    })

            # Return success response with generated images
        logger.info(f"✅ Generated {len(generated_images)} images using g4f")
        
        return Response({
            'success': True,
            'images': generated_images,
            'total_generated': len(generated_images),
            'session_id': session_id,
            'method': 'g4f_flux_free',
            'car_data': car_data,
            'angles': angles,
            'style': style
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"❌ Critical error in g4f image generation: {e}")
        return Response({
            'success': False,
            'error': f'g4f image generation failed: {str(e)}',
            'total_generated': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        
