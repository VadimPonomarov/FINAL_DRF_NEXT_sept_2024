"""
Views for AI image generation using g4f and Pollinations.ai
"""
import hashlib
import logging
import os

import requests
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

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
    """Build a rich, field-driven prompt for car image generation.

    Cascade: vehicle_type → brand → model → year, then colour, body_type,
    condition and free-text description contribute detail.  session_id enforces
    cross-angle consistency so every angle looks like the same vehicle.
    """
    vehicle_type = car_data.get('vehicle_type_name') or car_data.get('vehicle_type') or 'car'
    brand        = car_data.get('brand', 'vehicle')
    model        = car_data.get('model', '')
    year         = car_data.get('year', '')
    color        = car_data.get('color', 'silver')
    body_type    = car_data.get('body_type', 'sedan')
    condition    = car_data.get('condition', 'good')
    description  = (car_data.get('description') or '').strip()[:120]

    # Angle descriptions
    angle_descriptions = {
        'front':     f'front view of {brand} {model}, grille, headlights and bumper clearly visible',
        'side':      f'side profile of {brand} {model}, full silhouette, wheels and body lines',
        'rear':      f'rear view of {brand} {model}, taillights and trunk',
        'interior':  f'interior of {brand} {model}, dashboard, steering wheel, seats',
        'engine':    f'engine bay of {brand} {model}',
        'dashboard': f'dashboard close-up of {brand} {model}, instrument cluster',
    }
    angle_desc = angle_descriptions.get(angle, f'{angle} view of {brand} {model}')

    # Condition modifiers
    condition_modifiers = {
        'excellent': 'showroom condition, flawless paint, no scratches',
        'good':      'well-maintained, minor wear acceptable',
        'fair':      'visible everyday wear, some light scratches',
        'poor':      'heavily worn, dull paint, noticeable dents',
        'damaged':   'visibly damaged, dents, scratches, repair needed',
    }
    cond_mod = condition_modifiers.get(condition, 'good condition')

    # Style modifiers
    style_mod = {
        'realistic':     'photorealistic, professional automotive photography, studio lighting',
        'professional':  'commercial-grade automotive photography, showroom lighting',
        'artistic':      'artistic automotive shot, dramatic lighting',
    }.get(style, 'photorealistic, professional automotive photography')

    # Base subject
    subject = f"{year} {brand} {model} {body_type} {vehicle_type}".strip()

    parts = [
        f"SERIES ID: {session_id} — all angles MUST depict the SAME vehicle.",
        f"Subject: {subject}, {color} exterior.",
        f"Angle: {angle_desc}.",
        f"Condition: {cond_mod}.",
        style_mod + ", high resolution, sharp focus, clean neutral background.",
        "No people, no text overlays, no brand logos.",
    ]
    if description:
        parts.append(f"Additional details: {description}.")

    return " ".join(parts)


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


