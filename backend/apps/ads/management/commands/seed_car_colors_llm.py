"""
Management command to seed car colors using LLM (ChatAI).
"""
import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import translation
from django.utils.translation import get_language
from django.conf import settings
from pydantic import ValidationError
from apps.ads.models.reference import CarColorModel
from apps.ads.schemas.ninja_schemas import (
    ColorsLLMResponse, CarColorSchema, get_colors_prompt_template
)
from core.services.chat_ai import ChatAI


class Command(BaseCommand):
    help = 'Seed car colors using LLM (ChatAI)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if data already exists',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing colors before seeding',
        )
        parser.add_argument(
            '--locale',
            type=str,
            choices=['uk', 'en', 'ru'],
            help='Target locale for generated content (if not specified, uses environment variable or system locale)',
        )

    def handle(self, *args, **options):
        """Main command handler."""
        # Determine locale with priority: env var → command param → system locale
        target_locale = self.get_target_locale(options.get('locale'))

        if target_locale:
            translation.activate(target_locale)

        self.stdout.write(f'Using locale: {target_locale} (source: {self.get_locale_source(options.get("locale"))})')
        self.stdout.write(self.style.SUCCESS('Starting car colors seeding with LLM...'))

        # Check if data already exists
        if not options['force'] and not options['clear']:
            if CarColorModel.objects.count() > 12:  # More than default colors
                self.stdout.write(
                    self.style.WARNING(
                        'Car colors data already exists. Use --force to update or --clear to reset.'
                    )
                )
                return

        # Clear existing data if requested
        if options['clear']:
            self.clear_existing_data()

        try:
            with transaction.atomic():
                self.generate_colors_with_llm(target_locale)

        except Exception as e:
            raise CommandError(f'Error processing with LLM: {e}')

        self.stdout.write(self.style.SUCCESS('Car colors seeding completed successfully!'))

    def clear_existing_data(self):
        """Clear existing colors data."""
        self.stdout.write('Clearing existing car colors data...')
        CarColorModel.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Existing colors data cleared.'))

    def generate_colors_with_llm(self, locale=None):
        """Generate car colors with LLM."""
        self.stdout.write('Generating car colors with LLM...')

        chat_ai = ChatAI()
        total_colors = 0

        try:
            # Generate colors data
            colors_data = self.generate_colors_data(chat_ai, locale)

            # Create colors
            for color_data in colors_data:
                self.create_color(color_data)
                total_colors += 1

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating colors: {e}')
            )
            # Use fallback data
            fallback_colors = self.get_fallback_colors_data()
            for color_data in fallback_colors:
                self.create_color(color_data)
                total_colors += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {total_colors} colors')
        )

    def generate_colors_data(self, chat_ai, locale=None):
        """Generate colors data using LLM with Pydantic validation."""
        prompt = get_colors_prompt_template().format(
            locale=chat_ai.get_locale_name(locale)
        )

        try:
            response = chat_ai.get_completion(prompt, locale=locale)
            # Clean response - remove any markdown formatting
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()

            # Parse JSON and validate with Pydantic Schema
            json_data = json.loads(response)
            validated_response = ColorsLLMResponse.parse_obj(json_data)

            # Convert to list format for compatibility
            return [color.dict() for color in validated_response.colors]

        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Invalid JSON response: {e}')
            )
            return self.get_fallback_colors_data()
        except ValidationError as e:
            self.stdout.write(
                self.style.ERROR(f'Validation error: {e}')
            )
            return self.get_fallback_colors_data()
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'LLM error: {e}')
            )
            return self.get_fallback_colors_data()

    def get_fallback_colors_data(self):
        """Get fallback colors data when LLM fails, validated with Ninja Schema."""
        fallback_data = {
            "colors": [
                {"name": "Білий", "hex_code": "#FFFFFF", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Чорний", "hex_code": "#000000", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Сірий", "hex_code": "#808080", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Срібний", "hex_code": "#C0C0C0", "is_metallic": True, "is_pearlescent": False, "is_popular": True},
                {"name": "Червоний", "hex_code": "#FF0000", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Синій", "hex_code": "#0000FF", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Зелений", "hex_code": "#008000", "is_metallic": False, "is_pearlescent": False, "is_popular": False},
                {"name": "Жовтий", "hex_code": "#FFFF00", "is_metallic": False, "is_pearlescent": False, "is_popular": False},
                {"name": "Коричневий", "hex_code": "#8B4513", "is_metallic": False, "is_pearlescent": False, "is_popular": False},
                {"name": "Помаранчевий", "hex_code": "#FFA500", "is_metallic": False, "is_pearlescent": False, "is_popular": False},
                {"name": "Фіолетовий", "hex_code": "#800080", "is_metallic": False, "is_pearlescent": False, "is_popular": False},
                {"name": "Рожевий", "hex_code": "#FFC0CB", "is_metallic": False, "is_pearlescent": False, "is_popular": False},
                {"name": "Золотий", "hex_code": "#FFD700", "is_metallic": True, "is_pearlescent": False, "is_popular": False},
                {"name": "Бронзовий", "hex_code": "#CD7F32", "is_metallic": True, "is_pearlescent": False, "is_popular": False},
                {"name": "Перламутровий білий", "hex_code": "#F8F8FF", "is_metallic": False, "is_pearlescent": True, "is_popular": True},
                {"name": "Перламутровий чорний", "hex_code": "#2F2F2F", "is_metallic": False, "is_pearlescent": True, "is_popular": True},
                {"name": "Металік сірий", "hex_code": "#696969", "is_metallic": True, "is_pearlescent": False, "is_popular": True},
                {"name": "Металік синій", "hex_code": "#191970", "is_metallic": True, "is_pearlescent": False, "is_popular": True},
                {"name": "Металік зелений", "hex_code": "#006400", "is_metallic": True, "is_pearlescent": False, "is_popular": False},
                {"name": "Металік червоний", "hex_code": "#8B0000", "is_metallic": True, "is_pearlescent": False, "is_popular": False}
            ]
        }
        
        try:
            # Validate fallback data with Ninja Schema
            validated_response = ColorsLLMResponse.parse_obj(fallback_data)
            return [color.dict() for color in validated_response.colors]
        except ValidationError as e:
            self.stdout.write(
                self.style.ERROR(f'Fallback data validation error: {e}')
            )
            # Return minimal valid data
            return [
                {"name": "Білий", "hex_code": "#FFFFFF", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Чорний", "hex_code": "#000000", "is_metallic": False, "is_pearlescent": False, "is_popular": True},
                {"name": "Сірий", "hex_code": "#808080", "is_metallic": False, "is_pearlescent": False, "is_popular": True}
            ]

    def create_color(self, color_data):
        """Create a car color."""
        color, created = CarColorModel.objects.get_or_create(
            name=color_data['name'],
            defaults={
                'hex_code': color_data.get('hex_code', '#FFFFFF'),
                'is_metallic': color_data.get('is_metallic', False),
                'is_pearlescent': color_data.get('is_pearlescent', False),
                'is_popular': color_data.get('is_popular', False),
            }
        )
        
        if created:
            self.stdout.write(f'  Created color: {color_data["name"]} ({color_data.get("hex_code", "#FFFFFF")})')
        
        return color

    def get_target_locale(self, command_locale=None):
        """
        Get target locale with priority:
        1. Environment variable CHAT_AI_LOCALE
        2. Command parameter --locale
        3. Django current language
        4. Fallback to Ukrainian
        """
        # Priority 1: Environment variable
        env_locale = getattr(settings, 'CHAT_AI_LOCALE', None) or os.getenv('CHAT_AI_LOCALE')
        if env_locale and env_locale.lower() in ['uk', 'en', 'ru']:
            return env_locale.lower()

        # Priority 2: Command parameter
        if command_locale and command_locale.lower() in ['uk', 'en', 'ru']:
            return command_locale.lower()

        # Priority 3: Django current language
        current_language = get_language()
        if current_language:
            if current_language.startswith('uk'):
                return 'uk'
            elif current_language.startswith('en'):
                return 'en'
            elif current_language.startswith('ru'):
                return 'ru'

        # Priority 4: Fallback to Ukrainian
        return 'uk'

    def get_locale_source(self, command_locale=None):
        """Get the source of the locale for logging."""
        env_locale = getattr(settings, 'CHAT_AI_LOCALE', None) or os.getenv('CHAT_AI_LOCALE')
        if env_locale and env_locale.lower() in ['uk', 'en', 'ru']:
            return 'environment variable'

        if command_locale and command_locale.lower() in ['uk', 'en', 'ru']:
            return 'command parameter'

        current_language = get_language()
        if current_language:
            return 'Django system locale'

        return 'fallback default'
