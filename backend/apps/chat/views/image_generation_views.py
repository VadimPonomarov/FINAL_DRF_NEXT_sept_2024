"""
Views for AI image generation using g4f
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

logger = logging.getLogger(__name__)

try:
    from g4f.client import Client
    G4F_AVAILABLE = True
except ImportError:
    G4F_AVAILABLE = False
    logger.warning("g4f not available, image generation will use fallbacks")


def search_reference_images(brand: str, model: str, year: int, color: Optional[str] = None) -> List[str]:
    """
    Поиск реальных фотографий автомобиля в интернете для использования как референс.
    
    Когда AI модель не уверена (менее 95%) в правильности отображения конкретного автомобиля,
    она должна найти реальные фото с точными параметрами и использовать их как образец.
    
    Args:
        brand: Марка автомобиля (например, "BMW")
        model: Модель (например, "X5")
        year: Год выпуска
        color: Цвет (опционально)
    
    Returns:
        List[str]: Список URL реальных фотографий для использования как референс
    """
    reference_urls = []
    
    # Формируем точный поисковый запрос
    search_query = f"{brand} {model} {year}"
    if color:
        search_query += f" {color}"
    search_query += " photo stock image"
    
    logger.info(f"[ReferenceSearch] Searching for: {search_query}")
    
    try:
        # Метод 1: Unsplash API (бесплатный, высококачественные фото)
        unsplash_url = f"https://api.unsplash.com/search/photos"
        unsplash_params = {
            'query': search_query,
            'per_page': 3,
            'orientation': 'landscape'
        }
        
        # Если есть Unsplash Access Key в настройках
        unsplash_key = getattr(settings, 'UNSPLASH_ACCESS_KEY', None)
        if unsplash_key:
            unsplash_params['client_id'] = unsplash_key
            response = requests.get(unsplash_url, params=unsplash_params, timeout=5)
            if response.status_code == 200:
                results = response.json().get('results', [])
                for result in results[:3]:
                    reference_urls.append(result['urls']['regular'])
                logger.info(f"[ReferenceSearch] Found {len(results)} images from Unsplash")
    
    except Exception as e:
        logger.warning(f"[ReferenceSearch] Unsplash search failed: {e}")
    
    try:
        # Метод 2: Pixabay API (бесплатный, хорошее качество)
        pixabay_key = getattr(settings, 'PIXABAY_API_KEY', None)
        if pixabay_key and len(reference_urls) < 3:
            pixabay_url = "https://pixabay.com/api/"
            pixabay_params = {
                'key': pixabay_key,
                'q': search_query,
                'image_type': 'photo',
                'per_page': 3,
                'safesearch': 'true'
            }
            response = requests.get(pixabay_url, params=pixabay_params, timeout=5)
            if response.status_code == 200:
                hits = response.json().get('hits', [])
                for hit in hits[:3]:
                    reference_urls.append(hit['largeImageURL'])
                logger.info(f"[ReferenceSearch] Found {len(hits)} images from Pixabay")
    
    except Exception as e:
        logger.warning(f"[ReferenceSearch] Pixabay search failed: {e}")
    
    # Если не нашли через API, создаем инструкцию для модели искать самостоятельно
    if not reference_urls:
        logger.info(f"[ReferenceSearch] No API results, AI will use internal knowledge of {search_query}")
    
    return reference_urls


def create_reference_instruction(brand: str, model: str, year: int, reference_urls: Optional[List[str]] = None) -> str:
    """
    Создает инструкцию для AI модели использовать реальные фотографии как референс.
    
    Эта инструкция говорит модели:
    1. Искать в своей базе знаний реальные фотографии этого автомобиля
    2. Копировать дизайн, пропорции, детали с реальных фото
    3. НЕ придумывать дизайн самостоятельно, если не уверена
    """
    
    if reference_urls and len(reference_urls) > 0:
        # Если нашли реальные фото - инструктируем модель их использовать
        reference_instruction = (
            f"CRITICAL REFERENCE INSTRUCTION: "
            f"Real photographs of {brand} {model} {year} have been found. "
            f"Your task is to COPY the design from these real photos as accurately as possible. "
            f"Found {len(reference_urls)} reference images. "
            f"EXACT COPYING required: body shape, headlight design, grille pattern, wheel design, "
            f"proportions, styling details - everything must match the real {brand} {model} {year}. "
            f"Do NOT invent or imagine - COPY what you see in real photos of this exact model and year."
        )
    else:
        # Если не нашли фото через API - инструктируем модель использовать внутренние знания
        reference_instruction = (
            f"CRITICAL KNOWLEDGE INSTRUCTION: "
            f"Search your training data for REAL photographs of {brand} {model} {year}. "
            f"If you are less than 95% confident about the exact appearance of this vehicle, "
            f"you MUST use reference images from your knowledge base. "
            f"Recreate the design AS IT APPEARS in real photographs - not your interpretation. "
            f"COPY EXACTLY: body panels, headlight shapes, grille design, wheel fitment, "
            f"all styling elements must match REAL {brand} {model} {year} from photos. "
            f"If uncertain about any detail (especially badges, logos, grille), "
            f"use GENERIC UNMARKED version of that area rather than guessing incorrectly."
        )
    
    return reference_instruction


@swagger_auto_schema(
    method='post',
    operation_summary="🎨 Generate AI Image",
    operation_description="Generate image using AI models (g4f flux). Supports various image generation prompts with enhanced quality.",
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
                default='flux-schnell',
                example='flux-schnell'
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
    Generate image using g4f flux-schnell model
    """
    try:
        data = request.data
        prompt = data.get('prompt')
        model = data.get('model', 'flux')
        quality = data.get('quality', 'standard')

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
                'image_url': generate_placeholder_url(prompt),
                'fallback': True,
                'message': 'g4f not available, using placeholder'
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
    operation_description="Generate multiple car images for different angles (front, side, rear, interior) based on car specifications.",
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
                    'body_type': openapi.Schema(type=openapi.TYPE_STRING, example='suv')
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
    Generate multiple car images for different angles using the same algorithm as generate_mock_ads
    """
    try:
        data = request.data
        car_data = data.get('car_data', {})
        angles = data.get('angles', ['front', 'side', 'rear'])
        style = data.get('style', 'realistic')
        use_mock_algorithm = data.get('use_mock_algorithm', True)  # New parameter

        # Логирование для отладки
        logger.info(f"🎯 [generate_car_images] Received angles: {angles}")
        logger.info(f"📊 [generate_car_images] Total angles count: {len(angles)}")
        logger.info(f"🚗 [generate_car_images] Car data: {car_data}")
        logger.info(f"🔧 [generate_car_images] Use mock algorithm: {use_mock_algorithm}")

        # Use the improved mock algorithm if requested
        if use_mock_algorithm:
            # IMPORTANT: generate_car_images_with_mock_algorithm is a DRF view (@api_view),
            # so it expects a Django HttpRequest, not a DRF Request wrapper.
            # Pass the underlying Django request to avoid type errors.
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

        # Создаем стабильный session_id для всех изображений этого автомобиля (БЕЗ времени для консистентности)
        import hashlib
        session_data = f"{car_data.get('brand', '')}_{car_data.get('model', '')}_{car_data.get('year', '')}_{car_data.get('color', '')}_{car_data.get('body_type', '')}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]

        logger.info(f"🔗 Car session ID for consistency: CAR-{car_session_id}")

        # 🚀 АСИНХРОННАЯ генерация изображений
        import asyncio
        import concurrent.futures
        from threading import Thread

        def generate_single_image(angle, index, car_data, style, car_session_id):
            """Генерирует одно изображение для указанного ракурса"""
            try:
                prompt = create_car_image_prompt(car_data, angle, style, car_session_id)

                # Используем наш упрощенный промпт напрямую
                english_prompt = prompt

                if G4F_AVAILABLE:
                    try:
                        client = Client()
                        response = client.images.generate(
                            model="flux",
                            prompt=english_prompt,
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

                return {
                    'url': image_url,
                    'angle': angle,
                    'title': get_angle_title(angle, car_data),
                    'isMain': index == 0,
                    'prompt': prompt,
                    'success': True
                }

            except Exception as e:
                logger.error(f"Failed to generate image for angle {angle}: {e}")
                return {
                    'url': generate_placeholder_url(f"Error generating {angle} view"),
                    'angle': angle,
                    'title': get_angle_title(angle, car_data),
                    'isMain': index == 0,
                    'prompt': f"Error: {str(e)}",
                    'success': False
                }

        # Используем ThreadPoolExecutor для параллельной генерации (увеличиваем workers)
        generated_images = []
        max_workers = min(len(angles), 6)  # Увеличено с 4 до 6
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Создаем задачи для всех ракурсов
            future_to_angle = {
                executor.submit(generate_single_image, angle, i, car_data, style, car_session_id): (angle, i)
                for i, angle in enumerate(angles)
            }

            # Собираем результаты по мере готовности
            for future in concurrent.futures.as_completed(future_to_angle):
                angle, index = future_to_angle[future]
                try:
                    result = future.result()
                    generated_images.append(result)
                    logger.info(f"✅ Generated image for {angle}: {result['success']}")
                except Exception as e:
                    logger.error(f"❌ Exception in thread for {angle}: {e}")
                    # Добавляем fallback результат
                    generated_images.append({
                        'url': generate_placeholder_url(f"Thread error for {angle}"),
                        'angle': angle,
                        'title': get_angle_title(angle, car_data),
                        'isMain': index == 0,
                        'prompt': f"Thread error: {str(e)}",
                        'success': False
                    })

        # Сортируем результаты по исходному порядку ракурсов
        angle_order = {angle: i for i, angle in enumerate(angles)}
        generated_images.sort(key=lambda x: angle_order.get(x['angle'], 999))

        logger.info(f"🎯 Generated {len(generated_images)} images using parallel processing")

        if not generated_images:
            return Response({
                'success': False,
                'error': 'Failed to generate any images'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'success': True,
            'images': generated_images,
            'total_generated': len(generated_images)
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
    operation_summary='🚗 Generate Car Images (Mock Algorithm)',
    operation_description="""
    Generate car images using the same algorithm as generate_mock_ads command.

    ### Permissions:
    - No authentication required (public endpoint)

    ### Request Body:
    Car data including brand, model, year, and other specifications.

    ### Response:
    Returns generated car images with metadata.
    """,
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
    Generate car images using the same algorithm as generate_mock_ads command
    """
    try:
        # If called directly, extract data from request
        if car_data is None and request is not None:
            data = request.data
            car_data = data.get('car_data', {})
            angles = data.get('angles', ['front', 'side', 'rear'])
            style = data.get('style', 'realistic')
        elif car_data is None:
            # Default values when no request and no car_data
            car_data = {}
            angles = angles or ['front', 'side', 'rear']
            style = style or 'realistic'

        logger.info(f"🎨 [mock_algorithm] Generating images with improved algorithm")
        logger.info(f"🚗 [mock_algorithm] Car data: {car_data}")
        logger.info(f"📐 [mock_algorithm] Angles: {angles}")
        logger.info(f"🎯 [mock_algorithm] Total angles to generate: {len(angles)}")

        # Import the mock algorithm functions
        from apps.ads.management.commands.generate_mock_ads import Command as MockCommand

        # Create a mock command instance to use its methods
        mock_cmd = MockCommand()

        # Build canonical car data using the same logic as mock command
        # Ensure all required fields are present
        specs = {
            'year': car_data.get('year', 2020),
            'color': car_data.get('color', 'silver'),
            'body_type': car_data.get('body_type', 'sedan'),
            'condition': car_data.get('condition', 'good'),  # Add missing condition field
            'vehicle_type': car_data.get('vehicle_type', 'car'),
            'vehicle_type_name': car_data.get('vehicle_type_name', 'car')
        }

        canonical_data = mock_cmd._build_canonical_car_data(
            car_data.get('brand', ''),
            car_data.get('model', ''),
            specs,  # specs with all required fields
            car_data.get('vehicle_type', 'car')
        )

        # Create session ID for consistency (БЕЗ времени для стабильности)
        import hashlib
        session_data = f"{canonical_data['brand']}_{canonical_data['model']}_{canonical_data['year']}_{canonical_data['color']}_{canonical_data['body_type']}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]
        canonical_data['session_id'] = f"CAR-{car_session_id}"

        logger.info(f"🔗 [mock_algorithm] Session ID: CAR-{car_session_id}")
        logger.info(f"📊 [mock_algorithm] Canonical data: {canonical_data}")

        # Generate images using the mock algorithm
        generated_images = []

        for index, angle in enumerate(angles):
            try:
                logger.info(f"🔄 [mock_algorithm] Generating image {index + 1}/{len(angles)} for angle: {angle}")

                # Create prompt using our improved algorithm (NOT mock algorithm)
                prompt = create_car_image_prompt(canonical_data, angle, style, car_session_id)

                # Use our own simplified prompt directly (no translation needed)
                english_prompt = prompt

                # Generate image using OpenAI DALL-E 3
                import os
                from openai import OpenAI

                try:
                    # Initialize OpenAI client
                    api_key = os.getenv('OPENAI_API_KEY')
                    if not api_key:
                        logger.error("❌ [DALL-E] OPENAI_API_KEY not found in environment")
                        raise ValueError("OPENAI_API_KEY not configured")

                    client = OpenAI(api_key=api_key)

                    # DALL-E 3 has a 4000 character limit for prompts
                    # Simplify prompt if needed
                    dalle_prompt = english_prompt[:4000] if len(english_prompt) > 4000 else english_prompt

                    logger.info(f"🎨 [DALL-E] Generating image for {angle} with prompt length: {len(dalle_prompt)}")

                    # Generate image with DALL-E 3
                    response = client.images.generate(
                        model="dall-e-3",
                        prompt=dalle_prompt,
                        size="1024x1024",  # DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
                        quality="standard",  # "standard" or "hd"
                        n=1,
                    )

                    image_url = response.data[0].url
                    logger.info(f"✅ [DALL-E] Successfully generated image for {angle}: {image_url[:100]}...")

                except Exception as e:
                    logger.error(f"❌ [DALL-E] Error generating image for {angle}: {e}")
                    # Fallback to pollinations.ai if DALL-E fails
                    logger.info(f"🔄 [DALL-E] Falling back to pollinations.ai")
                    import urllib.parse
                    enhanced_prompt = f"{english_prompt}. NEGATIVE: cartoon, anime, drawing, sketch, low quality, blurry, distorted, multiple vehicles, people, text, watermarks"
                    encoded_prompt = urllib.parse.quote(enhanced_prompt)
                    session_id = canonical_data.get('session_id', 'DEFAULT')
                    seed = abs(hash(session_id)) % 1000000
                    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}&nologo=true"
                    logger.info(f"🔗 [Pollinations] Fallback URL for {angle}: {image_url[:100]}...")

                # Create image object
                image_obj = {
                    'url': image_url,
                    'angle': angle,
                    'title': get_angle_title(angle, canonical_data),
                    'isMain': index == 0,
                    'prompt': english_prompt,
                    'seed': seed,
                    'session_id': session_id
                }

                generated_images.append(image_obj)

                logger.info(f"✅ [mock_algorithm] Generated {angle} image with seed {seed} (total: {len(generated_images)})")

            except Exception as e:
                logger.error(f"❌ [mock_algorithm] Error generating {angle} image: {e}")
                import traceback
                logger.error(f"❌ [mock_algorithm] Traceback: {traceback.format_exc()}")
                continue

        logger.info(f"🎉 [mock_algorithm] Successfully generated {len(generated_images)}/{len(angles)} images")

        response_data = {
            'success': True,
            'status': 'ok',
            'images': generated_images,
            'session_id': f"CAR-{car_session_id}",
            'canonical_data': canonical_data,
            'debug': {
                'requested_angles': angles,
                'generated_count': len(generated_images),
                'canonical': canonical_data,
                'prompts': [img.get('prompt', '') for img in generated_images],
                'angles': [img.get('angle', '') for img in generated_images],
                'style': style
            }
        }

        logger.info(f"📤 [mock_algorithm] Returning response with {len(generated_images)} images")

        return Response(response_data)

    except Exception as e:
        logger.error(f"❌ [mock_algorithm] Error: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'images': []
        }, status=500)


