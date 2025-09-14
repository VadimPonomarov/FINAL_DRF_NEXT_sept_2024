# 🚗 AutoRia Frontend Project

A modern Next.js 15 application with **dual-provider authentication architecture**, featuring AutoRia car marketplace functionality, external API integrations, and AI chat system.

## 🚀 Quick Start

```sh
git clone <repository URL>
cd frontend
npm install
npm install --legacy-peer-deps
npm run dev
```

## 🛠️ Technologies
- **React 19.1.0** - Latest React with concurrent features
- **Next.js 15.4.1** - App Router with server components
- **TypeScript 5.8.3** - Type-safe development
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Modern component library
- **Framer Motion** - Animation library
- **NextAuth.js** - Authentication solution
- **Redis** - Caching and session storage
- **i18n** - Internationalization (EN, RU, UK)

## 🏗️ Project Architecture

### 🔐 Dual-Provider Authentication System

The project implements a **sophisticated dual-provider authentication architecture** that allows switching between different data sources and functionalities:

#### 1. **Backend Provider** (`AuthProvider.MyBackendDocs`)
- **Purpose**: Main AutoRia functionality with Django backend
- **Endpoint**: `http://localhost:8000` (local) / `http://app:8000` (Docker)
- **Features**:
  - 🚗 **AutoRia Marketplace** - Car advertisements and management
  - 👤 **User Profiles** - Comprehensive user management
  - 📊 **Analytics Dashboard** - Premium user statistics
  - 💬 **AI Chat System** - Real-time WebSocket chat with AI
  - 🛡️ **Content Moderation** - Automated profanity detection
  - 💰 **Currency System** - Multi-currency support (USD, EUR, UAH)

#### 2. **Dummy Provider** (`AuthProvider.Dummy`)
- **Purpose**: External API integration demonstration
- **Endpoint**: `https://dummyjson.com`
- **Features**:
  - 🍳 **Recipes System** - External recipe data integration
  - 👥 **Users Management** - External user profiles
  - 🔍 **Search & Filtering** - Advanced filtering capabilities
  - 📱 **Pagination** - Infinite scroll and pagination

### Modular Structure
The project uses Next.js App Router with route groups `()` for logical organization without affecting URLs:

#### 📱 Pages (`src/app/`)
- **`(auth)/`** - Authentication pages (login, register)
  - `login/` - Multi-provider login form
  - `register/` - User registration
- **`(main)/`** - Main application pages
  - `autoria/` - **AutoRia marketplace** (Backend Provider)
    - `search/` - Car search and filtering
    - `create-ad/` - Advertisement creation
    - `my-ads/` - User's advertisements
    - `favorites/` - Favorite cars
    - `analytics/` - Premium analytics dashboard
    - `profile/` - AutoRia user profile
  - `recipes/` - **Recipe system** (Dummy Provider)
  - `users/` - **User management** (Dummy Provider)
  - `dashboard/` - Main dashboard
  - `enhanced-chat/` - AI chat interface
- **`(admin)/`** - Administrative and debug pages
  - `docs/` - API documentation (Swagger UI)
- **`(services)/`** - Service monitoring pages
  - `flower/` - Celery task monitoring
  - `rabbitmq/` - Message queue management
  - `redis-insight/` - Redis database monitoring

#### 🔌 API Routes (`src/app/api/`)
- **`(auth-api)/`** - Authentication APIs
  - `auth/login/` - Multi-provider login endpoint
  - `auth/refresh/` - Token refresh for both providers
- **`(autoria-api)/`** - AutoRia marketplace APIs
  - `ads/` - Car advertisement management
  - `accounts/` - User account management
- **`(external-api)/`** - External service integrations
  - `recipes/` - DummyJSON recipes API proxy
- **`(user-api)/`** - User management APIs
  - `users/` - DummyJSON users API proxy
- **`(admin-api)/`** - Administrative APIs
  - `health/` - System health checks
  - `redis/` - Redis operations
- **`(reference-api)/`** - Reference data APIs
  - `reference/` - Car brands, models, colors
  - `public/` - Public reference data
- **`(helpers)/`** - Shared API utilities

#### 🛠️ Utils (`src/utils/`)
- **`chat/`** - Chat system utilities
- **`auth/`** - Authentication utilities
- **`api/`** - API and network utilities
- **`ui/`** - UI and notification utilities
- **`dev-tools/`** - Development tools

#### 🌍 Localization (`src/locales/`)
- **`en.ts`** - English translations
- **`ru.ts`** - Russian translations
- **`uk.ts`** - Ukrainian translations
- **`index.ts`** - Exports and metadata

## 🧪 Testing

The project uses Vitest for testing. To run all tests:

```bash
npm test
```

### Translation Management
The project includes automated translation validation:

