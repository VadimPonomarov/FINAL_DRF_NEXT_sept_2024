web: cd backend && python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
worker: cd celery-service && celery -A config worker --loglevel=info
beat: cd celery-service && celery -A config beat --loglevel=info
