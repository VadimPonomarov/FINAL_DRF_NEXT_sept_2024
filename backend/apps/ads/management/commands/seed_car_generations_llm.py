"""
Management command to seed car generations and modifications using LLM (ChatAI).
"""
import json
import os
import csv
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import translation
from django.utils.translation import get_language
from django.conf import settings
from pydantic import ValidationError
from apps.ads.models.reference import (
    CarMarkModel, CarModel, CarGenerationModel, CarModificationModel
)
from apps.ads.schemas.ninja_schemas import (
    GenerationsLLMResponse, CarGenerationSchema, CarModificationSchema,
    get_generations_prompt_template
)
from core.services.chat_ai import ChatAI


class Command(BaseCommand):
    help = 'Seed car generations and modifications using LLM (ChatAI)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if data already exists',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing generations and modifications before seeding',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=10,
            help='Limit number of models to process (default: 10)',
        )
        parser.add_argument(
            '--locale',
            type=str,
            choices=['uk', 'en', 'ru'],
            help='Target locale for generated content (if not specified, uses system locale)',
        )

    def handle(self, *args, **options):
        """Main command handler."""
        # Determine locale with priority: env var → command param → system locale
        target_locale = self.get_target_locale(options.get('locale'))

        if target_locale:
            translation.activate(target_locale)

        self.stdout.write(f'Using locale: {target_locale} (source: {self.get_locale_source(options.get("locale"))})')
        self.stdout.write(self.style.SUCCESS('Starting car generations and modifications seeding with LLM...'))

        # Check if data already exists
        if not options['force'] and not options['clear']:
            if CarGenerationModel.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        'Car generations data already exists. Use --force to update or --clear to reset.'
                    )
                )
                return

        # Clear existing data if requested
        if options['clear']:
            self.clear_existing_data()

        try:
            with transaction.atomic():
                self.process_models_with_llm(options['limit'], target_locale)

        except Exception as e:
            raise CommandError(f'Error processing with LLM: {e}')

        self.stdout.write(self.style.SUCCESS('Car generations and modifications seeding completed successfully!'))

    def get_target_locale(self, command_locale=None):
        """
        Get target locale with priority:
        1. Command parameter --locale
        2. Environment variable CHAT_AI_LOCALE
        3. Django current language
        4. Fallback to Ukrainian
        """
        # Priority 1: Command parameter
        if command_locale and command_locale.lower() in ['uk', 'en', 'ru']:
            return command_locale.lower()

        # Priority 2: Environment variable
        env_locale = getattr(settings, 'CHAT_AI_LOCALE', None) or os.getenv('CHAT_AI_LOCALE')
        if env_locale and env_locale.lower() in ['uk', 'en', 'ru']:
            return env_locale.lower()

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

    def load_existing_models_from_csv(self):
        """Load existing models from CSV file to avoid duplication."""
        csv_file_path = os.path.join(settings.BASE_DIR, 'backend', 'core', 'data', 'cars_dict_output.csv')
        existing_models = set()

        if not os.path.exists(csv_file_path):
            self.stdout.write(self.style.WARNING(f'CSV file not found: {csv_file_path}'))
            return existing_models

        try:
            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
                csv_reader = csv.reader(csvfile)

                for row in csv_reader:
                    if len(row) >= 3:
                        # Format: vehicle_type, mark, model
                        mark = row[1].strip()
                        model = row[2].strip()
                        if mark and model:
                            existing_models.add(f"{mark}_{model}")

            self.stdout.write(f'Loaded {len(existing_models)} existing models from CSV')

        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Error reading CSV file: {e}'))

        return existing_models

    def clear_existing_data(self):
        """Clear existing generations and modifications data."""
        self.stdout.write('Clearing existing car generations and modifications data...')
        
        # Delete in reverse order of dependencies
        CarModificationModel.objects.all().delete()
        CarGenerationModel.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('Existing generations and modifications data cleared.'))

    def process_models_with_llm(self, limit, locale=None):
        """Process car models with LLM to generate generations and modifications."""
        self.stdout.write(f'Processing up to {limit} car models with LLM...')

        # Get popular car models to process
        models = CarModel.objects.filter(is_popular=True).select_related('mark')[:limit]

        if not models.exists():
            self.stdout.write(self.style.WARNING('No popular car models found. Processing first 10 models...'))
            models = CarModel.objects.all().select_related('mark')[:limit]

        # Load existing model names from CSV to avoid duplication
        existing_models = self.load_existing_models_from_csv()

        chat_ai = ChatAI()
        total_generations = 0
        total_modifications = 0

        for model in models:
            self.stdout.write(f'Processing: {model.mark.name} {model.name}')

            # Check if this model exists in CSV (third column)
            model_key = f"{model.mark.name}_{model.name}"
            if model_key in existing_models:
                self.stdout.write(f'  Skipping {model.mark.name} {model.name} - exists in CSV')
                continue

            try:
                # Generate data for this model
                generations_data = self.generate_generations_for_model(chat_ai, model, locale)

                # Create generations and modifications
                for gen_data in generations_data:
                    generation = self.create_generation(model, gen_data)
                    total_generations += 1

                    # Create modifications for this generation
                    for mod_data in gen_data.get('modifications', []):
                        self.create_modification(generation, mod_data)
                        total_modifications += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing {model.mark.name} {model.name}: {e}')
                )
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Created {total_generations} generations and {total_modifications} modifications'
            )
        )

    def generate_generations_for_model(self, chat_ai, model, locale=None):
        """Generate generations data for a car model using LLM with Pydantic validation."""
        prompt = get_generations_prompt_template().format(
            mark_name=model.mark.name,
            model_name=model.name,
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
            validated_response = GenerationsLLMResponse.parse_obj(json_data)

            # Convert to list format for compatibility
            return [gen.dict() for gen in validated_response.generations]

        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Invalid JSON response for {model.mark.name} {model.name}: {e}')
            )
            return self.get_fallback_generations_data()
        except ValidationError as e:
            self.stdout.write(
                self.style.ERROR(f'Validation error for {model.mark.name} {model.name}: {e}')
            )
            return self.get_fallback_generations_data()
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'LLM error for {model.mark.name} {model.name}: {e}')
            )
            return self.get_fallback_generations_data()

    def get_fallback_generations_data(self):
        """Get fallback generations data when LLM fails, validated with Ninja Schema."""
        fallback_data = {
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
        }

        try:
            # Validate fallback data with Ninja Schema
            validated_response = GenerationsLLMResponse.parse_obj(fallback_data)
            return [gen.dict() for gen in validated_response.generations]
        except ValidationError as e:
            self.stdout.write(
                self.style.ERROR(f'Fallback data validation error: {e}')
            )
            # Return minimal valid data
            return [
                {
                    "name": "Базове поколення",
                    "year_start": 2000,
                    "year_end": 2010,
                    "modifications": [
                        {
                            "name": "Базова модифікація",
                            "engine_type": "petrol",
                            "engine_volume": 1.6,
                            "power_hp": 100,
                            "transmission": "manual",
                            "drive_type": "front"
                        }
                    ]
                }
            ]

    def create_generation(self, model, gen_data):
        """Create a car generation."""
        generation, created = CarGenerationModel.objects.get_or_create(
            model=model,
            name=gen_data['name'],
            defaults={
                'year_start': gen_data.get('year_start'),
                'year_end': gen_data.get('year_end'),
            }
        )
        
        if created:
            self.stdout.write(f'  Created generation: {gen_data["name"]}')
        
        return generation

    def create_modification(self, generation, mod_data):
        """Create a car modification."""
        modification, created = CarModificationModel.objects.get_or_create(
            generation=generation,
            name=mod_data['name'],
            defaults={
                'engine_type': mod_data.get('engine_type', 'petrol'),
                'engine_volume': mod_data.get('engine_volume'),
                'power_hp': mod_data.get('power_hp'),
                'transmission': mod_data.get('transmission', 'manual'),
                'drive_type': mod_data.get('drive_type', 'front'),
            }
        )
        
        if created:
            self.stdout.write(f'    Created modification: {mod_data["name"]}')
        
        return modification
