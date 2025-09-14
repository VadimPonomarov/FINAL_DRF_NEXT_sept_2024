#!/usr/bin/env node

/**
 * Auto Translation Fixer - Intelligent automatic translation problem resolver
 * Integrates with Husky to automatically fix translation issues during commits
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AutoTranslationFixer {
  constructor() {
    this.localesDir = 'src/locales';
    this.languages = ['en', 'ru', 'uk'];
    this.translations = {};
    this.changes = [];
  }

  /**
   * Main entry point - fix all translation issues
   */
  async fixAll() {
    console.log('🤖 Auto Translation Fixer - Starting automatic repair...\n');

    try {
      // Load current translations
      await this.loadTranslations();
      
      // Analyze issues
      const issues = await this.analyzeIssues();
      
      if (issues.totalIssues === 0) {
        console.log('✅ No translation issues found. All good!');
        return true;
      }

      console.log(`🔍 Found ${issues.totalIssues} translation issues to fix:\n`);
      
      // Auto-fix issues
      await this.fixMissingKeys(issues.missing);
      await this.fixInconsistentKeys(issues.inconsistent);
      
      // Save changes
      await this.saveChanges();
      
      // Verify fixes
      const verification = await this.verifyFixes();
      
      if (verification.success) {
        console.log('\n🎉 All translation issues have been automatically fixed!');
        console.log(`📊 Summary: ${this.changes.length} changes made across ${this.languages.length} languages`);
        return true;
      } else {
        console.log('\n❌ Some issues could not be automatically fixed.');
        console.log('💡 Manual intervention may be required.');
        return false;
      }
      
    } catch (error) {
      console.error(`💥 Auto-fixer failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Load all translation files
   */
  async loadTranslations() {
    console.log('📁 Loading translation files...');
    
    for (const lang of this.languages) {
      const filePath = path.join(this.localesDir, `${lang}.ts`);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/);
        
        if (match) {
          this.translations[lang] = {
            content,
            object: eval(`(${match[1]})`),
            keys: new Set()
          };
          
          // Extract all keys
          this.extractKeys(this.translations[lang].object, '', this.translations[lang].keys);
          console.log(`   ✅ ${lang}: ${this.translations[lang].keys.size} keys`);
        }
      }
    }
  }

  /**
   * Extract keys from nested object
   */
  extractKeys(obj, prefix, keySet) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractKeys(value, fullKey, keySet);
      } else {
        keySet.add(fullKey);
      }
    }
  }

  /**
   * Analyze translation issues
   */
  async analyzeIssues() {
    console.log('🔍 Analyzing translation consistency...');
    
    const allKeys = new Set();
    const issues = {
      missing: {},
      inconsistent: {},
      totalIssues: 0
    };

    // Collect all unique keys
    for (const lang of this.languages) {
      if (this.translations[lang]) {
        this.translations[lang].keys.forEach(key => allKeys.add(key));
      }
    }

    // Find missing and inconsistent keys
    for (const key of allKeys) {
      const presentIn = [];
      const missingIn = [];

      for (const lang of this.languages) {
        if (this.translations[lang] && this.translations[lang].keys.has(key)) {
          presentIn.push(lang);
        } else {
          missingIn.push(lang);
        }
      }

      if (missingIn.length > 0) {
        if (presentIn.length > 0) {
          // Inconsistent - exists in some languages but not others
          issues.inconsistent[key] = { presentIn, missingIn };
        } else {
          // Missing everywhere (shouldn't happen, but handle it)
          issues.missing[key] = this.languages.slice();
        }
        issues.totalIssues++;
      }
    }

    return issues;
  }

  /**
   * Fix missing keys by copying from existing languages
   */
  async fixMissingKeys(missingKeys) {
    if (Object.keys(missingKeys).length === 0) return;

    console.log('🔧 Fixing missing keys...');
    
    for (const [key, missingLanguages] of Object.entries(missingKeys)) {
      // Generate translation for missing languages
      for (const lang of missingLanguages) {
        const translation = this.generateTranslation(key, lang);
        this.addKeyToLanguage(lang, key, translation);
        console.log(`   ✅ Added "${key}" to ${lang}: "${translation}"`);
      }
    }
  }

  /**
   * Fix inconsistent keys by copying from existing languages
   */
  async fixInconsistentKeys(inconsistentKeys) {
    if (Object.keys(inconsistentKeys).length === 0) return;

    console.log('🔧 Fixing inconsistent keys...');
    
    for (const [key, info] of Object.entries(inconsistentKeys)) {
      const { presentIn, missingIn } = info;
      
      // Get the source translation (prefer English, then first available)
      const sourceLang = presentIn.includes('en') ? 'en' : presentIn[0];
      const sourceTranslation = this.getKeyValue(sourceLang, key);
      
      // Add to missing languages
      for (const lang of missingIn) {
        const translation = this.generateTranslationFromSource(sourceTranslation, lang, key);
        this.addKeyToLanguage(lang, key, translation);
        console.log(`   ✅ Added "${key}" to ${lang}: "${translation}"`);
      }
    }
  }

  /**
   * Generate translation for a key and language
   */
  generateTranslation(key, language) {
    // Smart translation generation based on key structure and language
    const keyParts = key.split('.');
    const lastPart = keyParts[keyParts.length - 1];

    // Check if this key already exists to ensure uniqueness
    const existingTranslation = this.getKeyValue(language, key);
    if (existingTranslation) {
      return existingTranslation;
    }

    // Common translation patterns
    const patterns = {
      en: {
        'add': 'Add', 'edit': 'Edit', 'delete': 'Delete', 'save': 'Save',
        'cancel': 'Cancel', 'confirm': 'Confirm', 'loading': 'Loading...',
        'error': 'Error', 'success': 'Success', 'warning': 'Warning',
        'info': 'Information', 'search': 'Search', 'filter': 'Filter',
        'select': 'Select', 'choose': 'Choose', 'upload': 'Upload',
        'download': 'Download', 'create': 'Create', 'update': 'Update',
        'remove': 'Remove', 'clear': 'Clear', 'reset': 'Reset',
        'submit': 'Submit', 'apply': 'Apply', 'close': 'Close',
        'open': 'Open', 'show': 'Show', 'hide': 'Hide',
        'placeholder': 'Enter value', 'required': 'Required',
        'optional': 'Optional', 'invalid': 'Invalid', 'valid': 'Valid'
      },
      ru: {
        'add': 'Добавить', 'edit': 'Редактировать', 'delete': 'Удалить', 'save': 'Сохранить',
        'cancel': 'Отмена', 'confirm': 'Подтвердить', 'loading': 'Загрузка...',
        'error': 'Ошибка', 'success': 'Успешно', 'warning': 'Предупреждение',
        'info': 'Информация', 'search': 'Поиск', 'filter': 'Фильтр',
        'select': 'Выбрать', 'choose': 'Выбрать', 'upload': 'Загрузить',
        'download': 'Скачать', 'create': 'Создать', 'update': 'Обновить',
        'remove': 'Удалить', 'clear': 'Очистить', 'reset': 'Сбросить',
        'submit': 'Отправить', 'apply': 'Применить', 'close': 'Закрыть',
        'open': 'Открыть', 'show': 'Показать', 'hide': 'Скрыть',
        'placeholder': 'Введите значение', 'required': 'Обязательно',
        'optional': 'Необязательно', 'invalid': 'Неверно', 'valid': 'Верно'
      },
      uk: {
        'add': 'Додати', 'edit': 'Редагувати', 'delete': 'Видалити', 'save': 'Зберегти',
        'cancel': 'Скасувати', 'confirm': 'Підтвердити', 'loading': 'Завантаження...',
        'error': 'Помилка', 'success': 'Успішно', 'warning': 'Попередження',
        'info': 'Інформація', 'search': 'Пошук', 'filter': 'Фільтр',
        'select': 'Обрати', 'choose': 'Обрати', 'upload': 'Завантажити',
        'download': 'Скачати', 'create': 'Створити', 'update': 'Оновити',
        'remove': 'Видалити', 'clear': 'Очистити', 'reset': 'Скинути',
        'submit': 'Відправити', 'apply': 'Застосувати', 'close': 'Закрити',
        'open': 'Відкрити', 'show': 'Показати', 'hide': 'Сховати',
        'placeholder': 'Введіть значення', 'required': 'Обов\'язково',
        'optional': 'Необов\'язково', 'invalid': 'Невірно', 'valid': 'Вірно'
      }
    };

    // Try to find a pattern match
    const langPatterns = patterns[language] || patterns.en;
    
    for (const [pattern, translation] of Object.entries(langPatterns)) {
      if (lastPart.toLowerCase().includes(pattern.toLowerCase())) {
        return translation;
      }
    }

    // Generate unique fallback based on key structure
    const contextHint = keyParts.length > 1 ? keyParts[keyParts.length - 2] : '';
    const uniqueId = crypto.createHash('md5').update(key).digest('hex').substring(0, 6);
    
    return `${this.capitalizeFirst(lastPart)} (${contextHint || uniqueId})`;
  }

  /**
   * Generate translation from source translation
   */
  generateTranslationFromSource(sourceTranslation, targetLanguage, key) {
    if (!sourceTranslation) {
      return this.generateTranslation(key, targetLanguage);
    }

    // If source is English, try to translate
    if (targetLanguage === 'ru') {
      return this.simpleTranslateToRussian(sourceTranslation);
    } else if (targetLanguage === 'uk') {
      return this.simpleTranslateToUkrainian(sourceTranslation);
    } else if (targetLanguage === 'en') {
      // If target is English, return English version
      return this.simpleTranslateToEnglish(sourceTranslation);
    }

    return sourceTranslation;
  }

  /**
   * Simple English to Russian translation for common terms
   */
  simpleTranslateToRussian(text) {
    const translations = {
      'Add': 'Добавить', 'Edit': 'Редактировать', 'Delete': 'Удалить',
      'Save': 'Сохранить', 'Cancel': 'Отмена', 'Confirm': 'Подтвердить',
      'Loading...': 'Загрузка...', 'Error': 'Ошибка', 'Success': 'Успешно',
      'Search': 'Поиск', 'Select': 'Выбрать', 'Required': 'Обязательно',
      'Optional': 'Необязательно', 'Invalid': 'Неверно', 'Valid': 'Верно'
    };

    return translations[text] || text;
  }

  /**
   * Simple English to Ukrainian translation for common terms
   */
  simpleTranslateToUkrainian(text) {
    const translations = {
      'Add': 'Додати', 'Edit': 'Редагувати', 'Delete': 'Видалити',
      'Save': 'Зберегти', 'Cancel': 'Скасувати', 'Confirm': 'Підтвердити',
      'Loading...': 'Завантаження...', 'Error': 'Помилка', 'Success': 'Успішно',
      'Search': 'Пошук', 'Select': 'Обрати', 'Required': 'Обов\'язково',
      'Optional': 'Необов\'язково', 'Invalid': 'Невірно', 'Valid': 'Вірно'
    };

    return translations[text] || text;
  }

  /**
   * Simple translation to English for common terms
   */
  simpleTranslateToEnglish(text) {
    const translations = {
      'Добавить': 'Add', 'Редактировать': 'Edit', 'Удалить': 'Delete',
      'Сохранить': 'Save', 'Отмена': 'Cancel', 'Подтвердить': 'Confirm',
      'Загрузка...': 'Loading...', 'Ошибка': 'Error', 'Успешно': 'Success',
      'Поиск': 'Search', 'Выбрать': 'Select', 'Обязательно': 'Required',
      'Необязательно': 'Optional', 'Неверно': 'Invalid', 'Верно': 'Valid',
      'Додати': 'Add', 'Редагувати': 'Edit', 'Видалити': 'Delete',
      'Зберегти': 'Save', 'Скасувати': 'Cancel', 'Підтвердити': 'Confirm',
      'Завантаження...': 'Loading...', 'Помилка': 'Error', 'Успішно': 'Success',
      'Пошук': 'Search', 'Обрати': 'Select', 'Обов\'язково': 'Required',
      'Необов\'язково': 'Optional', 'Невірно': 'Invalid', 'Вірно': 'Valid'
    };

    return translations[text] || text;
  }

  /**
   * Get value of a key from a language
   */
  getKeyValue(language, key) {
    if (!this.translations[language]) return null;
    
    const keys = key.split('.');
    let value = this.translations[language].object;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return typeof value === 'string' ? value : null;
  }

  /**
   * Add a key to a language object
   */
  addKeyToLanguage(language, key, translation) {
    if (!this.translations[language]) return;

    const keys = key.split('.');
    let current = this.translations[language].object;

    // Navigate to the correct nested location
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    // Set the final value
    const finalKey = keys[keys.length - 1];
    current[finalKey] = translation;
    
    // Update the key set
    this.translations[language].keys.add(key);
    
    // Track change
    this.changes.push({
      language,
      key,
      translation,
      action: 'add'
    });
  }

  /**
   * Save all changes to files
   */
  async saveChanges() {
    if (this.changes.length === 0) return;

    console.log('\n💾 Saving changes to translation files...');
    
    for (const lang of this.languages) {
      if (!this.translations[lang]) continue;

      const filePath = path.join(this.localesDir, `${lang}.ts`);
      const newContent = this.generateFileContent(this.translations[lang].object);
      
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`   ✅ Updated ${lang}.ts`);
    }
  }

  /**
   * Generate file content with proper formatting
   */
  generateFileContent(translationObject) {
    const content = this.stringifyObject(translationObject, 0);
    return `export default ${content};\n`;
  }

  /**
   * Stringify object with proper indentation
   */
  stringifyObject(obj, indent) {
    const spaces = '  '.repeat(indent);
    const innerSpaces = '  '.repeat(indent + 1);
    
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    const lines = entries.map(([key, value]) => {
      const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      
      if (typeof value === 'object' && value !== null) {
        return `${innerSpaces}${keyStr}: ${this.stringifyObject(value, indent + 1)}`;
      } else {
        return `${innerSpaces}${keyStr}: ${JSON.stringify(value)}`;
      }
    });

    return `{\n${lines.join(',\n')}\n${spaces}}`;
  }

  /**
   * Verify that fixes worked
   */
  async verifyFixes() {
    console.log('\n🔍 Verifying fixes...');
    
    // Reload translations
    await this.loadTranslations();
    
    // Check if all languages have the same keys
    const keyCounts = {};
    for (const lang of this.languages) {
      if (this.translations[lang]) {
        keyCounts[lang] = this.translations[lang].keys.size;
      }
    }

    const counts = Object.values(keyCounts);
    const allSame = counts.every(count => count === counts[0]);

    if (allSame) {
      console.log(`   ✅ All languages synchronized (${counts[0]} keys each)`);
      return { success: true, keyCount: counts[0] };
    } else {
      console.log('   ❌ Languages still not synchronized:');
      for (const [lang, count] of Object.entries(keyCounts)) {
        console.log(`      ${lang}: ${count} keys`);
      }
      return { success: false, keyCounts };
    }
  }

  /**
   * Utility: Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Main execution
async function main() {
  const fixer = new AutoTranslationFixer();
  const success = await fixer.fixAll();
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AutoTranslationFixer;
