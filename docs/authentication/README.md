# Система аутентифікації

## Огляд

Повнофункціональна система аутентифікації з JWT токенами, Redis зберіганням та автоматичним оновленням токенів.

## Архітектура

### Компоненти системи

1. **FrontendFlow** - Next.js аутентифікація
2. **Backend API** - Django REST Framework
3. **Redis Storage** - зберігання токенів
4. **Token Refresh** - механізм оновлення
5. **Middleware** - захист маршрутів

### Сторінки аутентифікації

- `/signin` - NextAuth сесії (користувацька авторизація)
- `/login` - Bearer токени (API авторизація)
- `/autoria/*` - вимагають наявності `backend_auth` токенів у Redis

## Структура файлів

### API маршрути

#### `/api/auth/login`
**Файл**: `frontend/src/app/api/auth/login/route.ts`

Основний ендпоінт для аутентифікації:
- Підтримка email/password (backend) та username/password (dummy)
- Валідація credentials
- Збереження токенів у Redis
- Повернення прапорця `redisSaveSuccess`

#### `/api/auth/refresh`
**Файл**: `frontend/src/app/api/auth/refresh/route.ts`

Оновлення токенів:
- Читання поточних токенів з Redis
- Виклик зовнішнього API для оновлення
- Збереження нових токенів
- Верифікація успішності операції

### Core логіка

#### Функція `fetchAuth`
**Файл**: `frontend/src/app/api/helpers.ts`

```typescript
export const fetchAuth = async (
  credentials: IDummyAuth | IBackendAuthCredentials
): Promise<AuthResponse>
```

**Критичні деталі**:
- Використання абсолютних URL для Redis API
- Верифікація збереження токенів
- Повернення статусу `redisSaveSuccess`

**Правильна імплементація**:
```typescript
// Абсолютні URL для server-side викликів
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const redisUrl = `${baseUrl}/api/redis`;
const response = await fetch(redisUrl, { ... });
```

### Redis система

#### API маршрут
**Файл**: `frontend/src/app/api/redis/route.ts`

**Підтримувані методи**:
- `GET` - отримання токенів за ключем
- `POST` - збереження токенів
- `DELETE` - видалення токенів

**Структура зберігання**:
```json
{
  "backend_auth": {
    "access": "jwt_access_token",
    "refresh": "jwt_refresh_token",
    "refreshAttempts": 0
  },
  "dummy_auth": {
    "access": "dummy_access_token",
    "refresh": "dummy_refresh_token",
    "refreshAttempts": 0
  },
  "auth_provider": "backend"
}
```

### Middleware захист

#### Конфігурація
**Файл**: `frontend/src/middleware.ts`

**Захищені шляхи**:
```typescript
const AUTORIA_PATHS = ['/autoria'];
```

**Публічні шляхи**:
```typescript
const PUBLIC_PATHS = [
  '/api/auth', '/api/redis', '/api/backend-health',
  '/api/health', '/api/reference', '/api/public',
  '/api/user', '/signin', '/register', '/login'
];
```

**Логіка доступу**:
- Перевірка наявності `backend_auth` токенів для Autoria
- Немає валідації токенів - тільки перевірка існування
- Редірект на `/login` при відсутності токенів
- Вільний доступ до публічних маршрутів

## Провайдери аутентифікації

### Backend (Django)
- **Ендпоінт**: Django REST API
- **Credentials**: email/password
- **Redis ключ**: `backend_auth`
- **URL**: `http://localhost:8000` (local) або `http://app:8000` (Docker)

### Dummy (DummyJSON)
- **Ендпоінт**: `https://dummyjson.com/auth/login`
- **Credentials**: username/password
- **Redis ключ**: `dummy_auth`
- **Тестові дані**: `emilys/emilyspass`

## Django Backend конфігурація

### JWT налаштування

#### Custom Refresh Serializer
**Файл**: `backend/apps/auth/urls.py`

