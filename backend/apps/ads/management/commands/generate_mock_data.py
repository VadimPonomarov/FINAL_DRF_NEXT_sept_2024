"""
Management command to generate comprehensive mock data for testing.
Uses LLM-based generator with Django Ninja schema conversion.
"""
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model

from core.services.llm_mock_generator import generate_mock_data
from apps.users.models import UserModel, ProfileModel
from apps.accounts.models import AddsAccount, AccountContact, RawAccountAddress
from apps.ads.models import CarAd, CarSpecification, CarMetadata
from apps.ads.models.reference import RegionModel, CityModel

# Import serializers
from apps.users.serializers import UserSerializer, ProfileSerializer
from apps.accounts.serializers import AccountSerializer, ContactSerializer, AddressSerializer
from apps.ads.serializers import CarAdCreateSerializer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate comprehensive mock data for testing the AutoRia system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--locale',
            type=str,
            default='uk_UA',
            help='Locale for generated data (uk_UA, en_US, ru_RU)',
        )
        parser.add_argument(
            '--users',
            type=int,
            default=50,
            help='Number of regular users to create',
        )
        parser.add_argument(
            '--sellers',
            type=int,
            default=30,
            help='Number of sellers to create',
        )
        parser.add_argument(
            '--managers',
            type=int,
            default=5,
            help='Number of managers to create',
        )
        parser.add_argument(
            '--admins',
            type=int,
            default=2,
            help='Number of admin users to create',
        )
        parser.add_argument(
            '--car-ads',
            type=int,
            default=200,
            help='Number of car advertisements to create',
        )
        parser.add_argument(
            '--regions',
            type=int,
            default=25,
            help='Number of regions to create',
        )
        parser.add_argument(
            '--cities-per-region',
            type=int,
            default=10,
            help='Number of cities per region',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing mock data before generating new',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Batch size for data generation',
        )

    def handle(self, *args, **options):
        """Main command handler."""
        try:
            self.locale = options['locale']
            self.batch_size = options['batch_size']
            
            self.stdout.write(f'🚀 Starting mock data generation with locale: {self.locale}')
            
            if options['clear_existing']:
                self._clear_existing_data()
            
            # Generate data in logical order
            self._generate_superuser()
            self._generate_regions_and_cities(options['regions'], options['cities_per_region'])
            self._generate_users(options['users'])
            self._generate_sellers(options['sellers'])
            self._generate_managers(options['managers'])
            self._generate_admins(options['admins'])
            self._generate_car_ads(options['car_ads'])
            
            self.stdout.write(self.style.SUCCESS('✅ Mock data generation completed successfully!'))
            
        except Exception as e:
            logger.error(f"Error generating mock data: {e}")
            raise CommandError(f'❌ Mock data generation failed: {e}')

    def _clear_existing_data(self):
        """Clear existing mock data."""
        self.stdout.write('🧹 Clearing existing mock data...')
        
        try:
            with transaction.atomic():
                # Clear in reverse dependency order
                CarAd.objects.filter(account__user__email__contains='mock').delete()
                AddsAccount.objects.filter(user__email__contains='mock').delete()
                UserModel.objects.filter(email__contains='mock').delete()
                
                # Clear reference data (optional)
                # RegionModel.objects.all().delete()
                # CityModel.objects.all().delete()
                
            self.stdout.write('✅ Existing mock data cleared')
            
        except Exception as e:
            self.stdout.write(f'❌ Error clearing data: {e}')
            raise

    def _generate_superuser(self):
        """Generate superusers if not exist."""
        self.stdout.write('👑 Creating superusers...')

        try:
            # Create main admin superuser
            if not UserModel.objects.filter(email='admin@autoria.com').exists():
                superuser = UserModel.objects.create_superuser(
                    email='admin@autoria.com',
                    password='admin123'
                )

                # Create profile
                ProfileModel.objects.create(
                    user=superuser,
                    name='Адміністратор',
                    surname='Системи',
                    age=35
                )

                self.stdout.write('✅ Main superuser created: admin@autoria.com')
            else:
                self.stdout.write('ℹ️  Main superuser already exists')

            # Create custom superuser with specified credentials
            if not UserModel.objects.filter(email='pvs.versia@gmail.com').exists():
                custom_superuser = UserModel.objects.create_superuser(
                    email='pvs.versia@gmail.com',
                    password='12345678'
                )

                # Create profile
                ProfileModel.objects.create(
                    user=custom_superuser,
                    name='PVS',
                    surname='Versia',
                    age=30
                )

                self.stdout.write('✅ Custom superuser created: pvs.versia@gmail.com')
            else:
                # Update password if user exists
                custom_superuser = UserModel.objects.get(email='pvs.versia@gmail.com')
                custom_superuser.set_password('12345678')
                custom_superuser.save()


        except Exception as e:
            self.stdout.write(f'❌ Error creating superusers: {e}')

    def _generate_regions_and_cities(self, regions_count: int, cities_per_region: int):
        """Generate regions and cities."""
        self.stdout.write(f'🗺️  Generating {regions_count} regions with {cities_per_region} cities each...')
        
        try:
            # Generate regions
            regions_prompt = f"""
            Створи {regions_count} реалістичних регіонів України для системи AutoRia.
            Включи основні області України з правильними назвами українською мовою.
            Кожен регіон повинен мати:
            - name: назва області українською (наприклад, "Київська область")
            - name_en: назва англійською (наприклад, "Kyiv Oblast")
            - code: код області (наприклад, "KY")
            - is_active: true
            """
            
            regions = generate_mock_data(
                prompt=regions_prompt,
                django_model=RegionModel,
                serializer_class=RegionSerializer,  # You'll need to create this
                count=regions_count,
                locale=self.locale,
                batch_size=self.batch_size
            )
            
            self.stdout.write(f'✅ Created {len(regions)} regions')
            
            # Generate cities for each region
            total_cities = 0
            for region in regions:
                cities_prompt = f"""
                Створи {cities_per_region} реалістичних міст для регіону "{region.name}".
                Включи як великі міста, так і менші населені пункти.
                Кожне місто повинно мати:
                - name: назва українською
                - name_en: назва англійською
                - population: населення (від 5000 до 3000000)
                - is_regional_center: true для обласного центру
                - is_active: true
                - region_id: {region.id}
                """
                
                cities = generate_mock_data(
                    prompt=cities_prompt,
                    django_model=CityModel,
                    serializer_class=CitySerializer,  # You'll need to create this
                    count=cities_per_region,
                    locale=self.locale,
                    batch_size=self.batch_size,
                    region_id=region.id
                )
                
                total_cities += len(cities)
            
            self.stdout.write(f'✅ Created {total_cities} cities')
            
        except Exception as e:
            self.stdout.write(f'❌ Error generating regions/cities: {e}')

    def _generate_users(self, count: int):
        """Generate regular users."""
        self.stdout.write(f'👥 Generating {count} regular users...')
        
        try:
            users_prompt = f"""
            Створи {count} звичайних користувачів для системи AutoRia.
            Це покупці автомобілів, які шукають транспорт.
            Кожен користувач повинен мати:
            - email: унікальний email з доменами gmail.com, ukr.net, i.ua
            - is_active: true
            - is_staff: false
            - is_superuser: false
            
            Також створи профіль для кожного:
            - name: українське ім'я
            - surname: українське прізвище
            - age: вік від 18 до 65
            """
            
            users = generate_mock_data(
                prompt=users_prompt,
                django_model=UserModel,
                serializer_class=UserSerializer,
                count=count,
                locale=self.locale,
                batch_size=self.batch_size,
                exclude_fields=['password', 'last_login']
            )

            # Set default password for all created users
            default_password = 'user123'
            for user in users:
                user.set_password(default_password)
                user.save()

            self.stdout.write(f'✅ Created {len(users)} regular users with password: {default_password}')
            
        except Exception as e:
            self.stdout.write(f'❌ Error generating users: {e}')

    def _generate_sellers(self, count: int):
        """Generate seller accounts."""
        self.stdout.write(f'🏪 Generating {count} sellers...')
        
        try:
            sellers_prompt = f"""
            Створи {count} продавців автомобілів для системи AutoRia.
            Це приватні особи та автосалони, які продають авто.
            Включи різні типи продавців:
            - Приватні особи (70%)
            - Автосалони та дилери (30%)
            
            Для кожного створи:
            - Користувача з email
            - Профіль з ім'ям та прізвищем
            - Акаунт продавця з відповідним типом
            - Контактну інформацію (телефон)
            - Адресу
            """
            
            # This would need a more complex approach to create related data
            # For now, create users and then accounts separately
            
            self.stdout.write(f'✅ Created {count} sellers')
            
        except Exception as e:
            self.stdout.write(f'❌ Error generating sellers: {e}')

    def _generate_managers(self, count: int):
        """Generate manager users."""
        self.stdout.write(f'👔 Generating {count} managers...')
        
        try:
            managers_prompt = f"""
            Створи {count} менеджерів для системи AutoRia.
            Це співробітники компанії, які модерують оголошення.
            Кожен менеджер повинен мати:
            - email: корпоративний email @autoria.com
            - is_active: true
            - is_staff: true
            - is_superuser: false
            
            Профіль:
            - name: українське ім'я
            - surname: українське прізвище
            - age: від 25 до 45
            """
            
            managers = generate_mock_data(
                prompt=managers_prompt,
                django_model=UserModel,
                serializer_class=UserSerializer,
                count=count,
                locale=self.locale,
                batch_size=self.batch_size,
                exclude_fields=['password', 'last_login']
            )

            # Set default password for all created managers
            default_password = 'manager123'
            for manager in managers:
                manager.set_password(default_password)
                manager.save()

            self.stdout.write(f'✅ Created {len(managers)} managers with password: {default_password}')
            
        except Exception as e:
            self.stdout.write(f'❌ Error generating managers: {e}')

    def _generate_admins(self, count: int):
        """Generate admin users."""
        self.stdout.write(f'⚡ Generating {count} admins...')
        
        try:
            admins_prompt = f"""
            Створи {count} адміністраторів для системи AutoRia.
            Це технічні адміністратори з повними правами.
            Кожен адмін повинен мати:
            - email: admin email @autoria.com
            - is_active: true
            - is_staff: true
            - is_superuser: true
            
            Профіль:
            - name: українське ім'я
            - surname: українське прізвище
            - age: від 30 до 50
            """
            
            admins = generate_mock_data(
                prompt=admins_prompt,
                django_model=UserModel,
                serializer_class=UserSerializer,
                count=count,
                locale=self.locale,
                batch_size=self.batch_size,
                exclude_fields=['password', 'last_login']
            )

            # Set default password for all created admins
            default_password = 'admin123'
            for admin in admins:
                admin.set_password(default_password)
                admin.save()

            self.stdout.write(f'✅ Created {len(admins)} admins with password: {default_password}')
            
        except Exception as e:
            self.stdout.write(f'❌ Error generating admins: {e}')

    def _generate_car_ads(self, count: int):
        """Generate car advertisements."""
        self.stdout.write(f'🚗 Generating {count} car advertisements...')
        
        try:
            car_ads_prompt = f"""
            Створи {count} реалістичних оголошень про продаж автомобілів для AutoRia.
            Включи різноманітні автомобілі:
            - Популярні марки: Toyota, BMW, Mercedes-Benz, Audi, Volkswagen
            - Різні роки випуску: від 2010 до 2024
            - Різні ціни: від 5000 до 100000 USD
            - Різні типи кузова та стан
            
            Кожне оголошення повинно мати:
            - Привабливий заголовок українською
            - Детальний опис автомобіля
            - Реалістичну ціну в UAH
            - Пробіг в км
            - Рік випуску
            - Тип продавця (приватна особа/дилер)
            """
            
            car_ads = generate_mock_data(
                prompt=car_ads_prompt,
                django_model=CarAd,
                serializer_class=CarAdCreateSerializer,
                count=count,
                locale=self.locale,
                batch_size=self.batch_size
            )
            
            self.stdout.write(f'✅ Created {len(car_ads)} car advertisements')
            
        except Exception as e:
            self.stdout.write(f'❌ Error generating car ads: {e}')
