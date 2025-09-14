"""
Django management command for user registration using our API endpoints.
Usage: python manage.py register_user --email user@example.com --password mypassword
"""

import getpass
import json
from django.core.management.base import BaseCommand, CommandError
from django.test import Client
from django.urls import reverse
from django.contrib.auth import get_user_model


User = get_user_model()


class Command(BaseCommand):
    help = 'Register a new user using our registration API endpoint'

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
        
        return self.register_user(
            email=email,
            password=password,
            first_name=options.get('first_name', ''),
            last_name=options.get('last_name', ''),
            phone=options.get('phone', ''),
        )

    def handle_interactive(self):
        """Interactive mode for user registration"""
        self.stdout.write(self.style.SUCCESS('=== Interactive User Registration ==='))
        
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
        
        return self.register_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
        )

    def register_user(self, email, password, first_name='', last_name='', phone=''):
        """Register user using our API endpoint"""
        try:
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                raise CommandError(f'User with email {email} already exists')
            
            # Prepare registration data
            registration_data = {
                'email': email,
                'password': password,
                'password_confirm': password,  # Required by our registration endpoint
                'first_name': first_name,
                'last_name': last_name,
            }

            # Add phone if provided
            if phone:
                registration_data['phone'] = phone
            
            # Create test client
            client = Client()
            
            # Make registration request to our API
            response = client.post(
                '/api/users/create',  # Our registration endpoint
                data=json.dumps(registration_data),
                content_type='application/json'
            )
            
            # Handle response
            if response.status_code == 201:
                response_data = response.json()
                
                self.stdout.write(self.style.SUCCESS('\n=== User Registered Successfully ==='))
                self.stdout.write(f'User ID: {response_data.get("id")}')
                self.stdout.write(f'Email: {response_data.get("email")}')
                self.stdout.write(f'Name: {response_data.get("first_name", "")} {response_data.get("last_name", "")}'.strip())
                if response_data.get('phone'):
                    self.stdout.write(f'Phone: {response_data.get("phone")}')
                
                self.stdout.write(self.style.SUCCESS('\n=== Next Steps ==='))
                self.stdout.write('Now you can login using:')
                self.stdout.write(f'python manage.py login_user --email {email} --password <password>')
                
                return response_data
                
            else:
                # Handle registration errors
                try:
                    error_data = response.json()
                    error_messages = []
                    
                    for field, errors in error_data.items():
                        if isinstance(errors, list):
                            error_messages.extend([f"{field}: {error}" for error in errors])
                        else:
                            error_messages.append(f"{field}: {errors}")
                    
                    raise CommandError(f'Registration failed: {"; ".join(error_messages)}')
                except json.JSONDecodeError:
                    raise CommandError(f'Registration failed with status {response.status_code}: {response.content.decode()}')
            
        except Exception as e:
            if isinstance(e, CommandError):
                raise
            raise CommandError(f'Error during registration: {e}')

    def get_user_info(self, user_id):
        """Get additional user information"""
        try:
            user = User.objects.get(id=user_id)
            return {
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'date_joined': user.date_joined.isoformat(),
            }
        except User.DoesNotExist:
            return {}
