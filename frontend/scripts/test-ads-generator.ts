/**
 * Тестовый скрипт для проверки работы генератора объявлений
 */

import { runAdGenerator, AdGeneratorConfig } from './ads-generator';

async function testAdGenerator() {
  console.log('🧪 Starting ads generator test...');

  // Конфигурация из переменных окружения или значения по умолчанию
  const config: Omit<AdGeneratorConfig, 'users'> = {
    count: parseInt(process.env.ADS_COUNT || '3'),
    imageTypes: (process.env.IMAGE_TYPES || 'front,side').split(','),
    includeImages: process.env.INCLUDE_IMAGES !== 'false',
    headless: process.env.HEADLESS === 'true',
    slowMo: 500, // Замедляем действия для наблюдения
    timeout: 30000 // Таймаут 30 секунд
  };

  console.log('📋 Test configuration:');
  console.log(`  - Count: ${config.count}`);
  console.log(`  - Images: ${config.includeImages}`);
  console.log(`  - Image types: ${config.imageTypes.join(', ')}`);
  console.log(`  - Headless: ${config.headless}`);
  console.log('');

  try {
    const results = await runAdGenerator(config);
    
    console.log('\n🎯 Test Results:');
    console.log(`✅ Successful ads: ${results.success}`);
    console.log(`❌ Failed ads: ${results.failed}`);
    console.log(`📊 Success rate: ${((results.success / (results.success + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.details.length > 0) {
      console.log('\n📋 Detailed Results:');
      results.details.forEach((detail, index) => {
        const status = detail.success ? '✅' : '❌';
        console.log(`  ${status} Ad ${detail.adIndex}: ${detail.user} (${detail.accountType}) - ${detail.timestamp}`);
        if (!detail.success && detail.error) {
          console.log(`    Error: ${detail.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Запускаем тест, если скрипт вызван напрямую
if (require.main === module) {
  testAdGenerator()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testAdGenerator };
