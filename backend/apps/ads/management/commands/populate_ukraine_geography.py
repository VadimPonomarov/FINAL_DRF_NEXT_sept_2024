"""
Management command to populate comprehensive Ukraine geography data.
Creates all regions (oblasts) and major cities using LLM generation.
"""
import json
from django.core.management.base import BaseCommand
from django.db import transaction

from core.services.llm_mock_generator import generate_mock_data
from apps.ads.models.reference import RegionModel, CityModel


class Command(BaseCommand):
    help = 'Populate comprehensive Ukraine geography data (all regions and major cities)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of all geography data',
        )
        parser.add_argument(
            '--regions-only',
            action='store_true',
            help='Only create regions, skip cities',
        )
        parser.add_argument(
            '--cities-only',
            action='store_true',
            help='Only create cities, skip regions',
        )

    def handle(self, *args, **options):
        """Populate Ukraine geography data."""
        try:
            self.stdout.write('🇺🇦 Populating comprehensive Ukraine geography...')
            
            if options['force']:
                self._clear_existing_data()
            
            if not options['cities_only']:
                self._create_regions()
            
            if not options['regions_only']:
                self._create_cities()
            
            self._print_summary()
            self.stdout.write(self.style.SUCCESS('✅ Ukraine geography populated successfully!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error populating geography: {e}'))
            raise

    def _clear_existing_data(self):
        """Clear existing geography data."""
        self.stdout.write('🧹 Clearing existing geography data...')
        
        with transaction.atomic():
            CityModel.objects.all().delete()
            RegionModel.objects.all().delete()
        
        self.stdout.write('✅ Existing data cleared')

    def _create_regions(self):
        """Create all Ukraine regions using LLM."""
        self.stdout.write('🗺️ Creating all Ukraine regions...')
        
        # Prompt for generating all Ukraine regions with multilingual support
        regions_prompt = """
        Создай полный список всех регионов (областей) Украины в формате JSON.
        Включи все 24 области + АР Крым + города со специальным статусом.

        Для каждого региона укажи названия на ТРЕХ языках:
        - name_uk: официальное название на украинском языке (основное)
        - name_ru: название на русском языке
        - name_en: название на английском языке
        - name: дублирует name_uk для совместимости
        - code: двухбуквенный код области
        - country: "Україна"
        - is_active: true для всех кроме временно оккупированных территорий

        Пример формата:
        [
            {
                "name_uk": "Київська область",
                "name_ru": "Киевская область",
                "name_en": "Kyiv Oblast",
                "name": "Київська область",
                "code": "KV",
                "country": "Україна",
                "is_active": true
            },
            {
                "name_uk": "Львівська область",
                "name_ru": "Львовская область",
                "name_en": "Lviv Oblast",
                "name": "Львівська область",
                "code": "LV",
                "country": "Україна",
                "is_active": true
            }
        ]

        Включи ВСЕ области: Вінницька, Волинська, Дніпропетровська, Донецька, Житомирська,
        Закарпатська, Запорізька, Івано-Франківська, Київська, Кіровоградська, Луганська,
        Львівська, Миколаївська, Одеська, Полтавська, Рівненська, Сумська, Тернопільська,
        Харківська, Херсонська, Хмельницька, Черкаська, Чернівецька, Чернігівська +
        АР Крим + міста Київ та Севастополь.

        ВАЖНО: Обязательно укажи все три языка для каждого региона!
        """
        
        try:
            # Generate regions data using LLM
            regions_data = self._generate_with_llm(regions_prompt, "regions")
            
            if not regions_data:
                self.stdout.write('⚠️ LLM generation failed, using fallback data')
                regions_data = self._get_fallback_regions()
            
            # Create regions in database
            created_count = 0
            with transaction.atomic():
                for region_data in regions_data:
                    region, created = RegionModel.objects.get_or_create(
                        name_uk=region_data.get('name_uk', region_data.get('name', '')),
                        defaults={
                            'name_ru': region_data.get('name_ru', ''),
                            'name_en': region_data.get('name_en', ''),
                            'name': region_data.get('name_uk', region_data.get('name', '')),
                            'code': region_data.get('code', ''),
                            'country': region_data.get('country', 'Україна'),
                            'is_active': region_data.get('is_active', True)
                        }
                    )
                    if created:
                        created_count += 1
            
            self.stdout.write(f'✅ Created {created_count} regions')
            
        except Exception as e:
            self.stdout.write(f'❌ Error creating regions: {e}')
            self.stdout.write('📦 Using fallback regions data...')
            self._create_fallback_regions()

    def _create_cities(self):
        """Create all major Ukraine cities using LLM."""
        self.stdout.write('🏙️ Creating all major Ukraine cities...')
        
        # Get all regions first
        regions = list(RegionModel.objects.all())
        if not regions:
            self.stdout.write('⚠️ No regions found, creating regions first...')
            self._create_regions()
            regions = list(RegionModel.objects.all())
        
        # Prompt for generating cities
        cities_prompt = f"""
        Создай полный список всех крупных городов Украины в формате JSON.
        Включи ВСЕ областные центры, районные центры, города областного значения и столицу.

        Доступные регионы: {[r.name for r in regions]}

        Для каждого города укажи:
        - name: название на украинском языке
        - name_en: название на английском языке
        - region_name: точное название области из списка выше
        - population: примерная численность населения
        - is_regional_center: true для областных центров и столицы
        - is_active: true для всех кроме временно оккупированных
        - latitude: широта (примерная)
        - longitude: долгота (примерная)

        Пример формата:
        [
            {{
                "name": "Київ",
                "name_en": "Kyiv",
                "region_name": "Київська область",
                "population": 2884000,
                "is_regional_center": true,
                "is_active": true,
                "latitude": 50.4501,
                "longitude": 30.5234
            }}
        ]

        ОБЯЗАТЕЛЬНО включи ВСЕ города для каждой области:

        1. Столицу: Київ
        2. ВСЕ областные центры (24 города)
        3. ВСЕ районные центры и города областного значения
        4. Важные промышленные центры

        ОСОБЕННО ВАЖНО для Запорізької області включи ВСЕ города:
        - Запоріжжя (областной центр, ~750000 жителей)
        - Мелітополь (~150000 жителей)
        - Бердянськ (~115000 жителей)
        - Енергодар (~53000 жителей)
        - Токмак (~33000 жителей)
        - Василівка (~17000 жителей)
        - Оріхів (~14000 жителей)
        - Пологи (~20000 жителей)
        - Гуляйполе (~14000 жителей)
        - Вільнянськ (~12000 жителей)
        - Кам'янка-Дніпровська (~12000 жителей)
        - Дніпрорудне (~18000 жителей)
        - Якимівка (~7000 жителей)
        - Михайлівка (~5000 жителей)
        - Приморськ (~12000 жителей)
        - Розівка (~4000 жителей)
        - Новомиколаївка (~3000 жителей)
        - Комиш-Зоря (~6000 жителей)
        - Молочанськ (~7000 жителей)
        - Чернігівка (~8000 жителей)

        Аналогично детально проработай ВСЕ остальные области с включением:
        - Областного центра
        - ВСЕХ районных центров
        - Городов областного значения
        - Крупных поселков городского типа (ПГТ)
        - Важных промышленных центров

        Минимум 200+ городов для полного покрытия всех областей Украины.
        Каждая область должна иметь минимум 8-15 городов.
        """
        
        try:
            # Generate cities data using LLM
            cities_data = self._generate_with_llm(cities_prompt, "cities")
            
            if not cities_data:
                self.stdout.write('⚠️ LLM generation failed, using fallback data')
                cities_data = self._get_fallback_cities()
            
            # Create cities in database
            created_count = 0
            with transaction.atomic():
                for city_data in cities_data:
                    # Find region
                    region = None
                    for r in regions:
                        if r.name == city_data.get('region_name'):
                            region = r
                            break
                    
                    if not region:
                        self.stdout.write(f'⚠️ Region not found for city {city_data["name"]}: {city_data.get("region_name")}')
                        continue
                    
                    city, created = CityModel.objects.get_or_create(
                        name=city_data['name'],
                        region=region,
                        defaults={
                            'is_regional_center': city_data.get('is_regional_center', False),
                            'is_active': city_data.get('is_active', True),
                            'latitude': city_data.get('latitude'),
                            'longitude': city_data.get('longitude')
                        }
                    )
                    if created:
                        created_count += 1
            
            self.stdout.write(f'✅ Created {created_count} cities')
            
        except Exception as e:
            self.stdout.write(f'❌ Error creating cities: {e}')
            self.stdout.write('📦 Using fallback cities data...')
            self._create_fallback_cities()

    def _generate_with_llm(self, prompt, data_type):
        """Generate data using LLM service."""
        try:
            self.stdout.write(f'🧠 Generating {data_type} with LLM...')
            
            # Use LLM mock generator
            from core.services.llm_mock_generator import LLMMockGenerator
            
            generator = LLMMockGenerator()
            response = generator._call_llm_api(prompt)
            
            if response and 'choices' in response:
                content = response['choices'][0]['message']['content']
                
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    data = json.loads(json_str)
                    self.stdout.write(f'✅ Generated {len(data)} {data_type} with LLM')
                    return data
            
            return None
            
        except Exception as e:
            self.stdout.write(f'❌ LLM generation failed: {e}')
            return None

    def _get_fallback_regions(self):
        """Fallback regions data if LLM fails."""
        return [
            {"name": "Вінницька область", "code": "VN", "country": "Україна", "is_active": True},
            {"name": "Волинська область", "code": "VL", "country": "Україна", "is_active": True},
            {"name": "Дніпропетровська область", "code": "DP", "country": "Україна", "is_active": True},
            {"name": "Донецька область", "code": "DN", "country": "Україна", "is_active": True},
            {"name": "Житомирська область", "code": "ZT", "country": "Україна", "is_active": True},
            {"name": "Закарпатська область", "code": "ZK", "country": "Україна", "is_active": True},
            {"name": "Запорізька область", "code": "ZP", "country": "Україна", "is_active": True},
            {"name": "Івано-Франківська область", "code": "IF", "country": "Україна", "is_active": True},
            {"name": "Київська область", "code": "KV", "country": "Україна", "is_active": True},
            {"name": "Кіровоградська область", "code": "KR", "country": "Україна", "is_active": True},
            {"name": "Луганська область", "code": "LG", "country": "Україна", "is_active": True},
            {"name": "Львівська область", "code": "LV", "country": "Україна", "is_active": True},
            {"name": "Миколаївська область", "code": "MK", "country": "Україна", "is_active": True},
            {"name": "Одеська область", "code": "OD", "country": "Україна", "is_active": True},
            {"name": "Полтавська область", "code": "PL", "country": "Україна", "is_active": True},
            {"name": "Рівненська область", "code": "RV", "country": "Україна", "is_active": True},
            {"name": "Сумська область", "code": "SM", "country": "Україна", "is_active": True},
            {"name": "Тернопільська область", "code": "TR", "country": "Україна", "is_active": True},
            {"name": "Харківська область", "code": "KH", "country": "Україна", "is_active": True},
            {"name": "Херсонська область", "code": "KS", "country": "Україна", "is_active": True},
            {"name": "Хмельницька область", "code": "HM", "country": "Україна", "is_active": True},
            {"name": "Черкаська область", "code": "CK", "country": "Україна", "is_active": True},
            {"name": "Чернівецька область", "code": "CV", "country": "Україна", "is_active": True},
            {"name": "Чернігівська область", "code": "CN", "country": "Україна", "is_active": True},
            {"name": "АР Крим", "code": "CR", "country": "Україна", "is_active": False},
            {"name": "м. Київ", "code": "KC", "country": "Україна", "is_active": True},
            {"name": "м. Севастополь", "code": "SV", "country": "Україна", "is_active": False}
        ]

    def _get_fallback_cities(self):
        """Fallback cities data if LLM fails."""
        return [
            # Столица
            {"name": "Київ", "region_name": "м. Київ", "is_regional_center": True, "is_active": True, "latitude": 50.4501, "longitude": 30.5234},

            # Областные центры
            {"name": "Харків", "region_name": "Харківська область", "is_regional_center": True, "is_active": True, "latitude": 49.9935, "longitude": 36.2304},
            {"name": "Одеса", "region_name": "Одеська область", "is_regional_center": True, "is_active": True, "latitude": 46.4825, "longitude": 30.7233},
            {"name": "Дніпро", "region_name": "Дніпропетровська область", "is_regional_center": True, "is_active": True, "latitude": 48.4647, "longitude": 35.0462},
            {"name": "Донецьк", "region_name": "Донецька область", "is_regional_center": True, "is_active": False, "latitude": 48.0159, "longitude": 37.8028},
            {"name": "Запоріжжя", "region_name": "Запорізька область", "is_regional_center": True, "is_active": True, "latitude": 47.8388, "longitude": 35.1396},
            {"name": "Львів", "region_name": "Львівська область", "is_regional_center": True, "is_active": True, "latitude": 49.8397, "longitude": 24.0297},

            # Крупные города
            {"name": "Кривий Ріг", "region_name": "Дніпропетровська область", "is_regional_center": False, "is_active": True, "latitude": 47.9077, "longitude": 33.3916},

            # Города Запорожской области (полный список)
            {"name": "Мелітополь", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 46.8419, "longitude": 35.3659},
            {"name": "Бердянськ", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 46.7569, "longitude": 36.7982},
            {"name": "Енергодар", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.4986, "longitude": 34.6564},
            {"name": "Токмак", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.2547, "longitude": 35.7053},
            {"name": "Пологи", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.4397, "longitude": 36.2831},
            {"name": "Дніпрорудне", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.3547, "longitude": 34.9831},
            {"name": "Василівка", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.4397, "longitude": 35.2831},
            {"name": "Оріхів", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.5697, "longitude": 35.8031},
            {"name": "Гуляйполе", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.6597, "longitude": 36.2631},
            {"name": "Вільнянськ", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.9397, "longitude": 35.4331},
            {"name": "Кам'янка-Дніпровська", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.5297, "longitude": 34.3431},
            {"name": "Приморськ", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 46.7397, "longitude": 36.3031},
            {"name": "Чернігівка", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.6897, "longitude": 35.5231},
            {"name": "Молочанськ", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.1297, "longitude": 35.3631},
            {"name": "Якимівка", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.2897, "longitude": 36.1831},
            {"name": "Комиш-Зоря", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.0697, "longitude": 36.4231},
            {"name": "Михайлівка", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.2597, "longitude": 35.0431},
            {"name": "Розівка", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.4597, "longitude": 36.1231},
            {"name": "Новомиколаївка", "region_name": "Запорізька область", "is_regional_center": False, "is_active": True, "latitude": 47.3297, "longitude": 35.6831}
        ]

    def _create_fallback_regions(self):
        """Create fallback regions."""
        regions_data = self._get_fallback_regions()
        created_count = 0
        
        with transaction.atomic():
            for region_data in regions_data:
                region, created = RegionModel.objects.get_or_create(
                    name=region_data['name'],
                    defaults=region_data
                )
                if created:
                    created_count += 1
        
        self.stdout.write(f'✅ Created {created_count} fallback regions')

    def _create_fallback_cities(self):
        """Create fallback cities."""
        cities_data = self._get_fallback_cities()
        regions = {r.name: r for r in RegionModel.objects.all()}
        created_count = 0
        
        with transaction.atomic():
            for city_data in cities_data:
                region = regions.get(city_data['region_name'])
                if region:
                    city, created = CityModel.objects.get_or_create(
                        name=city_data['name'],
                        region=region,
                        defaults={k: v for k, v in city_data.items() if k != 'region_name'}
                    )
                    if created:
                        created_count += 1
        
        self.stdout.write(f'✅ Created {created_count} fallback cities')

    def _print_summary(self):
        """Print summary of created geography data."""
        regions_count = RegionModel.objects.count()
        cities_count = CityModel.objects.count()
        regional_centers = CityModel.objects.filter(is_regional_center=True).count()
        
        self.stdout.write('\n🇺🇦 Ukraine Geography Summary:')
        self.stdout.write('=' * 40)
        self.stdout.write(f'🗺️ Regions: {regions_count}')
        self.stdout.write(f'🏙️ Cities: {cities_count}')
        self.stdout.write(f'🏛️ Regional centers: {regional_centers}')
        self.stdout.write('=' * 40)
