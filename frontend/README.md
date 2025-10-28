# 🚗 AutoRia Frontend Проект

Сучасний Next.js 15 додаток з **архітектурою подвійного провайдера автентифікації**, що включає функціонал AutoRia автомобільного маркетплейсу, інтеграції зовнішніх API та AI чат-систему.

## 🚀 Швидкий старт

```sh
git clone <repository URL>
cd frontend
npm install --legacy-peer-deps  # ⚠️ ОБОВ'ЯЗКОВИЙ ФЛАГ!
npm run dev
```

> **⚠️ ВАЖЛИВО**: Завжди використовуйте `--legacy-peer-deps` при встановленні залежностей!
> 
> **Чому?** Проект використовує React 19 з налаштуваннями сумісності для бібліотек React 18.
> Флаг `--legacy-peer-deps` дозволяє npm коректно обробити залежності.
> 
> **Що робити при проблемах?**
> - Прочитайте `REACT_COMPATIBILITY.md` - детальна документація
> - Прочитайте `QUICK_FIX_REACT.md` - швидкі рішення
> - Запустіть `.\scripts\fix-react-deps.ps1` (Windows) або `bash scripts/fix-react-deps.sh` (Linux/Mac)

## 🔧 Встановлення нового пакета

```sh
# ЗАВЖДИ використовуйте --legacy-peer-deps
npm install <package-name> --legacy-peer-deps
```

## 🛠️ Технології
- **React 19.1.0** - Останній React з concurrent функціями
- **Next.js 15.4.1** - App Router з серверними компонентами
- **TypeScript 5.8.3** - Типобезпечна розробка
- **TanStack Query** - Управління серверним станом
- **Tailwind CSS** - Utility-first CSS фреймворк
- **Shadcn/UI** - Сучасна бібліотека компонентів
- **Framer Motion** - Бібліотека анімацій
- **NextAuth.js** - Рішення для автентифікації
- **Redis** - Кешування та зберігання сесій
- **i18n** - Інтернаціоналізація (EN, RU, UK)

## 🏗️ Архітектура проекту

### 🔐 Система подвійного провайдера автентифікації

Проект реалізує **складну архітектуру подвійного провайдера автентифікації**, що дозволяє перемикатися між різними джерелами даних та функціоналом:

#### 1. **Backend Provider** (`AuthProvider.MyBackendDocs`)
- **Призначення**: Основний функціонал AutoRia з Django backend
- **Endpoint**: `http://localhost:8000` (локально) / `http://app:8000` (Docker)
- **Функції**:
  - 🚗 **AutoRia Маркетплейс** - Автомобільні оголошення та управління
  - 👤 **Профілі користувачів** - Комплексне управління користувачами
  - 📊 **Панель аналітики** - Статистика для преміум користувачів
  - 💬 **AI Чат-система** - Реальний час WebSocket чат з AI
  - 🛡️ **Модерація контенту** - Автоматичне виявлення нецензурної лексики
  - 💰 **Валютна система** - Підтримка багатьох валют (USD, EUR, UAH)

#### 2. **Dummy Provider** (`AuthProvider.Dummy`)
- **Призначення**: Демонстрація інтеграції зовнішніх API
- **Endpoint**: `https://dummyjson.com`
- **Функції**:
  - 🍳 **Система рецептів** - Інтеграція зовнішніх даних рецептів
  - 👥 **Управління користувачами** - Зовнішні профілі користувачів
  - 🔍 **Пошук та фільтрація** - Розширені можливості фільтрації
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