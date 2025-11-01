#!/usr/bin/env node
/**
 * Скрипт для проверки переменных окружения Google OAuth
 * Запуск: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

const envConfigDir = path.resolve(__dirname, '../../env-config');

const envFiles = [
  '.env.base',
  '.env.secrets',
  '.env.local',
  '.env.development',
  '.env.docker'
];

console.log('🔍 Проверка переменных окружения Google OAuth\n');
console.log('=' .repeat(60));

const requiredVars = {
  'NEXTAUTH_SECRET': [],
  'GOOGLE_CLIENT_ID': [],
  'GOOGLE_CLIENT_SECRET': []
};

// Читаем все файлы
envFiles.forEach(fileName => {
  const filePath = path.join(envConfigDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`\n⚠️  Файл ${fileName} не найден`);
    return;
  }
  
  console.log(`\n📄 ${fileName}:`);
  console.log('-'.repeat(60));
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Ищем нужные переменные
    Object.keys(requiredVars).forEach(varName => {
      if (trimmed.startsWith(varName + '=')) {
        const value = trimmed.substring(varName.length + 1).trim();
        
        // Проверяем, зашифровано ли значение
        const isEncrypted = value.startsWith('ENC_');
        const isSet = value && value.length > 0;
        
        const status = isSet 
          ? (isEncrypted ? '✅ [ENCRYPTED]' : '✅ [PLAIN]')
          : '❌ [EMPTY]';
        
        console.log(`  ${varName}: ${status}`);
        
        if (isSet) {
          const preview = isEncrypted 
            ? value.substring(0, 30) + '...'
            : value.substring(0, Math.min(30, value.length)) + (value.length > 30 ? '...' : '');
          console.log(`    Value: ${preview}`);
          console.log(`    Length: ${value.length} chars`);
        }
        
        requiredVars[varName].push({
          file: fileName,
          value: value,
          encrypted: isEncrypted,
          set: isSet
        });
      }
    });
  });
});

// Итоговая проверка
console.log('\n' + '='.repeat(60));
console.log('\n📊 ИТОГОВАЯ ПРОВЕРКА:\n');

let allOk = true;

Object.keys(requiredVars).forEach(varName => {
  const entries = requiredVars[varName];
  const lastEntry = entries[entries.length - 1]; // Берем последнее значение (оно имеет приоритет)
  
  if (!lastEntry || !lastEntry.set) {
    console.log(`❌ ${varName}: НЕ УСТАНОВЛЕНО`);
    allOk = false;
    
    // Показываем, где должна быть переменная
    console.log(`   Должна быть в: .env.secrets или .env.local`);
  } else {
    const status = lastEntry.encrypted ? '[ENCRYPTED]' : '[PLAIN TEXT]';
    console.log(`✅ ${varName}: ${status} (из ${lastEntry.file})`);
  }
});

if (!allOk) {
  console.log('\n⚠️  ВНИМАНИЕ: Некоторые переменные не установлены!');
  console.log('   Google OAuth не будет работать без этих переменных.');
  console.log('\n   Рекомендуется добавить переменные в:');
  console.log('   - env-config/.env.secrets (для зашифрованных значений)');
  console.log('   - env-config/.env.local (для локальных значений)');
} else {
  console.log('\n✅ Все необходимые переменные установлены!');
}

console.log('\n' + '='.repeat(60));

