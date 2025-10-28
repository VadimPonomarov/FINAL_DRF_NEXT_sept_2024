# 🔐 Налаштування OAuth та Криптозахист Ключів

## 📋 Огляд

Проект використовує **подвійну систему OAuth провайдерів** з **криптозахистом ключів через Fernet** для додаткової безпеки.

> **🎓 ВАЖЛИВО**: Це навчальний проект! Ключі зашифровані для демонстрації best practices.  
> У production використовуйте Hardware Security Modules (HSM) або хмарні Secrets Manager.

---

## 🔐 Криптозахист OAuth Ключів

### Що таке Fernet?

**Fernet** - це специфікація симетричного шифрування, яка забезпечує:
- ✅ **Конфіденційність** - дані зашифровані AES-128-CBC
- ✅ **Автентичність** - HMAC-SHA256 для перевірки цілісності
- ✅ **Часові мітки** - захист від replay атак
- ✅ **Простота** - легко використовувати

### Як працює шифрування в проекті

```javascript
// 1. Генерується Fernet ключ (один раз)
const fernetKey = generateKey();  // 32-byte ключ, Base64 encoded

// 2. Шифруються OAuth секрети
const encrypted = encrypt(plaintext, fernetKey);
// Результат: gAAAAABh4Kc9... (Base64 encoded)

// 3. Зберігаються в .env.local
GOOGLE_CLIENT_ID=gAAAAABh4Kc9...
GOOGLE_CLIENT_SECRET=gAAAAABh4Kc9...
FERNET_KEY=base64_encoded_key

// 4. Розшифровуються при використанні (runtime)
const clientId = decrypt(process.env.GOOGLE_CLIENT_ID, process.env.FERNET_KEY);
```

---

## 🚀 Швидкий старт OAuth

### Крок 1: Отримати Google OAuth ключі

1. **Перейдіть до Google Cloud Console:**  
   https://console.cloud.google.com/

2. **Створіть новий проект** (або виберіть існуючий)

3. **Увімкніть Google+ API:**
   - Перейдіть в "APIs & Services" → "Enable APIs and Services"
   - Знайдіть "Google+ API" → Enable

4. **Створіть OAuth 2.0 Client ID:**
   - "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `AutoRia Local Dev`
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     http://127.0.0.1:3000/api/auth/callback/google
     ```

5. **Збережіть Client ID та Client Secret**

### Крок 2: Зашифрувати ключі

```bash
# Перейти в frontend
cd frontend

# Запустити скрипт шифрування
node scripts/encrypt_nextjs_oauth_keys.cjs
```

**Скрипт запитає:**
```
Enter GOOGLE_CLIENT_ID: <ваш_client_id>
Enter GOOGLE_CLIENT_SECRET: <ваш_client_secret>
Enter NEXTAUTH_SECRET (або Enter для генерації): <або_Enter>
```

**Результат:**
```
✅ Encrypted keys saved to .env.local
✅ Fernet key generated and saved
```

### Крок 3: Перевірити .env.local

```bash
# frontend/.env.local повинен містити:
GOOGLE_CLIENT_ID=gAAAAABh4Kc9...          # Зашифровано
GOOGLE_CLIENT_SECRET=gAAAAABh4Kc9...      # Зашифровано
NEXTAUTH_SECRET=<random_32_char_string>
NEXTAUTH_URL=http://localhost:3000
FERNET_KEY=<base64_encoded_fernet_key>
```

### Крок 4: Запустити проект

```bash
# Повернутися в корінь проекту
cd ..

# Запустити через deploy.py
python deploy.py

