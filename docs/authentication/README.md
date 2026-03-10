# Система аутентифікації

## Огляд

Повнофункціональна система аутентифікації з JWT токенами, httpOnly cookies зберіганням та автоматичним оновленням токенів.

## Архітектура

### Компоненти системи

1. **FrontendFlow** - Next.js аутентифікація
2. **Backend API** - Django REST Framework
3. **HttpOnly Cookies Storage** - зберігання токенів
4. **Token Refresh** - механізм оновлення
5. **Middleware** - захист маршрутів

### Сторінки аутентифікації

- `/signin` - NextAuth сесії (користувацька авторизація)
- `/login` - Bearer токени (API авторизація)
- `/autoria/*` - вимагають наявності `backend_auth` токенів в cookies

## Структура файлів

### API маршрути

#### `/api/auth/login`
**Файл**: `frontend/src/app/api/auth/login/route.ts`

Основний ендпоінт для аутентифікації:
- Підтримка email/password (backend) та username/password (dummy)
- Валідація credentials
- Збереження токенів в httpOnly cookies
- Повернення JWT токенів

#### `/api/auth/refresh`
**Файл**: `frontend/src/app/api/auth/refresh/route.ts`

Оновлення токенів:
- Читання поточних токенів з cookies
- Виклик зовнішнього API для оновлення
- Збереження нових токенів в cookies
- Верифікація успішності операції

#### `/api/auth/token`
**Файл**: `frontend/src/app/api/auth/token/route.ts`

Робота з токенами в cookies:
- `GET` - отримання токенів з cookies
- `POST` - збереження токенів в cookies
- `DELETE` - видалення токенів з cookies

### Core логіка

#### Функція `fetchAuth`
**Файл**: `frontend/src/app/api/helpers.ts`

```typescript
export const fetchAuth = async (
  credentials: IDummyAuth | IBackendAuthCredentials
): Promise<AuthResponse>
```

**Критичні деталі**:
- Використання абсолютних URL для API викликів
- Верифікація успішності аутентифікації
- Повернення JWT токенів

### HttpOnly Cookies система

#### API маршрут
**Файл**: `frontend/src/app/api/auth/token/route.ts`

**Підтримувані методи**:
- `GET` - отримання токенів з cookies
- `POST` - збереження токенів в cookies
- `DELETE` - видалення токенів з cookies

**Структура зберігання**:
```javascript
// httpOnly cookies
access_token = "jwt_access_token"
refresh_token = "jwt_refresh_token"
```

**Cookie Settings**:
```typescript
const isProduction = process.env.NODE_ENV === 'production';
response.cookies.set('access_token', access, { 
  httpOnly: true, 
  secure: isProduction, 
  sameSite: 'lax', 
  path: '/', 
  maxAge: 60 * 60 * 24 
});
```

### Middleware захист

#### Конфігурація
**Файл**: `frontend/src/middleware.ts`

**Захищені шляхи**:
```typescript
const PROTECTED_PATHS = ['/autoria', '/profile', '/settings'];
```

**Публічні шляхи**:
```typescript
const PUBLIC_PATHS = [
  '/api/auth', '/api/health', '/api/reference', '/api/public',
  '/api/user', '/signin', '/register', '/login'
];
```

**Логіка доступу**:
- Перевірка наявності NextAuth сесії
- Немає валідації токенів - тільки перевірка існування сесії
- Редірект на `/api/auth/signin` при відсутності сесії
- Вільний доступ до публічних маршрутів

## Провайдери аутентифікації

### Backend (Django)
- **Ендпоінт**: Django REST API
- **Credentials**: email/password
- **Cookies**: `access_token`, `refresh_token`
- **URL**: `https://autoria-web-production.up.railway.app` (production) або `http://localhost:8000` (local)

### Dummy (DummyJSON)
- **Ендпоінт**: `https://dummyjson.com/auth/login`
- **Credentials**: username/password
- **Cookies**: `access_token`, `refresh_token`
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
    email: 'admin@autoria.com', 
    password: '12345678' 
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

#### Тест токенів в cookies
```javascript
// Отримання
fetch('/api/auth/token', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Tokens:', data));
```

## Типові проблеми

### "tokens_not_found" помилка
**Причина**: Токени не збережені в httpOnly cookies  
**Рішення**: Перевірити що login функція викликає POST /api/auth/token

### Алерт показує успіх але токенів немає в cookies
**Причина**: Login функція не зберігає токени  
**Рішення**: Перевірити що login() викликається з await

### 401 Unauthorized при логіні
**Причина**: Неправильні credentials або backend не працює  
**Рішення**:
- Для dummy: використовувати `emilys/emilyspass`
- Для backend: перевірити що Django backend запущений

### Оновлення токенів не працює
**Причина**: Токени не знайдені в cookies  
**Рішення**: Перевірити що токени правильно збережені

## Налаштування середовища

### Необхідні сервіси
1. **Next.js Frontend** - `http://localhost:3000`
2. **Django Backend** - `http://localhost:8000`

### Environment Variables
```bash
# Production
NEXT_PUBLIC_BACKEND_URL=https://autoria-web-production.up.railway.app

# Local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Критерії успіху

### Система працює коректно коли:
- Логін повертає JWT токени
- Токени зберігаються в httpOnly cookies
- BackendTokenPresenceGate знаходить токени
- Оновлення токенів працює
- Middleware перенаправляє на `/api/auth/signin` при відсутності сесії
- Autoria сторінки вимагають наявності токенів
- Публічні маршрути доступні без аутентифікації

### Система не працює коли:
- Токени не знайдені в cookies після логіну
- BackendTokenPresenceGate редиректить на /login
- Неправильні credentials для провайдера
- Django backend не відповідає

## Checklist діагностики

При проблемах з аутентифікацією перевірити:

1. **Login функція** - має зберігати токени в cookies
2. **Token API** - протестувати GET/POST/DELETE методи
3. **Credentials** - використовувати правильні дані для провайдера
4. **BackendTokenPresenceGate** - має знаходити токени
5. **Django refresh view** - має використовувати CustomTokenRefreshSerializer
6. **Ротація токенів** - новий refresh токен має повертатись
7. **Backend сервіс** - Django має бути запущений
8. **Middleware редіректи** - перенаправлення на `/api/auth/signin`
9. **Доступ до Autoria** - `/autoria` має вимагати токени
10. **Публічні маршрути** - API роути та auth сторінки мають бути доступними

---

**Остання актуалізація**: Березень 2026  
**Статус системи**: Повністю робоча  
**Архітектура**: httpOnly cookies + NextAuth
