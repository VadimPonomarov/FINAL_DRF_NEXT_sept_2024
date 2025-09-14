# 🔐 API Key Security System

Система безопасного хранения и использования API ключей с шифрованием для защиты от несанкционированного использования в GitHub.

## 🎯 Назначение

- **Шифрование API ключей** для безопасного хранения в `.env.local`
- **Автоматическая дешифрация** при использовании в коде
- **Защита от утечек** при сохранении кода в GitHub
- **Централизованное управление** всеми API ключами

## 📁 Структура

```
backend/core/security/
├── __init__.py                 # Экспорты модуля
├── encryption_service.py       # Сервис шифрования/дешифрации
├── key_manager.py              # Менеджер API ключей
├── api_key_descriptor.py       # Дескриптор для ленивой дешифрации
├── key_encryption_tool.py      # Утилита для шифрования ключей
└── README.md                   # Эта документация
```

## 🔧 Использование

### 1. Шифрование API ключей

#### Интерактивный режим:
```bash
cd backend
python core/security/key_encryption_tool.py --interactive
```

#### Шифрование одного ключа:
```bash
python core/security/key_encryption_tool.py \
  --key-name GOOGLE_MAPS_API_KEY \
  --api-key "your-actual-api-key-here" \
  --output .env.local
```

#### Проверка статуса ключей:
```bash
python core/security/key_encryption_tool.py --status
```

### 2. Использование в коде

#### Через дескриптор (рекомендуется):
```python
from core.security import EncryptedAPIKey

class MySettings:
    GOOGLE_MAPS_API_KEY = EncryptedAPIKey('GOOGLE_MAPS_API_KEY', required=True)

settings = MySettings()
api_key = settings.GOOGLE_MAPS_API_KEY  # Автоматически дешифруется
```

#### Через менеджер ключей:
```python
from core.security import key_manager

# Получить ключ с fallback к обычному
api_key = key_manager.get_key('GOOGLE_MAPS_API_KEY')

# Получить только зашифрованный ключ
api_key = key_manager.get_key('GOOGLE_MAPS_API_KEY', fallback_to_plain=False)

# Удобные свойства
google_key = key_manager.google_maps_api_key
```

#### Прямое использование сервиса:
```python
from core.security import encryption_service

# Шифрование
encrypted = encryption_service.encrypt_api_key("my-secret-key", "MY_API_KEY")

# Дешифрация
decrypted = encryption_service.decrypt_api_key(encrypted, "MY_API_KEY")
```

### 3. Настройка окружения

#### Создайте `.env.local`:
```bash
cp .env.local.example .env.local
```

#### Добавьте зашифрованные ключи:
```env
# Зашифрованные API ключи
ENCRYPTED_GOOGLE_MAPS_API_KEY="gAAAAABh..."
ENCRYPTED_OPENAI_API_KEY="gAAAAABh..."

# Django SECRET_KEY (используется для шифрования)
SECRET_KEY="your-django-secret-key"
```

## 🔒 Безопасность

### Алгоритм шифрования
- **Fernet** (симметричное шифрование)
- **PBKDF2** для деривации ключа из Django SECRET_KEY
- **100,000 итераций** для защиты от brute force
- **Base64** кодирование для хранения

### Ключ шифрования
- Генерируется из Django `SECRET_KEY`
- Использует стабильную соль для консистентности
- Не хранится в коде или файлах

### Кэширование
- Дешифрованные ключи кэшируются в памяти
- Кэш очищается при перезапуске приложения
- Можно очистить кэш вручную: `key_manager.clear_cache()`

## 📋 Поддерживаемые API ключи

### Google Services
- `GOOGLE_MAPS_API_KEY` - Google Maps API
- `GOOGLE_API_KEY` - Google API
- `GOOGLE_SEARCH_ENGINE_ID` - Google Custom Search
- `GOOGLE_CLIENT_ID` - Google OAuth
- `GOOGLE_CLIENT_SECRET` - Google OAuth

### Microsoft Services
- `BING_API_KEY` - Bing Search API

### Other APIs
- `RIZA_API_KEY` - Riza.io API
- `OPENAI_API_KEY` - OpenAI API

### Storage Services
- `MINIO_ACCESS_KEY` - MinIO Access Key
- `MINIO_SECRET_KEY` - MinIO Secret Key

### Email Services
- `EMAIL_HOST_PASSWORD` - Email Host Password
- `SENDGRID_API_KEY` - SendGrid API

### Social Auth
- `FACEBOOK_APP_SECRET` - Facebook App Secret
- `TWITTER_API_SECRET` - Twitter API Secret
- `GITHUB_CLIENT_SECRET` - GitHub Client Secret

## 🚨 Важные замечания

### ⚠️ Не коммитьте в Git:
- `.env.local` - содержит зашифрованные ключи
- Реальные API ключи в любом виде

### ✅ Безопасно коммитить:
- `.env.local.example` - пример без реальных ключей
- Код с использованием `EncryptedAPIKey`
- Зашифрованные ключи (но лучше не надо)

### 🔄 Fallback механизм:
Система автоматически пытается:
1. Найти зашифрованный ключ (`ENCRYPTED_*`)
2. Если не найден, использует обычный ключ
3. Если и его нет, возвращает `None`

## 🛠️ Разработка

### Добавление нового API ключа:

1. **Добавьте в `key_manager.py`:**
```python
self._encrypted_keys = {
    # ...
    'NEW_API_KEY': 'ENCRYPTED_NEW_API_KEY',
}
```

2. **Добавьте в `key_encryption_tool.py`:**
```python
self.known_keys = {
    # ...
    'NEW_API_KEY': 'Description of New API Key',
}
```

3. **Добавьте в `apis.py`:**
```python
NEW_API_KEY = EncryptedAPIKey('NEW_API_KEY')
```

4. **Обновите `.env.local.example`:**
```env
ENCRYPTED_NEW_API_KEY="your-encrypted-new-api-key-here"
```

### Тестирование:
```python
from core.security import key_manager

# Проверить доступность ключа
is_available = key_manager.validate_key('GOOGLE_MAPS_API_KEY')

# Получить статус всех ключей
status = key_manager.list_available_keys()
```

## 🔍 Отладка

### Логирование:
```python
import logging
logging.getLogger('core.security').setLevel(logging.DEBUG)
```

### Проверка шифрования:
```python
from core.security import encryption_service

# Проверить, зашифрованы ли данные
is_encrypted = encryption_service.is_encrypted("gAAAAABh...")
```

### Очистка кэша:
```python
from core.security import key_manager
key_manager.clear_cache()
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте, что `SECRET_KEY` установлен
2. Убедитесь, что зашифрованные ключи корректны
3. Проверьте логи на ошибки дешифрации
4. Используйте `--status` для диагностики