# Або вручну
docker-compose up -d
cd frontend && npm run dev
```

### Крок 5: Перевірити OAuth

1. Відкрийти http://localhost:3000
2. Натиснути "Sign In"
3. Вибрати "Sign in with Google"
4. Авторизуватися через Google

---

## 🔄 Подвійна система провайдерів

### Що таке подвійна система?

Проект підтримує **два рівні автентифікації**:

```
┌─────────────────────────────────────────────┐
│  РІВЕНЬ 1: NextAuth (OAuth)                 │
│  ─────────────────────────────────────────  │
│  • Google OAuth 2.0                         │
│  • Email Magic Links                        │
│  • Зберігається: HTTP-only cookie           │
│  • Lifetime: 30 днів                        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  РІВЕНЬ 2: Backend JWT (Django)             │
│  ─────────────────────────────────────────  │
│  • Django REST Framework JWT                │
│  • Access + Refresh tokens                  │
│  • Зберігається: localStorage + Redis       │
│  • Lifetime: 15 хв (access) / 7 днів (refresh) │
└─────────────────────────────────────────────┘
```

### Коли використовується кожен рівень?

**NextAuth (РІВЕНЬ 1):**
- Початкова автентифікація через Google
- Всі Dummy та Backend Management сторінки
- Захист через middleware

**Backend JWT (РІВЕНЬ 2):**
- AutoRia сторінки та API
- CRUD операції з оголошеннями
- Модерація, аналітика, платежі
- Захист через HOC + fetchWithAuth

---

## 🛠️ Робота з ключами

### Розшифрувати існуючі ключі

```bash
cd frontend
node scripts/decrypt_oauth_keys.cjs
```

### Згенерувати новий Fernet ключ

```python
# Python
from cryptography.fernet import Fernet
key = Fernet.generate_key()
print(key.decode())  # Зберегти як FERNET_KEY
```

```javascript
// JavaScript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('base64');
console.log(key);  // Зберегти як FERNET_KEY
```

### Ротація ключів (рекомендується кожні 90 днів)

```bash
# 1. Згенерувати новий Fernet ключ
NEW_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# 2. Перешифрувати всі ключі з новим Fernet ключем
cd frontend
FERNET_KEY=$NEW_KEY node scripts/encrypt_nextjs_oauth_keys.cjs

# 3. Перезапустити frontend
npm run dev
```

---

## 🔒 Best Practices для Production

### 1. Використовуйте Secrets Manager

```yaml
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name prod/autoria/oauth \
  --secret-string '{
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "...",
    "FERNET_KEY": "..."
  }'
```

```python
# Завантаження в Django
import boto3
import json

def get_oauth_secrets():
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId='prod/autoria/oauth')
    return json.loads(response['SecretString'])
```

### 2. Не комітьте .env.local в Git

```bash
# .gitignore
frontend/.env.local
frontend/.env.production
.env.secrets
```

### 3. Різні ключі для різних середовищ

```
Development:  FERNET_KEY_DEV
Staging:      FERNET_KEY_STAGING  
Production:   FERNET_KEY_PROD
```

### 4. Моніторинг та аудит

```python
# Логування використання ключів
import logging

logger.info(f"OAuth key decrypted: {timestamp}, user: {user_id}")
```

### 5. Rate Limiting для OAuth endpoints

```nginx
# nginx.conf
location /api/auth/ {
    limit_req zone=auth_limit burst=5;
}
```

---

## 🆘 Troubleshooting

### Помилка: "Invalid Fernet key"

**Причина:** Невалідний або пошкоджений FERNET_KEY

**Рішення:**
```bash
# Згенерувати новий ключ
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Перешифрувати OAuth ключі
cd frontend
node scripts/encrypt_nextjs_oauth_keys.cjs
```

### Помилка: "OAuth callback mismatch"

**Причина:** URL в Google Console не співпадає з вашим

**Рішення:**
1. Перевірити Authorized redirect URIs в Google Console
2. Переконатися що є `http://localhost:3000/api/auth/callback/google`
3. Для production додати `https://yourdomain.com/api/auth/callback/google`

### Помилка: "NextAuth session not found"

**Причина:** Cookie сесії не створюється або видаляється

**Рішення:**
```bash
# frontend/.env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<мінімум_32_символи>

# Для production
NEXTAUTH_URL=https://yourdomain.com
SECURE_COOKIES=true
```

---

## 📚 Додаткові ресурси

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Cryptography Fernet](https://cryptography.io/en/latest/fernet/)
- [OWASP OAuth Security](https://owasp.org/www-community/vulnerabilities/OAuth)

---

**Назад до:** [Головний README](../README.md)
