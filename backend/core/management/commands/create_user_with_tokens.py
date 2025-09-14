"""
Django management command to create a user and return JWT tokens.
Usage: python manage.py create_user_with_tokens --email user@example.com --password mypassword
"""

import getpass
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


class Command(BaseCommand):
    help = 'Create a new user and return JWT tokens'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='User email address',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='User password',
        )
        parser.add_argument(
            '--first-name',
            type=str,
            help='User first name',
            default='',
        )
        parser.add_argument(
            '--last-name',
            type=str,
            help='User last name',
            default='',
        )
        parser.add_argument(
            '--phone',
            type=str,
            help='User phone number',
            default='',
        )
        parser.add_argument(
            '--is-staff',
            action='store_true',
            help='Make user a staff member',
        )
        parser.add_argument(
            '--is-superuser',
            action='store_true',
            help='Make user a superuser',
        )
        parser.add_argument(
            '--interactive',
            action='store_true',
            help='Use interactive mode to input user data',
        )

    def handle(self, *args, **options):
        if options['interactive']:
            return self.handle_interactive()
        
        email = options.get('email')
        password = options.get('password')
        
        if not email:
            raise CommandError('Email is required. Use --email or --interactive')
        
        if not password:
            raise CommandError('Password is required. Use --password or --interactive')
        
        return self.create_user_and_tokens(
            email=email,
            password=password,
            first_name=options.get('first_name', ''),
            last_name=options.get('last_name', ''),
            phone=options.get('phone', ''),
            is_staff=options.get('is_staff', False),
            is_superuser=options.get('is_superuser', False),
        )

    def handle_interactive(self):
        """Interactive mode for creating user"""
        self.stdout.write(self.style.SUCCESS('=== Interactive User Creation ==='))
        
        # Get user input
        email = input('Email: ').strip()
        if not email:
            raise CommandError('Email cannot be empty')
        
        password = getpass.getpass('Password: ')
        if not password:
            raise CommandError('Password cannot be empty')
        
        password_confirm = getpass.getpass('Confirm password: ')
        if password != password_confirm:
            raise CommandError('Passwords do not match')
        
        first_name = input('First name (optional): ').strip()
        last_name = input('Last name (optional): ').strip()
        phone = input('Phone number (optional): ').strip()
        
        is_staff = input('Is staff? (y/N): ').lower().startswith('y')
        is_superuser = input('Is superuser? (y/N): ').lower().startswith('y')
        
        return self.create_user_and_tokens(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            is_staff=is_staff,
            is_superuser=is_superuser,
        )

    def create_user_and_tokens(self, email, password, first_name='', last_name='', 
                              phone='', is_staff=False, is_superuser=False):
        """Create user and generate JWT tokens"""
        try:
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                raise CommandError(f'User with email {email} already exists')
            
            # Create user
            user_data = {
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'is_staff': is_staff,
                'is_superuser': is_superuser,
            }
            
            # Add phone if the model has this field
            if hasattr(User, 'phone') and phone:
                user_data['phone'] = phone
            
            user = User.objects.create_user(password=password, **user_data)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Display results
            self.stdout.write(self.style.SUCCESS('\n=== User Created Successfully ==='))
            self.stdout.write(f'User ID: {user.id}')
            self.stdout.write(f'Email: {user.email}')
            self.stdout.write(f'Name: {user.first_name} {user.last_name}'.strip())
            if hasattr(user, 'phone') and user.phone:
                self.stdout.write(f'Phone: {user.phone}')
            self.stdout.write(f'Staff: {user.is_staff}')
            self.stdout.write(f'Superuser: {user.is_superuser}')
            
            self.stdout.write(self.style.SUCCESS('\n=== JWT Tokens ==='))
            self.stdout.write(f'Access Token: {access_token}')
            self.stdout.write(f'Refresh Token: {refresh}')
            
            self.stdout.write(self.style.SUCCESS('\n=== Usage Example ==='))
            self.stdout.write('curl -H "Authorization: Bearer <access_token>" http://localhost:8000/api/users/profile/')
            
            return {
                'user_id': user.id,
                'email': user.email,
                'access_token': str(access_token),
                'refresh_token': str(refresh),
            }
            
        except IntegrityError as e:
            raise CommandError(f'Database error: {e}')
        except Exception as e:
            raise CommandError(f'Error creating user: {e}')
