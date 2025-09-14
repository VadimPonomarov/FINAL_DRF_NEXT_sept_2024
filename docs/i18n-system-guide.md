# 🌍 Посібник з системи інтернаціоналізації (i18n) AutoRia

## 📋 Зміст
- [Огляд](#огляд)
- [Архітектура](#архітектура)
- [Структура файлів](#структура-файлів)
- [Структура ключів перекладу](#структура-ключів-перекладу)
- [Використання в компонентах](#використання-в-компонентах)
- [Додавання нових перекладів](#додавання-нових-перекладів)
- [Валідація перекладів](#валідація-перекладів)
- [Валідація з i18n](#валідація-з-i18n)
- [Модульна структура утиліт](#модульна-структура-утиліт)
- [Найкращі практики](#найкращі-практики)
- [Усунення неполадок](#усунення-неполадок)
- [Останні оновлення](#останні-оновлення)
- [Посібник з міграції](#посібник-з-міграції)

## 🎯 Огляд

AutoRia використовує кастомну i18n систему побудовану на React Context API з підтримкою TypeScript. Система підтримує три мови:
- **Англійська (en)** - Базова мова
- **Російська (ru)** - Основна мова (за замовчуванням)
- **Українська (uk)** - Вторинна мова

**Поточний статус (Оновлено 2024):**
✅ **Повністю функціональна** - Система працює правильно з комплексним покриттям перекладів
✅ **Сторінка профілю** - Повна підтримка перекладу для управління профілем користувача
✅ **Генерація аватарів** - Багатомовна підтримка для функцій генерації AI аватарів
✅ **Управління адресами** - Локалізовані форми адрес з вибором регіону/міста
✅ **Налаштування акаунту** - Перекладені опції типу акаунту, ролі та рівня модерації

## 🏗️ Architecture

### Core Components

1. **I18nContext** (`frontend/src/contexts/I18nContext.tsx`)
   - Provides translation functions and language switching
   - Manages current language state with localStorage persistence
   - Provides date/number/currency formatting utilities
   - Default locale: Ukrainian (uk)

2. **Translation Files** (`frontend/src/locales/`)
   - TypeScript files with structured translation objects
   - Hierarchical key-value pairs for organized translations
   - Type-safe translation keys with nested object support
   - Index file for convenient imports and metadata

3. **i18n Configuration** (`frontend/src/lib/i18n.ts`)
   - Imports and configures all translation files
   - Sets up language mappings and locale configurations
   - Provides utility functions for translation retrieval

4. **Root Provider Integration** (`frontend/src/common/providers/RootProvider.tsx`)
   - I18nProvider wraps the entire application
   - Ensures translation context is available globally
   - Integrated with other context providers (Auth, Notifications, etc.)

### Data Flow
```
Component → useI18n() → I18nContext → Translation Files → Localized Text
                ↓
        localStorage ← Language Selection → Browser Display
```

### Language Detection & Storage
- **Default Language**: Ukrainian (uk)
- **Storage**: localStorage with key 'locale'
- **Fallback**: English (en) if translation key not found
- **Auto-detection**: Browser language preference (future enhancement)

## 📁 File Structure

```
frontend/src/
├── contexts/
│   └── I18nContext.tsx          # Main i18n context provider with hooks
├── lib/
│   └── i18n.ts                  # i18n configuration and utilities
├── locales/                     # Translation files directory
│   ├── en.ts                    # English translations (base/fallback)
│   ├── ru.ts                    # Russian translations (comprehensive)
│   ├── uk.ts                    # Ukrainian translations (default)
│   ├── index.ts                 # Exports and metadata
│   └── README.md                # Locales documentation
├── common/providers/
│   └── RootProvider.tsx         # Root provider with I18nProvider integration
└── hooks/
    └── useI18n.ts              # Custom hook for accessing translations
```

### Translation File Size & Coverage
- **en.ts**: ~573 lines (base translations)
- **ru.ts**: ~600+ lines (most comprehensive)
- **uk.ts**: ~580+ lines (complete coverage)
- **Total Keys**: 200+ translation keys across all categories

### Translation File Format

Each translation file exports a default object with hierarchical nested structure:

```typescript
export default {
  // Top-level keys for common elements
  "searchTitle": "Search Cars",
  "myAdsTitle": "My Ads",

  // Deeply nested objects for organized sections
  "profile": {
    "title": "User Profile",
    "personalInfo": "Personal Information",
    "accountSettings": "Account Settings",
    "addresses": "Addresses",

    // Sub-sections with specific functionality
    "avatar": {
      "upload": "Upload Avatar",
      "generate": "Generate AI Avatar",
      "generating": "Generating...",
      "success": "Avatar generated successfully",
      "failed": "Avatar generation failed",
      "title": "Avatar Settings",
      "style": "Style",
      "gender": "Gender",
      "customRequirements": "Custom Requirements"
    },

    "form": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "age": "Age",
      "email": "Email",
      "save": "Save",
      "saving": "Saving...",
      "firstNamePlaceholder": "Enter first name",
      "lastNamePlaceholder": "Enter last name"
    },

    "address": {
      "add": "Add Address",
      "edit": "Edit",
      "delete": "Delete",
      "save": "Save",
      "cancel": "Cancel",
      "region": "Region",
      "locality": "City/Locality",
      "regionPlaceholder": "Select region",
      "localityPlaceholder": "Select city",
      "selectRegionFirst": "Select region first"
    }
  },

  "autoria": {
    "title": "CarHub",
    "myAds": "My Ads",
    "profile": "Profile"
  }
};
```

## 🗂️ Translation Keys Structure

### Naming Convention
- Use **camelCase** for keys: `firstName`, `selectVehicleType`
- Use **descriptive names**: `enterTitle` instead of `enter1`
- Group related keys in **nested objects**: `profile.title`, `autoria.myAds`

### Key Categories

#### 1. Page Titles
```typescript
"searchTitle": "Search Cars",
"myAdsTitle": "My Ads",
"favoritesTitle": "Favorites"
```

#### 2. Form Fields
```typescript
"title": "Title",
"description": "Description",
"vehicleType": "Vehicle Type",
"brand": "Brand"
```

#### 3. Placeholders
```typescript
"enterTitle": "Enter title",
"selectBrand": "Select brand",
"searchPlaceholder": "Search cars..."
```

#### 4. Actions
```typescript
"save": "Save",
"cancel": "Cancel",
"continue": "Continue",
"delete": "Delete"
```

#### 5. Nested Sections
```typescript
"profile": {
  "title": "User Profile",
  "personalInfo": "Personal Information",
  "avatar": {
    "upload": "Upload Avatar",
    "generate": "Generate AI"
  }
},
"autoria": {
  "title": "CarHub",
  "myAds": "My Ads",
  "searchCars": "Search Cars"
}
```

## 🔧 Usage in Components

### Basic Usage

```typescript
import { useI18n } from '@/contexts/I18nContext';

const MyComponent = () => {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('searchTitle')}</h1>
      <p>{t('profile.personalInfo')}</p>
    </div>
  );
};
```

### Available Functions

```typescript
const { 
  t,              // Translation function
  language,       // Current language ('en' | 'ru' | 'uk')
  setLanguage,    // Language setter
  formatDate      // Date formatting function
} = useI18n();
```

### Date Formatting

```typescript
const { formatDate } = useI18n();

// Format with options
const formattedDate = formatDate(new Date(), {
  day: '2-digit',
  month: '2-digit', 
  year: 'numeric'
});
```

### Language Switching

```typescript
const { setLanguage } = useI18n();

// Switch to Russian
setLanguage('ru');

// Switch to Ukrainian  
setLanguage('uk');

// Switch to English
setLanguage('en');
```

## ➕ Adding New Translations

### Step-by-Step Process

1. **Add to English file first** (`en.ts`)
```typescript
// Add new key
"newFeature": "New Feature",
"newSection": {
  "title": "New Section",
  "description": "Section description"
}
```

2. **Add to Russian file** (`ru.ts`)
```typescript
"newFeature": "Новая функция",
"newSection": {
  "title": "Новый раздел", 
  "description": "Описание раздела"
}
```

3. **Add to Ukrainian file** (`uk.ts`)
```typescript
"newFeature": "Нова функція",
"newSection": {
  "title": "Новий розділ",
  "description": "Опис розділу"
}
```

4. **Use in component**
```typescript
<h2>{t('newFeature')}</h2>
<p>{t('newSection.description')}</p>
```

### Validation Checklist
- [ ] Key exists in all three files (`en.ts`, `ru.ts`, `uk.ts`)
- [ ] Key structure is identical across files
- [ ] Translations are accurate and contextual
- [ ] No typos in key names
- [ ] Follows naming conventions

## 🔍 Translation Validation

### Automated Translation Checker

The project includes an automated script to validate translation consistency across all language files.

**Location**: `frontend/src/utils/check-translations.js`

#### Usage

```bash
# Run translation validation
npm run check-translations

# Or run directly
node src/utils/check-translations.js
```

#### What it checks

✅ **Missing Keys**: Keys present in one language but missing in others
✅ **Extra Keys**: Keys present in one language but not in others
✅ **Key Count**: Total number of keys in each language file
✅ **File Structure**: Validates that all translation files can be loaded

#### Example Output

```bash
🔍 Checking translation files...

📁 Loading en: en.ts
   ✅ Loaded 352 keys
📁 Loading ru: ru.ts
   ✅ Loaded 368 keys
📁 Loading uk: uk.ts
   ✅ Loaded 350 keys

🔍 Comparing translation keys...

❌ Missing keys in EN:
   - profile.account.selectAccountType
   - profile.roles.dealer
   - profile.moderationLevels.strict

✅ RU: All keys present

❌ Missing keys in UK:
   - profile.account.selectAccountType
   - profile.roles.dealer

💡 To fix missing keys, add them to the respective translation files.
```

#### Integration with Development Workflow

**Before making changes:**
```bash
# 1. Check current state
npm run check-translations

# 2. Add missing keys to all language files
# 3. Verify fixes
npm run check-translations

# 4. Only then use keys in code
```

**Pre-commit Hook** (recommended):
Add to your git hooks or CI/CD pipeline:
```bash
npm run check-translations || exit 1
```

#### Common Fixes

**Missing Keys:**
```typescript
// Add to all language files (en.ts, ru.ts, uk.ts)
"profile": {
  "account": {
    "selectAccountType": "Select account type" // en
    "selectAccountType": "Выберите тип аккаунта" // ru
    "selectAccountType": "Оберіть тип акаунту" // uk
  }
}
```

**Extra Keys:**
Either add the key to other languages or remove it if unused.

## 🔧 Validation with i18n

### Using Translation Keys in Joi Schemas

Instead of hardcoding validation messages, use existing translation keys:

```typescript
// ❌ Bad - Hardcoded messages
export const carAdSchema = Joi.object({
  title: Joi.string()
    .required()
    .messages({
      'string.empty': 'Заголовок обязателен' // Hardcoded Russian
    })
});

// ✅ Good - Using i18n
export const createCarAdSchema = (t: TranslationFunction) => Joi.object({
  title: Joi.string()
    .required()
    .messages({
      'string.empty': t('common.validation.requiredFields'),
      'string.min': `${t('autoria.title')} must be at least 10 characters`
    })
});
```

### Schema Organization

Schemas are organized by module:
- **Component-specific**: `src/components/[Module]/schemas/`
- **Shared schemas**: `src/schemas/` (for common validation schemas)

Example structure:
```
src/
├── components/
│   └── AutoRia/
│       └── schemas/
│           └── autoria.schemas.ts
└── schemas/
    ├── common.schemas.ts
    └── user.schemas.ts
```

### Using Validation Schemas

```typescript
import { useI18n } from '@/contexts/I18nContext';
import { createCarAdSchema } from '../schemas/autoria.schemas';

const MyForm = () => {
  const { t } = useI18n();
  const schema = createCarAdSchema(t);

  // Use schema for validation
  const { error } = schema.validate(formData);
};
```

## 🏗️ Modular Utils Structure

### New Organization

Utils are now organized by functionality:

```
src/utils/
├── chat/           # Chat system utilities
│   ├── chatTypes.ts
│   ├── chatStorage.ts
│   ├── logger.ts
│   └── index.ts
├── auth/           # Authentication utilities
│   ├── serverAuth.ts
│   └── index.ts
├── api/            # API and network utilities
│   ├── env.ts
│   ├── getBaseUrl.ts
│   └── index.ts
├── ui/             # UI and notification utilities
│   ├── notificationUtils.ts
│   └── index.ts
└── dev-tools/      # Development tools
    └── check-translations.js
```

### Import Examples

```typescript
// ✅ Modular imports
import { Message, ChatChunk } from '@/utils/chat';
import { ServerAuthManager } from '@/utils/auth';
import { getRuntimeEnv } from '@/utils/api';
import { useErrorHandler } from '@/utils/ui';

// ❌ Old way (still works but not recommended)
import { Message } from '@/utils/chat/chatTypes';
```

## ✅ Best Practices

### 1. Key Naming
```typescript
// ✅ Good
"selectVehicleType": "Select vehicle type",
"enterFirstName": "Enter first name",
"profile.avatar.upload": "Upload Avatar"

// ❌ Bad  
"select1": "Select vehicle type",
"enter_first_name": "Enter first name",
"profileAvatarUpload": "Upload Avatar"
```

### 2. Structure Organization
```typescript
// ✅ Good - Organized by feature
"profile": {
  "title": "Profile",
  "form": {
    "firstName": "First Name",
    "lastName": "Last Name"
  },
  "avatar": {
    "upload": "Upload",
    "generate": "Generate"
  }
}

// ❌ Bad - Flat structure
"profileTitle": "Profile",
"profileFormFirstName": "First Name",
"profileAvatarUpload": "Upload"
```

### 3. Consistency
- Use same key names across all language files
- Maintain identical nested structure
- Keep translations contextually appropriate

### 4. Validation Messages
```typescript
// ✅ Good - Use existing translation keys
const schema = createSchema((t) => ({
  title: Joi.string()
    .required()
    .messages({
      'string.empty': t('common.validation.requiredFields'),
      'string.min': `${t('autoria.title')} must be at least 10 characters`
    })
}));

// ❌ Bad - Hardcoded validation messages
const schema = Joi.object({
  title: Joi.string()
    .required()
    .messages({
      'string.empty': 'Заголовок обязателен' // Hardcoded Russian
    })
});
```

### 5. Modular Organization
```typescript
// ✅ Good - Organized imports
import { Message, ChatChunk } from '@/utils/chat';
import { ServerAuthManager } from '@/utils/auth';

// ✅ Good - Component-specific schemas
import { createCarAdSchema } from '../schemas/autoria.schemas';

// ❌ Bad - Direct file imports
import { Message } from '@/utils/chat/chatTypes';
import { carAdSchema } from '@/validation/autoria.schemas';
```

### 6. Avoid
- Hardcoded strings in components
- Hardcoded validation messages
- Emoji in translation keys (only in values)
- Inconsistent key structures
- Duplicate translation files
- Mixing languages in validation schemas

## 🆕 Recent Updates

### August 2025 - Modular Architecture & Validation

#### 🏗️ **Modular Utils Structure**
- **Reorganized utilities** by functionality into modules
- **Chat utilities**: `src/utils/chat/` - All chat-related utilities
- **Auth utilities**: `src/utils/auth/` - Authentication management
- **API utilities**: `src/utils/api/` - Network and environment utilities
- **UI utilities**: `src/utils/ui/` - Notifications and UI helpers
- **Dev tools**: `src/utils/dev-tools/` - Development and testing tools

#### 🔍 **Translation Validation System**
- **Automated checker**: `check-translations.js` script
- **Missing key detection**: Finds keys present in one language but missing in others
- **Extra key detection**: Identifies orphaned translation keys
- **CI/CD integration**: Can be used in pre-commit hooks
- **Command**: `npm run check-translations`

#### 📝 **Schema Organization**
- **Component-specific schemas**: Moved to `src/components/[Module]/schemas/`
- **Shared schemas**: Available in `src/schemas/` for common validation
- **i18n integration**: Schemas now use translation functions instead of hardcoded messages
- **AutoRia schemas**: Moved from `src/validation/` to `src/components/AutoRia/schemas/`

#### 🌍 **Locales Reorganization**
- **New location**: Translation files moved from `src/messages/` to `src/locales/`
- **Index file**: Added `src/locales/index.ts` for convenient imports
- **Metadata support**: Language metadata with flags and native names
- **Documentation**: Added `src/locales/README.md` with usage guidelines
- **Type safety**: Enhanced TypeScript support for translations

#### 🧹 **Cleanup & Optimization**
- **Removed unused utilities**: Cleaned up 14+ unused utility files
- **Updated imports**: All imports updated to use new modular structure
- **Documentation**: Comprehensive documentation for new architecture

### December 2024 - Major System Overhaul

#### ✅ **Fixed Issues**
- **Translation Loading**: Resolved issues with translation files not loading properly
- **Missing Keys**: Added 50+ missing translation keys for profile management
- **Cache Problems**: Fixed Next.js build cache issues affecting i18n system
- **Provider Integration**: Ensured I18nProvider is properly integrated in RootProvider

#### 🔧 **Enhanced Features**
- **Profile Management**: Complete translation coverage for user profile forms
- **Avatar Generation**: Multi-language support for AI avatar generation interface
- **Address Management**: Localized address forms with region/city selection
- **Account Settings**: Translated account types, roles, and moderation levels
- **Form Validation**: Localized error messages and placeholders

#### 📊 **Translation Coverage**
- **Profile Section**: 40+ keys (forms, avatar, account settings)
- **Address Section**: 20+ keys (regions, cities, validation)
- **Avatar Generation**: 15+ keys (styles, genders, options)
- **Account Management**: 25+ keys (types, roles, moderation)
- **Navigation**: 10+ keys (menus, buttons, actions)

#### 🎯 **Key Improvements**
```typescript
// Before: Missing translations
t('profile.avatar.generating') // → 'profile.avatar.generating'

// After: Proper translations
t('profile.avatar.generating') // → 'Генерация...' (ru) / 'Генерація...' (uk)
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Missing Translation Key
**Error**: `Translation key 'someKey' not found`
**Solution**: Add the key to all three translation files (`en.ts`, `ru.ts`, `uk.ts`)

#### 2. Build Error - File Not Found
**Error**: `Failed to read source code from uk.ts`
**Solution**: Ensure all three files exist and are properly formatted

#### 3. Inconsistent Structure
**Error**: Translation returns `undefined`
**Solution**: Check that nested object structure matches exactly across all files

#### 4. Cache Issues
**Error**: Translations not updating after changes
**Solution**: Clear Next.js cache: `rm -rf .next && npm run dev`

#### 5. Provider Not Working
**Error**: `useI18n` hook returns undefined
**Solution**: Ensure I18nProvider is wrapped around your app in RootProvider

### Debugging Steps

1. **Check file existence and structure**
```bash
ls frontend/src/locales/
# Should show: en.ts, ru.ts, uk.ts, index.ts, README.md
```

2. **Validate key structure in browser console**
```typescript
// Test translation function
const { t } = useI18n();
console.log(t('profile.avatar.upload')); // Should return translated text
console.log(t('profile.form.firstName')); // Should not be undefined

// Check current locale
console.log(localStorage.getItem('locale')); // Should show 'uk', 'ru', or 'en'
```

3. **Clear build cache and restart**
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev

# Linux/Mac
rm -rf .next && npm run dev
```

4. **Verify Provider Integration**
```typescript
// Check if I18nProvider is properly wrapped
// In frontend/src/common/providers/RootProvider.tsx
<I18nProvider>
  <AuthProvider>
    {/* Other providers */}
  </AuthProvider>
</I18nProvider>
```

5. **Test Translation Loading**
```typescript
// Add temporary logging in component
const { t, locale } = useI18n();
console.log('Current locale:', locale);
console.log('Translation test:', t('profile.title'));
```

## 🔄 Migration Guide

### Current System Status
✅ **No Migration Needed** - System is fully functional with TypeScript files

### Historical Migration (Completed)

The system has been successfully migrated from JSON to TypeScript files:

#### ✅ **Completed Steps**
1. **Translation Files**: All files converted from `.json` to `.ts` format
2. **Import System**: Updated to use TypeScript imports in `lib/i18n.ts`
3. **Type Safety**: Added TypeScript interfaces for translation keys
4. **Provider Integration**: I18nProvider properly integrated in RootProvider
5. **Cache Resolution**: Fixed Next.js build cache issues

#### 📁 **Current File Structure**
```typescript
// frontend/src/locales/en.ts
export default {
  "profile": {
    "title": "User Profile",
    "avatar": {
      "upload": "Upload Avatar",
      "generate": "Generate AI Avatar"
    }
  }
};

// frontend/src/locales/index.ts
import en from './en';
import ru from './ru';
import uk from './uk';

export { en, ru, uk };
export const translations = { en, ru, uk };

// frontend/src/lib/i18n.ts
import { translations } from '../locales';
const { en: enTranslations, ru: ruTranslations, uk: ukTranslations } = translations;
```

### Adding New Language

To add a new language (e.g., Polish):

1. **Create translation file**
```typescript
// frontend/src/locales/pl.ts
export default {
  // Copy structure from en.ts and translate
};
```

2. **Update locales index**
```typescript
// frontend/src/locales/index.ts
import pl from './pl';

export { en, ru, uk, pl };
export const translations = { en, ru, uk, pl };
```

3. **Update i18n configuration**
```typescript
// frontend/src/lib/i18n.ts
import { translations } from '../locales';
const { pl: plTranslations } = translations;

const messages = {
  en,
  ru, 
  uk,
  pl  // Add new language
};
```

3. **Update context types**
```typescript
// Add 'pl' to language type
type Language = 'en' | 'ru' | 'uk' | 'pl';
```

## 📝 Summary

The AutoRia i18n system provides:
- **Type-safe translations** with TypeScript
- **Organized structure** with nested objects
- **Three language support** (en, ru, uk)
- **React Context integration** for easy usage
- **Date formatting utilities**

Remember: Always maintain consistency across all translation files and follow the established naming conventions for optimal maintainability.