```bash
# Check translation consistency
npm run check-translations

# Get fix suggestions with templates
npm run fix-translations
```

**Automated Validation:**
- ✅ **Pre-commit hooks** automatically validate translations
- ✅ **Blocks commits** with translation inconsistencies
- ✅ **Multi-language support** (EN, RU, UK)
- ✅ **Detailed error reporting** with fix suggestions

**Translation Files:**
- `src/locales/en.ts` - English (base language)
- `src/locales/ru.ts` - Russian translations
- `src/locales/uk.ts` - Ukrainian translations

## Test Structure

Tests are organized in the `src/__tests__` directory:

- `src/__tests__/chat/` - Tests for chat functionality
  - `ChatWebSocket.test.ts` - Tests for WebSocket connection
  - `ChatAuth.test.ts` - Tests for authentication and token refresh
  - `ChatEnvironment.test.ts` - Tests for environment-specific behavior
  - `ChatFunctionality.test.ts` - Tests for core chat functionality
  - `ChatComponents.test.tsx` - Tests for UI component integration
  - `ChatRedisIntegration.test.ts` - Tests for Redis integration

## ✨ Key Features

### 🔐 Advanced Authentication System
- **Dual-provider architecture**: Seamless switching between Backend and Dummy providers
- **Dynamic menu system**: Context-aware navigation based on active provider
- **Token management**: JWT access/refresh tokens with Redis storage
- **Route protection**: Middleware-based authentication for protected routes
- **Session persistence**: Automatic token refresh and session management
- **Provider switching**: Runtime authentication provider switching

### 🚗 AutoRia Marketplace
- **Car listings**: Create, edit, and manage car advertisements
- **Advanced search**: Filter by brand, model, year, price, location
- **User profiles**: Comprehensive user management with avatars
- **Analytics**: View statistics and performance data
- **Favorites**: Save and manage favorite listings

### 💬 AI Chat System
- **Real-time chat**: WebSocket-based chat with AI integration
- **File uploads**: Support for images and documents
- **Markdown support**: Rich text formatting with syntax highlighting
- **Chat history**: Persistent conversation storage

### 🌍 Internationalization
- **Multi-language**: English, Russian, Ukrainian support
- **Dynamic switching**: Runtime language switching
- **Translation validation**: Automated consistency checking
- **Type-safe translations**: TypeScript integration

### 🎨 Modern UI/UX
- **Responsive design**: Mobile-first approach with Tailwind CSS
- **Dark/light themes**: System preference detection
- **Animations**: Smooth transitions with Framer Motion
- **Accessibility**: WCAG compliant components

## 🔧 Development Tools

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run check-translations  # Validate translations
```

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for automated quality checks
  - ✅ **Pre-commit**: Translation consistency validation
  - ✅ **Commit-msg**: Extra checks for translation-related commits
  - ✅ **Automatic blocking**: Prevents inconsistent translations from being committed

## 📞 Contact
**Email**: pvs.versia@gmail.com

## 📋 Development Guidelines

### Adding New Features
1. **Choose provider context** - Determine if feature belongs to Backend or Dummy provider
2. **Plan the structure** - Determine which route group fits best
3. **Create translations** - Add keys to all language files
4. **Validate translations** - Run `npm run check-translations`
5. **Follow patterns** - Use existing component and utility patterns
6. **Test thoroughly** - Write tests for new functionality

### Working with Authentication Providers
- **Backend Provider**: Use for AutoRia-specific features (cars, ads, profiles)
- **Dummy Provider**: Use for external API demonstrations (recipes, users)
- **Provider switching**: Implement context-aware components that adapt to active provider
- **Menu integration**: Add new items to appropriate provider menu section

### Working with Translations
- Always add keys to **all language files** (en, ru, uk)
- Use the translation validation script before committing
- Follow the hierarchical key structure
- Never hardcode strings in components

### API Development
- Use appropriate route groups for organization
- Follow RESTful conventions
- Implement proper error handling
- Add TypeScript types for requests/responses
- Consider provider context when designing endpoints

## 🔄 Provider Switching

The application supports runtime switching between authentication providers:

### Backend Provider Features
```typescript
// Access AutoRia-specific features
- Car advertisements (CRUD operations)
- User profiles with AutoRia context
- Premium analytics and statistics
- AI chat system with WebSocket
- Content moderation system
```

### Dummy Provider Features
```typescript
// Access external API demonstrations
- Recipe browsing and search
- User management from DummyJSON
- Advanced filtering and pagination
- External API integration patterns
```

### Implementation Example
```typescript
// Components adapt to active provider
const { provider } = useAuthProvider();

if (provider === AuthProvider.MyBackendDocs) {
  // Show AutoRia functionality
} else if (provider === AuthProvider.Dummy) {
  // Show external API features
}
```