# 🔧 AutoRia - Вирішення проблем

## 📋 Огляд

Повний посібник з вирішення типових проблем в AutoRia платформі.

---

## 🔐 Проблеми з Автентифікацією

### 401 Unauthorized на всіх запитах

**Симптоми**:
```
GET /api/users/profile/ → 401 Unauthorized
```

**Причини та рішення**:

1. **Токен не збережено в Redis**
   ```typescript
   // Перевірити
   const token = await fetch('/api/redis/get/backend_auth');
   console.log(token);
   ```
   **Фікс**: Після логіна переконайтеся, що `fetchAuth` зберігає токен:
   ```typescript
   await fetch('/api/redis/set', {
     method: 'POST',
     body: JSON.stringify({
       key: 'backend_auth',
       value: JSON.stringify({ access: accessToken, refresh: refreshToken })
     })
   });
   ```

2. **Токен застарів**
   ```typescript
   // frontend/src/utils/fetchWithAuth.ts
   if (response.status === 401) {
     const refreshed = await refreshAccessToken();
     if (refreshed) {
       // Retry original request
       return fetchWithAuth(url, options);
     }
   }
   ```

3. **Provider не співпадає**
   ```typescript
   const provider = await fetch('/api/redis/get/auth_provider');
   // Має бути 'backend' або 'dummy'
   ```

###  NextAuth Session помилки

**Симптоми**:
```
[next-auth][error][SESSION_ERROR]
```

**Фікс**:
```typescript
// frontend/src/app/api/auth/[...nextauth]/route.ts
session: {
  strategy: 'jwt',  // Не 'database'
  maxAge: 24 * 60 * 60,  // 24 години
},
callbacks: {
  async jwt({ token, user }) {
    if (user) token.user = user;
    return token;
  }
}
```

---

## 🌐 CORS Помилки

### CORS policy: No 'Access-Control-Allow-Origin'

**Симптоми**:
```
Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Фікс (Backend)**:
```python
# backend/config/extra_config/cors_config.py

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",  # Docker
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-csrftoken',
    'x-requested-with',
]
```

### Preflight OPTIONS запити fails

**Симптоми**:
```
OPTIONS /api/... → 403 Forbidden
```

**Фікс**:
```python
# Додати в CORS_ALLOW_METHODS
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',  # Обов'язково!
    'PATCH',
    'POST',
    'PUT',
]
```

---

## 🔄 Проблеми з Редіректами

### Нескінченні редіректи /login → /

**Симптоми**:
```
/login → / → /login → / → ...
```

**Причина**: `useRedisAuth` вважає користувача авторизованим, але насправді ні.

**Фікс**:
```typescript
// frontend/src/contexts/RedisAuthContext.tsx
useEffect(() => {
  const checkAuth = async () => {
    const provider = await fetch('/api/redis/get/auth_provider').then(r => r.json());
    const authKey = provider === 'dummy' ? 'dummy_auth' : 'backend_auth';
    const authData = await fetch(`/api/redis/get/${authKey}`).then(r => r.json());
    
    if (authData && authData.access) {
      // Перевірити токен валідний
      const valid = await fetch('/api/users/profile/', {
        headers: { Authorization: `Bearer ${authData.access}` }
      });
      
      if (valid.ok) {
        setRedisUser(authData.user);
      } else {
        // Токен недійсний - очистити
        await fetch('/api/redis/delete/backend_auth', { method: 'POST' });
        setRedisUser(null);
      }
    }
  };
  
  checkAuth();
}, []);
```

---

## 🖼️ Проблеми з Зображеннями

### AI генерація зображень fails

**Симптоми**:
```
POST /api/ads/cars/{id}/images/generate/ → 500 Internal Server Error
Error: g4f timeout or connection error
```

**Рішення**:

1. **Перевірити g4f**:
   ```python
   # backend/test_g4f.py
   from g4f.client import Client
   
   client = Client()
   response = client.images.generate(
       model="flux",
       prompt="car"
   )
   print(response.data[0].url)
   ```

2. **Збільшити timeout**:
   ```python
   # backend/core/services/ai_image_service.py
   response = client.images.generate(
       model="flux",
       prompt=prompt,
       timeout=60  # 60 секунд
   )
   ```

3. **Fallback на stock URLs**:
   ```python
   try:
       image_url = generate_image(prompt)
   except Exception as e:
       logger.error(f"AI generation failed: {e}")
       image_url = "https://via.placeholder.com/800x600?text=Car"
   ```

### Завантаження зображень fails

**Симптоми**:
```
POST /api/ads/cars/{id}/images/upload/ → 413 Request Entity Too Large
```

**Фікс**:
```python
# backend/config/extra_config/security_config.py
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
```

```nginx
# nginx.conf (якщо використовується)
client_max_body_size 10M;
```

---

## 🐳 Docker та Infrastructure

### Redis connection refused

**Симптоми**:
```
[ERROR] Redis client not available
ConnectionRefusedError: [Errno 111] Connection refused
```

**Рішення**:

1. **Перевірити Redis працює**:
   ```bash
   docker-compose ps redis
   # Має бути "Up"
   ```

2. **Перевірити налаштування**:
   ```python
   # backend/config/extra_config/cache_config.py
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
               'SOCKET_CONNECT_TIMEOUT': 5,
               'SOCKET_TIMEOUT': 5,
           }
       }
   }
   ```

3. **Docker network**:
   ```bash
   # Перевірити network
   docker network ls
   docker network inspect final_drf_next_sept_2024_default
   ```

### PostgreSQL connection errors

**Симптоми**:
```
django.db.utils.OperationalError: could not connect to server
```

**Фікс**:
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: autoria
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  app:
    depends_on:
      db:
        condition: service_healthy  # Чекати поки DB готова
```

---

## 🎨 Frontend Problems

### Build fails з "Module not found"

**Симптоми**:
```
Module not found: Can't resolve '@/components/...'
```

**Фікс**:
```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Cache проблеми

**Симптоми**: Старі дані відображаються після оновлення

**Фікс**:
```bash
# Очистити Next.js cache
cd frontend
rm -rf .next
npm run dev
```

**Для production**:
```bash
npm run build
# Перевірити .next/cache
```

---

## 📊 Пов'язані документи

- [Setup Guide](./SETUP_GUIDE.md) - Початкове налаштування
- [Infrastructure](./INFRASTRUCTURE_SETUP.md) - Docker, Redis, Nginx
- [Backend API](./BACKEND_API_GUIDE.md) - API документація

---

**Версія**: 2.0  
**Останнє оновлення**: 2025-01-25