def create_car_image_prompt(car_data, angle, style, car_session_id=None):
    """
    Create a structured, enforceable prompt for FLUX that:
    - First, makes the LLM understand the required vehicle TYPE
    - Then injects brand, model, year, color, condition, scene description
    - Enforces SAME vehicle across a series using a stable ID and repeated cues
    """
    brand = (car_data.get('brand') or '').strip()
    model = (car_data.get('model') or '').strip()
    year = car_data.get('year') or ''
    color = (car_data.get('color') or 'silver').strip()
    body_type = (car_data.get('body_type') or '').strip() or 'sedan'
    condition = (car_data.get('condition') or '').strip()
    scene_desc = (car_data.get('description') or '').strip()
    vehicle_type_name = (car_data.get('vehicle_type_name') or '').strip().lower()

    # ❌ FALLBACK DISABLED: Use ONLY real vehicle_type_name from API data
    # NO OVERRIDES, NO HEURISTICS, NO LLM FALLBACKS
    vehicle_type = None

    # Map Ukrainian vehicle type names to English for image generation
    vehicle_type_mapping = {
        'легкові': 'car',
        'легковые': 'car',
        'вантажівки': 'truck',
        'грузовые': 'truck',
        'мото': 'motorcycle',
        'мотоциклы': 'motorcycle',
        'причепи': 'trailer',
        'прицепы': 'trailer',
        'автобуси': 'bus',
        'автобусы': 'bus',
        'спецтехніка': 'special',
        'спецтехника': 'special',
        'водний транспорт': 'boat',
        'водный транспорт': 'boat'
    }

    # Use ONLY the real vehicle_type_name from API, no fallbacks
    if vehicle_type_name:
        vehicle_type = vehicle_type_mapping.get(vehicle_type_name.lower(), 'car')
        print(f"[ImageGen] ✅ Using real vehicle_type_name: '{vehicle_type_name}' → '{vehicle_type}'")
    else:
        print(f"[ImageGen] ❌ No vehicle_type_name provided, using 'car' as last resort")
        vehicle_type = 'car'

    # Stable series ID for consistency across angles (БЕЗ времени для стабильности)
    if not car_session_id:
        import hashlib
        session_data = f"{brand}_{model}_{year}_{color}_{body_type}_{vehicle_type}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]

    # Определяем angle_key и vt в начале
    angle_key = str(angle or '').lower().replace('-', '_')
    vt = vehicle_type or 'car'  # Fallback to 'car' if vehicle_type is None

    # Простые элементы консистентности
    consistency_elements = [
        f"Same vehicle (ID: CAR-{car_session_id})",
        f"Different angle: {angle}",
        "Professional photography"
    ]

    # Добавляем уникальные элементы для каждого ракурса
    # Простые описания ракурсов
    angle_specific_elements = {
        'front': ["Front view", "Grille and headlights visible"],
        'front_left': ["Front-left angle", "Three-quarter view"],
        'front_right': ["Front-right angle", "Three-quarter view"],
        'rear': ["Rear view", "Taillights and bumper visible"],
        'rear_left': ["Rear-left angle", "Three-quarter view"],
        'rear_right': ["Rear-right angle", "Three-quarter view"],
        'side': ["Side profile", "Complete silhouette"],
        'left': ["Left side", "Side profile"],
        'right': ["Right side", "Side profile"],
        'top': ["Top view", "Bird's eye perspective"],
        'interior': ["Interior cabin", "Dashboard and seats"],
        'dashboard': ["Dashboard close-up", "Instrument cluster"],
        'engine': ["Engine bay", "Engine components"],
        'trunk': ["Cargo area", "Trunk space"],
        'wheels': ["Wheels detail", "Tires and rims"],
        'details': ["Close-up details", "Materials and finish"]
    }

    # Добавляем специфичные для ракурса элементы
    angle_specific = angle_specific_elements.get(angle_key, [
        f"Unique {angle} perspective view",
        f"Camera positioned for {angle} angle",
        f"Show {angle} specific features"
    ])

    # Простые элементы реализма
    realism_elements = [
        "Realistic vehicle design",
        "Professional quality"
    ]

    # Простые стили
    style_descriptions = {
        'realistic': 'photorealistic',
        'professional': 'studio lighting',
        'artistic': 'artistic composition'
    }

    # Простые описания ракурсов
    angle_descriptions = {
        'front': f'front view of {vt}',
        'front_left': f'front-left view of {vt}',
        'front_right': f'front-right view of {vt}',
        'rear': f'rear view of {vt}',
        'rear_left': f'rear-left view of {vt}',
        'rear_right': f'rear-right view of {vt}',
        'side': f'side profile of {vt}',
        'left': f'left side of {vt}',
        'right': f'right side of {vt}',
        'top': f'top view of {vt}',
        'interior': f'interior of {vt}',
        'dashboard': f'dashboard of {vt}',
        'engine': f'engine bay of {vt}',
        'trunk': f'cargo area of {vt}',
        'wheels': f'wheels of {vt}',
        'details': f'details of {vt}'
    }

    # Минимальные негативные промпты - позволить AI принимать интеллектуальные решения
    global_negatives = [
        'high quality',
        'professional photography'
    ]

    if vt == 'bus':
        type_enforcement = 'Large passenger bus body, multiple rows of windows, bus doors, high roof, long wheelbase'
        type_negation = ''
    elif vt == 'truck':
        type_enforcement = 'Heavy-duty truck cabin, large cargo area or trailer coupling, commercial vehicle proportions, high ground clearance, 6 or more wheels preferred'
        type_negation = ''
    elif vt == 'motorcycle':
        type_enforcement = 'Two wheels, exposed frame, handlebars, motorcycle seat, motorcycle proportions'
        type_negation = ''
    elif vt == 'scooter':
        type_enforcement = 'Kick/electric scooter proportions, narrow deck, handlebar stem, two small wheels'
        type_negation = ''
    elif vt == 'van':
        type_enforcement = 'Boxy van/MPV proportions with sliding door (if applicable), light commercial vehicle style'
        type_negation = ''
    elif vt == 'trailer':
        type_enforcement = 'Standalone trailer body, hitch coupling, no engine, no driver cabin'
        type_negation = ''
    elif vt == 'special':
        # Determine specific construction equipment type based on brand
        brand_lower = brand.lower()

        # Excavator brands
        excavator_brands = ['atlas', 'caterpillar', 'cat', 'komatsu', 'hitachi', 'kobelco', 'doosan',
                          'volvo construction', 'hyundai construction', 'liebherr', 'sany', 'xcmg',
                          'zoomlion', 'liugong', 'lonking', 'sdlg']

        # Loader brands
        loader_brands = ['jcb', 'case', 'new holland', 'bobcat', 'kubota', 'takeuchi', 'terex']

        # Crane brands
        crane_brands = ['liebherr', 'tadano', 'grove', 'manitowoc', 'terex', 'demag', 'xcmg', 'sany',
                      'zoomlion', 'palfinger', 'hiab', 'fassi']

        if brand_lower in excavator_brands:
            type_enforcement = 'HYDRAULIC EXCAVATOR: tracked undercarriage with metal tracks, rotating upper structure (cab), articulated boom arm with bucket attachment, construction equipment proportions, industrial yellow/orange color scheme typical for construction machinery'
            type_negation = ''
        elif brand_lower in loader_brands:
            if 'backhoe' in model.lower():
                type_enforcement = 'BACKHOE LOADER: four-wheeled construction vehicle with front bucket loader and rear excavator arm, construction equipment design, industrial proportions'
            else:
                type_enforcement = 'WHEEL LOADER: large front bucket, articulated steering frame, four large construction wheels, heavy-duty construction equipment proportions'
            type_negation = ''
        elif brand_lower in crane_brands:
            type_enforcement = 'MOBILE CRANE: telescopic boom, counterweights, outriggers, crane proportions, construction/industrial design'
            type_negation = ''
        else:
            # Generic construction equipment
            type_enforcement = 'HEAVY CONSTRUCTION EQUIPMENT: industrial construction machinery with heavy-duty components, construction equipment proportions, industrial design elements, heavy attachments (boom, bucket, blade, or similar), tracks or large construction wheels'
            type_negation = ''
    else:
        type_enforcement = 'Passenger car proportions'
        type_negation = ''

    # 🚨 STRICT BRANDING CONTROL: Prevent incorrect badge assignments
    # Check if brand matches vehicle type to avoid wrong badges (e.g., Mercedes on Atlas)
    brand_lower = brand.lower()
    vehicle_type_lower = vt.lower()

    # Known automotive brands that should ONLY appear on passenger cars
    automotive_brands = [
        # German brands
        'bmw', 'mercedes-benz', 'mercedes', 'audi', 'volkswagen', 'vw', 'porsche', 'opel', 'smart', 'maybach',
        # Japanese brands
        'toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'lexus', 'infiniti', 'acura', 'suzuki', 'isuzu',
        # American brands
        'ford', 'chevrolet', 'gmc', 'cadillac', 'buick', 'lincoln', 'chrysler', 'dodge', 'jeep', 'ram', 'tesla',
        # Korean brands
        'hyundai', 'kia', 'genesis', 'daewoo', 'ssangyong',
        # European brands
        'volvo', 'peugeot', 'renault', 'citroen', 'fiat', 'abarth', 'alfa romeo', 'lancia', 'skoda', 'seat', 'vauxhall',
        'saab', 'jaguar', 'land rover', 'mini', 'ferrari', 'lamborghini', 'maserati', 'bentley', 'rolls-royce',
        'aston martin', 'mclaren', 'bugatti', 'koenigsegg', 'pagani', 'lotus', 'morgan', 'caterham', 'ariel',
        'noble', 'tvr', 'westfield', 'ginetta', 'radical', 'ultima', 'spyker', 'wiesmann', 'artega', 'melkus',
        # French brands
        'ds', 'alpine', 'bugatti',
        # Italian brands
        'iveco', 'pagani', 'de tomaso', 'lancia delta',
        # British brands
        'triumph', 'austin', 'rover', 'mg motor', 'leyland',
        # Swedish brands
        'koenigsegg', 'polestar',
        # Czech brands
        'tatra',
        # Romanian brands
        'dacia',
        # Russian brands
        'lada', 'gaz', 'uaz', 'kamaz', 'zil',
        # Chinese brands
        'byd', 'geely', 'chery', 'great wall', 'haval', 'mg', 'nio', 'xpeng', 'li auto', 'lynk co',
        'hongqi', 'dongfeng', 'faw', 'saic', 'changan', 'brilliance', 'lifan', 'roewe', 'wuling',
        # Indian brands
        'tata', 'mahindra', 'maruti suzuki', 'bajaj', 'force motors',
        # Malaysian brands
        'proton', 'perodua',
        # Australian brands
        'holden',
        # Iranian brands
        'iran khodro', 'saipa',
        # Turkish brands
        'togg', 'otosan'
    ]

    # Known special equipment brands that should ONLY appear on special vehicles
    special_equipment_brands = [
        # Construction equipment
        'atlas', 'caterpillar', 'cat', 'komatsu', 'liebherr', 'hitachi', 'kobelco', 'doosan', 'case', 'new holland',
        'jcb', 'bobcat', 'kubota', 'takeuchi', 'yanmar', 'wacker neuson', 'bomag', 'dynapac', 'hamm', 'wirtgen',
        'vogele', 'kleemann', 'benninghoven', 'terex', 'grove', 'manitowoc', 'tadano', 'demag', 'atlas copco',
        # Chinese construction brands
        'sany', 'xcmg', 'zoomlion', 'liugong', 'lonking', 'sdlg', 'shantui', 'changlin', 'foton lovol', 'yto',
        # Agricultural equipment
        'deutz-fahr', 'same', 'lamborghini trattori', 'hurlimann', 'fendt', 'valtra', 'massey ferguson',
        'john deere', 'claas', 'new holland agriculture', 'case ih', 'kubota agriculture', 'yanmar agriculture',
        # Mining and heavy equipment
        'volvo construction', 'hyundai construction', 'bell equipment', 'sandvik', 'epiroc', 'metso outotec',
        # Specialized brands
        'palfinger', 'hiab', 'fassi', 'pm', 'effer', 'atlas crane', 'tadano faun', 'grove crane', 'liebherr crane'
    ]

    # Core object description
    parts = [
        f"Task: generate a {vt}",
        f"Exact vehicle: {brand} {model} {year}",
        f"Primary color: {color}",
        f"Body type: {body_type}",
    ]
    if condition:
        parts.append(f"Condition: {condition}")
    if scene_desc:
        parts.append(f"Scene: {scene_desc}")

    base_prompt = ", ".join(parts)

    angle_prompt = angle_descriptions.get(angle_key, f"automotive photography of the same {vt}")
    style_prompt = style_descriptions.get(style, style if style else 'realistic')
    consistency_prompt = ", ".join(consistency_elements + [f"Series ID: CAR-{car_session_id}"])
    realism_prompt = ", ".join(realism_elements)
    
    # Добавляем специфичные для ракурса элементы
    angle_specific = angle_specific_elements.get(angle_key, [
        f"Unique {angle} perspective view",
        f"Camera positioned for {angle} angle",
        f"Show {angle} specific features"
    ])
    angle_specific_prompt = ", ".join(angle_specific)

    # 🚨 STRICT BRANDING CONTROL: Prevent incorrect badge assignments
    # Check if brand matches vehicle type to avoid wrong badges (e.g., Mercedes on Atlas)
    brand_lower = brand.lower()
    vehicle_type_lower = vt.lower()

    # Known automotive brands that should ONLY appear on passenger cars
    automotive_brands = [
        # German brands
        'bmw', 'mercedes-benz', 'mercedes', 'audi', 'volkswagen', 'vw', 'porsche', 'opel', 'smart', 'maybach',
        # Japanese brands
        'toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'lexus', 'infiniti', 'acura', 'suzuki', 'isuzu',
        # American brands
        'ford', 'chevrolet', 'gmc', 'cadillac', 'buick', 'lincoln', 'chrysler', 'dodge', 'jeep', 'ram', 'tesla',
        # Korean brands
        'hyundai', 'kia', 'genesis', 'daewoo', 'ssangyong',
        # European brands
        'volvo', 'peugeot', 'renault', 'citroen', 'fiat', 'abarth', 'alfa romeo', 'lancia', 'skoda', 'seat', 'vauxhall',
        'saab', 'jaguar', 'land rover', 'mini', 'ferrari', 'lamborghini', 'maserati', 'bentley', 'rolls-royce',
        'aston martin', 'mclaren', 'bugatti', 'koenigsegg', 'pagani', 'lotus', 'morgan', 'caterham', 'ariel',
        'noble', 'tvr', 'westfield', 'ginetta', 'radical', 'ultima', 'spyker', 'wiesmann', 'artega', 'melkus',
        # French brands
        'ds', 'alpine',
        # Italian brands
        'iveco', 'de tomaso', 'lancia delta',
        # British brands
        'triumph', 'austin', 'rover', 'mg motor', 'leyland',
        # Swedish brands
        'polestar',
        # Czech brands
        'tatra',
        # Romanian brands
        'dacia',
        # Russian brands
        'lada', 'gaz', 'uaz', 'kamaz', 'zil',
        # Chinese brands
        'byd', 'geely', 'chery', 'great wall', 'haval', 'mg', 'nio', 'xpeng', 'li auto', 'lynk co',
        'hongqi', 'dongfeng', 'faw', 'saic', 'changan', 'brilliance', 'lifan', 'roewe', 'wuling',
        # Indian brands
        'tata', 'mahindra', 'maruti suzuki', 'bajaj', 'force motors',
        # Malaysian brands
        'proton', 'perodua',
        # Australian brands
        'holden',
        # Iranian brands
        'iran khodro', 'saipa',
        # Turkish brands
        'togg', 'otosan'
    ]

    # Known special equipment brands that should ONLY appear on special vehicles
    special_equipment_brands = [
        # Construction equipment
        'atlas', 'caterpillar', 'cat', 'komatsu', 'liebherr', 'hitachi', 'kobelco', 'doosan', 'case', 'new holland',
        'jcb', 'bobcat', 'kubota', 'takeuchi', 'yanmar', 'wacker neuson', 'bomag', 'terex', 'grove', 'manitowoc', 'tadano',
        # Chinese construction brands
        'sany', 'xcmg', 'zoomlion', 'liugong', 'lonking', 'sdlg', 'shantui',
        # Agricultural equipment
        'john deere', 'claas', 'massey ferguson', 'fendt', 'valtra',
    ]

    # UNSAFE brands - AI doesn't know their logos well and may use Toyota fallback
    # For these brands, ALWAYS disable branding to prevent wrong logo generation
    unsafe_brands = [
        # Rare Chinese brands (AI often confuses with Toyota)
        'great wall', 'haval', 'dongfeng', 'faw', 'saic', 'changan', 'brilliance', 'lifan', 'roewe', 'wuling',
        # Rare European brands
        'morgan', 'caterham', 'ariel', 'noble', 'tvr', 'westfield', 'ginetta', 'radical', 'ultima',
        'spyker', 'wiesmann', 'artega', 'melkus', 'de tomaso', 'lancia delta',
        # Rare British brands
        'triumph', 'austin', 'rover', 'mg motor', 'leyland',
        # Rare Russian brands
        'kamaz', 'zil',
        # Rare Indian brands
        'maruti suzuki', 'bajaj', 'force motors',
        # Malaysian brands
        'proton', 'perodua',
        # Australian brands
        'holden',
        # Iranian brands
        'iran khodro', 'saipa',
        # Turkish brands
        'togg', 'otosan',
        # Czech brands
        'tatra',
    ]

    # 🚫 CRITICAL DECISION: DISABLE ALL BRANDING FOR ALL VEHICLES
    # Problem: AI IGNORES all negative prompts and still generates logo emblems (Toyota fallback)
    # Solution: FORCE disable branding for 100% of vehicles - NO EXCEPTIONS
    should_show_branding = False
    brand_mismatch_reason = "AI ignores negative prompts and generates wrong logos - FORCE DISABLE for all vehicles"

    print(f"[ImageGen] 🚫 BRANDING FORCE DISABLED FOR ALL VEHICLES: {brand_mismatch_reason}")

    # ✅ "ОТ ОБРАТНОГО" ПОДХОД: Явно описываем ЗОНЫ, которые должны быть ПУСТЫМИ
    # Фокусируем внимание модели на конкретных областях автомобиля
    
    # Layer 1: Детальное описание ПУСТЫХ зон (области, где обычно логотипы)
    strict_branding = (
        f"CRITICAL ZONES SPECIFICATION for {brand} {model}: "
        f"1. FRONT GRILLE CENTER: completely SMOOTH metal/plastic surface, FLAT and UNMARKED, no protrusions, no circular elements, no oval shapes. "
        f"2. HOOD CENTER (above grille): CLEAN painted surface matching body color ({color}), FLAT, no raised elements. "
        f"3. REAR TRUNK/TAILGATE CENTER: SMOOTH painted surface, BLANK area, no lettering, no emblems. "
        f"4. WHEEL CENTERS (hubcaps): simple PLAIN design, solid color or basic pattern, no text, no symbols. "
        f"5. STEERING WHEEL CENTER (if interior): FLAT surface, single color, no circular badges. "
        f"IMPORTANT: These areas must look like BLANK TEMPLATES ready for badge installation - smooth, unmarked, clean."
    )

    # ✅ СТРОГАЯ ЗАЩИТА: Запрет на использование популярных логотипов для неподходящих брендов
    # Список популярных брендов с узнаваемыми логотипами
    popular_branded_logos = {
        'toyota': 'Toyota oval logo',
        'volkswagen': 'VW logo', 'vw': 'VW logo',
        'mercedes-benz': 'Mercedes star', 'mercedes': 'Mercedes star',
        'bmw': 'BMW roundel',
        'audi': 'Audi rings',
        'honda': 'Honda H logo',
        'nissan': 'Nissan circle logo',
        'ford': 'Ford oval logo',
        'chevrolet': 'Chevrolet bowtie', 'chevy': 'Chevrolet bowtie',
        'hyundai': 'Hyundai H logo',
        'kia': 'Kia oval logo',
        'mazda': 'Mazda M logo',
        'subaru': 'Subaru stars',
        'volvo': 'Volvo arrow logo',
        'porsche': 'Porsche crest',
        'ferrari': 'Ferrari prancing horse',
        'lamborghini': 'Lamborghini bull logo',
        'bentley': 'Bentley B logo',
        'rolls-royce': 'Rolls-Royce RR logo',
        'lexus': 'Lexus L logo',
        'infiniti': 'Infiniti logo',
        'acura': 'Acura A logo'
    }
    
    brand_lower = brand.lower()
    
    # Создаем список ЗАПРЕЩЕННЫХ логотипов (все популярные, кроме текущего бренда)
    forbidden_logos = []
    for brand_name, logo_name in popular_branded_logos.items():
        if brand_lower != brand_name:  # Если это НЕ наш бренд
            forbidden_logos.append(logo_name)
    
    # Строгая инструкция о запрещенных логотипах
    if forbidden_logos:
        forbidden_instruction = (
            f"ABSOLUTELY FORBIDDEN - DO NOT GENERATE ANY OF THESE LOGOS: "
            f"{', '.join(forbidden_logos)}. "
            f"These logos belong to OTHER brands, NOT to {brand}. "
            f"CRITICAL: This is {brand} {model}, NOT Toyota, NOT Mercedes, NOT BMW, NOT any other brand. "
            f"If you are uncertain about {brand} logo - use BLANK unmarked grille instead."
        )
    else:
        forbidden_instruction = ""
    
    # Минимальная защита бренда - позволить AI принимать интеллектуальные решения
    brand_protection = (
        f"Focus on vehicle design elements: shape, proportions, color, styling, "
        f"headlights, taillights, wheels, overall silhouette. "
        f"Professional automotive photography style."
    )

    negatives = ", ".join(global_negatives + ([type_negation] if type_negation else []))

    # Собираем информацию о состоянии и особенностях автомобиля
    condition_details = []
    if condition:
        condition_lower = condition.lower()
        if 'excellent' in condition_lower or 'отличное' in condition_lower or 'відмінний' in condition_lower:
            condition_details.append("pristine condition, well-maintained, no visible damage")
        elif 'good' in condition_lower or 'хорошее' in condition_lower or 'гарний' in condition_lower:
            condition_details.append("good condition, minor wear typical for age")
        elif 'fair' in condition_lower or 'среднее' in condition_lower or 'задовільний' in condition_lower:
            condition_details.append("fair condition, visible signs of use and age")
        elif 'poor' in condition_lower or 'плохое' in condition_lower or 'поганий' in condition_lower:
            condition_details.append("poor condition, significant wear and damage")
    
    # Парсим описание для специфических повреждений/особенностей
    damage_keywords = {
        'scratch': 'scratches', 'царапина': 'scratches', 'подряпина': 'scratches',
        'dent': 'dents', 'вмятина': 'dents', 'вм\'ятина': 'dents',
        'crack': 'cracked glass', 'трещина': 'cracked glass', 'тріщина': 'cracked glass',
        'broken': 'broken parts', 'разбит': 'broken parts', 'розбитий': 'broken parts',
        'rust': 'rust spots', 'ржавчина': 'rust spots', 'іржа': 'rust spots',
        'paint': 'paint damage', 'краска': 'paint damage', 'фарба': 'paint damage'
    }
    
    specific_damages = []
    if scene_desc:
        scene_lower = scene_desc.lower()
        for keyword, damage_type in damage_keywords.items():
            if keyword in scene_lower:
                specific_damages.append(damage_type)
                # Пытаемся найти локализацию повреждения
                if 'капот' in scene_lower or 'hood' in scene_lower:
                    specific_damages[-1] += ' on hood'
                elif 'дверь' in scene_lower or 'door' in scene_lower or 'двері' in scene_lower:
                    specific_damages[-1] += ' on door'
                elif 'крыло' in scene_lower or 'fender' in scene_lower or 'крило' in scene_lower:
                    specific_damages[-1] += ' on fender'
                elif 'бампер' in scene_lower or 'bumper' in scene_lower:
                    specific_damages[-1] += ' on bumper'
    
    damage_description = ", ".join(specific_damages) if specific_damages else ""
    condition_description = ", ".join(condition_details) if condition_details else ""
    
    # ✅ IMPROVED PROMPT STRUCTURE: Lead with POSITIVE description, minimize negative mentions
    # Focus AI attention on what we WANT (specific vehicle, color, angle) rather than what we DON'T want
    
    # Определяем возраст автомобиля для корректного отображения
    current_year = 2025
    vehicle_age = current_year - int(year) if year else 0
    age_instruction = ""
    
    if vehicle_age >= 30:
        age_instruction = (
            f"This is a CLASSIC/VINTAGE vehicle from {year} (over 30 years old). "
            f"Show PERIOD-CORRECT design: older body style, classic headlights, vintage wheels, "
            f"technology and styling typical for {year}s era. NO modern elements."
        )
    elif vehicle_age >= 15:
        age_instruction = (
            f"This is an OLDER vehicle from {year} ({vehicle_age} years old). "
            f"Show APPROPRIATE AGE: body style from {year}, headlight/taillight design of that era, "
            f"wheel designs typical for {year}. NOT a modern redesign."
        )
    elif vehicle_age >= 5:
        age_instruction = (
            f"This is a USED vehicle from {year} ({vehicle_age} years old). "
            f"Show design from {year} model year, appropriate styling for that period."
        )
    else:
        age_instruction = (
            f"This is a RECENT/NEW vehicle from {year}. "
            f"Show current generation design typical for {year}."
        )
    
    # ✅ ПОИСК РЕФЕРЕНСНЫХ ИЗОБРАЖЕНИЙ (реальные фото из интернета)
    # Когда модель менее 95% уверена, она должна найти и скопировать реальные фото
    try:
        reference_urls = search_reference_images(brand, model, year, color)
        reference_instruction_part = create_reference_instruction(brand, model, year, reference_urls)
        logger.info(f"[ImageGen] Reference search completed for {brand} {model} {year}: {len(reference_urls)} images found")
    except Exception as e:
        logger.warning(f"[ImageGen] Reference search failed: {e}, using fallback instruction")
        reference_instruction_part = create_reference_instruction(brand, model, year, None)
    
    # Инструкция об использовании реальных знаний
    knowledge_instruction = (
        f"{reference_instruction_part} "
        f"CRITICAL INSTRUCTION: Use your REAL KNOWLEDGE about {brand} {model} ({year}). "
        f"{age_instruction} "
        f"Generate images based on ACTUAL characteristics of this specific vehicle model from {year}: "
        f"authentic body shape AS IT WAS IN {year}, correct proportions for that year, "
        f"realistic headlight/taillight design TYPICAL FOR {year}, "
        f"accurate wheel fitment and styling FROM {year} era, "
        f"typical design elements for this exact model and year {year}. "
        f"DO NOT show modern redesigns or newer generations - this must be the {year} version. "
        f"This must be a SINGLE CONSISTENT VEHICLE shown from different angles - "
        f"the SAME EXACT {brand} {model} {year} in ALL images, not different variants or generations."
    )
    
    # Детали состояния и повреждений с учетом возраста
    if condition_description or damage_description or vehicle_age >= 15:
        visual_age_markers = []
        
        # Добавляем визуальные признаки возраста
        if vehicle_age >= 30 and ('poor' in (condition or '').lower() or 'fair' in (condition or '').lower()):
            visual_age_markers.append(
                "aged classic car appearance: slightly faded paint, minor surface oxidation, "
                "vintage patina, period-appropriate wear"
            )
        elif vehicle_age >= 15:
            if 'poor' in (condition or '').lower():
                visual_age_markers.append(
                    "visible aging: worn paint, surface weathering, aged rubber seals, "
                    "typical wear for a {year} vehicle"
                )
            elif 'fair' in (condition or '').lower():
                visual_age_markers.append(
                    "moderate aging: some paint dulling, minor weathering, "
                    "typical aging for a {year} vehicle"
                )
        
        condition_parts = [condition_description] if condition_description else []
        if damage_description:
            condition_parts.append(f"Specific visible damage: {damage_description}")
        if visual_age_markers:
            condition_parts.extend(visual_age_markers)
        
        if condition_parts:
            condition_instruction = (
                f"Vehicle condition and age details: {'. '.join(condition_parts)}. "
                f"Show these details CONSISTENTLY in all angles where applicable. "
                f"IMPORTANT: The vehicle must look {vehicle_age} years old, NOT brand new."
            )
        else:
            condition_instruction = ""
    else:
        condition_instruction = ""
    
    # Простой финальный промпт с четким указанием брендинга и реализма
    final_prompt = (
        f"Professional automotive photography of {brand} {model} {year} {color} {body_type}, "
        f"{angle_prompt}, "
        f"with {brand} brand emblem and badges, "
        f"photorealistic, high quality, realistic lighting, "
        f"series ID CAR-{car_session_id}"
    )

    # Log branding decision for debugging
    print(f"[ImageGen] 🏷️ BRANDING DECISION for {brand} {model} ({vt}): {'ENABLED' if should_show_branding else 'DISABLED'}")
    if not should_show_branding:
        print(f"[ImageGen] 🚫 REASON: {brand_mismatch_reason}")
    print(f"[ImageGen] 📝 FINAL PROMPT: {final_prompt[:200]}...")

    return final_prompt


