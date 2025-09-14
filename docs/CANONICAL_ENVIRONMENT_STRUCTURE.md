# Canonical Environment Structure

## 🎯 Overview

This document describes the canonical environment configuration structure for the DRF-Next.js project. The structure ensures that Docker containers use **ONLY** variables from the centralized `.env.docker` file, eliminating configuration conflicts and ensuring consistency across all services.

## 🏗️ Architecture Principles

### 1. Single Source of Truth
- **Docker Environment**: Uses ONLY `.env.docker` from project root
- **Local Development**: Uses `.env.local` or other local files
- **No Service-Specific .env Files**: All services share the same canonical configuration

### 2. Environment Detection
- `IS_DOCKER=true` flag determines environment type
- Docker containers automatically detect and use canonical configuration
- Local development falls back to local environment files

### 3. Strict Separation
- Docker containers NEVER use `.env.local` or other local files
- Local development NEVER uses `.env.docker`
- Clear separation prevents configuration leakage

## 📁 File Structure

```
project-root/
├── .env.docker          # 🐳 CANONICAL Docker environment (REQUIRED)
├── .env.example         # 📝 Example configuration
├── backend/
│   ├── .env.local       # 💻 Local backend development (optional)
│   └── manage.py        # ✅ Configured for canonical loading
├── frontend/
│   └── .env.local       # 💻 Local frontend development (optional)
├── mailing/
│   └── .env.local       # 💻 Local mailing development (optional)
└── docker-compose.yml   # ✅ Uses .env.docker exclusively
```

### ❌ Forbidden Files (Removed)
- `backend/.env.docker` ❌ REMOVED
- `mailing/.env.docker` ❌ REMOVED
- `frontend/.env.docker` ❌ REMOVED

## 🐳 Docker Environment Configuration

### .env.docker Structure

```bash
# =============================================================================
# CANONICAL DOCKER ENVIRONMENT CONFIGURATION
# =============================================================================
# Single source of truth for all Docker services

# Docker Environment Flags
IS_DOCKER=true
DOCKER_ENV=true
DJANGO_ENV=production

# Database Configuration
POSTGRES_DB=automarket_db
POSTGRES_USER=automarket_user
POSTGRES_PASSWORD=automarket_password_secure_2024
POSTGRES_HOST=pg
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# RabbitMQ Configuration
RABBITMQ_HOST=rabbitmq
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=admin123
CELERY_BROKER=pyamqp://admin:admin123@rabbitmq:5672//

# Django Backend Configuration
SECRET_KEY=your-secret-key-here
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,backend,app,*

# Frontend Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_IS_DOCKER=true

# ... (all other variables)
```

### docker-compose.yml Configuration

```yaml
services:
  app:
    env_file:
      - .env.docker  # ✅ Uses canonical file
    environment:
      IS_DOCKER: ${IS_DOCKER}  # ✅ References .env.docker variables
      
  frontend:
    env_file:
      - .env.docker  # ✅ Uses canonical file
    environment:
      NEXT_PUBLIC_IS_DOCKER: ${NEXT_PUBLIC_IS_DOCKER}
      
  # All other services follow the same pattern
```

## 💻 Local Development Configuration

### Backend Local Configuration
```bash
# backend/.env.local
IS_DOCKER=false
POSTGRES_HOST=localhost
REDIS_HOST=localhost
RABBITMQ_HOST=localhost
# ... local-specific values
```

### Environment Loading Logic

#### Backend (manage.py & settings.py)
```python
is_docker = os.environ.get('IS_DOCKER', 'false').lower() == 'true'

if is_docker:
    # DOCKER: Use root .env.docker ONLY
    env_file = root_dir / '.env.docker'
else:
    # LOCAL: Use local environment files
    env_files = ['.env.local', '.env', '.env.production']
```

