#!/usr/bin/env node

/**
 * Script to help fix translation inconsistencies
 * This script provides guidance and templates for fixing translation issues
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Translation file paths
const LOCALES_DIR = join(__dirname, '../../locales');
const TRANSLATION_FILES = {
  en: join(LOCALES_DIR, 'en.ts'),
  ru: join(LOCALES_DIR, 'ru.ts'),
  uk: join(LOCALES_DIR, 'uk.ts')
};

/**
 * Load and parse translation file
 */
function loadTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the export default object
    const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/);
    if (!match) {
      throw new Error(`Could not parse translation file: ${filePath}`);
    }
    
    // Use eval to parse the object (safe in this context)
    const translationObject = eval(`(${match[1]})`);
    
    return {
      content,
      translations: translationObject,
      filePath
    };
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract all keys from nested object
 */
function extractKeys(obj, prefix = '') {
  const keys = new Set();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      const nestedKeys = extractKeys(value, fullKey);
      nestedKeys.forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  
  return keys;
}

/**
 * Generate template for missing keys
 */
function generateKeyTemplate(key, language) {
  const keyParts = key.split('.');
  const lastPart = keyParts[keyParts.length - 1];
  
  // Generate appropriate translation based on key name and language
  const templates = {
    en: {
      'add': 'Add',
      'edit': 'Edit',
      'delete': 'Delete',
      'save': 'Save',
      'cancel': 'Cancel',
      'confirm': 'Confirm',
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'placeholder': 'Enter value',
      'select': 'Select',
      'search': 'Search',
      'no': 'No',
      'found': 'found',
      'first': 'First',
      'name': 'Name',
      'type': 'Type',
      'value': 'Value'
    },
    ru: {
      'add': 'Добавить',
      'edit': 'Редактировать',
      'delete': 'Удалить',
      'save': 'Сохранить',
      'cancel': 'Отмена',
      'confirm': 'Подтвердить',
      'loading': 'Загрузка...',
      'error': 'Ошибка',
      'success': 'Успешно',
      'placeholder': 'Введите значение',
      'select': 'Выбрать',
      'search': 'Поиск',
      'no': 'Нет',
      'found': 'найдено',
      'first': 'Первый',
      'name': 'Название',
      'type': 'Тип',
      'value': 'Значение'
    },
    uk: {
      'add': 'Додати',
      'edit': 'Редагувати',
      'delete': 'Видалити',
      'save': 'Зберегти',
      'cancel': 'Скасувати',
      'confirm': 'Підтвердити',
      'loading': 'Завантаження...',
      'error': 'Помилка',
      'success': 'Успішно',
      'placeholder': 'Введіть значення',
      'select': 'Обрати',
      'search': 'Пошук',
      'no': 'Немає',
      'found': 'знайдено',
      'first': 'Перший',
      'name': 'Назва',
      'type': 'Тип',
      'value': 'Значення'
    }
  };
  
  // Try to find a template based on key name
  const template = templates[language];
  for (const [pattern, translation] of Object.entries(template)) {
    if (lastPart.toLowerCase().includes(pattern)) {
      return translation;
    }
  }
  
  // Default template
  return `[${key}]`;
}

/**
 * Main function to analyze and provide fix suggestions
 */
function analyzeTranslations() {
  console.log('🔧 Translation Fix Helper\n');
  
  // Load all translation files
  const translations = {};
  const allKeys = {};
  
  for (const [lang, filePath] of Object.entries(TRANSLATION_FILES)) {
    console.log(`📁 Loading ${lang}: ${filePath.split('/').pop()}`);
    const data = loadTranslationFile(filePath);
    
    if (!data) {
      console.log(`   ❌ Failed to load`);
      continue;
    }
    
    translations[lang] = data;
    allKeys[lang] = extractKeys(data.translations);
    console.log(`   ✅ Loaded ${allKeys[lang].size} keys`);
  }
  
  console.log('\n🔍 Analyzing translation inconsistencies...\n');
  
  // Find missing keys and generate templates
  const languages = Object.keys(allKeys);
  const allUniqueKeys = new Set();
  
  // Collect all unique keys
  languages.forEach(lang => {
    allKeys[lang].forEach(key => allUniqueKeys.add(key));
  });
  
  // Check for missing keys and provide templates
  for (const lang of languages) {
    const missingKeys = [];
    
    for (const key of allUniqueKeys) {
      if (!allKeys[lang].has(key)) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      console.log(`❌ Missing keys in ${lang.toUpperCase()}:`);
      console.log(`📝 Suggested additions for ${TRANSLATION_FILES[lang].split('/').pop()}:\n`);
      
      missingKeys.forEach(key => {
        const template = generateKeyTemplate(key, lang);
        console.log(`   "${key}": "${template}",`);
      });
      
      console.log('\n');
    }
  }
  
  console.log('💡 Copy the suggested lines above and add them to the respective translation files.');
  console.log('💡 Make sure to place them in the correct nested structure.');
  console.log('💡 After adding missing keys, run: npm run check-translations');
}

// Run the analysis
analyzeTranslations();
