/**
 * Скрипт для диагностики проблем с генератором объявлений
 */

import { getActiveUsers } from './ads-generator';

async function debugGenerator() {
  console.log('🔍 Starting generator diagnostics...\n');

  try {
    // 1. Проверяем получение пользователей
    console.log('1️⃣ Testing user retrieval...');
    const users = await getActiveUsers();
    
    if (users.length === 0) {
      console.log('❌ No users found - this is the main issue!');
      console.log('💡 Possible causes:');
      console.log('   - Backend API is not running');
      console.log('   - Authentication failed');
      console.log('   - No active users in database');
      return;
    }

    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.accountType}, ${user.currentAds || 0}/${user.maxAds} ads)`);
    });

    // 2. Проверяем доступность backend API
    console.log('\n2️⃣ Testing backend API connection...');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${backendUrl}/api/ads/cars/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const totalAds = Array.isArray(data) ? data.length : (data.count || data.results?.length || 0);
        console.log(`✅ Backend API accessible - found ${totalAds} existing ads`);
      } else {
        console.log(`⚠️ Backend API returned status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Backend API connection failed: ${error.message}`);
    }

    // 3. Проверяем аутентификацию
    console.log('\n3️⃣ Testing authentication...');
    try {
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

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Authentication successful');
        console.log(`   Token received: ${loginData.access ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ Authentication failed: ${loginResponse.status}`);
        const errorText = await loginResponse.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Authentication error: ${error.message}`);
    }

    // 4. Проверяем создание объявления через API
    console.log('\n4️⃣ Testing ad creation API...');
    try {
      // Сначала логинимся
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

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        const token = loginData.access;

        // Пробуем создать тестовое объявление
        const testAd = {
          title: 'Test Ad from Debug Script',
          description: 'This is a test ad created by the debug script',
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
          contacts: [
            {
              type: 'phone',
              value: '+380501234567',
              is_visible: true
            }
          ]
        };

        const createResponse = await fetch(`${backendUrl}/api/ads/cars/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testAd)
        });

        if (createResponse.ok) {
          const result = await createResponse.json();
          console.log('✅ Test ad creation successful!');
          console.log(`   Created ad ID: ${result.id || result.data?.id || 'unknown'}`);
          
          // Удаляем тестовое объявление
          if (result.id || result.data?.id) {
            const adId = result.id || result.data.id;
            const deleteResponse = await fetch(`${backendUrl}/api/ads/cars/${adId}/`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              }
            });
            
            if (deleteResponse.ok) {
              console.log('✅ Test ad cleaned up successfully');
            }
          }
        } else {
          const errorText = await createResponse.text();
          console.log(`❌ Test ad creation failed: ${createResponse.status}`);
          console.log(`   Error: ${errorText}`);
        }
      }
    } catch (error) {
      console.log(`❌ Ad creation test error: ${error.message}`);
    }

    console.log('\n📋 Diagnosis Summary:');
    console.log('If all tests pass but Playwright generator fails, the issue is likely:');
    console.log('1. Form selectors have changed');
    console.log('2. Auto-fill buttons are not working');
    console.log('3. Form submission process has changed');
    console.log('4. Page navigation issues');

  } catch (error) {
    console.error('❌ Diagnostic script failed:', error);
  }
}

// Запускаем диагностику
if (require.main === module) {
  debugGenerator()
    .then(() => {
      console.log('\n✅ Diagnostics completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Diagnostics failed:', error);
      process.exit(1);
    });
}

export { debugGenerator };
