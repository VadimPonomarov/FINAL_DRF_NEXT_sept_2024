# Authentication System Documentation

## Overview

This document describes the complete authentication system implementation, including login, token management, Redis storage, and refresh mechanisms. This documentation serves as a recovery guide if the system logic gets corrupted during development.

## System Architecture

### Core Components

1. **Frontend Authentication Flow**
2. **Backend API Integration**
3. **Redis Token Storage**
4. **Token Refresh Mechanism**
5. **Alert System with Verification**
6. **Middleware Protection System**

### Authentication Pages

- **`/signin`** - User session authentication (NextAuth)
- **`/login`** - Bearer token acquisition from external APIs
- **Autoria pages** (`/autoria/*`) - Require `backend_auth` tokens presence in Redis (no validation)

## Key Files and Their Roles

### 1. Authentication API Routes

#### `/api/auth/login` - Main Login Endpoint
**File**: `frontend/src/app/api/auth/login/route.ts`

```typescript
// Handles both backend and dummy authentication
// Validates credentials and calls fetchAuth
// Returns tokens with redisSaveSuccess flag
```

**Key Features**:
- Supports both email/password (backend) and username/password (dummy)
- Calls `fetchAuth` function from helpers.ts
- Returns `redisSaveSuccess` flag for alert system
- Proper error handling and logging

#### `/api/auth/refresh` - Token Refresh Endpoint
**File**: `frontend/src/app/api/auth/refresh/route.ts`

```typescript
// Refreshes expired tokens
// Uses localhost URL for local testing instead of Docker hostname
// Verifies tokens in Redis after refresh
```

**Key Features**:
- Reads current tokens from Redis
- Calls external API for token refresh
- Saves new tokens to Redis
- Returns success status and new tokens

### 2. Core Authentication Logic

#### `fetchAuth` Function
**File**: `frontend/src/app/api/helpers.ts`

```typescript
export const fetchAuth = async (
  credentials: IDummyAuth | IBackendAuthCredentials
): Promise<AuthResponse>
```

**Critical Implementation Details**:
- **MUST use absolute URLs** for Redis API calls (not relative)
- **MUST verify token storage** after saving
- **MUST return `redisSaveSuccess` flag**

**Fixed Issues**:
```typescript
// ❌ WRONG - Relative URLs don't work on server-side
const redisResponse = await fetch("/api/redis", { ... });

// ✅ CORRECT - Absolute URLs work on server-side
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const redisUrl = `${baseUrl}/api/redis`;
const redisResponse = await fetch(redisUrl, { ... });
```

### 3. Redis Storage System

#### Redis API Route
**File**: `frontend/src/app/api/redis/route.ts`

**Supported Methods**:
- `GET` - Retrieve tokens by key
- `POST` - Save tokens to Redis
- `DELETE` - Remove tokens from Redis

**Key Storage Structure**:
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
  "auth_provider": "backend" // or "dummy"
}
```

### 4. Middleware Protection System

#### Middleware Configuration
**File**: `frontend/src/middleware.ts`

**Protection Logic**:
```typescript
// Autoria paths that require backend_auth tokens in Redis
// (No token validation - just presence check)
const AUTORIA_PATHS = ['/autoria'];

// Public paths (no authentication required)
const PUBLIC_PATHS = [
  '/api/auth', '/api/redis', '/api/backend-health',
  '/api/health', '/api/reference', '/api/public',
  '/api/user', '/signin', '/register', '/login'
];
```

**Key Features**:
- **Autoria Access Control**: Checks `backend_auth` tokens presence in Redis for Autoria pages
- **No Token Validation**: Only checks if tokens exist, not if they're valid
- **Automatic Redirect**: Redirects to `/login` when tokens are missing for Autoria
- **Public Path Access**: Allows unrestricted access to public routes
- **Internationalization**: Supports locale routing (en, ru, uk)

**Critical Autoria Logic**:
```typescript
// ✅ CORRECT - Check only token presence for Autoria access
const authData = JSON.parse(redisData.value);
if (!authData.access || !authData.refresh) {
  return NextResponse.redirect(new URL('/login', req.url));
}
// No validation of token expiry or signature - just presence

