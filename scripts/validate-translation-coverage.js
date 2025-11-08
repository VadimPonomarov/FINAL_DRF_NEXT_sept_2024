#!/usr/bin/env node
/**
 * Валідатор покриття UI компонентів перекладами
 * 
 * Перевіряє:
 * 1. Чи всі використані ключі існують у translations.json
 * 2. Чи немає невикористаних ключів
 * 3. Чи всі ключі мають переклади для всіх мов
 */

const fs = require('fs');
const path = require('path');

// Використовуємо glob з frontend/node_modules
const frontendNodeModules = path.join(__dirname, '../frontend/node_modules');
const { glob } = require(path.join(frontendNodeModules, 'glob'));

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const TRANSLATIONS_FILE = path.join(FRONTEND_DIR, 'src/locales/translations.json');

console.log('🔍 Валідація покриття перекладами...\n');

// Завантаження translations.json
let translationsData;
try {
  translationsData = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf-8'));
} catch (error) {
  console.error('❌ Не вдалося завантажити translations.json');
  process.exit(1);
}

// Отримання всіх ключів з translations.json
function getAllTranslationKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object') {
      if ('en' in value && 'ru' in value && 'uk' in value) {
        keys.push(fullKey);
      } else {
        keys.push(...getAllTranslationKeys(value, fullKey));
      }
    }
  }
  
  return keys;
}

const allTranslationKeys = getAllTranslationKeys(translationsData.translations);
console.log(`📚 Ключів у translations.json: ${allTranslationKeys.length}`);

// Пошук використань перекладів у коді
async function findUsedKeys() {
  const usedKeys = new Set();
  const pattern = path.join(FRONTEND_DIR, 'src/**/*.{tsx,ts,jsx,js}').replace(/\\/g, '/');
  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/.next/**', '**/*.test.*', '**/*.spec.*']
  });
  
  // Регулярні вирази для пошуку використань
  const patterns = [
    /t\(['"]([^'"]+)['"]\)/g,  // t('key')
    /useTranslation\(\).t\(['"]([^'"]+)['"]\)/g,  // useTranslation().t('key')
    /i18n\.t\(['"]([^'"]+)['"]\)/g,  // i18n.t('key')
  ];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        usedKeys.add(match[1]);
      }
    }
  }
  
  return Array.from(usedKeys);
}

async function main() {
  console.log('🔎 Сканування використання ключів у коді...');
  const usedKeys = await findUsedKeys();
  console.log(`📝 Використано ключів у коді: ${usedKeys.length}\n`);
  
  // Перевірка 1: Чи всі використані ключі існують
  const missingKeys = usedKeys.filter(key => !allTranslationKeys.includes(key));
  
  if (missingKeys.length > 0) {
    console.log('❌ ВІДСУТНІ КЛЮЧІ В TRANSLATIONS.JSON:');
    console.log('   Ці ключі використовуються в коді, але відсутні в translations.json:\n');
    missingKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. "${key}"`);
    });
    console.log();
  }
  
  // Перевірка 2: Невикористані ключі
  const unusedKeys = allTranslationKeys.filter(key => !usedKeys.includes(key));
  
  if (unusedKeys.length > 0) {
    console.log(`⚠️  НЕВИКОРИСТАНІ КЛЮЧІ (${unusedKeys.length}):`);
    console.log('   Ці ключі є в translations.json, але не використовуються:\n');
    unusedKeys.slice(0, 20).forEach((key, index) => {
      console.log(`   ${index + 1}. "${key}"`);
    });
    if (unusedKeys.length > 20) {
      console.log(`   ... та ще ${unusedKeys.length - 20} ключів`);
    }
    console.log();
  }
  
  // Перевірка 3: Повнота перекладів
  function checkTranslationCompleteness(obj, prefix = '') {
    const incomplete = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object') {
        if ('en' in value && 'ru' in value && 'uk' in value) {
          // Перевірка чи всі мови мають значення
          const missing = [];
          if (!value.en || value.en.trim() === '') missing.push('en');
          if (!value.ru || value.ru.trim() === '') missing.push('ru');
          if (!value.uk || value.uk.trim() === '') missing.push('uk');
          
          if (missing.length > 0) {
            incomplete.push({
              key: fullKey,
              missing: missing
            });
          }
        } else {
          incomplete.push(...checkTranslationCompleteness(value, fullKey));
        }
      }
    }
    
    return incomplete;
  }
  
  const incompleteTranslations = checkTranslationCompleteness(translationsData.translations);
  
  if (incompleteTranslations.length > 0) {
    console.log(`❌ НЕПОВНІ ПЕРЕКЛАДИ (${incompleteTranslations.length}):`);
    console.log('   Ці ключі не мають перекладів для всіх мов:\n');
    incompleteTranslations.slice(0, 20).forEach((item, index) => {
      console.log(`   ${index + 1}. "${item.key}"`);
      console.log(`      Відсутні мови: ${item.missing.join(', ')}`);
    });
    if (incompleteTranslations.length > 20) {
      console.log(`   ... та ще ${incompleteTranslations.length - 20} ключів`);
    }
    console.log();
  }
  
  // Статистика покриття
  const coverage = {
    total: allTranslationKeys.length,
    used: usedKeys.length,
    unused: unusedKeys.length,
    missing: missingKeys.length,
    incomplete: incompleteTranslations.length,
    percentage: ((usedKeys.length / allTranslationKeys.length) * 100).toFixed(2)
  };
  
  console.log('📊 СТАТИСТИКА ПОКРИТТЯ:');
  console.log('='.repeat(60));
  console.log(`   Всього ключів: ${coverage.total}`);
  console.log(`   Використовується: ${coverage.used} (${coverage.percentage}%)`);
  console.log(`   Не використовується: ${coverage.unused}`);
  console.log(`   Відсутні в translations.json: ${coverage.missing}`);
  console.log(`   Неповні переклади: ${coverage.incomplete}`);
  console.log();
  
  // Збереження звіту
  const report = {
    timestamp: new Date().toISOString(),
    coverage,
    missingKeys,
    unusedKeys,
    incompleteTranslations
  };
  
  const reportPath = path.join(FRONTEND_DIR, 'src/locales/translation-coverage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`💾 Звіт збережено: ${path.relative(process.cwd(), reportPath)}`);
  
  // Результат
  console.log('\n' + '='.repeat(60));
  if (missingKeys.length > 0 || incompleteTranslations.length > 0) {
    console.log('❌ ВАЛІДАЦІЯ НЕ ПРОЙДЕНА');
    console.log('\n💡 Потрібні дії:');
    if (missingKeys.length > 0) {
      console.log(`   1. Додати ${missingKeys.length} відсутніх ключів у translations.json`);
    }
    if (incompleteTranslations.length > 0) {
      console.log(`   2. Заповнити ${incompleteTranslations.length} неповних перекладів`);
    }
    process.exit(1);
  } else {
    console.log('✅ ВАЛІДАЦІЯ ПРОЙДЕНА');
    if (unusedKeys.length > 0) {
      console.log(`\n💡 Рекомендація: Видалити ${unusedKeys.length} невикористаних ключів`);
    }
    process.exit(0);
  }
}

main();
