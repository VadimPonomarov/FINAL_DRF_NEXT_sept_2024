/**
 * Простой тест создания объявления через API
 */

async function testCreateAd() {
  console.log('🧪 Testing ad creation...\n');

  const testData = {
    title: 'TEST - Автоматически созданное объявление',
    description: 'Тестовое описание автомобиля для проверки API',
    brand: 'Toyota',
    model: 'Camry',
    year: 2020,
    price: 25000,
    currency: 'USD',
    region: 'Київська область',
    city: 'Київ',
    seller_type: 'private',
    exchange_status: 'no_exchange',
    mileage: 50000,
    fuel_type: 'petrol',
    transmission: 'automatic',
    body_type: 'sedan',
    condition: 'good',
    contacts: [
      {
        type: 'name',
        value: 'Тестовый пользователь',
        is_visible: true
      },
      {
        type: 'phone',
        value: '+380501234567',
        is_visible: true
      }
    ]
  };

  console.log('📋 Test data prepared');
  console.log(`  Title: ${testData.title}`);
  console.log(`  Price: ${testData.price} ${testData.currency}`);
  console.log(`  Brand/Model: ${testData.brand} ${testData.model}`);
  console.log('');

  // Тестируем оба endpoint'а
  const endpoints = [
    'http://localhost:3000/api/autoria/cars/create',
    'http://localhost:3000/api/autoria/cars'
  ];

  for (const endpoint of endpoints) {
    console.log(`🔄 Testing endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      console.log(`📡 Response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SUCCESS!');
        console.log(`   Created ad ID: ${result.id || 'unknown'}`);
        console.log(`   Title: ${result.title || 'unknown'}`);
        
        // Если создалось успешно, пробуем удалить для очистки
        if (result.id) {
          console.log(`🗑️ Cleaning up test ad ${result.id}...`);
          // Здесь можно добавить удаление, если есть такой endpoint
        }
        
        console.log('🎉 Test PASSED for', endpoint);
        return true;
      } else {
        const errorText = await response.text();
        console.log('❌ FAILED');
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.log(`   Exception: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('💥 All endpoints failed');
  return false;
}

// Запуск теста (ESM-совместимо)
import { fileURLToPath } from 'url';
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] && thisFile === process.argv[1];
  } catch {
    return false;
  }
})();

if (isMain) {
  testCreateAd()
    .then((success) => {
      if (success) {
        console.log('\n🎉 CREATE AD TEST PASSED!');
        console.log('The API is working correctly.');
        process.exit(0);
      } else {
        console.log('\n💥 CREATE AD TEST FAILED!');
        console.log('Check the logs above for details.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test crashed:', error);
      process.exit(1);
    });
}
