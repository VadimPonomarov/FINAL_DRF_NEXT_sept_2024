"""
Quick command to create a complete mock system for testing.
Creates users, sellers, and car advertisements with realistic data.
"""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from apps.users.models import UserModel, ProfileModel
from apps.accounts.models import AddsAccount, AddsAccountContact, RawAccountAddress
from apps.ads.models import CarAd, CarSpecification
from apps.ads.models.car_metadata_model import CarMetadataModel
from apps.ads.models.reference import (
    VehicleTypeModel, CarMarkModel, CarModel, CarColorModel,
    RegionModel, CityModel
)
from core.enums.ads import AccountTypeEnum, RoleEnum, ContactTypeEnum
from core.enums.cars import Currency, SellerType, ExchangeStatus


class Command(BaseCommand):
    help = 'Create complete mock system with users, sellers, and car ads'

    def add_arguments(self, parser):
        parser.add_argument(
            '--quick',
            action='store_true',
            help='Create minimal dataset for quick testing',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing mock data before creating new',
        )

    def handle(self, *args, **options):
        """Create mock system."""
        try:
            self.stdout.write('🚀 Creating mock AutoRia system...')
            
            if options['clear']:
                self._clear_mock_data()
            
            # Set dataset size
            if options['quick']:
                self.config = {
                    'sellers': 5,
                    'car_ads': 20,
                    'regions': 3
                }
            else:
                self.config = {
                    'sellers': 15,
                    'car_ads': 50,
                    'regions': 5
                }

            # Note: Buyers are anonymous visitors, no accounts needed
            
            # Create data
            self._ensure_reference_data()
            self._create_locations()
            self._create_mock_sellers()
            self._create_mock_car_ads()

            # Note: Buyers are anonymous visitors, no need to create user accounts
            
            self._print_summary()
            self.stdout.write(self.style.SUCCESS('✅ Mock system created successfully!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating mock system: {e}'))
            raise

    def _clear_mock_data(self):
        """Clear existing mock data."""
        self.stdout.write('🧹 Clearing mock data...')
        
        with transaction.atomic():
            # Clear ads and related data
            CarAd.objects.filter(account__user__email__contains='mock').delete()
            CarAd.objects.filter(account__user__email__contains='test').delete()
            
            # Clear accounts
            AddsAccount.objects.filter(user__email__contains='mock').delete()
            AddsAccount.objects.filter(user__email__contains='test').delete()
            
            # Clear users (except admin)
            UserModel.objects.filter(
                email__contains='mock',
                is_superuser=False
            ).delete()
            UserModel.objects.filter(
                email__contains='test',
                is_superuser=False
            ).delete()

    def _ensure_reference_data(self):
        """Ensure reference data exists."""
        if not VehicleTypeModel.objects.exists():
            call_command('auto_populate_references')

    def _create_locations(self):
        """Create comprehensive Ukraine regions and cities."""
        self.stdout.write('🗺️ Creating comprehensive Ukraine geography...')

        # Create all Ukraine regions
        self._create_all_ukraine_regions()

        # Create all major Ukraine cities
        self._create_all_ukraine_cities()

    def _create_all_ukraine_regions(self):
        """Create all Ukraine regions using LLM knowledge."""
        self.stdout.write('🇺🇦 Creating all Ukraine regions...')

        regions_prompt = """
        Создай полный список всех регионов (областей) Украины.
        Включи все 24 области + АР Крым + города со специальным статусом.

        Верни только список названий на украинском языке, по одному на строке:
        Вінницька область
        Волинська область
        Дніпропетровська область
        ...

        Включи ВСЕ области: Вінницька, Волинська, Дніпропетровська, Донецька, Житомирська,
        Закарпатська, Запорізька, Івано-Франківська, Київська, Кіровоградська, Луганська,
        Львівська, Миколаївська, Одеська, Полтавська, Рівненська, Сумська, Тернопільська,
        Харківська, Херсонська, Хмельницька, Черкаська, Чернівецька, Чернігівська +
        АР Крим + міста Київ та Севастополь.
        """

        try:
            regions_data = self._generate_geography_list(regions_prompt, "regions")

            if not regions_data:
                regions_data = self._get_fallback_regions()

            created_count = 0
            for region_name in regions_data:
                region, created = RegionModel.objects.get_or_create(
                    name=region_name.strip(),
                    defaults={
                        'country': 'Україна',
                        'is_active': True
                    }
                )
                if created:
                    created_count += 1

            self.stdout.write(f'✅ Created {created_count} regions')

        except Exception as e:
            self.stdout.write(f'❌ Error creating regions: {e}')
            self._create_fallback_regions()

    def _create_all_ukraine_cities(self):
        """Create all major Ukraine cities using LLM knowledge."""
        self.stdout.write('🏙️ Creating all major Ukraine cities...')

        regions = list(RegionModel.objects.all())
        region_names = [r.name for r in regions]

        cities_prompt = f"""
        Создай полный список всех крупных городов Украины.
        Включи ВСЕ областные центры, крупные районные центры, города областного значения и столицу.

        Доступные регионы: {region_names}

        Верни список в формате "Город|Область", по одному на строке:
        Київ|м. Київ
        Харків|Харківська область
        Одеса|Одеська область
        ...

        Обязательно включи:
        1. Столицу: Київ
        2. ВСЕ областные центры (24+ городов)
        3. Крупные районные центры и города областного значения
        4. Важные промышленные и культурные центры

        Минимум 100+ городов для полного покрытия Украины.
        """

        try:
            cities_data = self._generate_geography_list(cities_prompt, "cities")

            if not cities_data:
                cities_data = self._get_fallback_cities()

            created_count = 0
            regions_dict = {r.name: r for r in regions}

            for city_line in cities_data:
                if '|' in city_line:
                    city_name, region_name = city_line.strip().split('|', 1)
                    region = regions_dict.get(region_name.strip())

                    if region:
                        city, created = CityModel.objects.get_or_create(
                            name=city_name.strip(),
                            region=region,
                            defaults={'is_active': True}
                        )
                        if created:
                            created_count += 1

            self.stdout.write(f'✅ Created {created_count} cities')

        except Exception as e:
            self.stdout.write(f'❌ Error creating cities: {e}')
            self._create_fallback_cities()



    def _create_mock_sellers(self):
        """Create seller accounts for existing users."""
        self.stdout.write(f'🏪 Creating seller accounts for existing users...')

        # Get existing users without seller accounts
        users_without_accounts = UserModel.objects.filter(
            is_active=True,
            is_staff=False,
            is_superuser=False,
            account_adds__isnull=True
        )[:self.config['sellers']]

        if not users_without_accounts.exists():
            self.stdout.write('⚠️  No users available for seller accounts. Creating some users first...')
            # Create a few users if none exist
            self._create_additional_users()
            users_without_accounts = UserModel.objects.filter(
                is_active=True,
                is_staff=False,
                is_superuser=False,
                account_adds__isnull=True
            )[:self.config['sellers']]

        organizations = [
            'АвтоЦентр Київ', 'Преміум Авто', 'Автосалон Люкс', 'Мега Авто',
            'Автоплаза', 'Драйв Авто', 'Авто Експерт', 'Швидкий Авто'
        ]

        created_count = 0
        for user in users_without_accounts:
            # Create seller account for existing user
            account_type = random.choice([AccountTypeEnum.BASIC, AccountTypeEnum.PREMIUM])
            organization = random.choice(organizations) if account_type == AccountTypeEnum.PREMIUM else ''

            account, created = AddsAccount.objects.get_or_create(
                user=user,
                defaults={
                    'account_type': account_type,
                    'role': RoleEnum.SELLER,
                    'organization_name': organization,
                    'stats_enabled': True
                }
            )

            if created:
                created_count += 1

                # Add multiple contacts for new account (using all contact types)
                contact_data = [
                    (ContactTypeEnum.PHONE, f"+380{random.randint(50, 99)}{random.randint(1000000, 9999999)}"),
                    (ContactTypeEnum.EMAIL, f"seller{i+1}@example.com"),
                    (ContactTypeEnum.TELEGRAM, f"@seller{i+1}"),
                    (ContactTypeEnum.WHATSAPP, f"+380{random.randint(50, 99)}{random.randint(1000000, 9999999)}"),
                    (ContactTypeEnum.VIBER, f"+380{random.randint(50, 99)}{random.randint(1000000, 9999999)}"),
                ]

                # Create 2-3 random contacts per account
                selected_contacts = random.sample(contact_data, random.randint(2, 3))
                for contact_type, contact_value in selected_contacts:
                    AddsAccountContact.objects.create(
                        adds_account=account,
                        type=contact_type,
                        value=contact_value,
                        is_visible=True
                    )

                # Add address for new account with geocoding
                regions = list(RegionModel.objects.all())
                if regions:
                    region = random.choice(regions)
                    cities = list(CityModel.objects.filter(region=region))
                    city = random.choice(cities) if cities else region.name.split()[0]

                    street_name = random.choice(['Хрещатик', 'Шевченка', 'Франка', 'Лесі Українки', 'Грушевського', 'Володимирська'])
                    building_number = str(random.randint(1, 200))

                    # Create raw address
                    raw_address = RawAccountAddress.objects.create(
                        account=account,
                        country="Україна",
                        region=region.name,
                        locality=city.name if hasattr(city, 'name') else str(city),
                        street=f"вул. {street_name}",
                        building=building_number
                    )

                    # Try to generate formatted address using geocoding
                    try:
                        from apps.accounts.utils.geocoding import get_geocode
                        geocode = get_geocode(
                            country=raw_address.country,
                            region=raw_address.region,
                            locality=raw_address.locality,
                            street=raw_address.street,
                            building=raw_address.building
                        )
                        if geocode:
                            # Store geocode in the address for future use
                            raw_address.geocode = geocode[:128]  # Limit to field size
                            raw_address.save()
                    except Exception as e:
                        # Continue without geocoding if it fails
                        pass

        self.stdout.write(f'✅ Created {created_count} seller accounts')

    def _create_additional_users(self):
        """Create additional users if needed."""
        self.stdout.write('👥 Creating additional users for seller accounts...')

        names = [
            ('Олександр', 'Петренко'), ('Марія', 'Іваненко'), ('Іван', 'Коваленко'),
            ('Анна', 'Шевченко'), ('Петро', 'Бондаренко'), ('Олена', 'Ткаченко'),
            ('Сергій', 'Кравченко'), ('Тетяна', 'Мельник'), ('Андрій', 'Поліщук'),
            ('Наталія', 'Гончаренко'), ('Володимир', 'Лисенко'), ('Ірина', 'Савченко')
        ]

        domains = ['gmail.com', 'ukr.net', 'i.ua']

        for i in range(self.config['sellers']):
            name, surname = random.choice(names)
            domain = random.choice(domains)
            email = f"user.{i+1}@{domain}"

            user, created = UserModel.objects.get_or_create(
                email=email,
                defaults={
                    'is_active': True
                }
            )

            if created:
                user.set_password('test123')
                user.save()

                # Create profile
                ProfileModel.objects.get_or_create(
                    user=user,
                    defaults={
                        'name': name,
                        'surname': surname,
                        'age': random.randint(18, 65)
                    }
                )

    def _create_mock_car_ads(self):
        """Create mock car advertisements."""
        self.stdout.write(f'🚗 Creating {self.config["car_ads"]} mock car ads...')
        
        # Get seller accounts
        seller_accounts = list(AddsAccount.objects.filter(role=RoleEnum.SELLER))
        if not seller_accounts:
            self.stdout.write('⚠️  No seller accounts found')
            return
        
        # Get car data
        car_marks = list(CarMarkModel.objects.filter(is_popular=True)[:8])
        colors = list(CarColorModel.objects.all()[:6])
        
        if not car_marks:
            self.stdout.write('⚠️  No car marks found')
            return
        
        car_descriptions = [
            "Автомобіль в відмінному стані. Регулярне ТО. Один власник.",
            "Продається у зв'язку з покупкою нового авто. Торг можливий.",
            "Машина не била, не фарбована. Всі ТО вчасно.",
            "Економічний та надійний автомобіль. Ідеальний для міста.",
            "Сімейний автомобіль в хорошому стані. Дбайливий власник."
        ]
        
        for i in range(self.config['car_ads']):
            account = random.choice(seller_accounts)
            mark = random.choice(car_marks)
            
            # Get models for this mark
            models = list(CarModel.objects.filter(mark=mark)[:3])
            if not models:
                continue
                
            model = random.choice(models)
            color = random.choice(colors) if colors else None
            
            year = random.randint(2015, 2024)
            mileage = random.randint(0, 200000)
            price = Decimal(str(random.randint(8000, 50000)))
            
            # Create car ad with dynamic fields
            dynamic_fields = {
                'mark': mark.name,
                'model': model.name,
                'year': year,
                'mileage': mileage,
                'color': color.name if color else 'Не вказано',
                'condition': 'Вживана',
                'fuel_type': random.choice(['Бензин', 'Дизель', 'Гібрид']),
                'transmission': random.choice(['Механічна', 'Автоматична']),
                'body_type': random.choice(['Седан', 'Хетчбек', 'Кросовер']),
                'engine_volume': round(random.uniform(1.2, 3.5), 1),
            }

            # Get region and city for location
            regions = list(RegionModel.objects.all())
            region = random.choice(regions) if regions else None
            cities = list(CityModel.objects.filter(region=region)) if region else []
            city = random.choice(cities) if cities else None

            car_ad = CarAd.objects.create(
                account=account,
                mark=mark,
                model=model.name,
                title=f"{mark.name} {model.name} {year}",
                description=random.choice(car_descriptions),
                price=price,
                currency=Currency.UAH.value,
                region=region.name if region else 'Київська область',
                city=city.name if city else 'Київ',
                dynamic_fields=dynamic_fields,
                seller_type=SellerType.PRIVATE if account.account_type == AccountTypeEnum.BASIC else SellerType.DEALER,
                exchange_status=random.choice([ExchangeStatus.NOT_POSSIBLE, ExchangeStatus.POSSIBLE, ExchangeStatus.CONSIDER])
            )
            
            # Create specifications (using proper field names and enum values)
            from core.enums.cars import FuelType, TransmissionType, DriveType, CarBodyType, SteeringWheelSide

            CarSpecification.objects.create(
                car_ad=car_ad,
                year=year,
                mileage_km=mileage,
                engine_volume=round(random.uniform(1.2, 3.5), 1),
                engine_power=random.randint(100, 400),
                fuel_type=random.choice([FuelType.PETROL.value, FuelType.DIESEL.value, FuelType.HYBRID.value]),
                transmission_type=random.choice([TransmissionType.MANUAL.value, TransmissionType.AUTOMATIC.value]),
                drive_type=random.choice([DriveType.FWD.value, DriveType.AWD.value]),
                body_type=random.choice([CarBodyType.SEDAN.value, CarBodyType.HATCHBACK.value, CarBodyType.SUV.value]),
                color=color,
                steering_wheel=SteeringWheelSide.LEFT.value
            )
            
            # Create metadata
            CarMetadataModel.objects.create(
                car_ad=car_ad,
                is_active=True,
                is_verified=random.choice([True, False]),
                is_vip=random.choice([True, False]) if account.account_type == AccountTypeEnum.PREMIUM else False,
                is_premium=account.account_type == AccountTypeEnum.PREMIUM,
                views_count=random.randint(0, 500),
                phone_views_count=random.randint(0, 50),
                refreshed_at=timezone.now() - timedelta(days=random.randint(0, 15)),
                expires_at=timezone.now() + timedelta(days=random.randint(15, 45))
            )

    def _print_summary(self):
        """Print summary of created data."""
        self.stdout.write('\n📊 Mock System Summary:')
        self.stdout.write('=' * 40)
        
        sellers = AddsAccount.objects.filter(user__email__contains='mock.seller').count()
        car_ads = CarAd.objects.filter(account__user__email__contains='mock.seller').count()

        self.stdout.write(f'🏪 Mock Sellers: {sellers}')
        self.stdout.write(f'🚗 Mock Car Ads: {car_ads}')

        self.stdout.write('\n💡 Test Accounts:')
        self.stdout.write('   Seller: mock.seller.1@autodealer.com / test123')
        self.stdout.write('   Admin: admin@autoria.com / test123')
        self.stdout.write('   Note: Buyers are anonymous visitors (no accounts needed)')
        
        self.stdout.write('=' * 40)

    def _generate_geography_list(self, prompt, data_type):
        """Generate geography list using LLM."""
        try:
            from core.services.llm_mock_generator import generate_mock_data

            self.stdout.write(f'🧠 Generating {data_type} with LLM...')

            # Use LLM to generate data
            result = generate_mock_data(
                prompt=prompt,
                django_model=None,
                count=1,
                locale='uk_UA'
            )

            if result and len(result) > 0:
                response_text = str(result[0])
                # Split by lines and filter empty lines
                lines = [line.strip() for line in response_text.split('\n') if line.strip()]

                if lines:
                    self.stdout.write(f'✅ Generated {len(lines)} {data_type} with LLM')
                    return lines

            return None

        except Exception as e:
            self.stdout.write(f'❌ LLM generation failed for {data_type}: {e}')
            return None

    def _get_fallback_regions(self):
        """Comprehensive fallback regions list."""
        return [
            "Вінницька область",
            "Волинська область",
            "Дніпропетровська область",
            "Донецька область",
            "Житомирська область",
            "Закарпатська область",
            "Запорізька область",
            "Івано-Франківська область",
            "Київська область",
            "Кіровоградська область",
            "Луганська область",
            "Львівська область",
            "Миколаївська область",
            "Одеська область",
            "Полтавська область",
            "Рівненська область",
            "Сумська область",
            "Тернопільська область",
            "Харківська область",
            "Херсонська область",
            "Хмельницька область",
            "Черкаська область",
            "Чернівецька область",
            "Чернігівська область",
            "АР Крим",
            "м. Київ",
            "м. Севастополь"
        ]

    def _get_fallback_cities(self):
        """Comprehensive fallback cities list."""
        return [
            # Столица и крупнейшие города
            "Київ|м. Київ",
            "Харків|Харківська область",
            "Одеса|Одеська область",
            "Дніпро|Дніпропетровська область",
            "Донецьк|Донецька область",
            "Запоріжжя|Запорізька область",
            "Львів|Львівська область",
            "Кривий Ріг|Дніпропетровська область",

            # Областные центры
            "Вінниця|Вінницька область",
            "Луцьк|Волинська область",
            "Житомир|Житомирська область",
            "Ужгород|Закарпатська область",
            "Івано-Франківськ|Івано-Франківська область",
            "Кропивницький|Кіровоградська область",
            "Луганськ|Луганська область",
            "Миколаїв|Миколаївська область",
            "Полтава|Полтавська область",
            "Рівне|Рівненська область",
            "Суми|Сумська область",
            "Тернопіль|Тернопільська область",
            "Херсон|Херсонська область",
            "Хмельницький|Хмельницька область",
            "Черкаси|Черкаська область",
            "Чернівці|Чернівецька область",
            "Чернігів|Чернігівська область",

            # Крупные районные центры и города областного значения
            "Маріуполь|Донецька область",
            "Кам'янське|Дніпропетровська область",
            "Біла Церква|Київська область",
            "Бровари|Київська область",
            "Дрогобич|Львівська область",
            "Чорноморськ|Одеська область",
            "Ізмаїл|Одеська область",
            "Мелітополь|Запорізька область",
            "Бердянськ|Запорізька область",
            "Слов'янськ|Донецька область",
            "Краматорськ|Донецька область",
            "Нікополь|Дніпропетровська область",
            "Павлоград|Дніпропетровська область",
            "Синельникове|Дніпропетровська область",
            "Новомосковськ|Дніпропетровська область",
            "Покров|Дніпропетровська область",
            "Першотравенськ|Дніпропетровська область",
            "Жовті Води|Дніпропетровська область",
            "Марганець|Дніпропетровська область",
            "Орджонікідзе|Дніпропетровська область",
            "Тернівка|Дніпропетровська область",
            "Верхньодніпровськ|Дніпропетровська область",
            "Софіївка|Дніпропетровська область",
            "Васильківка|Дніпропетровська область",
            "Апостолове|Дніпропетровська область",
            "Широке|Дніпропетровська область",
            "Магдалинівка|Дніпропетровська область",
            "Петропавлівка|Дніпропетровська область",
            "Солоне|Дніпропетровська область",
            "Юр'ївка|Дніпропетровська область",
            "Межова|Дніпропетровська область",
            "Царичанка|Дніпропетровська область",
            "Новоолександрівка|Дніпропетровська область",
            "П'ятихатки|Дніпропетровська область",
            "Томаківка|Дніпропетровська область",
            "Губиниха|Дніпропетровська область",
            "Кочережки|Дніпропетровська область",
            "Богданівка|Дніпропетровська область",
            "Ботієве|Донецька область",
            "Вугледар|Донецька область",
            "Горлівка|Донецька область",
            "Дебальцеве|Донецька область",
            "Докучаєвськ|Донецька область",
            "Дружківка|Донецька область",
            "Єнакієве|Донецька область",
            "Жданівка|Донецька область",
            "Іловайськ|Донецька область",
            "Кальміуське|Донецька область",
            "Костянтинівка|Донецька область",
            "Лиман|Донецька область",
            "Макіївка|Донецька область",
            "Мангуш|Донецька область",
            "Мирноград|Донецька область",
            "Новоазовськ|Донецька область",
            "Покровськ|Донецька область",
            "Селидове|Донецька область",
            "Снігурівка|Донецька область",
            "Торецьк|Донецька область",
            "Українськ|Донецька область",
            "Харцизьк|Донецька область",
            "Часів Яр|Донецька область",
            "Шахтарськ|Донецька область",
            "Ясинувата|Донецька область",

            # Дополнительные крупные города других областей
            "Фастів|Київська область",
            "Обухів|Київська область",
            "Переяслав|Київська область",
            "Васильків|Київська область",
            "Ірпінь|Київська область",
            "Буча|Київська область",
            "Вишневе|Київська область",
            "Борисполь|Київська область",
            "Стрий|Львівська область",
            "Червоноград|Львівська область",
            "Самбір|Львівська область",
            "Трускавець|Львівська область",
            "Борислав|Львівська область",
            "Моршин|Львівська область",
            "Городок|Львівська область",
            "Жидачів|Львівська область",
            "Яворів|Львівська область",
            "Сокаль|Львівська область",
            "Турка|Львівська область",
            "Старий Самбір|Львівська область",
            "Коломия|Івано-Франківська область",
            "Калуш|Івано-Франківська область",
            "Надвірна|Івано-Франківська область",
            "Долина|Івано-Франківська область",
            "Болехів|Івано-Франківська область",
            "Яремче|Івано-Франківська область",
            "Косів|Івано-Франківська область",
            "Снятин|Івано-Франківська область",
            "Рожнятів|Івано-Франківська область",
            "Тисмениця|Івано-Франківська область"
        ]

    def _create_fallback_regions(self):
        """Create fallback regions if LLM fails."""
        regions_data = self._get_fallback_regions()
        created_count = 0

        for region_name in regions_data:
            region, created = RegionModel.objects.get_or_create(
                name=region_name,
                defaults={
                    'country': 'Україна',
                    'is_active': True
                }
            )
            if created:
                created_count += 1

        self.stdout.write(f'✅ Created {created_count} fallback regions')

    def _create_fallback_cities(self):
        """Create fallback cities if LLM fails."""
        cities_data = self._get_fallback_cities()
        regions_dict = {r.name: r for r in RegionModel.objects.all()}
        created_count = 0

        for city_line in cities_data:
            if '|' in city_line:
                city_name, region_name = city_line.split('|', 1)
                region = regions_dict.get(region_name.strip())

                if region:
                    city, created = CityModel.objects.get_or_create(
                        name=city_name.strip(),
                        region=region,
                        defaults={'is_active': True}
                    )
                    if created:
                        created_count += 1

        self.stdout.write(f'✅ Created {created_count} fallback cities')
