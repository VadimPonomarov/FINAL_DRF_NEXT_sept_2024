# ⚙️ AutoRia - Повне керівництво з налаштування

## 📋 Огляд

Покрокова інструкція налаштування всіх зовнішніх сервісів та API ключів для AutoRia платформи.

---

## 🔐 Система Шифрування та Безпека

### Структура ключів

```
env-config/
├── .env.base          # Базові налаштування (не секретні)
├── .env.secrets       # API ключі (ЗАШИФРОВАНІ)
├── .env.local         # Локальні переопределення
└── .env.docker        # Docker налаштування
```

### Шифрування API ключів

```bash
# 1. Встановити залежності
pip install cryptography python-dotenv

# 2. Зашифрувати ключі
python backend/scripts/encrypt_keys_for_backend.py

# 3. Перевірити
cat env-config/.env.secrets
# Ключі тепер зашифровані через Fernet
```

### Розшифрування (автоматичне)

```python
# backend/config/settings.py
from core.services.encryption_service import decrypt_env_value

# Автоматичне розшифрування при завантаженні
GOOGLE_MAPS_API_KEY = decrypt_env_value(os.getenv('GOOGLE_MAPS_API_KEY'))
```

---

## 🗺️ Google Maps API

### 1. Отримання API ключа

1. Перейти на https://console.cloud.google.com/
2. Створити новий проект або вибрати існуючий
3. Enable APIs:
   - **Geocoding API** (обов'язково)
   - **Maps JavaScript API** (для frontend)
   - **Places API** (опціонально)
4. Credentials → Create credentials → API key
5. Обмежити ключ (Application restrictions)

### 2. Налаштування в проекті

```bash
# env-config/.env.secrets
GOOGLE_MAPS_API_KEY=AIzaSyC...your_key_here
```

```python
# backend/apps/ads/services/geocoding_service.py
import googlemaps

gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

def geocode_address(address):
    result = gmaps.geocode(address)
    return {
        'lat': result[0]['geometry']['location']['lat'],
        'lng': result[0]['geometry']['location']['lng']
    }
```

### 3. Frontend налаштування

```typescript
// frontend/.env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC...your_key_here
```

```tsx
// frontend/src/components/Map/GoogleMap.tsx
import { GoogleMap, useLoadScript } from '@react-google-maps/api';

const { isLoaded } = useLoadScript({
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
});
```

---

## 💰 Валютні API

### PrivatBank API (безкоштовно, без ключа)

```python
# backend/apps/currency/services.py

NBU_API_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange"
PRIVATBANK_API_URL = "https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5"

def fetch_from_nbu(currency='USD'):
    response = requests.get(f"{NBU_API_URL}?valcode={currency}&json")
    return response.json()[0]['rate']
```

**Особливості**:
- Без реєстрації
- Ліміти: ~100 req/day
- Кеш: Redis 24h

---

## 🔑 OAuth 2.0 Налаштування

### DummyJSON (для тестування)

```bash
# env-config/.env.secrets
NEXT_PUBLIC_DUMMY_API_BASE_URL=https://dummyjson.com
```

```typescript
// frontend/src/app/api/helpers.ts
const response = await fetch(`${process.env.NEXT_PUBLIC_DUMMY_API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'emilys', password: 'emilyspass' })
});
```

### Backend OAuth (власна система)

```python
# backend/apps/auth/views/oauth2_views.py

OAUTH_PROVIDERS = {
    'google': {
        'client_id': os.getenv('GOOGLE_CLIENT_ID'),
        'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
        'redirect_uri': 'http://localhost:3000/auth/callback/google'
    }
}
```

---

## 🎨 AI Генерація Зображень (g4f)

### Налаштування

```python
# backend/core/services/ai_image_service.py
from g4f.client import Client

client = Client()

def generate_image(prompt):
    response = client.images.generate(
        model="flux",
        prompt=prompt
    )
    return response.data[0].url
```

**Особливості**:
- **Безкоштовно** (без API ключа)
- Provider: PollinationsAI через g4f
- Ліміти: залежить від provider

---

## 📧 Email Налаштування

### Gmail SMTP

```bash
# env-config/.env.secrets
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_specific_password
```

```python
# backend/config/extra_config/email_config.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
```

### Отримання App Password (Gmail)

1. Google Account → Security
2. 2-Step Verification (увімкнути)
3. App passwords → Generate
4. Використати згенерований пароль

---

## 🌍 i18n Система (Інтернаціоналізація)

### Backend (Django)

```python
# backend/config/extra_config/django_core.py
LANGUAGES = [
    ('uk', 'Українська'),
    ('ru', 'Русский'),
    ('en', 'English'),
]

LANGUAGE_CODE = 'uk'
USE_I18N = True
USE_L10N = True
```

### Frontend (Next.js)

```typescript
// frontend/src/contexts/I18nContext.tsx
const AVAILABLE_LOCALES = ['uk', 'ru', 'en'] as const;

// frontend/src/locales/uk.ts
export const uk = {
  common: {
    welcome: 'Ласкаво просимо',
    login: 'Увійти',
    // ...
  }
};
```

**Використання**:
```tsx
import { useI18n } from '@/contexts/I18nContext';

const { t } = useI18n();
return <h1>{t('common.welcome')}</h1>;
```

---

## 🌱 Початкове Seeding (Генерація даних)

### Автоматичне (Docker)

```yaml
# docker-compose.yml
services:
  app:
    command: >
      sh -c "python manage.py migrate &&
             python manage.py create_test_users &&
             python manage.py create_mock_system --quick &&
             python manage.py runserver 0.0.0.0:8000"
```

### Ручне

```bash
# 1. Довідники (марки, моделі, регіони)
python manage.py populate_references

# 2. Тестові користувачі
python manage.py create_test_users

# 3. Мокові дані
python manage.py create_mock_system --quick

# 4. Повна система (з LLM)
python manage.py populate_test_system --full
```

**Детальніше**: [Backend Services](./BACKEND_SERVICES.md#система-генерації-мокових-даних)

---

## ✅ Чек-лист налаштування

### Backend:
- [ ] PostgreSQL налаштовано
- [ ] Redis працює
- [ ] Google Maps API ключ додано
- [ ] Email SMTP налаштовано
- [ ] Міграції виконані (`python manage.py migrate`)
- [ ] Суперюзер створений
- [ ] Довідники заповнені
- [ ] Celery працює

### Frontend:
- [ ] `.env.local` створено
- [ ] Google Maps ключ додано
- [ ] Backend URL налаштовано
- [ ] NextAuth налаштовано
- [ ] `npm install` виконано
- [ ] `npm run dev` запускається

### Infrastructure:
- [ ] Docker Compose працює
- [ ] Nginx (якщо використовується)
- [ ] Volumes для media/static
- [ ] Логи доступні

---

## 🔗 Пов'язані документи

- [Infrastructure Setup](./INFRASTRUCTURE_SETUP.md) - Docker, Redis, Nginx
- [Backend Services](./BACKEND_SERVICES.md) - Модерація, Celery
- [Troubleshooting](./TROUBLESHOOTING.md) - Вирішення проблем

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25