#### Frontend (environmentDetector.ts)
```typescript
if (isDocker) {
  // DOCKER: Use Docker service names
  config = {
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
    wsHost: 'app:8000',  // Internal Docker service name
    isDocker: true,
  };
} else {
  // LOCAL: Use localhost
  config = {
    backendUrl: 'http://localhost:8000',
    wsHost: 'localhost:8000',
    isDocker: false,
  };
}
```

## 🚀 Deployment Process

### 1. Validation
```bash
# Validate environment configuration
./scripts/validate-environment.py

# Or use deployment script validation
./deploy.sh validate
```

### 2. Docker Deployment
```bash
# Development deployment
./deploy.sh dev

# Production deployment
./deploy.sh prod
```

### 3. Deployment Script Features
- ✅ Validates `.env.docker` exists and is complete
- ✅ Checks for forbidden service-specific .env files
- ✅ Ensures `IS_DOCKER=true` in Docker deployments
- ✅ Validates required variables are present

## 🔍 Validation & Troubleshooting

### Environment Validation Script
```bash
python scripts/validate-environment.py
```

**Checks:**
- ✅ Canonical `.env.docker` exists and is complete
- ✅ No forbidden service-specific .env files
- ✅ docker-compose.yml uses canonical configuration
- ✅ Backend configuration files use canonical loading
- ✅ All required variables are present

### Common Issues & Solutions

#### 1. Service-Specific .env Files Found
**Problem:** `backend/.env.docker` or `mailing/.env.docker` exists
**Solution:** Remove these files - use only root `.env.docker`

#### 2. IS_DOCKER Not Set
**Problem:** `IS_DOCKER` not set to `true` in `.env.docker`
**Solution:** Ensure `IS_DOCKER=true` in canonical `.env.docker`

#### 3. Missing Required Variables
**Problem:** Required variables missing from `.env.docker`
**Solution:** Add all required variables to canonical `.env.docker`

#### 4. Hardcoded Values in docker-compose.yml
**Problem:** Values hardcoded instead of using variables
**Solution:** Replace hardcoded values with `${VARIABLE_NAME}` references

## 📋 Required Variables Checklist

### Core Environment
- [ ] `IS_DOCKER=true`
- [ ] `DOCKER_ENV=true`
- [ ] `DJANGO_ENV=production`

### Database
- [ ] `POSTGRES_DB`
- [ ] `POSTGRES_USER`
- [ ] `POSTGRES_PASSWORD`
- [ ] `POSTGRES_HOST=pg`

### Redis
- [ ] `REDIS_HOST=redis`
- [ ] `REDIS_PORT=6379`
- [ ] `REDIS_URL=redis://redis:6379`

### RabbitMQ
- [ ] `RABBITMQ_HOST=rabbitmq`
- [ ] `RABBITMQ_DEFAULT_USER`
- [ ] `RABBITMQ_DEFAULT_PASS`
- [ ] `CELERY_BROKER`

### Django
- [ ] `SECRET_KEY`
- [ ] `DEBUG`
- [ ] `ALLOWED_HOSTS`

### Frontend
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXT_PUBLIC_BACKEND_URL`
- [ ] `NEXT_PUBLIC_IS_DOCKER=true`

## 🎉 Benefits

1. **Consistency**: All services use the same configuration source
2. **Simplicity**: Single file to manage for Docker deployments
3. **Reliability**: No configuration conflicts or variable leakage
4. **Maintainability**: Easy to update and validate configuration
5. **Security**: Clear separation between environments
6. **Debugging**: Easy to trace configuration issues

## 🔄 Migration from Old Structure

If migrating from the old structure:

1. **Consolidate Variables**: Move all variables to root `.env.docker`
2. **Remove Service Files**: Delete `backend/.env.docker`, `mailing/.env.docker`
3. **Update docker-compose.yml**: Use `env_file: - .env.docker` for all services
4. **Update Code**: Ensure environment loading uses canonical structure
5. **Validate**: Run validation script to ensure correctness
6. **Test**: Deploy and verify all services work correctly

---

**Remember**: In Docker, there is only ONE source of truth: `.env.docker` in the project root. 🎯
