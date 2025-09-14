# 🌍 Locales Directory

This directory contains translation files for the AutoRia internationalization (i18n) system.

## 📁 Structure

```
src/locales/
├── en.ts          # English translations (base language)
├── ru.ts          # Russian translations (primary language)
├── uk.ts          # Ukrainian translations (secondary language)
└── README.md      # This file
```

## 🗣️ Supported Languages

| Language | Code | File | Status | Coverage |
|----------|------|------|--------|----------|
| English | `en` | `en.ts` | ✅ Base | ~357 keys |
| Russian | `ru` | `ru.ts` | ✅ Primary | ~368 keys |
| Ukrainian | `uk` | `uk.ts` | ✅ Secondary | ~350 keys |

## 📝 File Format

Each translation file exports a default object with nested translation keys:

```typescript
// en.ts
export default {
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "validation": {
      "required": "This field is required"
    }
  },
  "profile": {
    "title": "Profile",
    "form": {
      "firstName": "First Name",
      "lastName": "Last Name"
    }
  }
};
```

## 🔧 Usage

Translation files are automatically imported by the i18n system:

```typescript
// src/lib/i18n.ts
import enTranslations from '../locales/en';
import ruTranslations from '../locales/ru';
import ukTranslations from '../locales/uk';
```

## 🔍 Validation

Use the translation validation script to check consistency:

```bash
# Check all translation files
npm run check-translations

# The script checks:
# - Missing keys across languages
# - Extra keys in specific languages
# - File structure integrity
```

## 📋 Key Structure Guidelines

### ✅ Good Structure
```typescript
"profile": {
  "title": "Profile",
  "form": {
    "firstName": "First Name",
    "save": "Save Profile"
  },
  "avatar": {
    "upload": "Upload Avatar",
    "generate": "Generate Avatar"
  }
}
```

### ❌ Bad Structure
```typescript
"profileTitle": "Profile",
"profileFormFirstName": "First Name",
"profileFormSave": "Save Profile",
"profileAvatarUpload": "Upload Avatar"
```

## 🚀 Adding New Translations

1. **Add to all language files** simultaneously
2. **Use consistent key structure** across all files
3. **Run validation** to check consistency
4. **Test in application** to ensure proper display

### Example Workflow
```bash
# 1. Add keys to en.ts, ru.ts, uk.ts
# 2. Validate translations
npm run check-translations

# 3. If validation passes, commit changes
git add src/locales/
git commit -m "Add new translation keys"
```

## 🔗 Related Files

- **i18n Configuration**: `src/lib/i18n.ts`
- **i18n Context**: `src/contexts/I18nContext.tsx`
- **Validation Script**: `src/utils/dev-tools/check-translations.js`
- **Documentation**: `docs/i18n-system-guide.md`

## 📊 Translation Statistics

Run the validation script to see current statistics:
- Total keys per language
- Missing keys
- Extra keys
- Consistency status

For detailed usage instructions, see the [i18n System Guide](../../../docs/i18n-system-guide.md).
