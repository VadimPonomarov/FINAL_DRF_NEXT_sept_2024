# 🔐 Backend Encryption Scripts

Утиліти для шифрування API ключів у Django backend.

## 📁 Файли

### `encrypt_keys_for_backend.py`
Утиліта для шифрування API ключів з використанням Django SECRET_KEY.

**Використання:**
```bash
# З root директорії проекту
python backend/scripts/encrypt_keys_for_backend.py
```

**Що робить:**
- Шифрує API ключі з використанням Fernet алгоритму
- Використовує Django SECRET_KEY як базу для ключа шифрування
- Генерує зашифровані ключі з префіксом `ENCRYPTED_`
- Виводить готові змінні для `env-config/.env.secrets`

**Приклад виводу:**
```bash
ENCRYPTED_TAVILY_API_KEY=Z0FBQUFBQm9uMXlRQVNkSzRBYzUxMHVwY1FMT2JUbGtwMEtCbHk1SUwtYTJvMDR4QzIzVDVQS1Vxck1CVkd4RnNGUXRfNUU4SDc5ZVo4ZTRhTV8xOWVkUjRwLVUzRk9oSlE9PQ==
```

## 🔧 Альтернативний спосіб - Django команда

Також можна використовувати Django management команду:

```bash
# Встановіть змінну середовища
export API_KEY_VALUE="your_secret_key"

# Зашифруйте через Django команду
docker-compose exec app python manage.py encrypt_api_key API_KEY_NAME
```

## 📋 Підтримувані ключі

- `TAVILY_API_KEY` - для AI чат сервісу
- `GOOGLE_CLIENT_SECRET` - для Google API
- `EMAIL_HOST_PASSWORD` - для SMTP
- Будь-які інші API ключі

## 🛡️ Безпека

- Ключі шифруються з використанням Django SECRET_KEY
- Використовується стабільна соль для консистентності
- Алгоритм: Fernet (AES 128 в CBC режимі)
- Зашифровані ключі безпечні для зберігання в Git

## 🔄 Дешифрування

Дешифрування відбувається автоматично в коді через:
- `backend/core/security/key_manager.py`
- `backend/core/security/encryption_service.py`

**Приклад використання:**
```python
from core.security.key_manager import KeyManager

km = KeyManager()
api_key = km.get_key('TAVILY_API_KEY')  # Автоматично дешифровано
```