def generate_placeholder_url(prompt, width=800, height=600):
    """Generate consistent seed-based picsum placeholder URL."""
    seed = hashlib.md5(str(prompt).encode()).hexdigest()[:12]
    return f"https://picsum.photos/seed/{seed}/{width}/{height}"


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
            logger.error("g4f not available")
            return Response({
                'success': False,
                'error': 'g4f not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
                logger.error("No image data in g4f response")
                return Response({
                    'success': False,
                    'error': 'No image data in g4f response'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as g4f_error:
            logger.error(f"g4f generation failed: {g4f_error}")
            return Response({
                'success': False,
                'error': f'g4f generation failed: {str(g4f_error)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                            logger.error(f"No image data in g4f response for {angle}")
                            raise Exception("No image data in g4f response")
                    except Exception as e:
                        logger.error(f"G4F generation failed for {angle}: {e}")
                        raise e
                else:
                    logger.error("G4F not available")
                    raise Exception("G4F not available")

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
                raise e

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

        logger.info(f"[g4f_algorithm] Generating images with g4f Client")
        logger.info(f"[g4f_algorithm] Car data: {car_data}")
        logger.info(f"[g4f_algorithm] Angles: {angles}")

        # Create session ID for consistency
        session_data = f"{car_data.get('brand', '')}_{car_data.get('model', '')}_{car_data.get('year', '')}_{car_data.get('color', '')}_{car_data.get('body_type', '')}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]
        session_id = f"CAR-{car_session_id}"

        logger.info(f"[g4f_algorithm] Session ID: {session_id}")

        # Generate images using g4f Client (FREE FLUX model)
        generated_images = []
        car_info = f"{car_data.get('brand', '')} {car_data.get('model', '')} {car_data.get('year', '')}".strip()

        for i, angle in enumerate(angles):
            try:
                logger.info(f"[g4f_algorithm] Generating image for angle: {angle} ({i + 1}/{len(angles)})")

                # Create prompt for g4f
                prompt = create_car_image_prompt(car_data, angle, style, session_id)

                try:
                    # Use g4f Client with Pollinations provider for FREE FLUX model
                    # Use pure G4F for car generation
                    client = Client()

                    response = client.images.generate(
                        model="flux",
                        prompt=prompt,
                        response_format="url"
                    )

                    if response and hasattr(response, 'data') and response.data:
                        image_url = response.data[0].url
                        logger.info(f"✅ G4F image generated: {image_url}")
                        
                        # Fix Pollinations.ai URL encoding issues
                        if 'image.pollinations.ai' in image_url:
                            # Convert to proper URL format
                            import urllib.parse
                            image_url = urllib.parse.unquote(image_url)
                            
                            # Create simple working URL with encoded prompt
                            if '?prompt=' in image_url:
                                base_url = image_url.split('?prompt=')[0]
                                # Extract seed from URL
                                seed_match = image_url.find('?seed=')
                                seed = image_url[seed_match:] if seed_match != -1 else ''
                                
                                # Create simple prompt that works
                                simple_prompt = f"{car_info} {angle} view, professional car photo, high quality"
                                encoded_prompt = urllib.parse.quote(simple_prompt)
                                
                                # Rebuild with simple format
                                image_url = f"{base_url}?prompt={encoded_prompt}&{seed}&width=1024&height=1024&model=flux"
                        
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
                        logger.error(f"No image data in G4F response for {angle}")
                        raise Exception(f"G4F failed to generate image for {angle}")
                        
                except Exception as e:
                    logger.warning(f"G4F failed for {angle}: {e}")
                    # Fallback to direct Pollinations.ai URL
                    import urllib.parse
                    
                    # Create working Pollinations.ai URL directly
                    simple_prompt = f"{car_info} {angle} view, professional car photo, high quality"
                    encoded_prompt = urllib.parse.quote(simple_prompt)
                    seed = int(hashlib.md5(f"{session_id}_{angle}".encode()).hexdigest()[:8], 16) % 1000000
                    
                    fallback_url = f"https://image.pollinations.ai/prompt/flux_{encoded_prompt}?seed={seed}&width=1024&height=1024&model=flux"
                    
                    logger.info(f"🔄 Using fallback URL for {angle}: {fallback_url}")
                    
                    generated_images.append({
                        'url': fallback_url,
                        'angle': angle,
                        'title': f"{car_info} - {angle.title()} View",
                        'isMain': (i == 0),
                        'prompt': simple_prompt,
                        'seed': seed,
                        'session_id': session_id,
                        'success': True
                    })
                        
            except Exception as angle_error:
                logger.error(f"[g4f_algorithm] Error generating image for angle {angle}: {angle_error}")
                continue

        # Return success response with generated images
        logger.info(f"[g4f_algorithm] Generated {len(generated_images)} images using g4f")
        
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
        logger.error(f"[g4f_algorithm] Critical error in g4f image generation: {e}")
        return Response({
            'success': False,
            'error': f'g4f image generation failed: {str(e)}',
            'total_generated': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        