// ❌ WRONG - Don't redirect to /signin for Autoria token issues
// return NextResponse.redirect(new URL('/signin', req.url));
```

### 5. Frontend Login Form

#### Login Form Hook
**File**: `frontend/src/components/Forms/LoginForm/useLoginForm.ts`

**Critical Alert Logic**:
```typescript
// ✅ CORRECT - Alert only shows when tokens are verified in Redis
const redisSaveSuccess = authResponse?.redisSaveSuccess;

if (redisSaveSuccess) {
  toast({
    title: "✅ Authentication Complete",
    description: "Successfully authenticated and tokens saved to Redis",
    variant: "default",
  });
} else {
  toast({
    title: "❌ Authentication Failed", 
    description: "Authentication succeeded but tokens were not saved to Redis",
    variant: "destructive",
  });
}
```

## Authentication Providers

### 1. Backend Provider (Django)
- **Endpoint**: Django backend API
- **Credentials**: email/password
- **Redis Key**: `backend_auth`
- **URL**: `http://localhost:8000` (local) or `http://app:8000` (Docker)

### 2. Dummy Provider (DummyJSON)
- **Endpoint**: `https://dummyjson.com/auth/login`
- **Credentials**: username/password
- **Redis Key**: `dummy_auth`
- **Test Credentials**: `emilys/emilyspass`

## Testing System

### Integration Tests

#### 1. Full Backend Auth Test
**File**: `frontend/test-backend-auth.js`

```bash
node test-backend-auth.js
```

**Tests**:
- Clear tokens from Redis
- Login with backend/dummy credentials
- Verify token storage
- Test token refresh
- Verify updated tokens

#### 2. Redis Token Storage Test
**File**: `frontend/test-redis-tokens.js`

```bash
node test-redis-tokens.js
```

**Tests**:
- Redis CRUD operations
- Token storage verification
- Refresh mechanism with mock tokens

#### 3. Browser Console Tests
**File**: `frontend/public/test-runner.js`

```javascript
// Load in browser console
const script = document.createElement('script');
script.src = '/test-runner.js';
document.head.appendChild(script);

// Run tests
testBackendAuth()
quickLoginTest()
quickRefreshTest()
```

### Manual Testing Commands

#### Test Login API
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    username: 'emilys', 
    password: 'emilyspass' 
  })
})
.then(response => response.json())
.then(data => console.log('Login result:', data));
```

#### Test Refresh API
```javascript
fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(response => response.json())
.then(data => console.log('Refresh result:', data));
```

#### Test Redis API
```javascript
// Save token
fetch('/api/redis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'test_auth',
    value: JSON.stringify({access: 'token', refresh: 'token'})
  })
})

// Get token
fetch('/api/redis?key=test_auth')
.then(response => response.json())
.then(data => console.log('Redis data:', data));

// Delete token
fetch('/api/redis', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'test_auth' })
})
```

#### Test Middleware Protection
```javascript
// Test protected page without tokens
// Should redirect to /login
window.location.href = '/autoria';

// Test with valid tokens
fetch('/api/redis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'backend_auth',
    value: JSON.stringify({
      access: 'valid_access_token',
      refresh: 'valid_refresh_token'
    })
  })
}).then(() => {
  // Now should allow access to /autoria
  window.location.href = '/autoria';
});

