import os
import sys
import threading
import traceback

sys.path.insert(0, '/var/task')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_vercel')
os.environ['RUN_SEEDS'] = 'false'
os.environ['IS_DOCKER'] = 'false'

_django_app = None
_init_error = None
_init_event = threading.Event()


def _setup():
    global _django_app, _init_error
    try:
        import django
        django.setup()
        from django.core.management import call_command
        call_command('migrate', '--noinput', verbosity=0)
        
        # Create basic users (SQLite is ephemeral on Vercel)
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            # Always create users since SQLite resets on cold start
            if User.objects.count() == 0:
                # Create superuser
                admin = User.objects.create_superuser(
                    email='admin@autoria.com',
                    password='admin123',
                    first_name='Admin',
                    last_name='User'
                )
                # Create test users with g4f fallback
                try:
                    # Try g4f for realistic data
                    import g4f
                    from g4f.client import Client
                    client = Client()
                    
                    # Generate user data with g4f
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": "Generate 3 realistic Ukrainian user profiles in JSON format with fields: email, first_name, last_name, phone. Make emails unique."}],
                        timeout=5
                    )
                    
                    import json
                    users_data = json.loads(response.choices[0].message.content)
                    
                    for user_data in users_data[:3]:
                        User.objects.create_user(
                            email=user_data.get('email', f'user{User.objects.count()}@test.com'),
                            password='test123',
                            first_name=user_data.get('first_name', 'Test'),
                            last_name=user_data.get('last_name', 'User')
                        )
                    print(f"Created {len(users_data)} users with g4f")
                    
                except Exception as g4f_error:
                    print(f"g4f failed: {g4f_error}, using fallback data")
                    # Fallback to predefined users
                    fallback_users = [
                        {'email': 'ivan@test.com', 'first_name': 'Іван', 'last_name': 'Петренко'},
                        {'email': 'maria@test.com', 'first_name': 'Марія', 'last_name': 'Коваленко'},
                        {'email': 'oleh@test.com', 'first_name': 'Олег', 'last_name': 'Шевченко'},
                    ]
                    for user_data in fallback_users:
                        User.objects.create_user(
                            email=user_data['email'],
                            password='test123',
                            first_name=user_data['first_name'],
                            last_name=user_data['last_name']
                        )
                    print("Created fallback users")
                
                print(f"Total users created: {User.objects.count()}")
        except Exception as e:
            print(f"User creation error: {e}")
        
        from django.core.wsgi import get_wsgi_application
        _django_app = get_wsgi_application()
        _init_event.set()
        # Seed data in background after app is ready
        def _seed():
            try:
                os.environ['RUN_SEEDS'] = 'true'
                call_command('init_project_data', '--force', verbosity=0)
            except Exception as e:
                print(f"Seed error: {e}")
        threading.Thread(target=_seed, daemon=True).start()
    except Exception:
        _init_error = traceback.format_exc()
        _init_event.set()
        print(f"INIT ERROR:\n{_init_error}")


threading.Thread(target=_setup, daemon=True).start()


def app(environ, start_response):
    _init_event.wait(timeout=9)
    if _init_error:
        body = f"Init Error:\n{_init_error}".encode()
        start_response('200 OK', [('Content-Type', 'text/plain'), ('Content-Length', str(len(body)))])
        return [body]
    if _django_app is None:
        body = b'{"status":"warming_up","message":"Backend initializing, retry in a few seconds"}'
        start_response('503 Service Unavailable', [('Content-Type', 'application/json'), ('Content-Length', str(len(body)))])
        return [body]
    return _django_app(environ, start_response)
