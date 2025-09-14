"""
Django management command for user login using our API endpoints.
Returns JWT token pair (access + refresh tokens).
Usage: python manage.py login_user --email user@example.com --password mypassword
"""

import getpass
import json
from django.core.management.base import BaseCommand, CommandError
from django.test import Client
from django.contrib.auth import get_user_model


User = get_user_model()


class Command(BaseCommand):
    help = 'Login user and get JWT token pair (access + refresh tokens)'

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
            '--interactive',
            action='store_true',
            help='Use interactive mode to input credentials',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output tokens in JSON format',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Only output the tokens without additional info',
        )

    def handle(self, *args, **options):
        if options['interactive']:
            return self.handle_interactive(
                json_output=options.get('json', False),
                quiet=options.get('quiet', False)
            )

        email = options.get('email')
        password = options.get('password')

        if not email:
            raise CommandError('Email is required. Use --email or --interactive')

        if not password:
            raise CommandError('Password is required. Use --password or --interactive')

        return self.login_user(
            email=email,
            password=password,
            json_output=options.get('json', False),
            quiet=options.get('quiet', False)
        )

    def handle_interactive(self, json_output=False, quiet=False):
        """Interactive mode for user login"""
        if not quiet:
            self.stdout.write(self.style.SUCCESS('=== Interactive User Login ==='))

        # Get user input
        email = input('Email: ').strip()
        if not email:
            raise CommandError('Email cannot be empty')

        password = getpass.getpass('Password: ')
        if not password:
            raise CommandError('Password cannot be empty')

        return self.login_user(
            email=email,
            password=password,
            json_output=json_output,
            quiet=quiet
        )

    def login_user(self, email, password, json_output=False, quiet=False):
        """Login user using our API endpoint and return JWT token pair"""
        try:
            # Check if user exists
            if not User.objects.filter(email=email).exists():
                raise CommandError(f'User with email {email} does not exist')

            # Prepare login data
            login_data = {
                'email': email,
                'password': password,
            }

            # Create test client
            client = Client()

            # Make login request to our API
            response = client.post(
                '/api/auth/login',  # Our login endpoint
                data=json.dumps(login_data),
                content_type='application/json'
            )

            # Handle response
            if response.status_code == 200:
                response_data = response.json()

                # Extract tokens and user data
                access_token = response_data.get('access')
                refresh_token = response_data.get('refresh')
                user_data = response_data.get('user', {})

                # Prepare result
                result = {
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': user_data,
                }

                # Output based on format preference
                if json_output:
                    # JSON output
                    self.stdout.write(json.dumps(result, indent=2))
                elif quiet:
                    # Quiet mode - only tokens
                    self.stdout.write(f'ACCESS_TOKEN={access_token}')
                    self.stdout.write(f'REFRESH_TOKEN={refresh_token}')
                else:
                    # Detailed output
                    self.stdout.write(self.style.SUCCESS('\n=== Login Successful ==='))
                    self.stdout.write(f'User ID: {user_data.get("id")}')
                    self.stdout.write(f'Email: {user_data.get("email")}')
                    name = f'{user_data.get("first_name", "")} {user_data.get("last_name", "")}'.strip()
                    if name:
                        self.stdout.write(f'Name: {name}')
                    if user_data.get('phone'):
                        self.stdout.write(f'Phone: {user_data.get("phone")}')

                    self.stdout.write(self.style.SUCCESS('\n=== JWT Token Pair ==='))
                    self.stdout.write(f'Access Token:  {access_token}')
                    self.stdout.write(f'Refresh Token: {refresh_token}')

                    self.stdout.write(self.style.SUCCESS('\n=== Quick Usage ==='))
                    self.stdout.write('Copy access token for API requests:')
                    self.stdout.write(f'export ACCESS_TOKEN="{access_token}"')
                    self.stdout.write('curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8000/api/users/profile/')

                return result

            else:
                # Handle login errors
                try:
                    error_data = response.json()
                    error_message = error_data.get('detail', 'Login failed')
                    raise CommandError(f'Login failed: {error_message}')
                except json.JSONDecodeError:
                    raise CommandError(f'Login failed with status {response.status_code}: {response.content.decode()}')

        except Exception as e:
            if isinstance(e, CommandError):
                raise
            raise CommandError(f'Error during login: {e}')