def get_vehicle_type_backend(brand, body_type, vehicle_type_name: Optional[str] = None, raw_vehicle_type_input: Optional[str] = None):
    """Определяет тип транспортного средства по множеству сигналов (явный ввод, локализованное имя, бренд/кузов)."""
    brand_lower = (brand or '').lower()
    body_type_lower = (body_type or '').lower()
    name_lower = (vehicle_type_name or '').lower()
    raw_lower = (raw_vehicle_type_input or '').lower()

    # 1) Явный ввод/локализованные названия
    mapping = {
        # русский/украинский -> canonical
        'легковой': 'car', 'легковий': 'car', 'авто': 'car', 'sedan': 'car', 'хэтчбек': 'car', 'купе': 'car',
        'грузовик': 'truck', 'вантажівка': 'truck', 'тягач': 'truck', 'фура': 'truck',
        'автобус': 'bus', 'маршрутка': 'bus',
        'мотоцикл': 'motorcycle', 'мопед': 'motorcycle', 'скутер': 'scooter', 'электросамокат': 'scooter', 'самокат': 'scooter',
        'прицеп': 'trailer', 'полуприцеп': 'trailer',
        'фургон': 'van', 'минивэн': 'van', 'minivan': 'van', 'van': 'van',
        'спецтехника': 'special', 'экскаватор': 'special', 'кран': 'special', 'бульдозер': 'special'
    }
    for key, val in mapping.items():
        if key in raw_lower or key in name_lower or key in body_type_lower:
            return val

    # 2) Прицепы
    if 'trailer' in brand_lower or 'trailer' in body_type_lower or 'adr' in brand_lower:
        return 'trailer'

    # 3) Грузовики (бренды и признаки)
    if 'truck' in body_type_lower or any(x in body_type_lower for x in ['грузов', 'фура', 'тягач']):
        return 'truck'
    if any(x in brand_lower for x in ['scania', 'man ', 'daf', 'iveco', 'volvo trucks', 'kamaz', 'маз', 'ford trucks']):
        return 'truck'

    # 4) Мото/скутер
    if any(x in body_type_lower for x in ['motorcycle', 'мотоцикл']) or any(x in body_type_lower for x in ['скутер', 'мопед']):
        return 'motorcycle'

    # 5) Автобусы
    if 'bus' in body_type_lower or 'маршрутка' in body_type_lower:
        return 'bus'

    # 6) Спецтехника
    if any(x in body_type_lower for x in ['спец', 'экскаватор', 'кран', 'бульдозер']):
        return 'special'

    # 7) Фургоны/вэны
    if any(x in body_type_lower for x in ['van', 'минивэн', 'minivan', 'фургон']):
        return 'van'

    # ❌ FALLBACK DISABLED: No default fallback to 'car'
    print(f"[ImageGen] ❌ get_vehicle_type_backend: Could not determine vehicle type for brand='{brand}', body_type='{body_type}', vehicle_type_name='{vehicle_type_name}'")
    return None  # Return None instead of 'car' fallback



