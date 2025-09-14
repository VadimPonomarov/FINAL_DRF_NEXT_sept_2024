import { NextRequest, NextResponse } from 'next/server';
import { generateFullMockData } from '@/utils/mockData';

// Эмуляция создания объявлений через форму с автозаполнением
async function simulateFormCreation(count: number, includeImages: boolean, imageTypes: string[]) {
  console.log(`🎭 Simulating ${count} form-based ad creations with autofill...`);

  // Список пользователей с учетом ограничений аккаунтов
  const testUsers = [
    { email: 'pvs.versia@gmail.com', type: 'PREMIUM', maxAds: -1 }, // Unlimited
    { email: 'mock.premium1@autoria.com', type: 'PREMIUM', maxAds: -1 },
    { email: 'mock.premium2@autoria.com', type: 'PREMIUM', maxAds: -1 },
    { email: 'mock.premium3@autoria.com', type: 'PREMIUM', maxAds: -1 },
    { email: 'mock.basic1@autoria.com', type: 'BASIC', maxAds: 1 },
    { email: 'mock.basic2@autoria.com', type: 'BASIC', maxAds: 1 },
  ];

  const results = [];
  let totalImages = 0;
  let userIndex = 0;

  for (let i = 0; i < count; i++) {
    try {
      console.log(`\n📝 === Creating ad ${i + 1}/${count} ===`);

      // Выбираем пользователя с учетом ограничений
      const currentUser = testUsers[userIndex % testUsers.length];
      console.log(`👤 Simulating user: ${currentUser.email} (${currentUser.type})`);

      // Для BASIC пользователей переходим к следующему после создания
      if (currentUser.type === 'BASIC') {
        userIndex++;
      }

      // 1. Эмулируем логин пользователя
      console.log(`🔐 Step 1: Authenticating as ${currentUser.email}...`);
      const authToken = await simulateUserLogin(currentUser.email);
      if (!authToken) {
        throw new Error(`Authentication failed for ${currentUser.email}`);
      }

      // 2. Эмулируем автозаполнение формы (как кнопка Quick)
      console.log(`🎲 Step 2: Generating autofill data (like Quick button)...`);
      const formData = await simulateAutofillGeneration(i + 1);
      console.log(`📋 Generated form data:`, {
        title: formData.title,
        brand: formData.brand,
        model: formData.model,
        price: formData.price,
        region: formData.region,
        city: formData.city,
        exchange_status: formData.exchange_status
      });

      // 3. Эмулируем отправку формы через готовый эндпоинт
      console.log(`🌐 Step 3: Submitting form via /api/autoria/cars/create...`);
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/autoria/cars/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Form submission failed: ${response.status} - ${errorText}`);
      }

      const createdAd = await response.json();
      const adId = createdAd.id || createdAd.data?.id;
      console.log(`✅ Step 3 Complete: Ad created with ID ${adId}`);

      let imagesGenerated = 0;

      // 4. Эмулируем генерацию изображений (если запрошено)
      if (includeImages && adId) {
        console.log(`🎨 Step 4: Generating images for ad ${adId}...`);
        try {
          imagesGenerated = await simulateImageGeneration(adId, formData, imageTypes, authToken);
          console.log(`✅ Step 4 Complete: Generated ${imagesGenerated} images`);
          totalImages += imagesGenerated;
        } catch (imageError) {
          console.error(`⚠️ Step 4 Failed: Image generation error:`, imageError);
        }
      }

      results.push({
        success: true,
        title: formData.title,
        id: adId,
        user: currentUser.email,
        userType: currentUser.type,
        imagesCount: imagesGenerated,
        steps: ['auth', 'autofill', 'submit', includeImages ? 'images' : null].filter(Boolean)
      });

      console.log(`🎉 Ad ${i + 1} creation simulation complete!`);

    } catch (error: any) {
      console.error(`❌ Error in ad ${i + 1} simulation:`, error);
      results.push({
        success: false,
        error: error.message,
        title: `Ad ${i + 1}`,
        imagesCount: 0,
        user: testUsers[userIndex % testUsers.length]?.email,
        steps: ['failed']
      });
    }
  }

  const created = results.filter(r => r.success).length;
  return { created, totalImages, details: results };
}

// Эмулируем логин пользователя
async function simulateUserLogin(email: string): Promise<string | null> {
  try {
    console.log(`🔐 Simulating login for ${email}...`);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error(`❌ Login simulation failed for ${email}: ${loginResponse.status} - ${errorText}`);
      return null;
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access || loginData.token;

    if (!accessToken) {
      console.error(`❌ No access token received for ${email}`);
      return null;
    }

    console.log(`✅ Login simulation successful for ${email}`);
    return accessToken;

  } catch (error) {
    console.error(`❌ Login simulation error for ${email}:`, error);
    return null;
  }
}

// Эмулируем автозаполнение формы (как кнопка Quick)
async function simulateAutofillGeneration(index: number): Promise<any> {
  try {
    console.log(`🎲 Simulating Quick autofill for ad ${index}...`);

    // Используем ту же функцию, что и кнопка Quick в форме
    const mockData = await generateFullMockData();
    
    // Добавляем уникальные элементы для каждого объявления
    const uniqueTitle = `${mockData.title || 'Автомобиль'} #${index}`;
    const uniqueDescription = `${mockData.description || 'Отличное состояние'} - объявление ${index}`;

    const formData = {
      ...mockData,
      title: uniqueTitle,
      description: uniqueDescription,
      // Убеждаемся, что обязательные поля заполнены
      use_profile_contacts: true,
      status: 'active',
      tags: ['demo', 'generated', `batch-${Date.now()}`],

      // Метаданные
      metadata: {
        generated: true,
        generated_at: new Date().toISOString(),
        generator_version: '3.0',
        source: 'form_simulation'
      }
    };

    console.log(`✅ Autofill simulation complete for ad ${index}`);
    return formData;

  } catch (error) {
    console.error(`❌ Autofill simulation error for ad ${index}:`, error);
    throw error;
  }
}

// Эмулируем генерацию изображений
async function simulateImageGeneration(adId: number, formData: any, imageTypes: string[], authToken: string): Promise<number> {
  try {
    console.log(`🎨 Simulating image generation for ad ${adId}...`);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/chat/generate-car-images/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        car_data: {
          brand: formData.brand || formData.brand_name || "BMW",
          model: formData.model || "Unknown",
          year: parseInt(formData.year) || 2020,
          color: formData.color || "black",
          body_type: formData.body_type || "sedan",
          vehicle_type: formData.vehicle_type || 'car',
          vehicle_type_name: formData.vehicle_type_name || formData.vehicle_type,
          condition: formData.condition || 'good',
          description: formData.description || ''
        },
        angles: imageTypes,
        style: "realistic"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    const imageResult = await response.json();
    const generatedCount = imageResult.images?.length || 0;
    
    console.log(`✅ Image generation simulation complete: ${generatedCount} images`);
    return generatedCount;

  } catch (error) {
    console.error(`❌ Image generation simulation error:`, error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🎭 API ENDPOINT: Starting form creation simulation...');

    // Безопасно парсим параметры запроса
    let body = {};
    try {
      body = await request.json();
      console.log('📋 API ENDPOINT: Request body:', body);
    } catch (jsonError) {
      console.log('⚠️ API ENDPOINT: No JSON body or invalid JSON, using defaults');
      body = {};
    }

    const { count = 1, includeImages = false, imageTypes = ['front', 'side'] } = body as any;

    const maxCount = Math.min(count, 10); // Ограничиваем максимум 10 объявлений
    console.log(`🎭 Simulating ${maxCount} form-based ad creations${includeImages ? ' with images' : ''}...`);

    if (includeImages && imageTypes.length === 0) {
      throw new Error('Image types must be specified when includeImages is true');
    }

    console.log('📸 Selected image types:', imageTypes);

    // Эмулируем создание объявлений через форму
    console.log('🚀 Starting form creation simulation...');
    const result = await simulateFormCreation(maxCount, includeImages, imageTypes);
    console.log('📊 Form simulation result:', result);

    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    console.log(`✅ Successfully simulated ${result.created} form-based ad creations in ${duration}`);

    return NextResponse.json({
      success: true,
      count: result.created,
      totalImages: result.totalImages || 0,
      duration: duration,
      message: `Successfully simulated ${result.created} form-based ad creations${includeImages ? ' with images' : ''}`,
      details: result.details,
      simulation: true
    });
  } catch (error) {
    console.error('❌ API ENDPOINT: Form simulation error:', error);
    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    return NextResponse.json({
      success: false,
      count: 0,
      totalImages: 0,
      duration: duration,
      message: 'Failed to simulate form-based ad creation',
      error: error instanceof Error ? error.message : 'Unknown error',
      simulation: true
    }, { status: 500 });
  }
}
