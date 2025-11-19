"""
ChatAI service for LLM interactions with localization support.
"""
import json
import logging
import os
import requests
import uuid
from typing import Optional, Dict, Any
from django.conf import settings
from django.utils import translation
from django.utils.translation import get_language
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


logger = logging.getLogger(__name__)


class ChatAI:
    """
    ChatAI service for interacting with Language Learning Models.
    
    This is a mock implementation that returns structured data
    for car generations and modifications.
    """
    
    def __init__(self, model=None):
        """Initialize ChatAI service."""
        self.model = model or getattr(settings, 'CHAT_AI_MODEL', 'mock')
        self.api_key = getattr(settings, 'CHAT_AI_API_KEY', None)

    def get_current_locale(self) -> str:
        """
        Get current locale with priority:
        1. Environment variable CHAT_AI_LOCALE
        2. Django current language
        3. Fallback to Ukrainian
        """
        # Priority 1: Environment variable
        env_locale = getattr(settings, 'CHAT_AI_LOCALE', None) or os.getenv('CHAT_AI_LOCALE')
        if env_locale and env_locale.lower() in ['uk', 'en', 'ru']:
            return env_locale.lower()

        # Priority 2: Django current language
        current_language = get_language()
        if current_language:
            # Convert Django language codes to our format
            if current_language.startswith('uk'):
                return 'uk'
            elif current_language.startswith('en'):
                return 'en'
            elif current_language.startswith('ru'):
                return 'ru'

        # Priority 3: Fallback to Ukrainian
        return 'uk'

    def get_locale_name(self, locale: str = None) -> str:
        """Get locale name for prompts."""
        if locale is None:
            locale = self.get_current_locale()

        locale_names = {
            'uk': 'Ukrainian',
            'en': 'English',
            'ru': 'Russian'
        }
        return locale_names.get(locale, 'Ukrainian')
        
    def get_completion(self, prompt: str, locale: str = None, **kwargs) -> str:
        """
        Get completion from LLM with locale support.

        Args:
            prompt: The prompt to send to the LLM
            locale: Target locale (if None, uses current Django locale)
            **kwargs: Additional parameters

        Returns:
            str: The LLM response
        """
        if locale is None:
            locale = self.get_current_locale()

        logger.info(f"ChatAI request (locale: {locale}): {prompt[:100]}...")

        # Mock implementation - returns structured data based on prompt content
        if "generations" in prompt.lower() and "modifications" in prompt.lower():
            return self._get_mock_generations_response(prompt, locale)
        elif "colors" in prompt.lower():
            return self._get_mock_colors_response(locale)
        elif "marks" in prompt.lower() or "manufacturers" in prompt.lower():
            return self._get_mock_marks_response(locale)
        elif "models" in prompt.lower() and "mark" in prompt.lower():
            return self._get_mock_models_response(prompt, locale)
        else:
            return self._get_generic_mock_response(locale)

    def generate_image(self, prompt: str, **kwargs) -> str:
        """
        Generate image using FLUX model.

        Args:
            prompt: The prompt for image generation
            **kwargs: Additional parameters

        Returns:
            str: URL or path to generated image
        """
        if self.model in ["flux", "flux-schnell"]:
            return self._generate_flux_image(prompt, **kwargs)
        else:
            return self._generate_mock_image(prompt, **kwargs)

    def _generate_flux_image(self, prompt: str, **kwargs) -> str:
        """Generate image using FLUX model."""
        try:
            # Try to use g4f client for FLUX image generation
            from g4f.client import Client

            client = Client()

            # Use original FLUX model (not flux-schnell)
            model_name = "flux"

            response = client.images.generate(
                model=model_name,
                prompt=prompt,
                response_format="url"
            )

            if response and hasattr(response, 'data') and response.data:
                image_url = response.data[0].url
                # Save image to local storage and return local URL
                return self._save_image_to_local_storage(image_url, prompt, **kwargs)
            else:
                return self._generate_mock_image(prompt, **kwargs)

        except Exception as e:
            logger.warning(f"Flux image generation failed: {e}, falling back to mock")
            return self._generate_mock_image(prompt, **kwargs)

    def _generate_mock_image(self, prompt: str, **kwargs) -> str:
        """Generate mock image for development - create local placeholder."""
        try:
            from PIL import Image, ImageDraw, ImageFont
            import hashlib
            from datetime import datetime
            
            # Generate unique filename based on prompt
            prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
            width = kwargs.get('width', 800)
            height = kwargs.get('height', 600)
            
            # Create a simple colored placeholder image
            colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
            color_index = int(prompt_hash, 16) % len(colors)
            bg_color = colors[color_index]
            
            # Create image
            image = Image.new('RGB', (width, height), bg_color)
            draw = ImageDraw.Draw(image)
            
            # Add text overlay
            try:
                # Try to use default font, fallback to basic if not available
                font_size = min(width, height) // 20
                font = ImageFont.load_default()
            except:
                font = None
            
            # Extract car info from prompt for text
            text_lines = []
            if any(word in prompt.lower() for word in ['car', 'auto', 'vehicle', 'машина', 'авто']):
                text_lines.append("🚗 Car Image")
                # Try to extract car details from prompt
                words = prompt.split()
                for i, word in enumerate(words):
                    if word.lower() in ['toyota', 'bmw', 'audi', 'mercedes', 'volkswagen', 'ford']:
                        if i + 1 < len(words):
                            text_lines.append(f"{word} {words[i+1]}")
                        else:
                            text_lines.append(word)
                        break
            else:
                text_lines.append("Generated Image")
            
            text_lines.append(f"#{prompt_hash}")
            
            # Draw text
            y_offset = height // 3
            for line in text_lines:
                if font:
                    bbox = draw.textbbox((0, 0), line, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_height = bbox[3] - bbox[1]
                else:
                    text_width = len(line) * 8
                    text_height = 16
                
                x = (width - text_width) // 2
                draw.text((x, y_offset), line, fill='white', font=font)
                y_offset += text_height + 10
            
            # Save to media directory
            date_prefix = datetime.now().strftime('%Y-%m-%d')
            filename = f"{date_prefix}/generated-images/mock-{prompt_hash}.jpg"
            
            # Create ContentFile from image
            from io import BytesIO
            img_buffer = BytesIO()
            image.save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            
            image_content = ContentFile(img_buffer.getvalue(), name=f'mock-{prompt_hash}.jpg')
            
            # Save to default storage
            saved_path = default_storage.save(filename, image_content)
            
            # Generate public URL
            if hasattr(default_storage, 'url'):
                public_url = default_storage.url(saved_path)
            else:
                public_url = f"/media/{saved_path}"
            
            logger.info(f"Mock image created: {saved_path} -> {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to create mock image: {e}")
            # Ultimate fallback - return a data URL for a simple colored rectangle
            import hashlib
            prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
            color_index = int(prompt_hash, 16) % 7
            colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8']
            color = colors[color_index]
            
            # Return a simple SVG data URL
            svg_data = f'''<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                <rect width="800" height="600" fill="#{color}"/>
                <text x="400" y="300" text-anchor="middle" fill="white" font-size="24" font-family="Arial">
                    Generated Image #{prompt_hash}
                </text>
            </svg>'''
            
            import base64
            svg_b64 = base64.b64encode(svg_data.encode()).decode()
            return f"data:image/svg+xml;base64,{svg_b64}"

    def _save_image_to_local_storage(self, image_url: str, prompt: str, **kwargs) -> str:
        """Save generated image to local media storage."""
        try:
            # Download image from URL
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()

            # Generate unique filename with date prefix
            image_id = str(uuid.uuid4())
            file_extension = self._get_image_extension(image_url, response.headers)

            # Create date-based directory structure
            from datetime import datetime
            date_prefix = datetime.now().strftime('%Y-%m-%d')
            filename = f"{date_prefix}/generated-images/flux-{image_id}{file_extension}"

            # Create ContentFile from image data
            image_content = ContentFile(response.content, name=f'flux-{image_id}{file_extension}')

            # Save to default storage (local media directory)
            saved_path = default_storage.save(filename, image_content)

            # Generate public URL
            if hasattr(default_storage, 'url'):
                public_url = default_storage.url(saved_path)
            else:
                public_url = f"/media/{saved_path}"

            logger.info(f"Image saved to local storage: {saved_path} -> {public_url}")

            # Store metadata
            self._store_image_metadata(image_id, prompt, saved_path, public_url, **kwargs)

            return public_url

        except Exception as e:
            logger.error(f"Failed to save image to local storage: {e}")
            # Return original URL if saving fails
            return image_url

    def _get_image_extension(self, url: str, headers: dict) -> str:
        """Determine image file extension from URL or headers."""
        # Try to get from Content-Type header
        content_type = headers.get('content-type', '').lower()
        if 'jpeg' in content_type or 'jpg' in content_type:
            return '.jpg'
        elif 'png' in content_type:
            return '.png'
        elif 'webp' in content_type:
            return '.webp'
        elif 'gif' in content_type:
            return '.gif'

        # Try to get from URL
        if url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
            return url[url.rfind('.'):]

        # Default to .jpg
        return '.jpg'

    def _store_image_metadata(self, image_id: str, prompt: str, file_path: str, public_url: str, **kwargs):
        """Store image metadata (can be enhanced to save to database)."""
        metadata = {
            'id': image_id,
            'prompt': prompt,
            'file_path': file_path,
            'public_url': public_url,
            'model': self.model,
            'generated_at': str(timezone.now()) if 'timezone' in globals() else None,
            'kwargs': kwargs
        }

        # Log metadata (could be saved to database in the future)
        logger.info(f"Image metadata: {json.dumps(metadata, indent=2)}")


    
    def _get_mock_generations_response(self, prompt: str, locale: str = 'uk') -> str:
        """Get mock response for car generations."""
        # Extract car mark and model from prompt if possible
        lines = prompt.split('\n')
        mark_model = "Unknown Car"
        for line in lines:
            if "Generate realistic car generations" in line and ":" in line:
                mark_model = line.split(':')[-1].strip()
                break
        
        # Generate mock data based on the car
        if "toyota" in mark_model.lower() or "camry" in mark_model.lower():
            # Localized generation names
            gen1_name = {
                'uk': 'XV40 (2006-2011)',
                'en': 'XV40 (2006-2011)',
                'ru': 'XV40 (2006-2011)'
            }
            gen2_name = {
                'uk': 'XV50 (2011-2017)',
                'en': 'XV50 (2011-2017)',
                'ru': 'XV50 (2011-2017)'
            }

            return json.dumps({
                "generations": [
                    {
                        "name": gen1_name.get(locale, gen1_name['uk']),
                        "year_start": 2006,
                        "year_end": 2011,
                        "modifications": [
                            {
                                "name": "2.4",
                                "engine_type": "petrol",
                                "engine_volume": 2.4,
                                "power_hp": 167,
                                "transmission": "automatic",
                                "drive_type": "front"
                            },
                            {
                                "name": "3.5 V6",
                                "engine_type": "petrol",
                                "engine_volume": 3.5,
                                "power_hp": 277,
                                "transmission": "automatic",
                                "drive_type": "front"
                            }
                        ]
                    },
                    {
                        "name": gen2_name.get(locale, gen2_name['uk']),
                        "year_start": 2011,
                        "year_end": 2017,
                        "modifications": [
                            {
                                "name": "2.5",
                                "engine_type": "petrol",
                                "engine_volume": 2.5,
                                "power_hp": 181,
                                "transmission": "automatic",
                                "drive_type": "front"
                            },
                            {
                                "name": "3.5 V6",
                                "engine_type": "petrol",
                                "engine_volume": 3.5,
                                "power_hp": 249,
                                "transmission": "automatic",
                                "drive_type": "front"
                            }
                        ]
                    }
                ]
            }, ensure_ascii=False, indent=2)
        
        elif "bmw" in mark_model.lower():
            return json.dumps({
                "generations": [
                    {
                        "name": "E90/E91/E92/E93 (2005-2013)",
                        "year_start": 2005,
                        "year_end": 2013,
                        "modifications": [
                            {
                                "name": "318i",
                                "engine_type": "petrol",
                                "engine_volume": 2.0,
                                "power_hp": 143,
                                "transmission": "manual",
                                "drive_type": "rear"
                            },
                            {
                                "name": "320i",
                                "engine_type": "petrol",
                                "engine_volume": 2.0,
                                "power_hp": 170,
                                "transmission": "automatic",
                                "drive_type": "rear"
                            },
                            {
                                "name": "320d",
                                "engine_type": "diesel",
                                "engine_volume": 2.0,
                                "power_hp": 163,
                                "transmission": "manual",
                                "drive_type": "rear"
                            }
                        ]
                    },
                    {
                        "name": "F30/F31/F34/F35 (2012-2019)",
                        "year_start": 2012,
                        "year_end": 2019,
                        "modifications": [
                            {
                                "name": "316i",
                                "engine_type": "petrol",
                                "engine_volume": 1.6,
                                "power_hp": 136,
                                "transmission": "manual",
                                "drive_type": "rear"
                            },
                            {
                                "name": "320i",
                                "engine_type": "petrol",
                                "engine_volume": 2.0,
                                "power_hp": 184,
                                "transmission": "automatic",
                                "drive_type": "rear"
                            }
                        ]
                    }
                ]
            }, ensure_ascii=False, indent=2)
        
        # Generic response for unknown cars
        return json.dumps({
            "generations": [
                {
                    "name": "I поколение",
                    "year_start": 2000,
                    "year_end": 2007,
                    "modifications": [
                        {
                            "name": "1.6",
                            "engine_type": "petrol",
                            "engine_volume": 1.6,
                            "power_hp": 110,
                            "transmission": "manual",
                            "drive_type": "front"
                        },
                        {
                            "name": "2.0",
                            "engine_type": "petrol",
                            "engine_volume": 2.0,
                            "power_hp": 150,
                            "transmission": "automatic",
                            "drive_type": "front"
                        }
                    ]
                },
                {
                    "name": "II поколение",
                    "year_start": 2008,
                    "year_end": 2015,
                    "modifications": [
                        {
                            "name": "1.8 TSI",
                            "engine_type": "petrol",
                            "engine_volume": 1.8,
                            "power_hp": 160,
                            "transmission": "automatic",
                            "drive_type": "front"
                        }
                    ]
                }
            ]
        }, ensure_ascii=False, indent=2)
    
    def _get_mock_colors_response(self, locale: str = 'uk') -> str:
        """Get mock response for car colors with localization."""
        # Define colors with localized names
        colors_data = [
            {
                "names": {"uk": "Білий", "en": "White", "ru": "Белый"},
                "hex_code": "#FFFFFF", "is_metallic": False, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Чорний", "en": "Black", "ru": "Черный"},
                "hex_code": "#000000", "is_metallic": False, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Сірий", "en": "Gray", "ru": "Серый"},
                "hex_code": "#808080", "is_metallic": False, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Срібний", "en": "Silver", "ru": "Серебряный"},
                "hex_code": "#C0C0C0", "is_metallic": True, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Червоний", "en": "Red", "ru": "Красный"},
                "hex_code": "#FF0000", "is_metallic": False, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Синій", "en": "Blue", "ru": "Синий"},
                "hex_code": "#0000FF", "is_metallic": False, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Зелений", "en": "Green", "ru": "Зеленый"},
                "hex_code": "#008000", "is_metallic": False, "is_pearlescent": False, "is_popular": False
            },
            {
                "names": {"uk": "Жовтий", "en": "Yellow", "ru": "Желтый"},
                "hex_code": "#FFFF00", "is_metallic": False, "is_pearlescent": False, "is_popular": False
            },
            {
                "names": {"uk": "Коричневий", "en": "Brown", "ru": "Коричневый"},
                "hex_code": "#8B4513", "is_metallic": False, "is_pearlescent": False, "is_popular": False
            },
            {
                "names": {"uk": "Помаранчевий", "en": "Orange", "ru": "Оранжевый"},
                "hex_code": "#FFA500", "is_metallic": False, "is_pearlescent": False, "is_popular": False
            },
            {
                "names": {"uk": "Металік сірий", "en": "Metallic Gray", "ru": "Металлик серый"},
                "hex_code": "#696969", "is_metallic": True, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Металік синій", "en": "Metallic Blue", "ru": "Металлик синий"},
                "hex_code": "#191970", "is_metallic": True, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Перламутровий білий", "en": "Pearl White", "ru": "Перламутровый белый"},
                "hex_code": "#F8F8FF", "is_metallic": False, "is_pearlescent": True, "is_popular": True
            },
            {
                "names": {"uk": "Перламутровий чорний", "en": "Pearl Black", "ru": "Перламутровый черный"},
                "hex_code": "#2F2F2F", "is_metallic": False, "is_pearlescent": True, "is_popular": True
            },
            # Додаткові обов'язкові металік кольори
            {
                "names": {"uk": "Білий металік", "en": "Metallic White", "ru": "Белый металлик"},
                "hex_code": "#F5F5F5", "is_metallic": True, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Чорний металік", "en": "Metallic Black", "ru": "Черный металлик"},
                "hex_code": "#1C1C1C", "is_metallic": True, "is_pearlescent": False, "is_popular": True
            },
            {
                "names": {"uk": "Червоний металік", "en": "Metallic Red", "ru": "Красный металлик"},
                "hex_code": "#8B0000", "is_metallic": True, "is_pearlescent": False, "is_popular": False
            },
            {
                "names": {"uk": "Золотий металік", "en": "Metallic Gold", "ru": "Золотой металлик"},
                "hex_code": "#FFD700", "is_metallic": True, "is_pearlescent": False, "is_popular": False
            },
            {
                "names": {"uk": "Темно-синій металік", "en": "Dark Blue Metallic", "ru": "Темно-синий металлик"},
                "hex_code": "#000080", "is_metallic": True, "is_pearlescent": False, "is_popular": False
            },
            # Додаткові перламутрові кольори
            {
                "names": {"uk": "Перламутровий сірий", "en": "Pearl Gray", "ru": "Перламутровый серый"},
                "hex_code": "#A9A9A9", "is_metallic": False, "is_pearlescent": True, "is_popular": False
            },
            {
                "names": {"uk": "Перламутровий синій", "en": "Pearl Blue", "ru": "Перламутровый синий"},
                "hex_code": "#4169E1", "is_metallic": False, "is_pearlescent": True, "is_popular": False
            }
        ]

        # Convert to response format with localized names
        colors = []
        for color_data in colors_data:
            colors.append({
                "name": color_data["names"].get(locale, color_data["names"]["uk"]),
                "hex_code": color_data["hex_code"],
                "is_metallic": color_data["is_metallic"],
                "is_pearlescent": color_data["is_pearlescent"],
                "is_popular": color_data["is_popular"]
            })

        return json.dumps({
            "colors": colors
        }, ensure_ascii=False, indent=2)
    
    def _get_mock_marks_response(self) -> str:
        """Get mock response for car marks."""
        return json.dumps({
            "marks": [
                {"name": "Audi", "is_popular": True},
                {"name": "BMW", "is_popular": True},
                {"name": "Mercedes-Benz", "is_popular": True},
                {"name": "Volkswagen", "is_popular": True},
                {"name": "Toyota", "is_popular": True},
                {"name": "Honda", "is_popular": True},
                {"name": "Nissan", "is_popular": True},
                {"name": "Ford", "is_popular": True},
                {"name": "Chevrolet", "is_popular": True},
                {"name": "Hyundai", "is_popular": True},
                {"name": "Kia", "is_popular": True},
                {"name": "Mazda", "is_popular": True},
                {"name": "Subaru", "is_popular": False},
                {"name": "Mitsubishi", "is_popular": False},
                {"name": "Lexus", "is_popular": False},
                {"name": "Infiniti", "is_popular": False},
                {"name": "Acura", "is_popular": False},
                {"name": "Volvo", "is_popular": False},
                {"name": "Jaguar", "is_popular": False},
                {"name": "Land Rover", "is_popular": False},
                {"name": "Porsche", "is_popular": False},
                {"name": "Ferrari", "is_popular": False},
                {"name": "Lamborghini", "is_popular": False},
                {"name": "Bentley", "is_popular": False},
                {"name": "Rolls-Royce", "is_popular": False}
            ]
        }, ensure_ascii=False, indent=2)

    def _get_mock_models_response(self, prompt: str) -> str:
        """Get mock response for car models based on mark."""
        # Extract mark name from prompt
        mark_name = "Unknown"
        if ":" in prompt:
            for line in prompt.split('\n'):
                if "Generate realistic car models" in line and ":" in line:
                    mark_name = line.split(':')[-1].strip()
                    break

        if "audi" in mark_name.lower():
            return json.dumps({
                "models": [
                    {"name": "A1", "is_popular": False},
                    {"name": "A3", "is_popular": True},
                    {"name": "A4", "is_popular": True},
                    {"name": "A5", "is_popular": True},
                    {"name": "A6", "is_popular": True},
                    {"name": "A7", "is_popular": False},
                    {"name": "A8", "is_popular": False},
                    {"name": "Q3", "is_popular": True},
                    {"name": "Q5", "is_popular": True},
                    {"name": "Q7", "is_popular": True},
                    {"name": "Q8", "is_popular": False},
                    {"name": "TT", "is_popular": False},
                    {"name": "R8", "is_popular": False}
                ]
            }, ensure_ascii=False, indent=2)
        elif "bmw" in mark_name.lower():
            return json.dumps({
                "models": [
                    {"name": "1 Series", "is_popular": False},
                    {"name": "2 Series", "is_popular": False},
                    {"name": "3 Series", "is_popular": True},
                    {"name": "4 Series", "is_popular": True},
                    {"name": "5 Series", "is_popular": True},
                    {"name": "6 Series", "is_popular": False},
                    {"name": "7 Series", "is_popular": False},
                    {"name": "8 Series", "is_popular": False},
                    {"name": "X1", "is_popular": True},
                    {"name": "X3", "is_popular": True},
                    {"name": "X5", "is_popular": True},
                    {"name": "X6", "is_popular": False},
                    {"name": "X7", "is_popular": False},
                    {"name": "Z4", "is_popular": False}
                ]
            }, ensure_ascii=False, indent=2)
        elif "toyota" in mark_name.lower():
            return json.dumps({
                "models": [
                    {"name": "Corolla", "is_popular": True},
                    {"name": "Camry", "is_popular": True},
                    {"name": "Avalon", "is_popular": False},
                    {"name": "Prius", "is_popular": True},
                    {"name": "RAV4", "is_popular": True},
                    {"name": "Highlander", "is_popular": True},
                    {"name": "4Runner", "is_popular": False},
                    {"name": "Sequoia", "is_popular": False},
                    {"name": "Sienna", "is_popular": False},
                    {"name": "Tacoma", "is_popular": False},
                    {"name": "Tundra", "is_popular": False},
                    {"name": "Yaris", "is_popular": False},
                    {"name": "C-HR", "is_popular": False}
                ]
            }, ensure_ascii=False, indent=2)
        else:
            # Generic models for unknown marks
            return json.dumps({
                "models": [
                    {"name": "Sedan", "is_popular": True},
                    {"name": "Hatchback", "is_popular": True},
                    {"name": "SUV", "is_popular": True},
                    {"name": "Coupe", "is_popular": False},
                    {"name": "Wagon", "is_popular": False},
                    {"name": "Convertible", "is_popular": False}
                ]
            }, ensure_ascii=False, indent=2)

    def _get_generic_mock_response(self) -> str:
        """Get generic mock response."""
        return json.dumps({
            "message": "Mock response from ChatAI service",
            "status": "success"
        }, ensure_ascii=False, indent=2)
