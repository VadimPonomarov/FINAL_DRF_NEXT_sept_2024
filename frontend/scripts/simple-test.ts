/**
 * Упрощенный тест создания объявления без Playwright
 * Для проверки API напрямую
 */

async function createTestAdDirectly() {
  console.log('🧪 Testing direct ad creation via API...\n');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  try {
    // 1. Логинимся
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'pvs.versia@gmail.com',
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.access;
    console.log('✅ Login successful');

    // 2. Создаем объявление
    console.log('\n2️⃣ Creating test ad...');
    const testAd = {
      title: 'BMW X5 2020 - тестовое объявление',
      description: 'Тестовое объявление, созданное автоматически для проверки системы. Автомобиль в отличном состоянии.',
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

    console.log('📋 Ad data:', JSON.stringify(testAd, null, 2));

    const createResponse = await fetch(`${backendUrl}/api/ads/cars/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAd)
    });

    console.log(`📤 Create response status: ${createResponse.status}`);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('❌ Create response error:', errorText);
      throw new Error(`Ad creation failed: ${createResponse.status} - ${errorText}`);
    }

    const result = await createResponse.json();
    console.log('✅ Ad created successfully!');
    console.log('📋 Result:', JSON.stringify(result, null, 2));

    const adId = result.id || result.data?.id;
    if (adId) {
      console.log(`🎯 Created ad ID: ${adId}`);
      
      // 3. Проверяем, что объявление действительно создалось
      console.log('\n3️⃣ Verifying ad creation...');
      const verifyResponse = await fetch(`${backendUrl}/api/ads/cars/${adId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (verifyResponse.ok) {
        const adData = await verifyResponse.json();
        console.log('✅ Ad verification successful');
        console.log(`   Title: ${adData.title}`);
        console.log(`   Status: ${adData.status || 'unknown'}`);
        console.log(`   Created: ${adData.created_at || 'unknown'}`);
      } else {
        console.log('⚠️ Ad verification failed');
      }

      // 4. Получаем список всех объявлений
      console.log('\n4️⃣ Checking total ads count...');
      const listResponse = await fetch(`${backendUrl}/api/ads/cars/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        const totalAds = Array.isArray(listData) ? listData.length : 
                        (listData.count || listData.results?.length || 0);
        console.log(`✅ Total ads in system: ${totalAds}`);
        
        if (totalAds === 0) {
          console.log('⚠️ No ads found in system - this explains why search shows 0 results');
        }
      }

      // 5. Опционально удаляем тестовое объявление
      const shouldDelete = process.argv.includes('--cleanup');
      if (shouldDelete) {
        console.log('\n5️⃣ Cleaning up test ad...');
        const deleteResponse = await fetch(`${backendUrl}/api/ads/cars/${adId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        if (deleteResponse.ok) {
          console.log('✅ Test ad deleted successfully');
        } else {
          console.log('⚠️ Failed to delete test ad');
        }
      } else {
        console.log('\n💡 Test ad left in system. Use --cleanup flag to auto-delete.');
      }
    }

    console.log('\n🎉 Direct API test completed successfully!');
    console.log('If this works but Playwright doesn\'t, the issue is in browser automation.');

  } catch (error) {
    console.error('❌ Direct API test failed:', error);
    console.log('\n🔍 This suggests the issue is in the API layer, not Playwright.');
  }
}

// Запускаем тест
if (require.main === module) {
  createTestAdDirectly()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { createTestAdDirectly };
