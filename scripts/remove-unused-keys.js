#!/usr/bin/env node
/**
 * Видалення невикористаних ключів перекладів
 * 
 * Безпечно видаляє ключі, які не використовуються в коді
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const TRANSLATIONS_FILE = path.join(FRONTEND_DIR, 'src/locales/translations.json');
const COVERAGE_REPORT = path.join(FRONTEND_DIR, 'src/locales/translation-coverage-report.json');

console.log('🧹 Видалення невикористаних ключів перекладів...\n');

// Завантаження звіту
let coverageReport;
try {
  coverageReport = JSON.parse(fs.readFileSync(COVERAGE_REPORT, 'utf-8'));
} catch (error) {
  console.error('❌ Не вдалося завантажити звіт покриття');
  console.log('💡 Спочатку запустіть: npm run translations:coverage');
  process.exit(1);
}

// Завантаження translations.json
let translationsData;
try {
  translationsData = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf-8'));
} catch (error) {
  console.error('❌ Не вдалося завантажити translations.json');
  process.exit(1);
}

const unusedKeys = coverageReport.unusedKeys || [];

console.log(`📋 Невикористаних ключів: ${unusedKeys.length}`);

if (unusedKeys.length === 0) {
  console.log('✅ Немає невикористаних ключів для видалення!');
  process.exit(0);
}

// Фільтр для ключів, які варто зберегти
const KEEP_PATTERNS = [
  /^common\./,        // Загальні ключі можуть знадобитися
  /^validation\./,    // Валідаційні повідомлення
  /^error\./,         // Помилки
  /^success\./,       // Успіх
];

function shouldKeep(key) {
  return KEEP_PATTERNS.some(pattern => pattern.test(key));
}

// Розділення на категорії
const toKeep = unusedKeys.filter(shouldKeep);
const toRemove = unusedKeys.filter(key => !shouldKeep(key));

console.log(`\n📊 Аналіз:`);
console.log(`   - Зберегти (важливі): ${toKeep.length}`);
console.log(`   - Видалити: ${toRemove.length}`);

if (toKeep.length > 0) {
  console.log(`\n💾 Збережуться (важливі ключі):`);
  toKeep.slice(0, 10).forEach(key => console.log(`      - ${key}`));
  if (toKeep.length > 10) {
    console.log(`      ... та ще ${toKeep.length - 10}`);
  }
}

if (toRemove.length === 0) {
  console.log('\n✅ Всі невикористані ключі є важливими, нічого не видаляємо!');
  process.exit(0);
}

console.log(`\n🗑️  Будуть видалені (перші 20):`);
toRemove.slice(0, 20).forEach(key => console.log(`      - ${key}`));
if (toRemove.length > 20) {
  console.log(`      ... та ще ${toRemove.length - 20}`);
}

// Функція для видалення ключа
function deleteKey(obj, key) {
  const parts = key.split('.');
  let current = obj;
  const path = [];
  
  // Знаходимо ключ
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) return false;
    path.push({ obj: current, key: part });
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  if (!(lastPart in current)) return false;
  
  // Видаляємо ключ
  delete current[lastPart];
  
  // Видаляємо пусті батьківські об'єкти
  for (let i = path.length - 1; i >= 0; i--) {
    const { obj, key: parentKey } = path[i];
    if (Object.keys(obj[parentKey]).length === 0) {
      delete obj[parentKey];
    } else {
      break;
    }
  }
  
  return true;
}

// Створення backup
const BACKUP_DIR = path.join(FRONTEND_DIR, 'src/locales/.backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `translations-before-cleanup-${timestamp}.json`);
const originalContent = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');
fs.writeFileSync(backupFile, originalContent);
console.log(`\n📦 Backup створено: ${path.basename(backupFile)}`);

// Видалення ключів
console.log(`\n🗑️  Видалення ключів...\n`);
let removed = 0;

for (const key of toRemove) {
  if (deleteKey(translationsData.translations, key)) {
    removed++;
    if (removed <= 20) {
      console.log(`   ✅ Видалено: ${key}`);
    }
  }
}

if (removed > 20) {
  console.log(`   ... та ще ${removed - 20} ключів`);
}

// Оновлення метаданих
translationsData.meta.lastUpdated = new Date().toISOString();
translationsData.meta.totalKeys -= removed;

// Збереження
fs.writeFileSync(TRANSLATIONS_FILE, JSON.stringify(translationsData, null, 2), 'utf-8');
console.log(`\n✅ Оновлено translations.json (-${removed} ключів)`);

console.log('\n' + '='.repeat(60));
console.log('✅ ОЧИЩЕННЯ ЗАВЕРШЕНО');
console.log('='.repeat(60));
console.log(`\n📊 Підсумок:`);
console.log(`   - Видалено ключів: ${removed}`);
console.log(`   - Збережено важливих: ${toKeep.length}`);
console.log(`   - Всього ключів тепер: ${translationsData.meta.totalKeys}`);
console.log(`\n💡 Наступні кроки:`);
console.log(`   1. Регенерувати типи: npm run translations:generate-types`);
console.log(`   2. Перевірити покриття: npm run translations:coverage`);
console.log(`   3. Перевірити, що все працює: npm run dev`);
