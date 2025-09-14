"""
Management command to create test users with different roles.
Creates superuser, staff, managers, and regular users for testing.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.users.models import UserModel, ProfileModel
from apps.accounts.models import AddsAccount
from core.enums.ads import AccountTypeEnum, RoleEnum


class Command(BaseCommand):
    help = 'Create test users with different roles for manual testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='12345678',
            help='Password for all test users (default: 12345678)',
        )
        parser.add_argument(
            '--locale',
            type=str,
            default='uk_UA',
            help='Locale for user data (default: uk_UA)',
        )

    def handle(self, *args, **options):
        """Create test users."""
        password = options['password']
        locale = options['locale']
        
        self.stdout.write('👥 Creating test users...')
        
        try:
            with transaction.atomic():
                # Create superuser
                self._create_superuser(password)
                
                # Create staff users
                self._create_staff_users(password, locale)
                
                # Create regular users
                self._create_regular_users(password, locale)
                
                # Create seller accounts
                self._create_seller_accounts(password, locale)
                
            self.stdout.write(self.style.SUCCESS('✅ Test users created successfully!'))
            self._print_user_summary()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating test users: {e}'))
            raise

    def _create_superuser(self, password: str):
        """Create superuser."""
        self.stdout.write('👑 Creating superusers...')

        from apps.users.serializers import UserSeedSerializer

        # Create main admin superuser
        if not UserModel.objects.filter(email='admin@autoria.com').exists():
            admin_data = {
                'email': 'admin@autoria.com',
                'password': password,
                'is_superuser': True,
                'is_staff': True,
                'profile': {
                    'name': 'Адміністратор',
                    'surname': 'Головний',
                    'age': 35
                }
            }

            serializer = UserSeedSerializer(data=admin_data)
            if serializer.is_valid():
                superuser = serializer.save()
                # Manually set superuser flags since they're read-only in serializer
                superuser.is_superuser = True
                superuser.is_staff = True
                superuser.save()
                self.stdout.write('✅ Main superuser created: admin@autoria.com')
            else:
                self.stdout.write(f'❌ Error creating main superuser: {serializer.errors}')
        else:
            self.stdout.write('ℹ️  Main superuser already exists')

        # Create custom superuser with specified credentials
        if not UserModel.objects.filter(email='pvs.versia@gmail.com').exists():
            custom_data = {
                'email': 'pvs.versia@gmail.com',
                'password': '12345678',
                'is_superuser': True,
                'is_staff': True,
                'profile': {
                    'name': 'PVS',
                    'surname': 'Versia',
                    'age': 30
                }
            }

            serializer = UserSeedSerializer(data=custom_data)
            if serializer.is_valid():
                custom_superuser = serializer.save()
                # Manually set superuser flags since they're read-only in serializer
                custom_superuser.is_superuser = True
                custom_superuser.is_staff = True
                custom_superuser.save()
                self.stdout.write('✅ Custom superuser created: pvs.versia@gmail.com')
            else:
                self.stdout.write(f'❌ Error creating custom superuser: {serializer.errors}')
        else:
            # Update password if user exists using the same method as serializer
            custom_superuser = UserModel.objects.get(email='pvs.versia@gmail.com')
            custom_superuser.set_password('12345678')
            custom_superuser.save()
            self.stdout.write('ℹ️  Custom superuser already exists, password updated')

    def _create_staff_users(self, password: str, locale: str):
        """Create staff users (managers, moderators)."""
        self.stdout.write('👔 Creating staff users...')
        
        staff_users = [
            {
                'email': 'manager@autoria.com',
                'name': 'Олександр',
                'surname': 'Менеджер',
                'age': 32,
                'role': 'Менеджер з продажу'
            },
            {
                'email': 'moderator@autoria.com',
                'name': 'Марія',
                'surname': 'Модератор',
                'age': 28,
                'role': 'Модератор оголошень'
            },
            {
                'email': 'support@autoria.com',
                'name': 'Іван',
                'surname': 'Підтримка',
                'age': 26,
                'role': 'Служба підтримки'
            }
        ]
        
        for user_data in staff_users:
            user, created = UserModel.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'is_active': True,
                    'is_staff': True,
                    'is_superuser': False,
                }
            )
            
            if created:
                user.set_password(password)
                user.save()
                
                ProfileModel.objects.create(
                    user=user,
                    name=user_data['name'],
                    surname=user_data['surname'],
                    age=user_data['age']
                )
                
                self.stdout.write(f'✅ Staff user created: {user_data["email"]}')

    def _create_regular_users(self, password: str, locale: str):
        """Create regular users (buyers)."""
        self.stdout.write('👤 Creating regular users...')
        
        regular_users = [
            {
                'email': 'buyer1@gmail.com',
                'name': 'Петро',
                'surname': 'Покупець',
                'age': 35
            },
            {
                'email': 'buyer2@ukr.net',
                'name': 'Анна',
                'surname': 'Іванова',
                'age': 29
            },
            {
                'email': 'buyer3@i.ua',
                'name': 'Сергій',
                'surname': 'Коваленко',
                'age': 42
            },
            {
                'email': 'test.user@example.com',
                'name': 'Тест',
                'surname': 'Користувач',
                'age': 25
            }
        ]
        
        from apps.users.serializers import UserSeedSerializer

        for user_data in regular_users:
            if not UserModel.objects.filter(email=user_data['email']).exists():
                serializer_data = {
                    'email': user_data['email'],
                    'password': password,
                    'profile': {
                        'name': user_data['name'],
                        'surname': user_data['surname'],
                        'age': user_data['age']
                    }
                }

                serializer = UserSeedSerializer(data=serializer_data)
                if serializer.is_valid():
                    serializer.save()
                    self.stdout.write(f'✅ Regular user created: {user_data["email"]}')
                else:
                    self.stdout.write(f'❌ Error creating user {user_data["email"]}: {serializer.errors}')
            else:
                self.stdout.write(f'ℹ️  Regular user already exists: {user_data["email"]}')

    def _create_seller_accounts(self, password: str, locale: str):
        """Create seller accounts with AddsAccount."""
        self.stdout.write('🏪 Creating seller accounts...')
        
        sellers = [
            {
                'email': 'seller1@gmail.com',
                'name': 'Володимир',
                'surname': 'Продавець',
                'age': 38,
                'account_type': AccountTypeEnum.BASIC,
                'role': RoleEnum.SELLER,
                'organization_name': ''
            },
            {
                'email': 'dealer@autohouse.com',
                'name': 'Михайло',
                'surname': 'Дилер',
                'age': 45,
                'account_type': AccountTypeEnum.PREMIUM,
                'role': RoleEnum.SELLER,
                'organization_name': 'АвтоХаус Київ'
            },
            {
                'email': 'salon@carsalon.ua',
                'name': 'Олена',
                'surname': 'Менеджер',
                'age': 33,
                'account_type': AccountTypeEnum.PREMIUM,
                'role': RoleEnum.MANAGER,
                'organization_name': 'Автосалон Преміум'
            }
        ]
        
        from apps.users.serializers import UserSerializer

        for seller_data in sellers:
            if not UserModel.objects.filter(email=seller_data['email']).exists():
                # Create user with serializer
                serializer_data = {
                    'email': seller_data['email'],
                    'password': password,
                    'profile': {
                        'name': seller_data['name'],
                        'surname': seller_data['surname'],
                        'age': seller_data['age']
                    }
                }

                serializer = UserSerializer(data=serializer_data)
                if serializer.is_valid():
                    user = serializer.save()

                    # Create seller account
                    AddsAccount.objects.create(
                        user=user,
                        account_type=seller_data['account_type'],
                        role=seller_data['role'],
                        organization_name=seller_data['organization_name'],
                        stats_enabled=True
                    )

                    self.stdout.write(f'✅ Seller account created: {seller_data["email"]}')
                else:
                    self.stdout.write(f'❌ Error creating seller {seller_data["email"]}: {serializer.errors}')
            else:
                self.stdout.write(f'ℹ️  Seller already exists: {seller_data["email"]}')

    def _print_user_summary(self):
        """Print summary of created users."""
        self.stdout.write('\n📊 Test Users Summary:')
        self.stdout.write('=' * 50)
        
        # Superuser
        self.stdout.write('👑 SUPERUSER:')
        self.stdout.write('   Email: admin@autoria.com')
        self.stdout.write('   Password: 12345678')
        self.stdout.write('   Role: Full admin access')
        
        # Staff
        self.stdout.write('\n👔 STAFF USERS:')
        staff_emails = [
            'manager@autoria.com',
            'moderator@autoria.com',
            'support@autoria.com'
        ]
        for email in staff_emails:
            self.stdout.write(f'   Email: {email}')
            self.stdout.write('   Password: 12345678')
        
        # Regular users
        self.stdout.write('\n👤 REGULAR USERS (Buyers):')
        regular_emails = [
            'buyer1@gmail.com',
            'buyer2@ukr.net',
            'buyer3@i.ua',
            'test.user@example.com'
        ]
        for email in regular_emails:
            self.stdout.write(f'   Email: {email}')
            self.stdout.write('   Password: 12345678')
        
        # Sellers
        self.stdout.write('\n🏪 SELLER ACCOUNTS:')
        seller_emails = [
            'seller1@gmail.com (Private seller)',
            'dealer@autohouse.com (Premium dealer)',
            'salon@carsalon.ua (Premium salon)'
        ]
        for email in seller_emails:
            self.stdout.write(f'   Email: {email}')
            self.stdout.write('   Password: 12345678')
        
        self.stdout.write('\n💡 Usage:')
        self.stdout.write('   - Use superuser for admin panel access')
        self.stdout.write('   - Use staff users for moderation features')
        self.stdout.write('   - Use regular users for buyer functionality')
        self.stdout.write('   - Use seller accounts for creating car ads')
        self.stdout.write('=' * 50)
