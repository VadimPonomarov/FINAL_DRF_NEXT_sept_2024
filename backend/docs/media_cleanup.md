# Очистка временных медиа-файлов

В проекте используется библиотека `g4f` (GPT4Free) для генерации изображений. Эта библиотека создает директорию `backend/generated_media`, где хранит временные файлы изображений.

## Автоматическая очистка

Для очистки этой директории от старых файлов создана специальная Django management команда.

### Ручной запуск

Для ручного запуска очистки используйте:

```bash
# Удалить файлы старше 7 дней (значение по умолчанию)
python manage.py clean_generated_media

# Удалить файлы старше 30 дней
python manage.py clean_generated_media --days=30

# Показать, какие файлы будут удалены, без фактического удаления
python manage.py clean_generated_media --dry-run
```

### Настройка автоматического запуска

#### Через Cron (Linux/macOS)

Добавьте задачу в crontab для запуска очистки раз в неделю:

```bash
# Редактировать crontab
crontab -e

# Добавить строку (запуск каждое воскресенье в 3:00)
0 3 * * 0 cd /path/to/your/project && /path/to/your/venv/bin/python manage.py clean_generated_media
```

#### Через Планировщик заданий (Windows)

1. Откройте Планировщик заданий Windows
2. Создайте новую задачу
3. Настройте запуск скрипта:
   ```
   cmd.exe /c "cd /d D:\path\to\your\project && python manage.py clean_generated_media"
   ```
4. Настройте расписание (например, еженедельно)

#### Через Docker

Если вы используете Docker, добавьте в `docker-compose.yml` сервис для периодической очистки:

```yaml
services:
  # ... другие сервисы
  
  cleanup:
    build:
      context: ./backend
    volumes:
      - ./backend:/app
    environment:
      # ... те же переменные окружения, что и для основного приложения
    command: >
      sh -c "while true; do python manage.py clean_generated_media; sleep 604800; done"
    depends_on:
      - app
```

## Примечания

- Директория `generated_media` создается автоматически библиотекой `g4f` при необходимости
- Удаление файлов из этой директории безопасно, так как это временное хранилище
- Рекомендуется добавить директорию `backend/generated_media` в `.gitignore`, чтобы временные файлы не попадали в репозиторий