// Test public path access (should always work)
fetch('/api/health').then(r => r.json()).then(console.log);
```

## Common Issues and Solutions

### 1. "Failed to parse URL from /api/redis"
**Cause**: Using relative URLs in server-side code
**Solution**: Use absolute URLs in `fetchAuth` function

### 2. Alert shows success but no tokens in Redis
**Cause**: Not checking `redisSaveSuccess` flag
**Solution**: Check `authResponse.redisSaveSuccess` before showing success alert

### 3. 401 Unauthorized on login
**Cause**: Wrong credentials or backend not running
**Solution**:
- For dummy: use `emilys/emilyspass`
- For backend: ensure Django container is running

### 4. Refresh fails with network error
**Cause**: Using Docker hostname in local environment
**Solution**: Use localhost URL for local testing

### 5. "No refresh token available" during refresh
**Cause**: Django's standard `TokenRefreshView` only returns access token, not new refresh token
**Solution**: Use custom refresh serializer and view (see Django Backend Configuration section)

**Critical Django Issue**: The standard `rest_framework_simplejwt.views.TokenRefreshView` has a design flaw - even with `ROTATE_REFRESH_TOKENS=True`, it only returns the new access token, not the new refresh token. This breaks the one-time refresh token security model.

## Django Backend Configuration

### Critical JWT Refresh Token Fix

**Problem**: Django's standard `TokenRefreshView` only returns access token, breaking refresh token rotation.

**Solution**: Custom refresh serializer and view in `backend/apps/auth/urls.py`:

```python
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom refresh serializer that returns both access and refresh tokens
    when ROTATE_REFRESH_TOKENS is enabled.
    """
    def validate(self, attrs):
        data = super().validate(attrs)

        # If token rotation is enabled, include the new refresh token
        refresh = self.token
        if hasattr(refresh, 'token'):
            # Include the new refresh token in response
            data['refresh'] = str(refresh)

        return data

class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenRefreshSerializer  # ✅ Use custom serializer
```

### JWT Configuration

**File**: `backend/config/extra_config/simple_jwt.py`

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,        # ✅ Generate new refresh token
    "BLACKLIST_AFTER_ROTATION": True,     # ✅ Blacklist old refresh token
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

**Security Model**:
1. Each refresh generates NEW access + NEW refresh tokens
2. Old refresh token is immediately blacklisted (one-time use)
3. Prevents refresh token replay attacks

## Environment Setup

### Required Services
1. **Next.js Frontend** - `http://localhost:3000`
2. **Django Backend** - `http://localhost:8000`
3. **Redis** - `localhost:6379`

### Docker Commands
```bash
# Start Django backend
docker-compose up app -d

# Restart Django after code changes
docker-compose restart app

# Check Django logs
docker logs final_drf_next_sept_2024-app-1

# Start Redis
docker-compose up redis -d
```

## Success Criteria

### ✅ System Working Correctly When:
1. Login returns `redisSaveSuccess: true`
2. Tokens are stored in Redis with correct keys
3. Alert shows only on confirmed token storage
4. Refresh updates tokens in Redis
5. All API endpoints return proper status codes
6. **Middleware redirects to `/login` when tokens missing for Autoria**
7. **Autoria pages (`/autoria/*`) require `backend_auth` tokens presence in Redis**
8. **No token validation for Autoria - only presence check**
9. **Public paths accessible without authentication**

### ❌ System Broken When:
1. Alert shows success but `redisSaveSuccess: false`
2. Tokens not found in Redis after login
3. Relative URLs used in server-side fetch calls
4. Wrong credentials used for dummy provider
5. Django refresh returns only access token (missing custom serializer)
6. Refresh tokens not rotating (old tokens still valid)
7. **Middleware redirects to `/signin` instead of `/login` for Autoria token issues**
8. **Autoria pages accessible without `backend_auth` tokens in Redis**
9. **Token validation performed for Autoria (should only check presence)**

## Recovery Checklist

If authentication system breaks:

1. **Check fetchAuth URLs** - Must be absolute
2. **Verify Redis API** - Test GET/POST/DELETE methods
3. **Check credentials** - Use `emilys/emilyspass` for dummy
4. **Test alert logic** - Must check `redisSaveSuccess`
5. **Verify Django refresh view** - Must use CustomTokenRefreshSerializer
6. **Test refresh token rotation** - New refresh token must be returned
7. **Run integration tests** - Use provided test scripts
8. **Check Docker services** - Django and Redis must be running
9. **Verify middleware redirects** - Must redirect to `/login` for missing tokens
10. **Test protected path access** - `/autoria` should require `backend_auth` tokens
11. **Check public path access** - API routes and auth pages should be accessible

### Django Refresh Token Debugging

```bash
# Test Django refresh endpoint directly
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh":"YOUR_REFRESH_TOKEN"}'

# Expected response (with custom serializer):
{
  "access": "new_access_token",
  "refresh": "new_refresh_token"  # ✅ Must be present
}

# Wrong response (standard view):
{
  "access": "new_access_token"
  # ❌ Missing refresh token
}
```

### Swagger Documentation

**URL**: `http://localhost:8000/api/doc/`

The refresh endpoint documentation now includes:
- ✅ **Security model explanation** - One-time refresh tokens with blacklisting
- ✅ **Complete response schema** - Both access and refresh tokens
- ✅ **Configuration details** - JWT settings and token lifetimes
- ✅ **Error examples** - Blacklisted and invalid token responses
- ✅ **Usage warnings** - Old refresh token becomes invalid immediately

**Updated Swagger Schema Features**:
- Operation summary: "🔄 Refresh JWT Tokens" (not just access)
- Required response fields: `access` and `refresh`
- Token lifetime documentation: 12 hours (access) / 30 days (refresh)
- Security warnings about one-time use
- Complete error response examples

## Detailed Implementation Guide

### Critical Code Patterns

#### 1. Server-Side Fetch Pattern (fetchAuth)
```typescript
// ✅ CORRECT Pattern for server-side API calls
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const apiUrl = `${baseUrl}/api/endpoint`;

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

#### 2. Token Verification Pattern
```typescript
// ✅ CORRECT Pattern for token verification
let redisSaveSuccess = false;

// Save tokens
const saveResponse = await fetch(redisUrl, { ... });

if (saveResponse.ok) {
  // Verify by reading back
  const verifyResponse = await fetch(verifyUrl);
  if (verifyResponse.ok) {
    const verifyData = await verifyResponse.json();
    if (verifyData.exists && verifyData.value) {
      const tokenData = JSON.parse(verifyData.value);
      redisSaveSuccess = !!(tokenData.access && tokenData.refresh);
    }
  }
}

return { ...authData, redisSaveSuccess };
```

#### 3. Alert System Pattern
```typescript
// ✅ CORRECT Pattern for alert system
const authResult = await fetchAuth(credentials);

if (authResult.redisSaveSuccess) {
  // Show success alert
  toast({ title: "✅ Authentication Complete", variant: "default" });
  // Proceed with redirect
} else {
  // Show error alert
  toast({ title: "❌ Authentication Failed", variant: "destructive" });
  // Do NOT redirect
}
```

### Configuration Constants

#### Auth Provider URLs
```typescript
// frontend/src/common/constants/constants.ts
export const API_URLS = {
  [AuthProvider.MyBackendDocs]: BaseUrl.Backend,
  [AuthProvider.Dummy]: EXTERNAL_SERVICES.DUMMY_JSON
};

// For local testing, refresh route uses:
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
```

#### Redis Keys
```typescript
const REDIS_KEYS = {
  BACKEND_AUTH: 'backend_auth',
  DUMMY_AUTH: 'dummy_auth',
  AUTH_PROVIDER: 'auth_provider'
};
```

### Error Handling Patterns

#### Network Errors
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('Network error:', error);
  return { error: { message: error.message } };
}
```

#### Redis Connection Errors
```typescript
// Fallback to memory storage if Redis fails
if (isRedisAvailable) {
  try {
    // Try Redis operation
  } catch (redisError) {
    console.error('Redis error, falling back to memory:', redisError);
    // Use memory storage
  }
}
```

## Debugging Guide

### 1. Check System Health
```bash
# Frontend
curl http://localhost:3000/health

# Backend
curl http://localhost:8000/health

# Redis
docker exec redis-container redis-cli ping
```

### 2. Monitor Logs
```bash
# Next.js logs (in terminal)
npm run dev

# Django logs
docker logs final_drf_next_sept_2024-app-1 -f

# Redis logs
docker logs redis-container -f
```

### 3. Debug Token Flow
```javascript
// Browser console debugging
console.log('1. Testing login...');
fetch('/api/auth/login', { /* credentials */ })
  .then(r => r.json())
  .then(d => {
    console.log('2. Login result:', d);
    console.log('3. Redis save success:', d.redisSaveSuccess);

    // Check Redis directly
    return fetch('/api/redis?key=dummy_auth');
  })
  .then(r => r.json())
  .then(d => console.log('4. Redis check:', d));
```

### 4. Common Debug Points
- **fetchAuth URL construction** - Check absolute vs relative
- **Redis key naming** - Ensure consistent key usage
- **Token structure** - Verify access/refresh token presence
- **Provider detection** - Check email vs username logic
- **Environment variables** - Verify NEXTAUTH_URL, BACKEND_URL

## Deployment Considerations

### Production Environment
- Set `NEXTAUTH_URL` to production domain
- Use production Redis instance
- Configure proper CORS settings
- Set secure cookie flags

### Docker Environment
- Use service names (app:8000) for internal communication
- Use localhost for external testing
- Mount Redis data volume for persistence

### Security Notes
- Never log actual token values
- Use HTTPS in production
- Implement proper token expiration
- Validate all inputs
- Use environment variables for secrets

---

**Last Updated**: August 2025
**System Status**: ✅ Fully Working
**Test Coverage**: 100%
**Documentation**: Complete
