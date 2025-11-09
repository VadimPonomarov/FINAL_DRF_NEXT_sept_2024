#!/usr/bin/env node

/**
 * Простой скрипт для запуска генератора объявлений из командной строки
 */

const { spawn } = require('child_process');
const path = require('path');

// Параметры по умолчанию
const defaultConfig = {
  count: 10,  // Минимум 10 объявлений для деплоя
  images: false,  // Без изображений для быстрого деплоя
  imageTypes: ['front', 'side'],
  headless: true  // Headless режим для автоматического деплоя
};

// Парсим аргументы командной строки
const args = process.argv.slice(2);
const config = { ...defaultConfig };

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--count' && args[i + 1]) {
    config.count = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--no-images') {
    config.images = false;
  } else if (arg === '--headless') {
    config.headless = true;
  } else if (arg === '--image-types' && args[i + 1]) {
    config.imageTypes = args[i + 1].split(',');
    i++;
  } else if (arg === '--help') {
    console.log(`
🤖 Генератор тестовых объявлений AutoRia

Использование:
  node scripts/run-generator.js [опции]

Опции:
  --count <число>           Количество объявлений (по умолчанию: 3)
  --no-images              Не генерировать изображения
  --headless               Запустить в headless режиме
  --image-types <типы>     Типы изображений через запятую (front,side,rear,interior)
  --help                   Показать эту справку

Примеры:
  node scripts/run-generator.js --count 5
  node scripts/run-generator.js --count 2 --no-images --headless
  node scripts/run-generator.js --count 3 --image-types front,side,interior
    `);
    process.exit(0);
  }
}

console.log('🚀 Запуск генератора объявлений...');
console.log('📋 Конфигурация:');
console.log(`  - Количество объявлений: ${config.count}`);
console.log(`  - Изображения: ${config.images ? 'да' : 'нет'}`);
if (config.images) {
  console.log(`  - Типы изображений: ${config.imageTypes.join(', ')}`);
}
console.log(`  - Режим: ${config.headless ? 'headless' : 'с интерфейсом'}`);
console.log('');

// Запускаем TypeScript скрипт
const tsNode = spawn('npx', [
  'ts-node',
  '--project', 'tsconfig.json',
  path.join(__dirname, 'test-ads-generator.ts')
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ADS_COUNT: config.count.toString(),
    INCLUDE_IMAGES: config.images.toString(),
    IMAGE_TYPES: config.imageTypes.join(','),
    HEADLESS: config.headless.toString()
  }
});

tsNode.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Генерация завершена успешно!');
  } else {
    console.log(`\n❌ Генерация завершилась с ошибкой (код: ${code})`);
  }
  process.exit(code);
});

tsNode.on('error', (error) => {
  console.error('❌ Ошибка запуска:', error.message);
  console.log('\n💡 Убедитесь, что установлены зависимости:');
  console.log('   npm install');
  console.log('   npm install -D ts-node typescript');
  process.exit(1);
});
