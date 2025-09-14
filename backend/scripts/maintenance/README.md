# 🔧 Утилиты обслуживания

Этот каталог содержит утилиты для обслуживания и поддержки проекта в рабочем состоянии.

## 📋 Утилиты в этом каталоге

### 🧹 `cleanup.py` - Очистка системы
**Назначение:** Комплексная очистка системы от временных и устаревших файлов

**Что делает:**
- Удаляет старые временные файлы
- Очищает устаревшие логи
- Удаляет неиспользуемые медиа файлы
- Оптимизирует базу данных
- Очищает кэш Redis (опционально)
- Удаляет старые сессии

**Запуск:**
```bash
# Из Docker контейнера (рекомендуется)
docker-compose exec app python scripts/maintenance/cleanup.py

# Локально
cd backend
python scripts/maintenance/cleanup.py
```

**Результат:**
```
🧹 Начинаем очистку системы...
📁 Удалено 15 временных файлов
📄 Очищено 3 старых лог-файла
🗂️ Удалено 7 неиспользуемых медиа файлов
🗄️ Оптимизирована база данных
✅ Очистка завершена успешно!
```

**Параметры:**
```bash
# Только временные файлы
python scripts/maintenance/cleanup.py --temp-only

# Только логи
python scripts/maintenance/cleanup.py --logs-only

# Только медиа файлы
python scripts/maintenance/cleanup.py --media-only

# Сухой прогон (показать что будет удалено)
python scripts/maintenance/cleanup.py --dry-run

# Агрессивная очистка (включая кэш)
python scripts/maintenance/cleanup.py --aggressive
```

---

## 🚀 Инструкции по запуску

### Из Docker контейнера (Рекомендуется):
```bash
# Войти в контейнер
docker-compose exec app bash

# Запустить очистку
python scripts/maintenance/cleanup.py
```

### Локально:
```bash
# Активировать виртуальное окружение
cd backend
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Запустить очистку
python scripts/maintenance/cleanup.py
```

---

## ⚠️ Предупреждения и безопасность

### Опасные операции:
- `cleanup.py --aggressive` - может удалить важные кэшированные данные
- Очистка медиа файлов - может удалить файлы, на которые есть ссылки
- Оптимизация БД - может занять много времени на больших базах

### Рекомендации:
1. **Всегда делайте бэкап** перед запуском очистки
2. **Используйте --dry-run** для предварительного просмотра
3. **Запускайте в maintenance окне** для продакшн систем
4. **Мониторьте место на диске** после очистки

### Безопасные операции:
- `cleanup.py --temp-only` - безопасно удаляет только временные файлы
- `cleanup.py --logs-only` - безопасно очищает только старые логи
- `cleanup.py --dry-run` - только показывает, ничего не удаляет

---

## 🔍 Диагностика проблем

### Недостаточно места на диске:
```bash
# Проверить использование диска
docker-compose exec app df -h

# Найти большие файлы
docker-compose exec app find . -type f -size +100M

# Запустить агрессивную очистку
docker-compose exec app python scripts/maintenance/cleanup.py --aggressive
```

### Медленная работа системы:
```bash
# Оптимизировать только БД
docker-compose exec app python scripts/maintenance/cleanup.py --db-only

# Очистить кэш Redis
docker-compose exec app python scripts/maintenance/cleanup.py --cache-only
```

### Проблемы с логами:
```bash
# Очистить только логи
docker-compose exec app python scripts/maintenance/cleanup.py --logs-only

# Проверить размер логов
docker-compose exec app du -sh logs/
```

---

## 🔄 Автоматизация

### Cron задачи:
```bash
# Ежедневная очистка временных файлов в 2:00
0 2 * * * docker-compose exec app python scripts/maintenance/cleanup.py --temp-only

# Еженедельная полная очистка в воскресенье в 3:00
0 3 * * 0 docker-compose exec app python scripts/maintenance/cleanup.py

# Ежемесячная агрессивная очистка в первое число в 4:00
0 4 1 * * docker-compose exec app python scripts/maintenance/cleanup.py --aggressive
```

### Systemd timer (Linux):
```ini
# /etc/systemd/system/cleanup.timer
[Unit]
Description=Daily cleanup
Requires=cleanup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

### Docker health checks:
```yaml
healthcheck:
  test: ["CMD", "python", "scripts/maintenance/cleanup.py", "--health-check"]
  interval: 1h
  timeout: 30s
  retries: 3
```

---

## 📊 Мониторинг

### Метрики для отслеживания:
- Размер временных файлов
- Количество старых логов
- Размер неиспользуемых медиа файлов
- Время выполнения очистки
- Освобожденное место на диске

### Алерты:
- Если очистка не запускалась более 7 дней
- Если временные файлы занимают > 1GB
- Если логи занимают > 500MB
- Если очистка завершилась с ошибкой

---

## 📝 Логирование

Все операции обслуживания логируются:
- **Файл лога:** `logs/maintenance.log`
- **Формат:** timestamp, уровень, операция, результат
- **Ротация:** ежедневно, хранение 30 дней

### Уровни логирования:
- 🟢 **INFO** - обычные операции очистки
- 🟡 **WARNING** - файлы, которые не удалось удалить
- 🔴 **ERROR** - критические ошибки
- 🔵 **DEBUG** - детальная информация (только в debug режиме)

---

**⚠️ Важно:** Утилиты обслуживания могут изменять или удалять данные. Всегда тестируйте на development окружении перед использованием в продакшн!
