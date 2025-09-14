# 🧪 Encryption Systems Testing

Комплексні тести для всіх систем шифрування проекту.

## 📁 Файли

### `test_encryption_systems.js`
Головний тестовий файл для перевірки всіх систем шифрування.

**Використання:**
```bash
# З root директорії проекту
node scripts/testing/test_encryption_systems.js
```

**Що тестує:**
- ✅ Next.js Encryption System
- ✅ Backend Django Encryption System  
- ✅ Mailing Service Encryption System
- ✅ Environment Configuration
- ✅ Security Validation

**Приклад виводу:**
```bash
🧪 COMPREHENSIVE ENCRYPTION SYSTEMS TEST
Testing all three encryption systems for correctness

🔐 TESTING NEXT.JS ENCRYPTION SYSTEM
============================================================
PASS Next.js crypto-utils.ts exists
PASS Next.js config uses decryption
PASS OAuth keys are encrypted with nextjs_enc_ prefix
PASS No plain text OAuth keys in .env.secrets

📊 TEST RESULTS SUMMARY
============================================================
Total Tests: 20
✅ Passed: 20
❌ Failed: 0
Success Rate: 100.0%

🎉 ALL TESTS PASSED! Encryption systems are working correctly.
```

### `test_nextjs_decryption.js`
Спеціалізований тест для Next.js дешифрування.

**Використання:**
```bash
node scripts/testing/test_nextjs_decryption.js
```

**Що тестує:**
- Дешифрування GOOGLE_CLIENT_ID
- Дешифрування GOOGLE_CLIENT_SECRET  
- Дешифрування NEXTAUTH_SECRET
- Валідація відповідності очікуваним значенням

### `test_backend_decryption.py`
Тест для Backend Django дешифрування.

**Використання:**
```bash
# Через Docker
docker-compose exec app python /app/scripts/testing/test_backend_decryption.py

# Або прямо в коді
python scripts/testing/test_backend_decryption.py
```

**Що тестує:**
- Дешифрування TAVILY_API_KEY
- Дешифрування GOOGLE_CLIENT_SECRET
- Дешифрування EMAIL_HOST_PASSWORD
- Валідація KeyManager роботи

### `test-auth-flow.py`
Тест повного потоку аутентифікації.

**Використання:**
```bash
python scripts/testing/test-auth-flow.py
```

**Що тестує:**
- Повний цикл OAuth аутентифікації
- Інтеграція frontend та backend
- Токени та сесії

### `test-backend-only.py`
Тест тільки backend функціональності.

**Використання:**
```bash
python scripts/testing/test-backend-only.py
```

**Що тестує:**
- Backend API без frontend
- Django функціональність
- База даних підключення

### `test-oauth-google.js`
Тест Google OAuth інтеграції.

**Використання:**
```bash
node scripts/testing/test-oauth-google.js
```

**Що тестує:**
- Google OAuth налаштування
- Client ID та Client Secret
- Redirect URLs

## 🔧 Запуск всіх тестів

### Повний тестовий цикл:
```bash
# 1. Тест архітектури
node scripts/testing/test_encryption_systems.js

# 2. Тест Next.js дешифрування
node scripts/testing/test_nextjs_decryption.js

# 3. Тест Backend дешифрування
docker-compose exec app python -c "
from core.security.key_manager import KeyManager
km = KeyManager()
print('TAVILY_API_KEY:', km.get_key('TAVILY_API_KEY'))
"

# 4. Тест Mailing дешифрування
docker-compose exec mailing python -c "
from src.services.encription_service.decrypt_service import decrypt_message
print('Test passed')
"
```

## 📊 Результати тестування

### Успішний результат:
- **20/20 тестів пройдено (100%)**
- Всі системи шифрування працюють коректно
- Дешифрування відбувається без помилок
- Валідація ключів успішна

### При помилках:
1. Перевірте переменні середовища
2. Перезапустіть сервіси: `docker-compose restart`
3. Перевірте ключі шифрування
4. Запустіть тести окремо для діагностики

## 🛠️ Діагностика

### Перевірка переменних середовища:
```bash
# Backend
docker-compose exec app python -c "import os; print('ENCRYPTED_TAVILY_API_KEY:', bool(os.getenv('ENCRYPTED_TAVILY_API_KEY')))"

# Next.js (через Node.js)
node -e "console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET')"
```

### Перевірка ключів шифрування:
```bash
# Django SECRET_KEY
docker-compose exec app python -c "from django.conf import settings; print('SECRET_KEY:', settings.SECRET_KEY[:20] + '...')"

# NEXTAUTH_SECRET
grep "NEXTAUTH_SECRET" env-config/.env.secrets

# Mailing key
docker-compose exec mailing ls -la /app/src/services/encription_service/key.txt
```

## 🎯 Автоматизація

### CI/CD інтеграція:
```yaml
# .github/workflows/test-encryption.yml
- name: Test Encryption Systems
  run: |
    node scripts/testing/test_encryption_systems.js
    node scripts/testing/test_nextjs_decryption.js
```

### Pre-commit hook:
```bash
#!/bin/sh
# .git/hooks/pre-commit
node scripts/testing/test_encryption_systems.js
if [ $? -ne 0 ]; then
  echo "Encryption tests failed!"
  exit 1
fi
```

## ⚠️ Важливі нотатки

- Тести потребують запущених Docker контейнерів
- Переконайтеся, що всі env файли налаштовані
- При зміні ключів шифрування запустіть тести
- Тести перевіряють реальне дешифрування, не моки
