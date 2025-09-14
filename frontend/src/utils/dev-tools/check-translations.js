#!/usr/bin/env node

/**
 * Translation Checker Script
 * Проверяет соответствие ключей переводов во всех языковых файлах
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к файлам переводов
const TRANSLATION_FILES = {
  en: path.join(__dirname, '../../locales/en.ts'),
  ru: path.join(__dirname, '../../locales/ru.ts'),
  uk: path.join(__dirname, '../../locales/uk.ts')
};

// Функция для извлечения ключей из объекта
function extractKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// Функция для извлечения ключей из TypeScript файла
function extractKeysFromText(content) {
  const keys = new Set();

  try {
    // Удаляем export default и импорты
    let cleanContent = content
      .replace(/^import.*$/gm, '')
      .replace(/^export\s+default\s+/, '')
      .replace(/;\s*$/, '')
      .trim();

    // Если контент начинается с {, это объект
    if (cleanContent.startsWith('{')) {
      // Используем eval для парсинга объекта (безопасно для наших файлов)
      const translationObject = eval('(' + cleanContent + ')');

      // Рекурсивно извлекаем все ключи
      function extractKeysRecursive(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            extractKeysRecursive(value, fullKey);
          } else {
            keys.add(fullKey);
          }
        }
      }

      extractKeysRecursive(translationObject);
    } else {
      // Fallback: используем регулярное выражение для простых случаев
      const keyRegex = /["']([^"']+)["']\s*:\s*["']/g;
      let match;

      while ((match = keyRegex.exec(content)) !== null) {
        keys.add(match[1]);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not parse file content, using regex fallback:`, error.message);

    // Fallback: используем регулярное выражение
    const keyRegex = /["']([^"']+)["']\s*:\s*["']/g;
    let match;

    while ((match = keyRegex.exec(content)) !== null) {
      keys.add(match[1]);
    }
  }

  return keys;
}

// Функция для загрузки файла переводов
function loadTranslationKeys(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return extractKeysFromText(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return new Set();
  }
}

// Функция для добавления недостающих ключей
function addMissingKeys(lang, missingKeys, filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Находим место для вставки (перед последней закрывающей скобкой)
    const lastBraceIndex = content.lastIndexOf('};');
    if (lastBraceIndex === -1) {
      console.log(`❌ Could not find insertion point in ${path.basename(filePath)}`);
      return false;
    }

    // Проверяем, нужна ли запятая перед вставкой
    const beforeLastBrace = content.substring(0, lastBraceIndex).trim();
    const needsComma = !beforeLastBrace.endsWith(',') && !beforeLastBrace.endsWith('{');

    // Генерируем строки для новых ключей
    const newKeysString = missingKeys.map(key => {
      // Создаем базовый перевод на основе ключа
      const baseTranslation = key.split('.').pop() || key;
      let translation;

      // Простые переводы для разных языков
      switch (lang) {
        case 'uk':
          translation = baseTranslation.replace(/([A-Z])/g, ' $1').toLowerCase().trim() + ' (uk)';
          break;
        case 'ru':
          translation = baseTranslation.replace(/([A-Z])/g, ' $1').toLowerCase().trim() + ' (ru)';
          break;
        case 'en':
        default:
          translation = baseTranslation.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
          break;
      }

      return `  "${key}": "${translation}",`;
    }).join('\n');

    // Вставляем новые ключи с правильной пунктуацией
    const beforeInsert = content.substring(0, lastBraceIndex);
    const afterInsert = content.substring(lastBraceIndex);

    // Формируем новый контент
    let newContent = beforeInsert;

    // Добавляем запятую если нужно
    if (needsComma) {
      newContent = newContent.replace(/(\s*)$/, ',$1');
    }

    // Добавляем новую строку если нужно
    if (!newContent.endsWith('\n')) {
      newContent += '\n';
    }

    // Добавляем новые ключи
    newContent += newKeysString + '\n' + afterInsert;

    // Записываем обновленный файл
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error adding keys to ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Основная функция проверки
function checkTranslations() {
  console.log('🔍 Checking translation files...\n');

  const allKeys = {};

  // Загружаем все файлы переводов
  for (const [lang, filePath] of Object.entries(TRANSLATION_FILES)) {
    console.log(`📁 Loading ${lang}: ${path.basename(filePath)}`);
    allKeys[lang] = loadTranslationKeys(filePath);

    if (allKeys[lang].size > 0) {
      console.log(`   ✅ Loaded ${allKeys[lang].size} keys`);
    } else {
      console.log(`   ❌ Failed to load or no keys found`);
      return false;
    }
  }
  
  console.log('\n🔍 Comparing translation keys...\n');
  
  // Получаем все уникальные ключи
  const allUniqueKeys = new Set();
  Object.values(allKeys).forEach(keySet => {
    keySet.forEach(key => allUniqueKeys.add(key));
  });
  
  // Проверяем отсутствующие ключи
  let hasErrors = false;
  const languages = Object.keys(allKeys);
  
  for (const lang of languages) {
    const missingKeys = [];
    
    for (const key of allUniqueKeys) {
      if (!allKeys[lang].has(key)) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      console.log(`🔧 Auto-fixing ${missingKeys.length} missing keys in ${lang.toUpperCase()}:`);
      missingKeys.slice(0, 5).forEach(key => console.log(`   + ${key}`));
      if (missingKeys.length > 5) {
        console.log(`   + ... and ${missingKeys.length - 5} more`);
      }

      // Автоматически добавляем недостающие ключи
      const filePath = TRANSLATION_FILES[lang];
      if (addMissingKeys(lang, missingKeys, filePath)) {
        console.log(`   ✅ Successfully added missing keys to ${lang.toUpperCase()}`);
      } else {
        console.log(`   ❌ Failed to add missing keys to ${lang.toUpperCase()}`);
        hasErrors = true;
      }
      console.log();
    } else {
      console.log(`✅ ${lang.toUpperCase()}: All keys present`);
    }
  }
  
  // Проверяем лишние ключи
  for (const lang of languages) {
    const extraKeys = [];
    
    for (const key of allKeys[lang]) {
      const presentInOthers = languages.some(otherLang => 
        otherLang !== lang && allKeys[otherLang].has(key)
      );
      
      if (!presentInOthers && languages.length > 1) {
        extraKeys.push(key);
      }
    }
    
    if (extraKeys.length > 0) {
      hasErrors = true;
      console.log(`⚠️  Extra keys in ${lang.toUpperCase()} (not in other languages):`);
      extraKeys.forEach(key => console.log(`   + ${key}`));
      console.log();
    }
  }
  
  if (!hasErrors) {
    console.log('🎉 All translation files are synchronized!');
  } else {
    console.log('⚠️  Some translation issues remain after auto-fix.');
    console.log('💡 Please review and fix remaining issues manually.');
  }
  
  return !hasErrors;
}

// Запускаем проверку
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = process.argv[1];

if (currentFile === scriptFile) {
  const success = checkTranslations();
  process.exit(success ? 0 : 1);
}

export { checkTranslations };
