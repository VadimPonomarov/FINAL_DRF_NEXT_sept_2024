# 🌍 Translation Workflow Guide

This guide explains how to work with translations in the project and how the automated validation works.

## 📋 Quick Reference

### Commands
```bash
# Check translation consistency
npm run check-translations

# Get help fixing translations
npm run fix-translations

# Test pre-commit hook
git add . && git commit -m "test: translation check"
```

### Files
- `src/locales/en.ts` - English translations (base)
- `src/locales/ru.ts` - Russian translations
- `src/locales/uk.ts` - Ukrainian translations

## 🔄 Workflow

### 1. Adding New Features
When adding new UI elements that need translation:

1. **Add English keys first** (base language):
   ```typescript
   // src/locales/en.ts
   export default {
     // ... existing keys
     "newFeature": {
       "title": "New Feature",
       "description": "Feature description",
       "button": "Click Me"
     }
   }
   ```

2. **Add corresponding translations**:
   ```typescript
   // src/locales/ru.ts
   "newFeature": {
     "title": "Новая функция",
     "description": "Описание функции", 
     "button": "Нажми меня"
   }
   
   // src/locales/uk.ts
   "newFeature": {
     "title": "Нова функція",
     "description": "Опис функції",
     "button": "Натисни мене"
   }
   ```

3. **Use in components**:
   ```typescript
   import { useTranslation } from '@/hooks/useTranslation';
   
   const { t } = useTranslation();
   
   return (
     <div>
       <h1>{t('newFeature.title')}</h1>
       <p>{t('newFeature.description')}</p>
       <button>{t('newFeature.button')}</button>
     </div>
   );
   ```

### 2. Before Committing
The pre-commit hook automatically runs translation validation:

```bash
git add .
git commit -m "feat: add new feature"

# Output:
# 🔍 Running pre-commit checks...
# 📝 Checking translation consistency...
# ✅ All pre-commit checks passed!
```

### 3. If Validation Fails
```bash
# Output:
# ❌ Translation check failed! Please fix translation inconsistencies before committing.
# 💡 Run 'npm run check-translations' to see detailed issues.

# Get detailed report
npm run check-translations

# Get fix suggestions
npm run fix-translations
```

## 🛠️ Automated Tools

### Pre-commit Hook
- **Location**: `.husky/pre-commit`
- **Triggers**: Every `git commit`
- **Action**: Validates translation consistency
- **Blocks**: Commits with translation issues

### Commit Message Hook
- **Location**: `.husky/commit-msg`
- **Triggers**: Commits mentioning translations
- **Keywords**: `translation`, `translate`, `locale`, `i18n`, `lang`
- **Action**: Extra validation for translation-related commits

### Translation Checker
- **Script**: `src/utils/dev-tools/check-translations.js`
- **Command**: `npm run check-translations`
- **Features**:
  - ✅ Detects missing keys
  - ✅ Finds extra keys
  - ✅ Reports inconsistencies
  - ✅ Exits with error code for CI/CD

### Translation Fixer
- **Script**: `src/utils/dev-tools/fix-translations.js`
- **Command**: `npm run fix-translations`
- **Features**:
  - 🔧 Suggests missing key templates
  - 🔧 Provides smart translations
  - 🔧 Shows exact code to add

## 🚨 Common Issues & Solutions

### Missing Keys
```
❌ Missing keys in RU:
   - profile.contact.add
   - profile.contact.list
```

**Solution**: Add the missing keys to `src/locales/ru.ts`:
```typescript
"profile": {
  "contact": {
    "add": "Добавить контакт",
    "list": "Список контактов"
  }
}
```

### Extra Keys
```
⚠️ Extra keys in EN (not in other languages):
   + profile.oldFeature
```

**Solutions**:
1. **Add to other languages** if the feature is still used
2. **Remove from English** if the feature was removed

### Nested Structure
Keys must maintain the same nested structure:

```typescript
// ✅ Correct - same structure
// EN
"profile": { "contact": { "add": "Add" } }
// RU  
"profile": { "contact": { "add": "Добавить" } }

// ❌ Wrong - different structure
// EN
"profile": { "contact": { "add": "Add" } }
// RU
"profile.contact.add": "Добавить"
```

## 🎯 Best Practices

### 1. Key Naming
- Use descriptive, hierarchical keys
- Group related translations
- Use camelCase for consistency

```typescript
// ✅ Good
"profile": {
  "contact": {
    "addButton": "Add Contact",
    "editButton": "Edit Contact"
  }
}

// ❌ Avoid
"addContactBtn": "Add Contact",
"editContactBtn": "Edit Contact"
```

### 2. Translation Quality
- Keep translations contextually appropriate
- Maintain consistent tone across languages
- Consider cultural differences

### 3. Testing
- Always test UI with different languages
- Check text overflow with longer translations
- Verify special characters display correctly

## 🔧 Emergency Procedures

### Skip Validation (Emergency Only)
```bash
# Skip all hooks
git commit --no-verify -m "emergency fix"

# Temporarily disable Husky
export HUSKY=0
git commit -m "commit without hooks"
unset HUSKY
```

### Fix After Emergency Commit
```bash
# Check what needs fixing
npm run check-translations

# Get fix suggestions
npm run fix-translations

# Apply fixes and commit
git add .
git commit -m "fix: resolve translation inconsistencies"
```

## 📊 Integration with CI/CD

The translation check can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Check translations
  run: npm run check-translations
```

The script exits with code 1 on inconsistencies, failing the build appropriately.

## 🎉 Benefits

- 🛡️ **Prevents broken translations** in production
- 🔄 **Automatic validation** on every commit
- 🌍 **Multi-language consistency** guaranteed
- 📊 **Clear reporting** of issues
- ⚡ **Fast feedback** during development
- 🔧 **Helpful fix suggestions** for developers