def llm_resolve_vehicle_type(car_data: dict) -> str:
    """Use LLM to normalize vehicle type into one of: car, truck, trailer, motorcycle, bus, special, scooter, van.
    Called only as a fallback when heuristics are ambiguous.
    """
    try:
        from apps.ads.services.llm_service import LLMService
        llm = LLMService()
        allowed = ['car','truck','trailer','motorcycle','bus','special','scooter','van']
        prompt = (
            "You are a strict classifier. Normalize the vehicle type to one of: "
            + ", ".join(allowed) + ".\n"
            "Use fields: vehicle_type, vehicle_type_name, brand, model, body_type.\n"
            "Respond with ONLY the canonical one-word token.\n\n"
            f"vehicle_type: {car_data.get('vehicle_type')}\n"
            f"vehicle_type_name: {car_data.get('vehicle_type_name')}\n"
            f"brand: {car_data.get('brand')}\nmodel: {car_data.get('model')}\n"
            f"body_type: {car_data.get('body_type')}\n"
        )
        res = (llm.get_completion(prompt) or '').strip().lower()
        res = res.split()[0].strip(',.:;') if res else ''
        return res if res in allowed else ''
    except Exception as e:
        logger.warning(f"llm_resolve_vehicle_type failed: {e}")
        return ''


