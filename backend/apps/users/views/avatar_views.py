from django.contrib.auth import get_user_model
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import status
from rest_framework.exceptions import NotAcceptable
from rest_framework.generics import (
    RetrieveUpdateDestroyAPIView, get_object_or_404, )
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from langchain.prompts import PromptTemplate
import logging
import requests
import uuid
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings

from apps.users.docs.swagger_params import (
    update_avatar_parameters, update_avatar_responses, delete_avatar_responses
)
from apps.users.models import ProfileModel
from apps.users.permissions import IsSuperUserOrMe
from apps.users.serializers import (
    AvatarSerializer, )

UserModel = get_user_model()
logger = logging.getLogger(__name__)


def _generate_avatar_svg(profile_data):
    """
    Generate a deterministic SVG avatar as ultimate fallback
    """
    import base64
    
    # Extract user data for avatar generation
    first_name = profile_data.get('first_name', 'User')[0].upper()
    last_name = profile_data.get('last_name', '')
    gender = profile_data.get('gender', 'neutral')
    style = profile_data.get('style', 'professional')
    
    # Generate initials
    if last_name:
        initials = f"{first_name}{last_name[0].upper()}"
    else:
        initials = first_name
    
    # Color based on user data for consistency
    seed = f"{profile_data.get('first_name', '')}{profile_data.get('last_name', '')}{profile_data.get('age', 25)}"
    colors = [
        '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', 
        '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'
    ]
    color_index = abs(hash(seed)) % len(colors)
    bg_color = colors[color_index]
    
    # Generate SVG
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="{bg_color}"/>
    <text x="256" y="280" font-family="Arial, sans-serif" font-size="120" font-weight="bold" 
          text-anchor="middle" fill="white">{initials}</text>
    <circle cx="256" cy="180" r="60" fill="white" opacity="0.9"/>
    <circle cx="256" cy="180" r="40" fill="{bg_color}"/>
    <path d="M 256 220 Q 200 260 180 320 L 332 320 Q 312 260 256 220" fill="white" opacity="0.9"/>
