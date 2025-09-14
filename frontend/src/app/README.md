# 📁 App Directory Structure

This directory contains the Next.js App Router pages and API routes, organized by thematic groups using route groups `()` that don't affect the URL structure.

## 🏗️ Page Structure

### 📱 (auth) - Authentication Pages
- `(auth)/login/` - User login page
- `(auth)/register/` - User registration page

### 🏠 (main) - Main Application Pages
- `(main)/autoria/` - AutoRia car marketplace pages
  - `autoria/profile/` - User profile in AutoRia context
  - `autoria/search/` - Car search functionality
  - `autoria/create-ad/` - Create car advertisement
  - `autoria/my-ads/` - User's advertisements
  - `autoria/favorites/` - Favorite cars
  - `autoria/analytics/` - Analytics dashboard
- `(main)/dashboard/` - Main dashboard

- `(main)/profile/` - General user profile
- `(main)/recipes/` - Recipe management (DummyJSON integration)
- `(main)/users/` - User management pages
- `(main)/enhanced-chat/` - Enhanced chat interface

### 🛠️ (admin) - Administrative Pages
- `(admin)/debug/` - Debug utilities
- `(admin)/debug-auth/` - Authentication debugging
- `(admin)/debug-middleware/` - Middleware debugging
- `(admin)/docs/` - Documentation pages

### 🔗 (services) - Service Integration Pages
- `(services)/flower/` - Celery Flower monitoring
- `(services)/rabbitmq/` - RabbitMQ management
- `(services)/redis-insight/` - Redis monitoring

## 🔌 API Structure

### 🔐 (auth-api) - Authentication APIs
- `(auth-api)/auth/` - NextAuth.js configuration and endpoints
  - `auth/[...nextauth]/` - NextAuth.js dynamic routes
  - `auth/login/` - Login API
  - `auth/refresh/` - Token refresh
  - `auth/dummy/` - Dummy authentication for testing

### 👤 (user-api) - User Management APIs
- `(user-api)/user/` - Current user operations
  - `user/profile/` - User profile CRUD
  - `user/account/` - Account settings
  - `user/addresses/` - User addresses
- `(user-api)/users/` - Users listing and details
- `(user-api)/accounts/` - Account management

### 🚗 (autoria-api) - AutoRia APIs
- `(autoria-api)/autoria/` - AutoRia backend proxy
- `(autoria-api)/ads/` - Advertisement management
  - `ads/create/` - Create advertisements
  - `ads/my-ads/` - User's ads
  - `ads/statistics/` - Ad statistics

### 🌐 (external-api) - External Service APIs
- `(external-api)/recipes/` - DummyJSON recipes integration
- `(external-api)/google-maps-key/` - Google Maps API key

### 🛠️ (admin-api) - Administrative APIs
- `(admin-api)/health/` - Application health check
- `(admin-api)/backend-health/` - Backend health monitoring
- `(admin-api)/redis/` - Redis operations
- `(admin-api)/service-registry/` - Service discovery

### 📚 (reference-api) - Reference Data APIs
- `(reference-api)/reference/` - Reference data (brands, models, etc.)
  - `reference/brands/` - Car brands
  - `reference/models/` - Car models
  - `reference/colors/` - Available colors
  - `reference/regions/` - Geographic regions
  - `reference/cities/` - Cities
- `(reference-api)/public/` - Public reference data

### 🔧 (helpers) - API Helpers
- `(helpers)/backend.ts` - Backend communication utilities
- `(helpers)/common.ts` - Common API utilities
- `(helpers)/dummy.ts` - Dummy data helpers
- `(helpers)/errorHandler.ts` - Error handling utilities
- `(helpers)/index.ts` - Helper exports

## 🎯 Benefits of This Structure

### ✅ **Organized by Purpose**
- Authentication, user management, and business logic are clearly separated
- Easy to find related functionality
- Logical grouping reduces cognitive load

### ✅ **URL Structure Unchanged**
- Route groups `()` don't affect URLs
- `/login` still works, not `/(auth)/login`
- API endpoints remain the same: `/api/user/profile`

### ✅ **Scalable Architecture**
- Easy to add new pages to appropriate groups
- Clear separation of concerns
- Maintainable codebase structure

### ✅ **Developer Experience**
- Faster navigation in IDE
- Clear mental model of application structure
- Easier onboarding for new developers

## 🚀 Usage Examples

### Adding New Pages
```bash
# Add new auth page
mkdir src/app/(auth)/forgot-password

# Add new main page  
mkdir src/app/(main)/marketplace

# Add new admin page
mkdir src/app/(admin)/logs
```

### Adding New APIs
```bash
# Add new user API
mkdir src/app/api/(user-api)/preferences

# Add new external API
mkdir src/app/api/(external-api)/weather

# Add new admin API
mkdir src/app/api/(admin-api)/metrics
```

## 📝 Notes

- **Route Groups**: Folders with `()` are organizational only
- **URL Mapping**: `/autoria/profile` → `(main)/autoria/profile/page.tsx`
- **API Mapping**: `/api/user/profile` → `api/(user-api)/user/profile/route.ts`
- **Helpers**: Shared utilities in `(helpers)` group
- **Consistency**: Follow the established grouping patterns