def get_vehicle_description_backend(vehicle_type, body_type):
    """Returns an English descriptor of the vehicle for prompt conditioning."""
    if vehicle_type == 'trailer':
        return f"{body_type} trailer, commercial semi-trailer, industrial transport equipment"
    elif vehicle_type == 'truck':
        return f"{body_type} truck, commercial vehicle, heavy-duty transport"
    elif vehicle_type == 'motorcycle':
        return f"{body_type} motorcycle, two-wheeled vehicle, motorbike"
    elif vehicle_type == 'scooter':
        return f"{body_type} electric/kick scooter, personal mobility device"
    elif vehicle_type == 'bus':
        return f"{body_type} bus, passenger transport vehicle, public transport"
    elif vehicle_type == 'van':
        return f"{body_type} van/MPV, light commercial vehicle"
    elif vehicle_type == 'special':
        return f"{body_type} special vehicle, construction equipment, industrial machinery"
    else:
        return f"{body_type} car, passenger vehicle, automobile"


def translate_prompt_to_english(prompt):
    """
    Простой структурированный перевод промпта на английский БЕЗ использования LLM.
    Правило: ВСЕ промпты для генерации изображений ДОЛЖНЫ быть строго на английском языке.

    ВАЖНО: НЕ используем LLM для перевода, т.к. он может исказить промпт и добавить/убрать логотипы.
    Вместо этого используем простой словарь и транслитерацию.
    """
    try:
        # Simple mapping for Ukrainian/Russian colors to English
        color_mapping = {
            'червоний': 'red', 'синій': 'blue', 'зелений': 'green',
            'жовтий': 'yellow', 'білий': 'white', 'чорний': 'black',
            'сірий': 'gray', 'срібний': 'silver', 'коричневий': 'brown',
            'помаранчевий': 'orange', 'фіолетовий': 'purple', 'рожевий': 'pink',
            'бежевий': 'beige', 'золотий': 'gold'
        }

        # Simple word-by-word translation for common terms
        word_mapping = {
            'автомобіль': 'car', 'автомобиль': 'car',
            'вантажівка': 'truck', 'грузовик': 'truck',
            'мотоцикл': 'motorcycle', 'мотоцикл': 'motorcycle',
            'автобус': 'bus', 'автобус': 'bus',
            'спецтехніка': 'special equipment', 'спецтехника': 'special equipment',
            'екскаватор': 'excavator', 'экскаватор': 'excavator',
            'навантажувач': 'loader', 'погрузчик': 'loader',
            'бульдозер': 'bulldozer', 'бульдозер': 'bulldozer',
            'кран': 'crane', 'кран': 'crane',
            'передній': 'front', 'передний': 'front',
            'задній': 'rear', 'задний': 'rear',
            'боковий': 'side', 'боковой': 'side',
            'вид': 'view', 'вид': 'view',
            'ракурс': 'angle', 'ракурс': 'angle',
            'фото': 'photo', 'фото': 'photo',
            'зображення': 'image', 'изображение': 'image',
            'реалістичний': 'realistic', 'реалистичный': 'realistic',
            'професійний': 'professional', 'профессиональный': 'professional',
            'високої якості': 'high quality', 'высокого качества': 'high quality',
            'чисте тло': 'clean background', 'чистый фон': 'clean background',
            'студійне освітлення': 'studio lighting', 'студийное освещение': 'studio lighting'
        }

        # Translate prompt by replacing known words
        english_prompt = prompt
        for ukr_word, eng_word in word_mapping.items():
            english_prompt = english_prompt.replace(ukr_word, eng_word)

        for ukr_color, eng_color in color_mapping.items():
            english_prompt = english_prompt.replace(ukr_color, eng_color)

        logger.info(f"✅ Prompt translated (simple): {prompt[:50]}... -> {english_prompt[:50]}...")
        return english_prompt

    except Exception as e:
        logger.error(f"❌ Error translating prompt: {e}")
        # В случае ошибки возвращаем оригинальный промпт
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
    # Create a hash from the prompt for consistent placeholder
    hash_value = hash(prompt) % 1000000
    colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F']
    color = colors[abs(hash_value) % len(colors)]

    return f"https://via.placeholder.com/800x600/{color}/FFFFFF?text=Vehicle+Image"