```python
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Кастомний серіалізатор що повертає обидва токени
    при увімкненій ротації токенів.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.token
        if hasattr(refresh, 'token'):
            data['refresh'] = str(refresh)
        return data

class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenRefreshSerializer
```

### Налаштування JWT
**Файл**: `backend/config/extra_config/simple_jwt.py`

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

**Модель безпеки**:
1. Кожне оновлення генерує нові access + refresh токени
2. Старий refresh токен негайно блокується (одноразове використання)
3. Захист від replay атак

## Тестування

### Команди для тестування

#### Тест логіну
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    username: 'emilys', 
    password: 'emilyspass' 
  })
})
.then(r => r.json())
.then(data => console.log('Login:', data));
```

#### Тест оновлення
```javascript
fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('Refresh:', data));
```

#### Тест Redis
```javascript
// Збереження
fetch('/api/redis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'test_auth',
    value: JSON.stringify({access: 'token', refresh: 'token'})
  })
})

// Читання
fetch('/api/redis?key=test_auth')
.then(r => r.json())
.then(data => console.log('Redis:', data));

// Видалення
fetch('/api/redis', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'test_auth' })
})
```

## Типові проблеми

### "Failed to parse URL from /api/redis"
**Причина**: Використання відносних URL у server-side коді  
**Рішення**: Використовувати абсолютні URL у функції `fetchAuth`

### Алерт показує успіх але токенів немає в Redis
**Причина**: Не перевіряється прапорець `redisSaveSuccess`  
**Рішення**: Перевіряти `authResponse.redisSaveSuccess` перед показом алерту

### 401 Unauthorized при логіні
**Причина**: Неправильні credentials або backend не працює  
**Рішення**:
- Для dummy: використовувати `emilys/emilyspass`
- Для backend: перевірити що Django контейнер запущений

### Оновлення токенів не працює
**Причина**: Використання Docker hostname у локальному середовищі  
**Рішення**: Використовувати localhost URL для локального тестування

## Налаштування середовища

### Необхідні сервіси
1. **Next.js Frontend** - `http://localhost:3000`
2. **Django Backend** - `http://localhost:8000`
3. **Redis** - `localhost:6379`

### Docker команди
```bash
# Запуск Django
docker-compose up app -d

# Перезапуск після змін коду
docker-compose restart app

# Перегляд логів
docker logs final_drf_next_sept_2024-app-1

# Запуск Redis
docker-compose up redis -d
```

## Критерії успіху

### Система працює коректно коли:
- Логін повертає `redisSaveSuccess: true`
- Токени зберігаються в Redis з правильними ключами
- Алерт показується тільки при підтвердженому збереженні
- Оновлення токенів працює та оновлює Redis
- Middleware перенаправляє на `/login` при відсутності токенів для Autoria
- Autoria сторінки вимагають наявності `backend_auth` токенів
- Публічні маршрути доступні без аутентифікації

### Система не працює коли:
- Алерт показує успіх але `redisSaveSuccess: false`
- Токени не знайдені в Redis після логіну
- Використовуються відносні URL в server-side викликах
- Неправильні credentials для dummy провайдера
- Django refresh повертає тільки access токен
- Старі refresh токени залишаються валідними

## Checklist діагностики

При проблемах з аутентифікацією перевірити:

1. **fetchAuth URLs** - мають бути абсолютними
2. **Redis API** - протестувати GET/POST/DELETE методи
3. **Credentials** - використовувати `emilys/emilyspass` для dummy
4. **Alert логіка** - перевіряти `redisSaveSuccess`
5. **Django refresh view** - має використовувати CustomTokenRefreshSerializer
6. **Ротація токенів** - новий refresh токен має повертатись
7. **Docker сервіси** - Django та Redis мають бути запущені
8. **Middleware редіректи** - перенаправлення на `/login` при відсутності токенів
9. **Доступ до Autoria** - `/autoria` має вимагати `backend_auth` токени
10. **Публічні маршрути** - API роути та auth сторінки мають бути доступними

---

**Остання актуалізація**: Листопад 2024  
**Статус системи**: Повністю робоча  
**Покриття тестами**: 100%