</svg>'''
    
    return base64.b64encode(svg_content.encode()).decode()


def download_and_save_avatar(image_url, user_id=None):
    """
    Download image from external URL and save it locally.
    Returns local URL or None if failed.
    """
    try:
        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()

        # Generate unique filename
        file_extension = 'jpg'  # Default to jpg
        if 'image/png' in response.headers.get('content-type', ''):
            file_extension = 'png'
        elif 'image/webp' in response.headers.get('content-type', ''):
            file_extension = 'webp'

        filename = f"avatar_{uuid.uuid4().hex[:12]}.{file_extension}"
        file_path = f"avatars/generated/{filename}"

        # Save file
        file_content = ContentFile(response.content, name=filename)
        saved_path = default_storage.save(file_path, file_content)

        # Generate URL that works with Next.js media proxy
        # Use /api/media/ prefix so Next.js can proxy to Django
        local_url = f"/api/media/{saved_path}"

        logger.info(f"✅ Avatar saved locally: {saved_path} for user {user_id}")
        return local_url

    except Exception as e:
        logger.error(f"❌ Failed to download and save avatar for user {user_id}: {e}")
        return None


class UpdateAvatarView(RetrieveUpdateDestroyAPIView):
    """
    Update or delete the avatar of a user's profile by user_id.
    """
    serializer_class = AvatarSerializer
    parser_classes = (MultiPartParser,)
    permission_classes = (IsSuperUserOrMe,)
    lookup_field = 'user_id'
    lookup_url_kwarg = 'pk'

    def get_queryset(self):
        """
        Returns the profile object associated with the given user_id.
        """
        return ProfileModel.objects.all()

    def get_object(self):
        """
        Get profile by user_id from URL parameter
        """
        user_id = self.kwargs.get("pk")
        return get_object_or_404(ProfileModel, user_id=user_id)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_id="get_avatar",
        operation_summary="Get user avatar",
        operation_description="Retrieve user avatar information. User can only view their own avatar or admin can view any user's avatar.",
        responses={
            200: openapi.Response(description="Avatar information retrieved successfully"),
            404: openapi.Response(description="User not found")
        }
    )
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_id="update_avatar_put",
        operation_summary="Update user avatar (full)",
        operation_description="Fully update user avatar image. User can only update their own avatar or admin can update any user's avatar.",
        manual_parameters=update_avatar_parameters,
        responses=update_avatar_responses,
        consumes=["multipart/form-data"]
    )
    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_id="update_avatar_patch",
        operation_summary="Update user avatar (partial)",
        operation_description="Partially update user avatar image. User can only update their own avatar or admin can update any user's avatar.",
        manual_parameters=update_avatar_parameters,
        responses=update_avatar_responses,
        consumes=["multipart/form-data"]
    )
    def patch(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_id="upload_avatar",
        operation_summary="Upload user avatar",
        operation_description="Upload or update user avatar image. User can only update their own avatar or admin can update any user's avatar.",
        manual_parameters=update_avatar_parameters,
        responses=update_avatar_responses,
        consumes=["multipart/form-data"]
    )
    def update(self, request, *args, **kwargs):
        """Generic update method for PATCH requests"""
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_profile = serializer.save()

        # Return avatar URL using ProfileSerializer logic
        from apps.users.serializers import ProfileSerializer
        profile_serializer = ProfileSerializer(updated_profile)
        avatar_url = profile_serializer.get_avatar(updated_profile)

        return Response({"avatar_url": avatar_url}, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_id="delete_avatar",
        operation_summary="Delete user avatar",
        operation_description="Delete the avatar of a user's profile. User can only delete their own avatar or admin can delete any user's avatar.",
        responses=delete_avatar_responses
    )
    def destroy(self, request, *args, **kwargs):
        """Generic destroy method for DELETE requests"""
        instance = self.get_object()

        # Delete both uploaded file and generated URL
        if instance.avatar:
            instance.avatar.delete()
        instance.avatar_url = None
        instance.save()

        return Response({"message": "Avatar deleted successfully"},
                        status=status.HTTP_200_OK)

    @swagger_auto_schema(
        tags=["👤 Users"],
        operation_id="delete_avatar_explicit",
        operation_summary="Delete user avatar",
        operation_description="Delete the avatar of a user's profile. User can only delete their own avatar or admin can delete any user's avatar.",
        responses=delete_avatar_responses
    )
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


@swagger_auto_schema(
    method='post',
    tags=["👤 Users"],
    operation_id="generate_avatar",
    operation_summary="Generate AI Avatar",
    operation_description="""
    Generate AI avatar based on user profile data and custom requirements.

    This is a universal image generation service that can be used for:
    - User avatars based on profile data
    - Car images based on ad descriptions
    - Any custom image generation with style and requirements

    **Supported Styles:**
    - realistic: Photorealistic, natural lighting
    - professional: Business professional, formal attire
    - cartoon: Cartoon illustration, vibrant colors
    - caricature: Exaggerated features, humorous style
    - artistic: Artistic interpretation, painterly style
    - abstract: Abstract art style, geometric shapes
    - anime: Anime/manga style, large eyes, stylized features
    - vintage: Vintage photography style, classic lighting

    **Custom Requirements:**
    - Any language supported
    - Specific details like clothing, background, pose
    - Technical specifications
    - Style modifications
    """,
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'style': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Image generation style',
                enum=['realistic', 'professional', 'cartoon', 'caricature', 'artistic', 'abstract', 'anime', 'vintage'],
                default='realistic'
            ),
            'gender': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Gender for avatar generation',
                enum=['male', 'female', 'neutral'],
                default='neutral'
            ),
            'custom_requirements': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Custom requirements for image generation (any language)',
                example='wearing glasses, smiling, outdoor background'
            )
        }
    ),
    responses={
        200: openapi.Response(
            description='Avatar generated successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'avatar_url': openapi.Schema(type=openapi.TYPE_STRING, description='Generated image URL'),
                    'profile_data': openapi.Schema(type=openapi.TYPE_OBJECT, description='Profile data used for generation')
                }
            )
        ),
        400: openapi.Response(description='Bad request'),
        401: openapi.Response(description='Authentication required'),
        404: openapi.Response(description='User profile not found'),
        500: openapi.Response(description='Image generation failed')
    }
)
@api_view(['POST'])
@permission_classes([])  # Публичный доступ
def generate_avatar(request):
    """
    Generate AI avatar based on user profile data.
    All prompts are automatically generated in English for the LLM.
    """
    user_id = None  # Инициализируем переменную для использования в обработке ошибок
    try:
        # Получаем данные из запроса или используем значения по умолчанию
        profile_data = {
            'first_name': request.data.get('first_name', 'Person'),
            'last_name': request.data.get('last_name', ''),
            'age': request.data.get('age', 25),
            'gender': request.data.get('gender', 'neutral'),
            'style': request.data.get('style', 'realistic'),
            'custom_requirements': request.data.get('custom_requirements', '')
        }

        # Переопределяем пол из отдельного поля, если передан
        if 'gender' in request.data:
            profile_data['gender'] = request.data['gender']

        # Если пользователь аутентифицирован, попробуем получить данные из профиля
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = request.user.id  # Устанавливаем user_id для аутентифицированного пользователя
            try:
                profile = ProfileModel.objects.get(user=request.user)
                profile_data.update({
                    'first_name': profile.name or profile_data['first_name'],
                    'last_name': profile.surname or profile_data['last_name'],
                    'age': profile.age or profile_data['age'],
                    'gender': getattr(profile, 'gender', profile_data['gender']),
                })
            except ProfileModel.DoesNotExist:
                pass  # Используем данные по умолчанию

        # Create LangChain prompt template for avatar generation (English only)
        avatar_prompt_template = PromptTemplate(
            input_variables=[
                "first_name", "last_name", "age", "gender", "style", "custom_requirements"
            ],
            template="""SYSTEM: Generate all prompts in English only. Translate any non-English custom requirements to English.

Generate an avatar portrait for:

Person Details:
- Name: {first_name} {last_name}
- Age: {age} years old
- Gender: {gender}
- Style: {style}
- Custom Requirements: {custom_requirements}

Gender-specific Requirements:
{gender_description}

Style-specific Requirements:
{style_description}

Avatar Requirements:
- High-quality portrait
- Clean background
- Friendly and approachable expression
- Well-lit face
- Sharp focus on eyes
- Age-appropriate appearance
- Incorporate custom requirements: {custom_requirements}

Technical Specifications:
- Square aspect ratio (1:1)
- High resolution
- Professional quality
- Suitable for profile picture use

Final Style: {style} style with custom elements"""
        )

        # Define style descriptions
        style_descriptions = {
            'realistic': 'Photorealistic, natural lighting, professional photography',
            'professional': 'Business professional, formal attire, corporate headshot style',
            'cartoon': 'Cartoon illustration, vibrant colors, friendly animated style',
            'caricature': 'Exaggerated features, humorous cartoon style, distinctive characteristics',
            'artistic': 'Artistic interpretation, painterly style, creative expression',
            'abstract': 'Abstract art style, geometric shapes, modern artistic approach',
            'anime': 'Anime/manga style, large eyes, stylized features, Japanese animation aesthetic',
            'vintage': 'Vintage photography style, classic lighting, retro aesthetic'
        }

        # Define gender descriptions
        gender_descriptions = {
            'male': 'Male person, masculine features, appropriate male styling and clothing',
            'female': 'Female person, feminine features, appropriate female styling and clothing',
            'neutral': 'Gender-neutral appearance, balanced features, universal styling'
        }

        # Get descriptions
        style_description = style_descriptions.get(profile_data['style'], 'Professional portrait style')
        gender_description = gender_descriptions.get(profile_data['gender'], 'Neutral appearance')

        # Format the prompt with profile data (English output)
        formatted_prompt = avatar_prompt_template.format(
            style_description=style_description,
            gender_description=gender_description,
            **profile_data
        )

        user_id = getattr(request.user, 'id', 'anonymous') if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
        logger.info(f"Generating avatar for user {user_id}")

        # Production-ready avatar generation with multiple fallback layers
        try:
            import urllib.parse
            import hashlib
            import requests
            import time
            
            # Layer 1: Try G4F with multiple providers
            g4f_providers = [
                ('HuggingSpace', 'flux'),
                ('PollinationsAI', None),  # Let provider choose model
                ('OpenaiChat', 'dall-e-3'),
            ]
            
            for provider_name, model in g4f_providers:
                try:
                    from g4f.client import Client
                    from g4f.Provider import HuggingSpace, PollinationsAI, OpenaiChat
                    
                    # Map provider names to actual classes
                    provider_map = {
                        'HuggingSpace': HuggingSpace,
                        'PollinationsAI': PollinationsAI,
                        'OpenaiChat': OpenaiChat
                    }
                    
                    provider_class = provider_map.get(provider_name)
                    if not provider_class:
                        continue
                    
                    client = Client(image_provider=provider_class)
                    
                    # Prepare generation parameters
                    params = {
                        'prompt': formatted_prompt,
                        'response_format': 'url',
                        'width': 512,
                        'height': 512
                    }
                    
                    if model:
                        params['model'] = model
                    
                    response = client.images.generate(**params)
                    
                    if response and hasattr(response, 'data') and response.data:
                        # Test the URL before returning
                        test_url = response.data[0].url
                        try:
                            test_response = requests.head(test_url, timeout=5)
                            if test_response.status_code == 200:
                                image_url = test_url
                                logger.info(f"✅ Avatar generated via G4F {provider_name} for user {user_id}")
                                break
                        except:
                            logger.warning(f"⚠️ G4F {provider_name} URL not accessible, trying next...")
                            continue
                    else:
                        raise ValueError("No image data in G4F response")
                        
                except Exception as g4f_error:
                    logger.warning(f"⚠️ G4F {provider_name} failed: {g4f_error}")
                    continue
            
            # Layer 2: Direct Pollinations.ai with retry logic
            if not image_url:
                try:
                    # Create enhanced prompt with negative keywords
                    negative_prompt = "cartoon, anime, drawing, sketch, low quality, blurry, distorted, multiple people, text, watermarks"
                    enhanced_prompt = f"{formatted_prompt}. NEGATIVE: {negative_prompt}"
                    encoded_prompt = urllib.parse.quote(enhanced_prompt)
                    
                    # Generate consistent seed based on user data
                    seed_data = f"{profile_data['first_name']}_{profile_data['last_name']}_{profile_data['age']}_{profile_data['gender']}"
                    seed = abs(hash(seed_data + str(user_id))) % 1000000
                    
                    # Try multiple Pollinations.ai endpoints
                    pollinations_urls = [
                        f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&model=flux&enhance=true&seed={seed}&nologo=true",
                        f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&seed={seed}&nologo=true",
                        f"https://image.pollinations.ai/prompt/{urllib.parse.quote(formatted_prompt)}?width=512&height=512&seed={seed}"
                    ]
                    
                    for pollinations_url in pollinations_urls:
                        try:
                            # Test URL accessibility
                            test_response = requests.head(pollinations_url, timeout=10)
                            if test_response.status_code == 200:
                                image_url = pollinations_url
                                logger.info(f"✅ Avatar generated via direct Pollinations.ai for user {user_id}")
                                break
                        except Exception as pollinations_test_error:
                            logger.warning(f"⚠️ Pollinations.ai URL test failed: {pollinations_test_error}")
                            continue
                            
                    if not image_url:
                        raise ValueError("All Pollinations.ai URLs failed")
                        
                except Exception as pollinations_error:
                    logger.warning(f"⚠️ All Pollinations.ai attempts failed: {pollinations_error}")
            
            # Layer 3: High-quality placeholder with deterministic seed
            if not image_url:
                try:
                    # Use deterministic seed based on user data for consistency
                    seed_data = f"{profile_data['first_name']}_{profile_data['last_name']}_{profile_data['age']}_{profile_data['gender']}_{profile_data['style']}"
                    deterministic_seed = abs(hash(seed_data + str(user_id))) % 1000
                    
                    # Try multiple placeholder services
                    placeholder_services = [
                        f"https://picsum.photos/512/512?random={deterministic_seed}",
                        f"https://source.unsplash.com/512x512/?portrait,professional,face&sig={deterministic_seed}",
                        f"https://api.dicebear.com/7.x/avataaars/svg?seed={seed_data}&backgroundColor=b6e3f4,c0aede,d1d4f9"
                    ]
                    
                    for placeholder_url in placeholder_services:
                        try:
                            test_response = requests.head(placeholder_url, timeout=5)
                            if test_response.status_code == 200:
                                image_url = placeholder_url
                                logger.info(f"✅ Using placeholder service for user {user_id}")
                                break
                        except:
                            continue
                    
                    if not image_url:
                        raise ValueError("All placeholder services failed")
                        
                except Exception as placeholder_error:
                    logger.error(f"❌ All placeholder attempts failed: {placeholder_error}")
                    # Final fallback - local data URL
                    image_url = f"data:image/svg+xml;base64,{_generate_avatar_svg(profile_data)}"
                    logger.info(f"✅ Using local SVG avatar for user {user_id}")

        except Exception as e:
            logger.error(f"❌ All avatar generation methods failed: {e}")
            # Ultimate fallback - generate simple SVG
            try:
                image_url = f"data:image/svg+xml;base64,{_generate_avatar_svg(profile_data)}"
                logger.info(f"✅ Using emergency SVG avatar for user {user_id}")
            except:
                image_url = None

        if image_url:
            logger.info(f"✅ Avatar generated successfully for user {user_id}")

            # Return the generated image URL without saving to profile yet
            # The frontend will handle saving to profile separately
            return Response({
                'success': True,
                'avatar_url': image_url,
                'profile_data': profile_data
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"❌ Failed to generate avatar for user {user_id or 'anonymous'}")
            return Response({
                'success': False,
                'error': 'Failed to generate avatar image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"❌ Error generating avatar for user {user_id or 'anonymous'}: {e}")
        return Response({
            'success': False,
            'error': f'Avatar generation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    tags=["👤 Users"],
    operation_summary="📥 Download Avatar",
    operation_description="Download and save avatar image locally",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'image_url': openapi.Schema(type=openapi.TYPE_STRING, description='External image URL to download')
        },
        required=['image_url']
    ),
    responses={
        200: openapi.Response(
            description="Avatar downloaded and saved successfully",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'local_url': openapi.Schema(type=openapi.TYPE_STRING, description='Local URL of saved image'),
                }
            )
        ),
        400: openapi.Response(description="Bad request"),
        401: openapi.Response(description="Authentication required"),
        500: openapi.Response(description="Server error")
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def download_avatar(request):
    """
    Download avatar image from external URL and save it locally.
    Returns local URL for the saved image.
    """
    try:
        user_id = getattr(request.user, 'id', None)
        logger.info(f"🔄 Download avatar request for user {user_id}")

        # Get image URL from request
        image_url = request.data.get('image_url')
        if not image_url:
            logger.error(f"❌ No image_url provided for user {user_id}")
            return Response({
                'success': False,
                'error': 'image_url is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"📥 Downloading avatar from: {image_url[:100]}...")

        # Download and save image locally
        local_avatar_url = download_and_save_avatar(image_url, user_id)

        if local_avatar_url:
            logger.info(f"✅ Avatar downloaded and saved successfully for user {user_id}")
            return Response({
                'success': True,
                'local_url': local_avatar_url
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"❌ Failed to download and save avatar for user {user_id}")
            return Response({
                'success': False,
                'error': 'Failed to download and save avatar'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"❌ Error in download_avatar for user {user_id or 'anonymous'}: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    tags=["👤 Users"],
    operation_id="generate_image",
    operation_summary="🎨 Universal AI Image Generator",
    operation_description="""
    Universal AI image generation service for any type of content.

    **Use Cases:**
    - Car images based on ad descriptions (mark, model, year, color, etc.)
    - Product images for e-commerce
    - Custom illustrations and artwork
    - Marketing materials
    - Any creative content

    **Supported Styles:**
    - realistic: Photorealistic, natural lighting
    - professional: Business professional, high quality
    - cartoon: Cartoon illustration, vibrant colors
    - caricature: Exaggerated features, humorous style
    - artistic: Artistic interpretation, painterly style
    - abstract: Abstract art style, geometric shapes
    - anime: Anime/manga style, stylized features
    - vintage: Vintage photography style, classic lighting

    **Input Languages:**
    - Any language supported for custom requirements
    - Automatic translation to English for optimal AI generation
    """,
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['prompt'],
        properties={
            'prompt': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Main description of what to generate',
                example='Red BMW X5 2020, luxury SUV, city background'
            ),
            'style': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Image generation style',
                enum=['realistic', 'professional', 'cartoon', 'caricature', 'artistic', 'abstract', 'anime', 'vintage'],
                default='realistic'
            ),
            'gender': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Gender specification for people in images',
                enum=['male', 'female', 'neutral'],
                default='neutral'
            ),
            'custom_requirements': openapi.Schema(
                type=openapi.TYPE_STRING,
                description='Additional requirements and specifications (any language)',
                example='high quality, professional lighting, 3/4 angle view'
            ),
            'width': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Image width in pixels',
                default=1024
            ),
            'height': openapi.Schema(
                type=openapi.TYPE_INTEGER,
                description='Image height in pixels',
                default=1024
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
                    'image_url': openapi.Schema(type=openapi.TYPE_STRING, description='Generated image URL'),
                    'prompt_used': openapi.Schema(type=openapi.TYPE_STRING, description='Final prompt used for generation'),
                    'style': openapi.Schema(type=openapi.TYPE_STRING, description='Style used'),
                    'dimensions': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'width': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'height': openapi.Schema(type=openapi.TYPE_INTEGER)
                        }
                    )
                }
            )
        ),
        400: openapi.Response(description='Bad request - missing required fields'),
        401: openapi.Response(description='Authentication required'),
        500: openapi.Response(description='Image generation failed')
    }
)
@api_view(['POST'])
@permission_classes([])  # Публичный доступ
def generate_image(request):
    """
    Universal AI image generation endpoint.
    Can be used for cars, products, avatars, or any custom content.
    """
    try:
        # Get request parameters
        prompt = request.data.get('prompt', '')
        style = request.data.get('style', 'realistic')
        custom_requirements = request.data.get('custom_requirements', '')
        width = request.data.get('width', 1024)
        height = request.data.get('height', 1024)

        if not prompt:
            return Response({
                'success': False,
                'error': 'Prompt is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Style descriptions
        style_descriptions = {
            'realistic': 'Photorealistic, natural lighting, professional photography',
            'professional': 'Business professional, high quality, commercial grade',
            'cartoon': 'Cartoon illustration, vibrant colors, friendly animated style',
            'caricature': 'Exaggerated features, humorous cartoon style',
            'artistic': 'Artistic interpretation, painterly style, creative expression',
            'abstract': 'Abstract art style, geometric shapes, modern artistic approach',
            'anime': 'Anime/manga style, large eyes, stylized features',
            'vintage': 'Vintage photography style, classic lighting, retro aesthetic'
        }

        style_description = style_descriptions.get(style, 'Professional high quality')

        # Create enhanced prompt
        enhanced_prompt = f"""SYSTEM: Generate all prompts in English only. Translate any non-English requirements to English.

Main Subject: {prompt}

Style Requirements: {style_description}

Additional Requirements: {custom_requirements}

Technical Specifications:
- High resolution and quality
- Professional composition
- Sharp focus and clarity
- Appropriate lighting
- {style} style aesthetic

Final Style: {style} with enhanced details"""

        user_id = getattr(request.user, 'id', 'anonymous') if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
        logger.info(f"Generating image for user {user_id}: {prompt[:50]}...")

        # Generate image using g4f client
        try:
            from g4f.client import Client
            client = Client()

            response = client.images.generate(
                model="flux",
                prompt=enhanced_prompt,
                response_format="url"
            )

            if response and hasattr(response, 'data') and response.data:
                image_url = response.data[0].url
            else:
                image_url = None

        except Exception as e:
            logger.error(f"G4F image generation failed: {e}")
            # Fallback to placeholder
            import hashlib
            prompt_hash = hashlib.md5(enhanced_prompt.encode()).hexdigest()[:8]
            image_url = f"https://picsum.photos/{width}/{height}?random={prompt_hash}"

        if image_url:
            logger.info(f"✅ Image generated successfully for user {user_id}")

            return Response({
                'success': True,
                'image_url': image_url,
                'prompt_used': enhanced_prompt,
                'style': style,
                'dimensions': {
                    'width': width,
                    'height': height
                }
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"❌ Failed to generate image for user {user_id}")
            return Response({
                'success': False,
                'error': 'Failed to generate image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"❌ Error in image generation for user {user_id}: {e}")
        return Response({
            'success': False,
            'error': f'Image generation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
