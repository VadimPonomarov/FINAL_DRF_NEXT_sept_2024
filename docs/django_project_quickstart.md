# Django Project Quickstart (Poetry + Docker Compose + PostgreSQL + HttpOnly Cookies)

> Цель: создать минимальный Django-проект за 5–10 минут с использованием Poetry, Docker Compose и собственной папки `modules` c `load_django.py`, а также проверить подключение к PostgreSQL через отдельные скрипты. Проект настроен для работы с httpOnly cookies аутентификацией.

## 0. Предварительные условия

1. Установлен Docker Desktop и поддержка Docker Compose v2.
2. Установлен Python 3.10+.
3. Установлен Poetry (`pip install poetry`).
4. В терминале используется PowerShell (Windows) или оболочка Unix (macOS/Linux).

## 1. Создание структуры проекта

```bash
# 1.1 Создаём папку проекта и переходим в неё
mkdir my_django_project
cd my_django_project

# 1.2 Инициализируем Poetry-проект
poetry init -n --python "^3.10"

# 1.3 Устанавливаем зависимости
poetry add django djangorestframework psycopg2-binary python-dotenv djangorestframework-simplejwt
poetry add --group dev black isort flake8

# 1.4 Создаём базовую структуру каталогов
mkdir -p modules scripts
```

## 2. Docker Compose и Dockerfile

```yaml
# 2.1 Создаём файл docker-compose.yml в корне проекта
version: '3.9'
services:
  db:
    image: postgres:14
    restart: always
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/code
    ports:
      - "8000:8000"
    depends_on:
      - db
    env_file:
      - .env

volumes:
  postgres_data:
```

```dockerfile
# 2.2 Создаём Dockerfile
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /code

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock* ./
RUN pip install poetry \
 && poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi

COPY . .
```

## 3. Файл окружения

```bash
# 3.1 Создаём .env в корне проекта
cat <<"EOF" > .env
DEBUG=1
SECRET_KEY=replace_me
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1 [::1]
SQL_ENGINE=django.db.backends.postgresql
SQL_DATABASE=mydb
SQL_USER=myuser
SQL_PASSWORD=mypassword
SQL_HOST=db
SQL_PORT=5432
EOF
```

> **Важно:** `SECRET_KEY` замените на произвольную строку перед публикацией.

## 4. Создание Django-проекта и приложения

```bash
# 4.1 Создаём проект
poetry run django-admin startproject config .

# 4.2 Создаём приложение parser_app
poetry run python manage.py startapp parser_app
```

## 5. Настройки Django (config/settings.py)

1. Подключаем `.env` и настраиваем БД.
2. Регистрируем приложение `parser_app`.

```python
# добавляем в начало файла
from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# базовые настройки остаются без изменений

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'parser_app',
]

DATABASES = {
    'default': {
        'ENGINE': os.getenv('SQL_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('SQL_DATABASE', BASE_DIR / 'db.sqlite3'),
        'USER': os.getenv('SQL_USER', ''),
        'PASSWORD': os.getenv('SQL_PASSWORD', ''),
        'HOST': os.getenv('SQL_HOST', ''),
        'PORT': os.getenv('SQL_PORT', ''),
    }
}
```

## 6. Модель для проверки (parser_app/models.py)

```python
from django.db import models


class TestRecord(models.Model):
    title = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.title
```

После создания модели выполняем миграции (см. шаг 9).

## 7. Файл `modules/load_django.py`

```python
"""Helper for standalone scripts to load Django settings."""

from pathlib import Path
import os
import sys
import django


def setup_django() -> None:
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.append(str(project_root))

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
```

## 8. Скрипты проверки подключения к БД

```python
# scripts/write_record.py
from modules.load_django import setup_django


def main() -> None:
    setup_django()
    from parser_app.models import TestRecord

    obj = TestRecord.objects.create(title="Hello from script")
    print(f"Created: {obj} (id={obj.pk})")


if __name__ == "__main__":
    main()
```

```python
# scripts/read_records.py
from modules.load_django import setup_django


def main() -> None:
    setup_django()
    from parser_app.models import TestRecord

    records = TestRecord.objects.all()
    print("Records in DB:")
    for record in records:
        print(f"- {record} (created_at={record.created_at:%Y-%m-%d %H:%M:%S})")


if __name__ == "__main__":
    main()
```

## 9. Запуск Docker и проверка

```bash
# 9.1 Поднимаем контейнеры (создаёт web + db)
docker compose up -d

# 9.2 Применяем миграции
docker compose exec web python manage.py makemigrations parser_app
docker compose exec web python manage.py migrate

# 9.3 Проверяем запись и чтение
docker compose exec web python scripts/write_record.py
docker compose exec web python scripts/read_records.py
```

## 10. Завершение работы

```bash
# Останавливаем и удаляем контейнеры
docker compose down
```

## 11. Проверка чек-листа (под проект <10 минут)

1. Инициализация Poetry + установка зависимостей.
2. Создание Django проекта + `parser_app`.
3. Создание `modules/load_django.py`.
4. Настройка БД в Docker + `.env`.
5. Миграции и запуск.
6. Скрипты чтения/записи — работают без ошибок.

## 12. Возможные проблемы и решение

| Проблема                                   | Решение                                                          |
|--------------------------------------------|------------------------------------------------------------------|
| Django не видит настройки из `.env`        | Убедитесь, что `load_dotenv(BASE_DIR / '.env')` вызывается до чтения переменных. |
| Ошибка подключения к PostgreSQL            | Проверьте, что сервис `db` запущен, и используйте команду `docker compose ps`.
| Скрипт не видит Django-модели              | Проверьте путь в `modules/load_django.py`, убедитесь, что `modules` лежит рядом с `manage.py`.
| `poetry install` внутри Docker завершается с ошибкой | Убедитесь, что файл `poetry.lock` существует (если нет — создайте: `poetry lock`). |

---

Этот файл можно открыть во время стажировки и за 5–10 минут развернуть новый Django-проект по шагам.
