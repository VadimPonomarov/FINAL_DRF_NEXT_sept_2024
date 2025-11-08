#!/usr/bin/env node
/**
 * Сканер UI компонентів для виявлення hardcoded текстів
 * 
 * Сканує:
 * - JSX/TSX файли
 * - Текст між тегами
 * - Атрибути (title, placeholder, label, тощо)
 * - Toast повідомлення
 * - Статичні тексти в компонентах
 */

const fs = require('fs');
const path = require('path');

// Використовуємо glob з frontend/node_modules
const frontendNodeModules = path.join(__dirname, '../frontend/node_modules');
const { glob } = require(path.join(frontendNodeModules, 'glob'));

const FRONTEND_DIR = path.join(__dirname, '../frontend');
const COMPONENTS_DIRS = [
  'src/app',
  'src/components',
  'src/modules',
  'src/shared'
];

console.log('🔍 Сканування UI компонентів на hardcoded тексти...\n');

// Регулярні вирази для пошуку текстів
const PATTERNS = {
  // Текст між JSX тегами: >текст<
  jsxText: />\s*([A-ZА-ЯЁЇІЄҐa-zа-яёїієґ\s]{3,})\s*</g,
  
  // Атрибути з текстом
  attributes: /(title|placeholder|label|aria-label|alt|value)=["']([^"']{3,})["']/g,
  
  // Toast та alert повідомлення
  toasts: /(toast\.|alert\(|confirm\(|showMessage\()["']([^"']{3,})["']/g,
  
  // Статичні рядки в const
  constStrings: /const\s+\w+\s*=\s*["']([A-ZА-ЯЁЇІЄҐa-zа-яёїієґ\s]{5,})["']/g,
  
  // Hardcoded тексти в return
  returnStrings: /return\s+["']([A-ZА-ЯЁЇІЄҐa-zа-яёїієґ\s]{3,})["']/g
};

// Виключення (technical strings, які не потребують перекладу)
const EXCLUSIONS = [
  /^[0-9\s\-\+\(\)\.]+$/, // Тільки цифри та спец.символи
  /^[a-z_\-]+$/, // Тільки lowercase (CSS класи, змінні)
  /^https?:\/\//, // URL
  /^\/[a-z\/\-]+$/, // Шляхи
  /^\$/, // Template змінні
  /^rgb|rgba|#[0-9a-f]{3,8}$/i, // Кольори
  /px|rem|em|vh|vw|%$/i, // CSS одиниці
];

function shouldExclude(text) {
  return EXCLUSIONS.some(pattern => pattern.test(text.trim()));
}

async function scanFiles() {
  const results = {
    files: 0,
    hardcodedTexts: [],
    byType: {
      jsxText: [],
      attributes: [],
      toasts: [],
      constStrings: [],
      returnStrings: []
    }
  };
  
  for (const dir of COMPONENTS_DIRS) {
    const fullPath = path.join(FRONTEND_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    
    const pattern = path.join(fullPath, '**/*.{tsx,ts,jsx,js}').replace(/\\/g, '/');
    const files = await glob(pattern, { 
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*', '**/.next/**']
    });
    
    for (const file of files) {
      results.files++;
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(FRONTEND_DIR, file);
      
      // Пошук по кожному паттерну
      for (const [type, pattern] of Object.entries(PATTERNS)) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(content)) !== null) {
          const text = match[match.length - 1].trim();
          
          // Пропускаємо якщо це виключення або дуже короткий текст
          if (shouldExclude(text) || text.length < 3) {
            continue;
          }
          
          // Пропускаємо якщо це вже використовується переклад (t('...'))
          if (content.includes(`t('${text}')`|| content.includes(`t("${text}")`)) {
            continue;
          }
          
          const lineNumber = content.substring(0, match.index).split('\n').length;
          
          const finding = {
            file: relativePath,
            line: lineNumber,
            type,
            text,
            context: content.substring(
              Math.max(0, match.index - 50),
              Math.min(content.length, match.index + match[0].length + 50)
            ).replace(/\n/g, ' ').trim()
          };
          
          results.byType[type].push(finding);
          results.hardcodedTexts.push(finding);
        }
      }
    }
  }
  
  return results;
}

async function main() {
  try {
    const results = await scanFiles();
    
    console.log('📊 РЕЗУЛЬТАТИ СКАНУВАННЯ');
    console.log('='.repeat(60));
    console.log(`📁 Проскановано файлів: ${results.files}`);
    console.log(`⚠️  Знайдено hardcoded текстів: ${results.hardcodedTexts.length}\n`);
    
    // Статистика по типах
    console.log('📈 Статистика по типах:');
    for (const [type, items] of Object.entries(results.byType)) {
      console.log(`   ${type}: ${items.length}`);
    }
    
    // Топ файлів з найбільшою кількістю hardcoded текстів
    const fileStats = {};
    for (const item of results.hardcodedTexts) {
      fileStats[item.file] = (fileStats[item.file] || 0) + 1;
    }
    
    const topFiles = Object.entries(fileStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    if (topFiles.length > 0) {
      console.log('\n🔝 Топ-10 файлів з hardcoded текстами:');
      topFiles.forEach(([file, count], index) => {
        console.log(`   ${index + 1}. ${file} (${count})`);
      });
    }
    
    // Приклади знайдених текстів
    if (results.hardcodedTexts.length > 0) {
      console.log('\n📋 Приклади знайдених hardcoded текстів (перші 20):');
      results.hardcodedTexts.slice(0, 20).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.file}:${item.line}`);
        console.log(`   Тип: ${item.type}`);
        console.log(`   Текст: "${item.text}"`);
        console.log(`   Контекст: ...${item.context}...`);
      });
    }
    
    // Збереження повного звіту
    const reportPath = path.join(FRONTEND_DIR, 'src/locales/hardcoded-texts-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n💾 Повний звіт збережено: ${path.relative(process.cwd(), reportPath)}`);
    
    console.log('\n' + '='.repeat(60));
    if (results.hardcodedTexts.length > 0) {
      console.log('⚠️  ПОТРІБНА УВАГА: Знайдено hardcoded тексти');
      console.log('\n💡 Рекомендації:');
      console.log('   1. Перегляньте звіт: src/locales/hardcoded-texts-report.json');
      console.log('   2. Замініть hardcoded тексти на t("key")');
      console.log('   3. Додайте нові ключі в translations.json');
      process.exit(1);
    } else {
      console.log('✅ Hardcoded тексти не знайдено!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

main();
