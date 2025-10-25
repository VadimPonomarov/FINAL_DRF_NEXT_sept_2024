/**
 * Тестирование API создания объявлений
 */

async function testCreateAPI() {
  console.log('🧪 Testing car ad creation API...\n');

  // Тестовые данные для объявления
  const testAdData = {
    title: 'TEST - BMW X5 2020',
    description: 'Тестовое объявление для проверки API. Автомобиль в отличном состоянии.',
    brand: 'BMW',
    model: 'X5',
    year: 2020,
    price: 45000,
    currency: 'USD',
    region: 'Київська область',
    city: 'Київ',
    seller_type: 'private',
    exchange_status: 'no_exchange',
    mileage: 35000,
    fuel_type: 'petrol',
    transmission: 'automatic',
    body_type: 'suv',
    engine_volume: 3.0,
    engine_power: 340,
    drive_type: 'awd',
    color: 'black',
    condition: 'excellent',
    contacts: [
      {
        type: 'name',
        value: 'Тестовый пользователь',
        is_visible: true,
        note: 'Контактное лицо'
      },
      {
        type: 'phone',
        value: '+380501234567',
        is_visible: true,
        note: 'Основной телефон'
      }
    ]
  };

  console.log('📋 Test data prepared:');
  console.log(`  Title: ${testAdData.title}`);
  console.log(`  Price: ${testAdData.price} ${testAdData.currency}`);
  console.log(`  Brand/Model: ${testAdData.brand} ${testAdData.model}`);
  console.log(`  Contacts: ${testAdData.contacts.length}`);
  console.log('');

  try {
    // 1. Тестируем frontend API endpoint
    console.log('1️⃣ Testing frontend API endpoint...');
    console.log('📤 POST http://localhost:3000/api/autoria/cars');
    
    const frontendResponse = await fetch('http://localhost:3000/api/autoria/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAdData)
    });

    console.log(`📡 Frontend API response: ${frontendResponse.status} ${frontendResponse.statusText}`);

    if (!frontendResponse.ok) {
      const errorText = await frontendResponse.text();
      console.log('❌ Frontend API Error Response:');
      console.log(errorText);
      console.log('');
      
      // Пробуем альтернативный endpoint
      console.log('2️⃣ Trying alternative endpoint...');
      console.log('📤 POST http://localhost:3000/api/autoria/cars/create');
      
      const altResponse = await fetch('http://localhost:3000/api/autoria/cars/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testAdData)
      });

      console.log(`📡 Alternative API response: ${altResponse.status} ${altResponse.statusText}`);

      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.log('❌ Alternative API Error Response:');
        console.log(altErrorText);
      } else {
        const altResult = await altResponse.json();
        console.log('✅ Alternative API Success!');
        console.log('📋 Result:', JSON.stringify(altResult, null, 2));
      }
    } else {
      const result = await frontendResponse.json();
      console.log('✅ Frontend API Success!');
      console.log('📋 Result:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('💥 API Test Error:', error.message);
  }

  // 3. Тестируем прямое обращение к Django backend
  console.log('\n3️⃣ Testing direct Django backend...');
  
  try {
    // Сначала логинимся
    console.log('🔐 Logging in to get token...');
    const loginResponse = await fetch('http://localhost:8000/api/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'pvs.versia@gmail.com',
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Django login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access;
    console.log('✅ Django login successful');

    // Создаем объявление через Django
    console.log('📤 POST http://localhost:8000/api/ads/cars/create/');
    const djangoResponse = await fetch('http://localhost:8000/api/ads/cars/create/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAdData)
    });

    console.log(`📡 Django API response: ${djangoResponse.status} ${djangoResponse.statusText}`);

    if (!djangoResponse.ok) {
      const djangoErrorText = await djangoResponse.text();
      console.log('❌ Django API Error Response:');
      console.log(djangoErrorText);
    } else {
      const djangoResult = await djangoResponse.json();
      console.log('✅ Django API Success!');
      console.log('📋 Result:', JSON.stringify(djangoResult, null, 2));
      
      // Удаляем тестовое объявление
      if (djangoResult.id) {
        console.log(`🗑️ Cleaning up test ad ${djangoResult.id}...`);
        const deleteResponse = await fetch(`http://localhost:8000/api/ads/cars/${djangoResult.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Test ad cleaned up');
        } else {
          console.log('⚠️ Could not clean up test ad');
        }
      }
    }

  } catch (error) {
    console.error('💥 Django Test Error:', error.message);
  }

  console.log('\n📊 API Test Summary:');
  console.log('If Django backend works but frontend fails, the issue is in:');
  console.log('1. Frontend API routing (/api/autoria/cars)');
  console.log('2. Authentication headers in frontend');
  console.log('3. Data transformation between frontend and backend');
  console.log('4. CORS or proxy configuration');
}

// Запуск теста
if (require.main === module) {
  testCreateAPI()
    .then(() => {
      console.log('\n✅ API test completed');
    })
    .catch((error) => {
      console.error('\n💥 API test failed:', error);
    });
}
