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
