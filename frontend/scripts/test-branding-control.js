/**
 * Тестовый скрипт для проверки системы контроля брендинга
 * Проверяет, что шилдики марок соответствуют реальным маркам автомобилей
 */

const testCases = [
  // Правильные комбинации (брендинг должен быть включен)
  {
    brand: 'BMW',
    model: 'X5',
    vehicle_type: 'car',
    body_type: 'suv',
    expected_branding: true,
    description: 'BMW SUV - правильная комбинация'
  },
  {
    brand: 'Mercedes-Benz',
    model: 'E-Class',
    vehicle_type: 'car',
    body_type: 'sedan',
    expected_branding: true,
    description: 'Mercedes седан - правильная комбинация'
  },
  {
    brand: 'Caterpillar',
    model: '320D',
    vehicle_type: 'excavator',
    body_type: 'construction',
    expected_branding: true,
    description: 'Caterpillar экскаватор - правильная комбинация'
  },
  {
    brand: 'Atlas',
    model: 'AC 40',
    vehicle_type: 'crane',
    body_type: 'construction',
    expected_branding: true,
    description: 'Atlas кран - правильная комбинация'
  },
  
  // Неправильные комбинации (брендинг должен быть отключен)
  {
    brand: 'Mercedes-Benz',
    model: 'Excavator',
    vehicle_type: 'excavator',
    body_type: 'construction',
    expected_branding: false,
    description: 'Mercedes на экскаваторе - НЕПРАВИЛЬНО'
  },
  {
    brand: 'BMW',
    model: 'Crane',
    vehicle_type: 'crane',
    body_type: 'construction',
    expected_branding: false,
    description: 'BMW на кране - НЕПРАВИЛЬНО'
  },
  {
    brand: 'Atlas',
    model: 'Sedan',
    vehicle_type: 'car',
    body_type: 'sedan',
    expected_branding: false,
    description: 'Atlas на легковом авто - НЕПРАВИЛЬНО'
  },
  {
    brand: 'Caterpillar',
    model: 'SUV',
    vehicle_type: 'car',
    body_type: 'suv',
    expected_branding: false,
    description: 'Caterpillar на SUV - НЕПРАВИЛЬНО'
  },
  
  // Граничные случаи
  {
    brand: '',
    model: 'Unknown',
    vehicle_type: 'car',
    body_type: 'sedan',
    expected_branding: false,
    description: 'Пустой бренд - брендинг отключен'
  },
  {
    brand: 'Unknown',
    model: 'Car',
    vehicle_type: 'car',
    body_type: 'sedan',
    expected_branding: false,
    description: 'Неизвестный бренд - брендинг отключен'
  }
];

async function testBrandingControl() {
  console.log('🧪 Тестирование системы контроля брендинга...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`📋 Тест: ${testCase.description}`);
      console.log(`   Бренд: ${testCase.brand}, Модель: ${testCase.model}`);
      console.log(`   Тип ТС: ${testCase.vehicle_type}, Кузов: ${testCase.body_type}`);
      
      // Тестируем через API генерации изображений
      const response = await fetch('/api/llm/generate-car-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formData: {
            brand: testCase.brand,
            model: testCase.model,
            year: 2020,
            color: 'silver',
            body_type: testCase.body_type,
            vehicle_type: testCase.vehicle_type,
            vehicle_type_name: testCase.vehicle_type,
            condition: 'good'
          },
          angles: ['front'],
          style: 'realistic',
          quality: 'standard',
          useDescription: false
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Проверяем промпт на наличие инструкций по брендингу
        const prompt = result.images?.[0]?.prompt || '';
        const hasBrandingDisabled = prompt.includes('CRITICAL: Do not show any brand logos') || 
                                   prompt.includes('Do not show Mercedes-Benz, BMW, Audi, Toyota');
        const hasBrandingEnabled = prompt.includes('Use ONLY authentic') && 
                                  prompt.includes(testCase.brand);
        
        const actualBranding = !hasBrandingDisabled && (hasBrandingEnabled || testCase.brand);
        
        if (actualBranding === testCase.expected_branding) {
          console.log(`   ✅ ПРОШЕЛ: Брендинг ${actualBranding ? 'включен' : 'отключен'} как ожидалось`);
          passed++;
        } else {
          console.log(`   ❌ ПРОВАЛЕН: Ожидался брендинг ${testCase.expected_branding ? 'включен' : 'отключен'}, получен ${actualBranding ? 'включен' : 'отключен'}`);
          console.log(`   📝 Промпт: ${prompt.substring(0, 150)}...`);
          failed++;
        }
      } else {
        console.log(`   ⚠️ ОШИБКА API: ${response.status} ${response.statusText}`);
        failed++;
      }
      
      console.log(''); // Пустая строка для разделения
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`   ❌ ОШИБКА: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`✅ Прошло: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`📈 Успешность: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 Все тесты прошли успешно! Система контроля брендинга работает корректно.');
  } else {
    console.log('⚠️ Некоторые тесты провалены. Требуется доработка системы контроля брендинга.');
  }
}

// Запуск тестов
if (typeof window !== 'undefined') {
  // Браузерная среда
  window.testBrandingControl = testBrandingControl;
  console.log('🔧 Для запуска тестов выполните: testBrandingControl()');
} else {
  // Node.js среда
  testBrandingControl().catch(console.error);
}

module.exports = { testBrandingControl, testCases };
