# 🛠️ Утилиты проекта

Этот каталог содержит вспомогательные утилиты для обслуживания и диагностики проекта.

## 📋 Утилиты в этом каталоге

### 🗄️ `init_minio.py` - Инициализация MinIO
**Назначение:** Создание и настройка bucket'ов в MinIO

**Что делает:**
- Подключается к MinIO серверу
- Создает необходимые bucket'ы для проекта
- Настраивает политики доступа
- Проверяет доступность сервиса

**Запуск:**
```bash
# Из Docker контейнера (рекомендуется)
docker-compose exec app python scripts/utils/init_minio.py

# Локально
cd backend
python scripts/utils/init_minio.py
```

---

### 🗄️ `init_minio.sh` - Bash версия инициализации MinIO
**Назначение:** То же что `init_minio.py`, но для Linux/macOS

**Что делает:**
- Использует MinIO Client (mc)
- Создает bucket'ы через командную строку
- Подходит для shell скриптов

**Запуск:**
```bash
cd backend/scripts/utils
chmod +x init_minio.sh
./init_minio.sh
```

---

### 📁 `check_media.py` - Проверка медиа файлов
**Назначение:** Диагностика состояния медиа файлов

**Что делает:**
- Сканирует папку media на наличие файлов
- Проверяет целостность файлов
- Находит потерянные или поврежденные файлы
- Генерирует подробный отчет

**Запуск:**
```bash
# Из Docker контейнера
docker-compose exec app python scripts/utils/check_media.py

# Локально
cd backend
python scripts/utils/check_media.py
```

---

### 🧪 `run_tests.bat` - Запуск тестов (Windows)
**Назначение:** Автоматизированный запуск тестов на Windows

**Что делает:**
- Запускает Django тесты
- Проверяет покрытие кода
- Генерирует отчеты в HTML формате

**Запуск:**
```cmd
cd backend\scripts\utils
run_tests.bat
```

---

## 🚀 Общие инструкции по запуску

### Из Docker контейнера (Рекомендуется):
```bash
# Войти в контейнер
docker-compose exec app bash

# Запустить утилиту
python scripts/utils/init_minio.py
python scripts/utils/check_media.py
```

### Локально:
```bash
# Активировать виртуальное окружение
cd backend
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Запустить утилиту
python scripts/utils/init_minio.py
```

---

## 🔍 Диагностика проблем

### MinIO не доступен:
```bash
# Проверить статус MinIO
curl http://localhost:9000/minio/health/live

# Перезапустить MinIO
docker-compose restart minio
```

### Проблемы с медиа файлами:
```bash
# Проверить права доступа
docker-compose exec app ls -la media/

# Очистить временные файлы
docker-compose exec app find media/ -name "*.tmp" -delete
```

---

**💡 Совет:** Всегда читайте вывод утилит и проверяйте результаты их работы!
