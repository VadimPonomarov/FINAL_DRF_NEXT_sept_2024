"""
Views for AI image generation using g4f
"""
import logging
import requests
from typing import Optional, List, Dict
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

logger = logging.getLogger(__name__)

try:
    from g4f.client import Client
    G4F_AVAILABLE = True
except ImportError:
    G4F_AVAILABLE = False
    logger.warning("g4f not available, image generation will use fallbacks")


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_car_images_with_mock_algorithm(request):
    """
    Generate car images using advanced algorithm with g4f + Pollinations.ai
    """
    logger.info("🎨 [MOCK_ALGORITHM] Starting advanced car image generation")
    
    # Get data from request
    brand = request.data.get('brand', '').strip()
    model = request.data.get('model', '').strip()
    year = request.data.get('year', 2023)
    color = request.data.get('color', 'silver').strip()
    body_type = request.data.get('body_type', '').strip()
    condition = request.data.get('condition', '').strip()
    description = request.data.get('description', '').strip()
    angles = request.data.get('angles', ['front', 'rear', 'side', 'interior', 'dashboard', 'engine', 'trunk', 'wheels', 'details'])
    style = request.data.get('style', 'professional')
    
    # Get vehicle type from request
    vehicle_type = request.data.get('vehicle_type', 'car')
    vehicle_type_name = request.data.get('vehicle_type_name', '')
    
    logger.info(f"🎨 [MOCK_ALGORITHM] Input: {brand} {model} {year} {color} {vehicle_type}")
    
    if not brand or not model:
        return Response({
            'success': False,
            'error': 'Brand and model are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create canonical data structure
    canonical_data = {
        'brand': brand,
        'model': model,
        'year': year,
        'color': color,
        'body_type': body_type,
        'condition': condition,
        'description': description,
        'vehicle_type': vehicle_type,
        'vehicle_type_name': vehicle_type_name
    }
    
    # Create session ID for consistency
    import hashlib
    session_data = f"{canonical_data['brand']}_{canonical_data['model']}_{canonical_data['year']}_{canonical_data['color']}_{canonical_data['body_type']}"
    car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]
    canonical_data['session_id'] = f"CAR-{car_session_id}"
    
    logger.info(f"🔗 [MOCK_ALGORITHM] Session ID: CAR-{car_session_id}")
    
    # Generate images using Pollinations.ai
    import concurrent.futures
    import urllib.parse
    
    def generate_single_image(angle_index_tuple):
        """Generate a single image for given angle"""
        index, angle = angle_index_tuple
        try:
            logger.info(f"🔄 [MOCK_ALGORITHM] Generating {angle} ({index + 1}/{len(angles)})")
            
            # Create simple prompt for Pollinations.ai
            brand = canonical_data.get('brand', 'Unknown')
            model = canonical_data.get('model', 'Unknown')
            year = canonical_data.get('year', '2023')
            color = canonical_data.get('color', 'silver')
            vehicle_type = canonical_data.get('vehicle_type', 'car')
            
            # Simple, clear prompt that works
            if vehicle_type == 'motorcycle':
                simple_prompt = f"Professional photo of {brand} {model} {year} {color} motorcycle, {angle} view"
            elif vehicle_type == 'bus':
                simple_prompt = f"Professional photo of {brand} {model} {year} {color} bus, {angle} view"
            elif vehicle_type == 'truck':
                simple_prompt = f"Professional photo of {brand} {model} {year} {color} truck, {angle} view"
            elif vehicle_type == 'special':
                simple_prompt = f"Professional photo of {brand} {model} {year} {color} construction equipment, {angle} view"
            else:
                simple_prompt = f"Professional photo of {brand} {model} {year} {color} car, {angle} view"
            
            # Use consistent seed for all angles
            session_id = canonical_data.get('session_id', 'DEFAULT')
            base_seed = abs(hash(f"{session_id}")) % 1000000
            angle_offset = hash(angle) % 100
            seed = base_seed + angle_offset
            
            # Encode prompt
            encoded_prompt = urllib.parse.quote(simple_prompt)
            
            # Generate URL with Pollinations.ai
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&seed={seed}&nologo=true"
            
            logger.info(f"✅ [MOCK_ALGORITHM] Generated {angle}: {image_url[:100]}...")
            
            return {
                'angle': angle,
                'url': image_url,
                'seed': seed,
                'prompt': simple_prompt,
                'method': 'pollinations_ai'
            }
            
        except Exception as e:
            logger.error(f"❌ [MOCK_ALGORITHM] Error generating {angle}: {e}")
            return {
                'angle': angle,
                'url': None,
                'error': str(e),
                'method': 'error'
            }
    
    # Generate images in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        angle_tuples = list(enumerate(angles))
        results = list(executor.map(generate_single_image, angle_tuples))
    
    # Filter successful results
    successful_results = [r for r in results if r.get('url')]
    failed_results = [r for r in results if not r.get('url')]
    
    logger.info(f"✅ [MOCK_ALGORITHM] Generated {len(successful_results)}/{len(angles)} images successfully")
    
    if failed_results:
        logger.warning(f"⚠️ [MOCK_ALGORITHM] Failed to generate {len(failed_results)} images: {[r['angle'] for r in failed_results]}")
    
    return Response({
        'success': True,
        'images': successful_results,
        'failed': failed_results,
        'total_requested': len(angles),
        'total_generated': len(successful_results),
        'session_id': canonical_data['session_id'],
        'method': 'pollinations_ai_simple',
        'vehicle_data': {
            'brand': brand,
            'model': model,
            'year': year,
            'color': color,
            'vehicle_type': vehicle_type,
            'vehicle_type_name': vehicle_type_name
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_single_image_view(request):
    """
    Generate a single image using g4f
    """
    prompt = request.data.get('prompt', '').strip()
    model = request.data.get('model', 'flux')
    
    if not prompt:
        return Response({
            'success': False,
            'error': 'Prompt is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    logger.info(f"🎨 Generating image with prompt: {prompt[:100]}...")
    
    if not G4F_AVAILABLE:
        logger.warning("g4f not available, returning placeholder")
        return Response({
            'success': True,
            'image_url': f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=1024&height=768&model=flux",
            'fallback': True,
            'message': 'g4f not available, using Pollinations.ai directly'
        })
    
    try:
        # Initialize g4f client
        client = Client()
        
        # Generate image
        response = client.images.generate(
            model=model,
            prompt=prompt,
            response_format="url"
        )
        
        if response and hasattr(response, 'data') and response.data:
            image_url = response.data[0].url
            logger.info(f"✅ Image generated successfully: {image_url}")
            
            return Response({
                'success': True,
                'image_url': image_url,
                'model': model,
                'prompt': prompt
            })
        else:
            logger.warning("No image data in g4f response, using fallback")
            return Response({
                'success': True,
                'image_url': f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=1024&height=768&model=flux",
                'fallback': True,
                'message': 'g4f response empty, using Pollinations.ai directly'
            })
    
    except Exception as g4f_error:
        logger.error(f"g4f generation failed: {g4f_error}")
        return Response({
            'success': True,
            'image_url': f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=1024&height=768&model=flux",
            'fallback': True,
            'message': f'g4f failed: {g4f_error}, using Pollinations.ai directly'
        })
