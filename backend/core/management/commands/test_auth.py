"""
Django management command for testing authentication and tokens.
Usage: python manage.py test_auth --token <access_token>
"""

import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.test import Client


class Command(BaseCommand):
    help = 'Test authentication tokens and API endpoints'

    def add_arguments(self, parser):
        parser.add_argument(
            '--token',
            type=str,
            help='Access token to test',
        )
        parser.add_argument(
            '--refresh-token',
            type=str,
            help='Refresh token to test',
        )
        parser.add_argument(
            '--load-from-file',
            type=str,
            help='Load tokens from saved file (email)',
        )
        parser.add_argument(
            '--test-all',
            action='store_true',
            help='Test all available endpoints',
        )

    def handle(self, *args, **options):
        access_token = options.get('token')
        refresh_token = options.get('refresh_token')
        load_from_file = options.get('load_from_file')
        
        # Load tokens from file if specified
        if load_from_file:
            tokens = self.load_tokens_from_file(load_from_file)
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
        
        if not access_token:
            raise CommandError('Access token is required. Use --token, --load-from-file, or login first')
        
        self.stdout.write(self.style.SUCCESS('=== Testing Authentication ==='))
        
        # Test access token
        self.test_access_token(access_token)
        
        # Test refresh token if provided
        if refresh_token:
            self.test_refresh_token(refresh_token)
        
        # Test all endpoints if requested
        if options.get('test_all'):
            self.test_all_endpoints(access_token)

    def load_tokens_from_file(self, email):
        """Load tokens from saved file"""
        try:
            filename = f"temp/tokens/tokens_{email}.json"
            if not os.path.exists(filename):
                raise CommandError(f'Token file not found: {filename}')
            
            with open(filename, 'r') as f:
                tokens_data = json.load(f)
            
            self.stdout.write(f'Loaded tokens from: {filename}')
            return tokens_data
            
        except Exception as e:
            raise CommandError(f'Failed to load tokens: {e}')

    def test_access_token(self, access_token):
        """Test access token with various endpoints"""
        client = Client()
        
        test_endpoints = [
            {
                'url': '/api/users/profile/',
                'method': 'GET',
                'name': 'User Profile',
                'description': 'Get current user profile'
            },
            {
                'url': '/api/users/',
                'method': 'GET', 
                'name': 'Users List',
                'description': 'Get users list (may require permissions)'
            },
            {
                'url': '/health',
                'method': 'GET',
                'name': 'Health Check',
                'description': 'Public health check endpoint'
            }
        ]
        
        self.stdout.write(self.style.SUCCESS('\n=== Testing Access Token ==='))
        
        for endpoint in test_endpoints:
            try:
                if endpoint['method'] == 'GET':
                    response = client.get(
                        endpoint['url'],
                        HTTP_AUTHORIZATION=f'Bearer {access_token}'
                    )
                else:
                    response = client.post(
                        endpoint['url'],
                        HTTP_AUTHORIZATION=f'Bearer {access_token}'
                    )
                
                status_icon = '✅' if response.status_code < 400 else '❌'
                self.stdout.write(
                    f"{status_icon} {endpoint['name']}: {response.status_code} - {endpoint['description']}"
                )
                
                # Show response data for successful requests
                if response.status_code == 200:
                    try:
                        data = response.json()
                        if endpoint['name'] == 'User Profile':
                            user_info = data.get('user', data)
                            self.stdout.write(f"   User: {user_info.get('email')} (ID: {user_info.get('id')})")
                    except:
                        pass
                        
            except Exception as e:
                self.stdout.write(f"❌ {endpoint['name']}: Error - {e}")

    def test_refresh_token(self, refresh_token):
        """Test refresh token"""
        client = Client()
        
        self.stdout.write(self.style.SUCCESS('\n=== Testing Refresh Token ==='))
        
        try:
            response = client.post(
                '/api/auth/refresh',
                data=json.dumps({'refresh': refresh_token}),
                content_type='application/json'
            )
            
            if response.status_code == 200:
                data = response.json()
                new_access = data.get('access')
                new_refresh = data.get('refresh')
                
                self.stdout.write('✅ Refresh token is valid')
                self.stdout.write(f'New access token: {new_access[:50]}...')
                if new_refresh:
                    self.stdout.write(f'New refresh token: {new_refresh[:50]}...')
                
                # Test new access token
                self.stdout.write('\n=== Testing New Access Token ===')
                test_response = client.get(
                    '/api/users/profile/',
                    HTTP_AUTHORIZATION=f'Bearer {new_access}'
                )
                
                if test_response.status_code == 200:
                    self.stdout.write('✅ New access token works')
                else:
                    self.stdout.write('❌ New access token failed')
                    
            else:
                self.stdout.write(f'❌ Refresh failed: {response.status_code}')
                try:
                    error_data = response.json()
                    self.stdout.write(f'Error: {error_data}')
                except:
                    pass
                    
        except Exception as e:
            self.stdout.write(f'❌ Refresh test failed: {e}')

    def test_all_endpoints(self, access_token):
        """Test all available API endpoints"""
        client = Client()
        
        self.stdout.write(self.style.SUCCESS('\n=== Testing All Endpoints ==='))
        
        # Get API documentation to find all endpoints
        try:
            response = client.get('/api/doc/?format=json')
            if response.status_code == 200:
                api_spec = response.json()
                paths = api_spec.get('paths', {})
                
                self.stdout.write(f'Found {len(paths)} API endpoints:')
                
                for path, methods in paths.items():
                    for method, details in methods.items():
                        if method.upper() in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
                            summary = details.get('summary', 'No description')
                            self.stdout.write(f'  {method.upper()} {path} - {summary}')
                            
            else:
                self.stdout.write('❌ Could not fetch API documentation')
                
        except Exception as e:
            self.stdout.write(f'❌ Failed to test all endpoints: {e}')

    def show_token_info(self, access_token):
        """Show information about the token"""
        try:
            import jwt
            from datetime import datetime
            
            # Decode token without verification to see payload
            decoded = jwt.decode(access_token, options={"verify_signature": False})
            
            self.stdout.write(self.style.SUCCESS('\n=== Token Information ==='))
            self.stdout.write(f'User ID: {decoded.get("user_id")}')
            self.stdout.write(f'Token Type: {decoded.get("token_type")}')
            
            # Show expiration
            exp = decoded.get('exp')
            if exp:
                exp_date = datetime.fromtimestamp(exp)
                self.stdout.write(f'Expires: {exp_date}')
                
                # Check if expired
                if datetime.now() > exp_date:
                    self.stdout.write('❌ Token is expired')
                else:
                    self.stdout.write('✅ Token is valid')
                    
        except Exception as e:
            self.stdout.write(f'Could not decode token: {e}')
