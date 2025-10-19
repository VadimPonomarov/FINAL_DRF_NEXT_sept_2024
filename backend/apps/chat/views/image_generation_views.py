"""
Views for AI image generation using g4f
"""
import logging
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


@swagger_auto_schema(
    method='post',
    operation_summary="🎨 Generate AI Image",
    operation_description="Generate image using AI models (g4f flux-schnell). Supports various image generation prompts.",
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
        model = data.get('model', 'flux-schnell')
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

        # Создаем уникальный session_id для всех изображений этого автомобиля
        import hashlib
        import time
        session_data = f"{car_data.get('brand', '')}_{car_data.get('model', '')}_{car_data.get('year', '')}_{car_data.get('color', '')}_{int(time.time())}"
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

                # Автоматически переводим промпт на английский с помощью LLM для лучшей генерации
                english_prompt = translate_prompt_to_english(prompt)

                if G4F_AVAILABLE:
                    try:
                        client = Client()
                        response = client.images.generate(
                            model="flux-schnell",
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

        # Create session ID for consistency
        import hashlib
        import time
        session_data = f"{canonical_data['brand']}_{canonical_data['model']}_{canonical_data['year']}_{canonical_data['color']}_{canonical_data['body_type']}"
        car_session_id = hashlib.md5(f"{session_data}_{int(time.time())}".encode()).hexdigest()[:8]
        canonical_data['session_id'] = f"CAR-{car_session_id}"

        logger.info(f"🔗 [mock_algorithm] Session ID: CAR-{car_session_id}")
        logger.info(f"📊 [mock_algorithm] Canonical data: {canonical_data}")

        # Generate images using the mock algorithm
        generated_images = []

        for index, angle in enumerate(angles):
            try:
                logger.info(f"🔄 [mock_algorithm] Generating image {index + 1}/{len(angles)} for angle: {angle}")

                # Create prompt using mock algorithm
                prompt = create_car_image_prompt(canonical_data, angle, style, car_session_id)

                # Translate to English using mock algorithm
                english_prompt = mock_cmd._simple_translate_to_english(prompt, canonical_data)

                # Generate image URL using pollinations.ai with seed consistency and enhanced realism
                import urllib.parse
                # Добавляем негативные промпты для лучшего качества
                enhanced_prompt = f"{english_prompt}. NEGATIVE: cartoon, anime, drawing, sketch, low quality, blurry, distorted, multiple vehicles, people, text, watermarks"
                encoded_prompt = urllib.parse.quote(enhanced_prompt)
                session_id = canonical_data.get('session_id', 'DEFAULT')
                seed = abs(hash(session_id)) % 1000000
                image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}&nologo=true"

                logger.info(f"🔗 [mock_algorithm] Generated URL for {angle}: {image_url[:100]}...")

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

    # Stable series ID for consistency across angles
    if not car_session_id:
        import hashlib, time
        session_data = f"{brand}_{model}_{year}_{color}_{body_type}_{vehicle_type}_{int(time.time())}"
        car_session_id = hashlib.md5(session_data.encode()).hexdigest()[:8]

    # Reusable consistency cues (avoid changing object between shots)
    consistency_elements = [
        f"SAME unique vehicle across all images (vehicle ID: CAR-{car_session_id})",
        "keep identical proportions, trims, and options in every shot",
        "same lighting conditions and color temperature",
        "same photographic style and post-processing",
        "single subject, no people, clean set"
    ]

    # Styles
    style_descriptions = {
        'realistic': 'photorealistic, high quality, professional automotive photography',
        'professional': 'studio lighting, clean background, commercial photography',
        'artistic': 'artistic composition, dramatic lighting, creative angle'
    }

    # Angle dictionary incl. common synonyms
    vt = vehicle_type
    angle_key = str(angle or '').lower().replace('-', '_')
    angle_descriptions = {
        'front': f'front view of the same {vt}, centered, showing grille, headlights, bumper',
        'front_left': f'front-left three-quarter view of the same {vt}, dynamic perspective',
        'front_right': f'front-right three-quarter view of the same {vt}, dynamic perspective',
        'rear': f'rear view of the same {vt}, taillights and rear bumper visible',
        'rear_left': f'rear-left three-quarter view of the same {vt}',
        'rear_right': f'rear-right three-quarter view of the same {vt}',
        'side': f'side profile of the same {vt}, complete silhouette, doors and windows visible',
        'left': f'left side profile of the same {vt}',
        'right': f'right side profile of the same {vt}',
        'top': f'top view (bird-eye) of the same {vt}, roof and proportions visible',
        'interior': f'interior cabin of the same {vt}, dashboard, steering wheel, seats',
        'dashboard': f'dashboard close-up of the same {vt}, instrument cluster and center console',
        'engine': f'engine bay of the same {vt}, engine block and components',
        'trunk': f'cargo/trunk area of the same {vt}',
        'wheels': f'wheels and tires detail of the same {vt}',
        'details': f'close-up details of the same {vt}, materials and craftsmanship'
    }

    # Enforce correct type; explicit positives and negatives per type
    global_negatives = [
        'no text overlay', 'no watermark', 'no low quality', 'no extra logos',
        'no people', 'no cropped vehicle', 'no distortion'
    ]

    if vt == 'bus':
        type_enforcement = 'Large passenger bus body, multiple rows of windows, bus doors, high roof, long wheelbase'
        type_negation = 'NOT a passenger car, NOT a van, NOT a truck'
    elif vt == 'truck':
        type_enforcement = 'Heavy-duty truck cabin, large cargo area or trailer coupling, commercial vehicle proportions, high ground clearance, 6 or more wheels preferred'
        type_negation = 'NOT a passenger car, NOT a bus, NOT a van'
    elif vt == 'motorcycle':
        type_enforcement = 'Two wheels, exposed frame, handlebars, motorcycle seat, motorcycle proportions'
        type_negation = 'NOT a car, NOT a truck, NOT a bus, NOT four wheels, NO enclosed cabin'
    elif vt == 'scooter':
        type_enforcement = 'Kick/electric scooter proportions, narrow deck, handlebar stem, two small wheels'
        type_negation = 'NOT a bicycle, NOT a motorcycle, NOT a car'
    elif vt == 'van':
        type_enforcement = 'Boxy van/MPV proportions with sliding door (if applicable), light commercial vehicle style'
        type_negation = 'NOT a sedan, NOT a hatchback/coupe, NOT a bus'
    elif vt == 'trailer':
        type_enforcement = 'Standalone trailer body, hitch coupling, no engine, no driver cabin'
        type_negation = 'NO tractor head, NO truck cabin, NOT a car'
    elif vt == 'special':
        type_enforcement = 'Construction/industrial vehicle, heavy attachments (e.g., boom, bucket), tracks or heavy-duty wheels'
        type_negation = 'NOT a passenger car, NOT a van, NOT a bus'
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

    # Determine if we should show branding at all
    should_show_branding = True
    brand_mismatch_reason = ""

    # Check for brand-vehicle type mismatches
    if brand_lower in special_equipment_brands and vehicle_type_lower in ['car', 'passenger', 'sedan', 'hatchback', 'suv', 'crossover', 'coupe', 'convertible', 'wagon', 'minivan']:
        # Special equipment brand on passenger car - suspicious, disable branding
        should_show_branding = False
        brand_mismatch_reason = f"Special equipment brand '{brand}' on passenger vehicle"
        print(f"[ImageGen] 🚨 BRANDING DISABLED: {brand_mismatch_reason}")
    elif brand_lower in automotive_brands and vehicle_type_lower in ['special', 'construction', 'industrial', 'excavator', 'bulldozer', 'crane', 'loader', 'tractor', 'agricultural']:
        # Automotive brand on special equipment - suspicious, disable branding
        should_show_branding = False
        brand_mismatch_reason = f"Automotive brand '{brand}' on special equipment"
        print(f"[ImageGen] 🚨 BRANDING DISABLED: {brand_mismatch_reason}")
    elif not brand or brand.lower() in ['unknown', 'generic', 'other', 'не указано', 'не вказано', '', 'null', 'none']:
        # No brand specified or generic brand - disable branding
        should_show_branding = False
        brand_mismatch_reason = f"Generic or unknown brand '{brand}'"
        print(f"[ImageGen] 🚨 BRANDING DISABLED: {brand_mismatch_reason}")
    elif brand_lower not in automotive_brands and brand_lower not in special_equipment_brands:
        # Unknown brand not in our lists - disable branding to prevent hallucination
        should_show_branding = False
        brand_mismatch_reason = f"Unknown brand '{brand}' not in validated lists"
        print(f"[ImageGen] 🚨 BRANDING DISABLED: {brand_mismatch_reason} - preventing logo hallucination")
    elif brand_lower in special_equipment_brands:
        # Special equipment brands are prone to AI confusion - disable branding for safety
        should_show_branding = False
        brand_mismatch_reason = f"Special equipment brand '{brand}' - AI often confuses with automotive brands"
        print(f"[ImageGen] 🚨 BRANDING DISABLED: {brand_mismatch_reason} - preventing logo confusion")

    if should_show_branding:
        strict_branding = f"Use authentic {brand} {model} {year} design elements and branding"
        print(f"[ImageGen] ✅ BRANDING ENABLED: {brand} branding allowed")
    else:
        strict_branding = "Generic vehicle design without visible brand badges or logos"
        print(f"[ImageGen] ❌ BRANDING DISABLED: No brand badges to prevent incorrect assignments")

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
    # Enhanced brand protection with specific instructions
    brand_protection = ""
    if not should_show_branding:
        # Enhanced protection against common AI logo hallucinations
        forbidden_automotive_logos = "BMW, Mercedes-Benz, Audi, Toyota, Honda, Hyundai, Ford, Volkswagen, Nissan, Chevrolet, Kia, Mazda, Subaru, Volvo"
        brand_protection = f"CRITICAL: Do not show any brand logos, badges, or emblems on this vehicle. Reason: {brand_mismatch_reason}. Generate a completely generic {vt} without any manufacturer branding. ABSOLUTELY FORBIDDEN: Do not show logos from {forbidden_automotive_logos}, or any other automotive brand logos. No text, no badges, no emblems, no manufacturer markings. "
    else:
        # Only show the correct brand if it matches the vehicle type
        other_brands = [b for b in automotive_brands[:10] if b != brand_lower]
        brand_protection = f"IMPORTANT: Show ONLY authentic {brand} branding and logos. Do not mix with other brands. If {brand} branding is uncertain, omit all visible logos. CRITICAL: Do not show logos from {', '.join(other_brands)}. "

    negatives = ", ".join(global_negatives + ([type_negation] if type_negation else []))

    # Final structured prompt (English translation is applied later)
    final_prompt = (
        f"{base_prompt}. {strict_branding}. {type_enforcement}. "
        f"Angle: {angle_prompt}. Style: {style_prompt}. {consistency_prompt}. "
        f"{brand_protection}Negative: {negatives}. High resolution, clean background or coherent scene, professional rendering."
    )

    # Log branding decision for debugging
    print(f"[ImageGen] 🏷️ BRANDING DECISION for {brand} {model} ({vt}): {'ENABLED' if should_show_branding else 'DISABLED'}")
    if not should_show_branding:
        print(f"[ImageGen] 🚫 REASON: {brand_mismatch_reason}")
    print(f"[ImageGen] 📝 FINAL PROMPT: {final_prompt[:200]}...")

    return final_prompt


def get_vehicle_type_backend(brand, body_type, vehicle_type_name: str = None, raw_vehicle_type_input: str = None):
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
    Автоматически переводит промпт на английский с помощью LLM для лучшей генерации изображений.
    Правило: ВСЕ промпты для генерации изображений ДОЛЖНЫ быть на английском языке.
    """
    try:
        from apps.ads.services.llm_service import LLMService

        translation_prompt = f"""
ВАЖНОЕ ПРАВИЛО: Все промпты для генерации изображений ДОЛЖНЫ быть строго на английском языке для корректной работы AI-генератора изображений.

Переведи следующий промпт для генерации изображения транспортного средства на английский язык.
Сохрани все технические термины, названия брендов и модели как есть.
Переведи только описательные части.

Исходный промпт: {prompt}

Переведенный промпт на английском:"""

        llm_service = LLMService()
        response = llm_service.get_completion(translation_prompt)

        if response and response.strip():
            # Очищаем ответ от лишних символов и возвращаем только английский промпт
            english_prompt = response.strip()
            # Убираем возможные префиксы типа "Переведенный промпт:" и т.д.
            if ':' in english_prompt:
                english_prompt = english_prompt.split(':', 1)[-1].strip()


            logger.info(f"Prompt translated: {prompt[:50]}... -> {english_prompt[:50]}...")
            return english_prompt
        else:
            logger.warning("LLM translation failed, using original prompt")
            return prompt

    except Exception as e:
        logger.error(f"Error translating prompt: {e}")
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
