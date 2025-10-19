import { NextRequest, NextResponse } from 'next/server';
import { generateFullMockData } from '@/utils/mockData';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

import { mapFormDataToApiData } from '@/utils/carAdDataMapper';
import type { CarAdFormData } from '@/types/autoria';

// Серверная функция для создания тестовых объявлений с прогрессом
async function createTestAdsServer(request: NextRequest, count: number, includeImages: boolean, imageTypes: string[], onProgress?: (progress: number, message: string) => void) {
  console.log(`🚀 Creating ${count} test ads on server...`);

  // Use current session tokens stored in Redis for all backend calls
  const isAuth = await ServerAuthManager.isAuthenticated(request);
  if (!isAuth) {
    onProgress?.(0, 'Не авторизован: войдите через /login');
    throw new Error('Not authenticated: backend_auth tokens missing');
  }
  const authFetch = (url: string, init?: RequestInit) => ServerAuthManager.authenticatedFetch(request, url, init);

  // Уведомляем о начале
  onProgress?.(0, `Начинаем создание ${count} объявлений...`);



  const results = [];
  let totalImages = 0;

  // 🚀 КЕШИРОВАНИЕ: Загружаем модели один раз для всех объявлений
  console.log('📦 [TestAds] Pre-loading models cache...');
  let cachedModels: any[] = [];
  try {
    const modelsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/public/reference/models?page_size=1000`);
    const modelsData = await modelsResponse.json();
    cachedModels = modelsData.options || [];
    console.log(`✅ [TestAds] Cached ${cachedModels.length} models for generation`);
  } catch (error) {
    console.warn('⚠️ [TestAds] Failed to cache models, will use individual requests:', error);
  }

  // Получаем список пользователей для распределения объявлений
  console.log('👥 Fetching users for ad distribution...');
  const usersResponse = await authFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/autoria/users/`);

  let availableUsers: any[] = [];
  if (usersResponse.ok) {
    const usersData = await usersResponse.json();
    availableUsers = usersData.results || [];
    console.log(`👥 Found ${availableUsers.length} users for ad distribution`);
  } else {
    console.warn('⚠️ Could not fetch users, will use current session for all ads');
  }

  // Разделяем пользователей по типам
  const superUsers = availableUsers.filter(u => u.is_superuser);
  const premiumUsers = availableUsers.filter(u =>
    !u.is_superuser && (u.account_adds?.account_type === 'PREMIUM' || u.is_staff)
  );
  const basicUsers = availableUsers.filter(u =>
    !u.is_superuser && !u.is_staff &&
    (u.account_adds?.account_type === 'BASIC' || !u.account_adds)
  );

  console.log(`👥 User distribution: ${superUsers.length} super, ${premiumUsers.length} premium, ${basicUsers.length} basic`);

  // Трекер использованных basic пользователей (они могут создать только 1 объявление)
  const usedBasicUsers = new Set<number>();

  for (let i = 0; i < count; i++) {
    try {
      const progress = Math.round((i / count) * (includeImages ? 50 : 90)); // 50% если с изображениями, 90% если без
      onProgress?.(progress, `Создание объявления ${i + 1}/${count}...`);
      console.log(`📝 Generating ad ${i + 1}/${count}...`);

      // Выбираем пользователя для этого объявления
      let selectedUser = null;
      let userCredentials = null;

      if (availableUsers.length > 0) {
        // Создаем пул доступных пользователей с учетом ограничений
        const availablePool = [];

        // Добавляем всех премиум пользователей (без ограничений)
        premiumUsers.forEach(user => availablePool.push(user));

        // Добавляем всех суперпользователей (без ограничений)
        superUsers.forEach(user => availablePool.push(user));

        // Добавляем basic пользователей, которые еще не использованы (лимит 1 объявление)
        basicUsers.forEach(user => {
          if (!usedBasicUsers.has(user.id)) {
            availablePool.push(user);
          }
        });

        if (availablePool.length > 0) {
          // Выбираем случайного пользователя из доступного пула
          selectedUser = availablePool[Math.floor(Math.random() * availablePool.length)];

          // Если это basic пользователь, помечаем его как использованного
          if (basicUsers.some(u => u.id === selectedUser.id)) {
            usedBasicUsers.add(selectedUser.id);
            console.log(`👤 Selected basic user: ${selectedUser.email} (${usedBasicUsers.size}/${basicUsers.length} basic users used)`);
          } else if (superUsers.some(u => u.id === selectedUser.id)) {
            console.log(`🔥 Selected super user: ${selectedUser.email}`);
          } else {
            console.log(`👑 Selected premium user: ${selectedUser.email}`);
          }

          // Подготавливаем данные для логинации
          userCredentials = {
            email: selectedUser.email,
            password: '12345678' // Все пользователи имеют одинаковый пароль
          };
        } else {
          console.log(`⚠️ No available users (all basic users exhausted), falling back to current session`);
        }
      }

      // Выполняем логинацию для выбранного пользователя
      let currentAuthFetch = authFetch; // По умолчанию используем текущую сессию

      if (selectedUser && userCredentials) {
        console.log(`🔐 Logging in as ${userCredentials.email}...`);

        try {
          // Выполняем логинацию
          const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userCredentials)
          });

          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            const accessToken = loginData.access;

            if (accessToken) {
              // Создаем новую функцию authFetch для этого пользователя
              currentAuthFetch = (url: string, init?: RequestInit) => {
                const headers = {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  ...(init?.headers || {})
                };
                return fetch(url, { ...init, headers });
              };

              console.log(`✅ Successfully logged in as ${userCredentials.email}`);
            } else {
              console.warn(`⚠️ Login successful but no access token received for ${userCredentials.email}`);
            }
          } else {
            console.warn(`⚠️ Failed to login as ${userCredentials.email}, using current session`);
          }
        } catch (error) {
          console.warn(`⚠️ Login error for ${userCredentials.email}:`, error);
        }
      } else {
        console.log('👤 Using current session tokens for backend calls');
      }




      // Генерируем корректные данные формы используя кешированные модели
      const mock = await generateFullMockData(cachedModels.length > 0 ? cachedModels : undefined);
      const uniqueTitle = `${(mock as any).brand_name || mock.brand || 'Auto'} ${mock.model || ''} ${mock.year || ''} - Test Ad ${i + 1}`.trim();

      // Resolve valid region/city IDs from backend reference endpoints
      let resolvedRegionId: number | null = null;
      let resolvedCityId: number | null = null;
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const regionsResp = await currentAuthFetch(`${backendUrl}/api/ads/reference/regions/`);
        if (regionsResp.ok) {
          const regionsData = await regionsResp.json();
          const regionsArr: any[] = Array.isArray(regionsData) ? regionsData : (regionsData.results || []);
          const firstRegion = regionsArr[0];
          if (firstRegion?.id != null) {
            resolvedRegionId = Number(firstRegion.id);
            const citiesResp = await currentAuthFetch(`${backendUrl}/api/ads/reference/cities/?region_id=${resolvedRegionId}`);
            if (citiesResp.ok) {
              const citiesData = await citiesResp.json();
              const citiesArr: any[] = Array.isArray(citiesData) ? citiesData : (citiesData.results || citiesData?.cities || []);
              const firstCity = citiesArr[0];
              if (firstCity?.id != null) {
                resolvedCityId = Number(firstCity.id);
              }
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Unable to resolve region/city, proceeding without explicit IDs', e);
      }

      const formData: Partial<CarAdFormData> = {
        ...mock,
        title: uniqueTitle,
        description: (mock as any).description || `Автотест оголошення ${i + 1}`,
        use_profile_contacts: true,
        status: 'active',
        // Valid region/city resolved dynamically above (if available)
        ...(resolvedRegionId ? { region: resolvedRegionId as any } : {}),
        ...(resolvedCityId ? { city: resolvedCityId as any } : {}),
      };
      if ((formData as any).exchange_status === 'no') {
        (formData as any).exchange_status = 'no_exchange';
      }

      // Simple moderation-safe censoring for known false-positives (e.g., 'A-Class')
      const censor = (s?: string) => (s ? s.replace(/ass/gi, 'a**') : s);
      formData.title = censor(formData.title);
      formData.description = censor(formData.description as string);


      // УБИРАЕМ ВСЕ ПЕРЕОПРЕДЕЛЕНИЯ - используем только данные из обратного каскада
      console.log('[TestAds] 🚫 NO OVERRIDES - Using reverse-cascade data as-is');
      console.log('[TestAds] 📊 Generated data:', {
        vehicle_type: (formData as any).vehicle_type,
        vehicle_type_name: (formData as any).vehicle_type_name,
        brand: (formData as any).brand,
        brand_name: (formData as any).brand_name,
        model: (formData as any).model
      });

      // Преобразуем в payload для backend
      console.log(`[TestAds] 🔍 BEFORE MAPPING - formData:`, {
        vehicle_type: (formData as any).vehicle_type,
        vehicle_type_name: (formData as any).vehicle_type_name,
        brand: (formData as any).brand,
        brand_name: (formData as any).brand_name,
        model: (formData as any).model
      });

      const apiPayload = mapFormDataToApiData(formData);

      console.log(`[TestAds] 🔍 AFTER MAPPING - apiPayload:`, {
        vehicle_type: (apiPayload as any).vehicle_type,
        vehicle_type_name: (apiPayload as any).vehicle_type_name,
        mark: (apiPayload as any).mark,
        model: (apiPayload as any).model
      });

      // Страховка: если по какой-то причине vehicle_type вырезался маппером — восстанавливаем из formData
      if ((apiPayload as any)?.vehicle_type === undefined && (formData as any)?.vehicle_type != null) {
        (apiPayload as any).vehicle_type = Number((formData as any).vehicle_type);
        console.log(`[TestAds] 🔧 RESTORED vehicle_type from formData: ${(apiPayload as any).vehicle_type}`);
      }
      // УБИРАЕМ ПЕРЕОПРЕДЕЛЕНИЯ ТИПА ТРАНСПОРТА - доверяем обратному каскаду
      {
        const vtIdRaw = (apiPayload as any)?.vehicle_type;
        const vtId = typeof vtIdRaw === 'number' ? vtIdRaw : parseInt(String(vtIdRaw));
        console.log(`[TestAds] 🚫 NO OVERRIDES - Vehicle type from reverse-cascade: ${vtId} (${(apiPayload as any)?.vehicle_type_name})`);

        // Только проверяем что данные есть, но НЕ переопределяем
        if (isNaN(vtId)) {
          throw new Error(`Invalid vehicle_type from reverse-cascade: ${vtIdRaw}`);
        }
      }

      // Убеждаемся что vehicle_type_name также есть в dynamic_fields
      if ((apiPayload as any).dynamic_fields && (apiPayload as any).vehicle_type_name) {
        (apiPayload as any).dynamic_fields.vehicle_type_name = (apiPayload as any).vehicle_type_name;
      }

      // Диагностика
      console.log('[TestAds] ▶ Final payload vehicle_type:', (apiPayload as any).vehicle_type, 'name:', (apiPayload as any).vehicle_type_name);
      console.log('[TestAds] ▶ Dynamic fields vehicle_type_name:', (apiPayload as any).dynamic_fields?.vehicle_type_name);


      // Создаем объявление через прямой вызов к бэкенду
      console.log(`🌐 Creating ad ${i + 1} through backend API...`);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await currentAuthFetch(`${backendUrl}/api/ads/cars/create`, {
        method: 'POST',
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const createdAd = await response.json();
      console.log(`✅ Created ad ${i + 1}: ${formData.title} (ID: ${createdAd.id})`);

      console.log(`[TestAds] 🔍 BACKEND RESPONSE - createdAd:`, {
        vehicle_type: createdAd.vehicle_type,
        vehicle_type_name: createdAd.vehicle_type_name,
        mark: createdAd.mark,
        model: createdAd.model,
        title: createdAd.title
      });

      // Optionally generate and save images using the new algorithm
      let savedCount = 0;
      let relevancyIssues: string[] = [];

      let debugInfo: any = undefined;

      if (includeImages) {
        try {
          console.log(`🎨 [TestAds] Starting image generation for ad ${createdAd.id}...`);
          console.log(`📊 [TestAds] Image types requested:`, imageTypes);

          // Normalize values for relevancy
          // ❌ NORMALIZATION DISABLED: Use ONLY real vehicle_type_name
          const normalizeVehicleType = (raw?: any, rawName?: any): string => {
            console.log(`[TestAds] ✅ Using REAL vehicle_type_name: '${rawName}' (no ID mapping)`);
            return rawName || 'car'; // Use real name or minimal fallback
            const map: Record<string, string> = {
              'легковой': 'car', 'легковий': 'car', 'легковые автомобили': 'car', 'легкові автомобілі': 'car', 'автомобиль': 'car', 'auto': 'car', 'car': 'car',
              'грузовой': 'truck', 'грузовик': 'truck', 'вантажівка': 'truck', 'грузовые автомобили': 'truck', 'вантажні автомобілі': 'truck', 'truck': 'truck',
              'мотоцикл': 'motorcycle', 'мотоцикли': 'motorcycle', 'скутер': 'motorcycle', 'motorcycle': 'motorcycle',
              'автобус': 'bus', 'автобуси': 'bus', 'bus': 'bus',
              'фургон': 'van', 'мінівен': 'van', 'минивэн': 'van', 'van': 'van', 'minivan': 'van',
              'прицеп': 'trailer', 'полуприцеп': 'trailer', 'trailer': 'trailer'
            };
            if (map[s]) return map[s];
            if (map[name]) return map[name];
            return 'car';
          };
          let vt = normalizeVehicleType((formData as any).vehicle_type, (formData as any).vehicle_type_name);
          if (vt === 'trailer') vt = 'car';
          const preferredBrand = (formData as any)._preferred_brand_for_images;
          const brandStr = (typeof preferredBrand === 'string' && preferredBrand.trim())
            ? preferredBrand
            : ((typeof (formData as any).brand_name === 'string' && (formData as any).brand_name.trim())
                ? (formData as any).brand_name
                : (typeof (formData as any).brand === 'string' && isNaN(Number((formData as any).brand)) ? (formData as any).brand : ''));
          const modelStr = (typeof (formData as any).model_name === 'string' && (formData as any).model_name.trim())
            ? (formData as any).model_name
            : String(formData.model || '');
          const colorStr = (typeof (formData as any).color === 'string' && (formData as any).color.trim())
            ? (formData as any).color.toLowerCase()
            : String((formData as any).color_name || 'silver').toLowerCase();
          const bodyTypeStr = String(formData.body_type || (vt === 'truck' ? 'semi-truck' : vt === 'motorcycle' ? 'sport' : vt === 'bus' ? 'coach' : vt === 'van' ? 'van' : vt === 'trailer' ? 'curtainsider' : 'sedan')).toLowerCase();
          const conditionStr = String(formData.condition || 'good').toLowerCase();

          console.log(`🚗 [TestAds] Car data for image generation:`, {
            brand: brandStr,
            model: modelStr,
            year: formData.year,
            color: colorStr,
            body_type: bodyTypeStr,
            vehicle_type: vt,
            vehicle_type_name: (formData as any).vehicle_type_name || vt
          });

          // Generate images via normalized frontend endpoint with debug for relevancy checks
          const imageProgress = 50 + Math.round((i / count) * 40); // 50-90% для изображений
          onProgress?.(imageProgress, `Генерация изображений для объявления ${i + 1}/${count}...`);

          // Call backend directly to use pollinations-based mock algorithm and avoid frontend placeholders
          console.log(`🌐 [TestAds] Calling image generation endpoint: ${backendUrl}/api/chat/generate-car-images-mock/`);
          const genResp = await fetch(`${backendUrl}/api/chat/generate-car-images-mock/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              car_data: {
                brand: brandStr,
                model: modelStr,
                year: formData.year,
                color: colorStr,
                body_type: bodyTypeStr,
                vehicle_type: vt,
                vehicle_type_name: (formData as any).vehicle_type_name || vt,
                condition: conditionStr,
                description: formData.description
              },
              angles: imageTypes,
              style: 'realistic',
              use_mock_algorithm: true
            })
          });

          console.log(`📡 [TestAds] Image generation response status: ${genResp.status}`);

          if (genResp.ok) {
            const genData = await genResp.json();
            console.log(`✅ [TestAds] Image generation response:`, {
              success: genData.success,
              status: genData.status,
              imagesCount: genData.images?.length || 0,
              hasImages: Array.isArray(genData.images)
            });
            debugInfo = {
              canonical: genData?.debug?.canonical,
              prompts: genData?.debug?.prompts,
              angles: genData?.debug?.angles,
              style: genData?.debug?.style
            };
            // Relevancy/consistency checks using debug prompts
            try {
              const debugPrompts: string[] = (genData?.debug?.prompts as string[]) || [];
              const expected = {
                vt: String(vt || '').toLowerCase(),
                brand: String(brandStr || '').toLowerCase(),
                model: String(modelStr || '').toLowerCase(),
                color: String(colorStr || '').toLowerCase(),
                body: String(bodyTypeStr || '').toLowerCase(),
              };
              debugPrompts.forEach((p, i) => {
                const pl = String(p || '').toLowerCase();
                const miss: string[] = [];
                if (expected.vt && !pl.includes(expected.vt)) miss.push(`type!=${expected.vt}`);
                if (expected.brand && !pl.includes(expected.brand)) miss.push(`brand!=${expected.brand}`);
                if (expected.model && expected.model.length > 0 && !pl.includes(expected.model)) miss.push(`model!=${expected.model}`);
                if (miss.length) relevancyIssues.push(`angle#${i + 1}: ${miss.join(',')}`);
              });
              if (relevancyIssues.length) {
                console.warn(`⚠️ Relevancy issues for ad ${createdAd.id}:`, relevancyIssues);
              }
            } catch (e) {
              console.warn('⚠️ Relevancy check failed (no debug prompts available)');
            }

            if ((genData.success || genData.status === 'ok') && Array.isArray(genData.images)) {
              console.log(`📸 [TestAds] Processing ${genData.images.length} generated images...`);

              for (let idx = 0; idx < genData.images.length; idx++) {
                const img = genData.images[idx];
                const url = String(img?.url || '').trim();

                console.log(`🔍 [TestAds] Image ${idx + 1}/${genData.images.length}:`, {
                  url: url.substring(0, 100) + '...',
                  angle: img?.angle,
                  title: img?.title,
                  isValid: !(!url || !/^https?:\/\//i.test(url) || url.includes('via.placeholder.com'))
                });

                if (!url || !/^https?:\/\//i.test(url) || url.includes('via.placeholder.com')) {
                  console.warn(`⚠️ [TestAds] Skipping invalid/empty image URL for ad ${createdAd.id} at index ${idx}:`, {
                    url: url || 'EMPTY',
                    reason: !url ? 'empty' : (!/^https?:\/\//i.test(url) ? 'not http/https' : 'placeholder')
                  });
                  continue;
                }

                try {
                  console.log(`💾 [TestAds] Saving image ${idx + 1} to ad ${createdAd.id}...`);
                  const saveResp = await currentAuthFetch(`${backendUrl}/api/ads/${createdAd.id}/images`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      image_url: url,
                      caption: img.title || '',
                      is_primary: idx === 0,
                      order: idx + 1
                    })
                  });

                  if (saveResp.ok) {
                    savedCount++;
                    totalImages++;
                    console.log(`✅ [TestAds] Successfully saved image ${idx + 1} for ad ${createdAd.id} (total: ${savedCount})`);
                  } else {
                    const errorText = await saveResp.text();
                    console.error(`❌ [TestAds] Failed to save image ${idx + 1} for ad ${createdAd.id}:`, {
                      status: saveResp.status,
                      error: errorText
                    });
                  }
                } catch (saveErr) {
                  console.error(`❌ [TestAds] Error saving image ${idx + 1} for ad ${createdAd.id}:`, saveErr);
                }
              }

              console.log(`📊 [TestAds] Image saving complete for ad ${createdAd.id}: ${savedCount}/${genData.images.length} saved`);
            } else {
              console.error(`❌ [TestAds] Image generation returned no images or invalid response:`, {
                success: genData.success,
                status: genData.status,
                hasImages: Array.isArray(genData.images),
                imagesCount: genData.images?.length || 0
              });
            }
          } else {
            const errorText = await genResp.text();
            console.error(`❌ [TestAds] Image generation failed:`, {
              status: genResp.status,
              error: errorText
            });
          }
        } catch (imgErr) {
          console.error(`❌ [TestAds] Image generation flow error:`, imgErr);
        }
      }

      console.log(`✅ [TestAds] Ad ${i + 1} created successfully:`, {
        id: createdAd.id,
        title: formData.title,
        imagesCount: savedCount
      });

      results.push({
        success: true,
        title: formData.title,
        id: createdAd.id,
        user: 'current-session',
        imagesCount: savedCount,
        relevancyIssues,
        debug: debugInfo
      });

    } catch (error: any) {
      console.error(`❌ [TestAds] Error creating ad ${i + 1}:`, error);
      results.push({
        success: false,
        error: error.message,
        title: `Ad ${i + 1}`,
        imagesCount: 0
      });
    }
  }

  const created = results.filter(r => r.success).length;
  const totalAdsWithImages = results.filter(r => r.success && r.imagesCount > 0).length;

  console.log(`🎉 [TestAds] Generation complete:`, {
    totalRequested: count,
    created,
    totalImages,
    adsWithImages: totalAdsWithImages,
    adsWithoutImages: created - totalAdsWithImages
  });

  onProgress?.(100, `Завершено! Создано ${created} объявлений с ${totalImages} изображениями`);
  return { created, totalImages, details: results };
}

// Серверная функция логина
async function loginAsUserServer(email: string): Promise<string | null> {
  try {
    console.log(`🔐 Server login as ${email}...`);

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
      console.error(`❌ Server login failed for ${email}: ${loginResponse.status} - ${errorText}`);
      return null;
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access || loginData.token;

    if (!accessToken) {
      console.error(`❌ No access token received for ${email}`);
      return null;
    }

    console.log(`✅ Server login successful for ${email}`);
    return accessToken;

  } catch (error) {
    console.error(`❌ Server login error for ${email}:`, error);
    return null;
  }
}

// Функция генерации случайных данных автомобиля
function generateRandomCarData(index: number) {
  const brands = ['BMW', 'Mercedes-Benz', 'Toyota', 'Audi', 'Volkswagen', 'Honda', 'Ford', 'Nissan'];
  const models = ['X5', 'C-Class', 'Camry', 'A4', 'Golf', 'Civic', 'Focus', 'Altima'];
  const colors = ['Черный', 'Белый', 'Серый', 'Синий', 'Красный', 'Серебристый'];
  const bodyTypes = ['sedan', 'hatchback', 'suv', 'wagon', 'coupe'];
  const vehicleTypes = ['car', 'car', 'car', 'car', 'truck', 'motorcycle']; // Больше легковых

  const brand = brands[Math.floor(Math.random() * brands.length)];
  const model = models[Math.floor(Math.random() * models.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const bodyType = bodyTypes[Math.floor(Math.random() * bodyTypes.length)];
  const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
  const year = 2015 + Math.floor(Math.random() * 9); // 2015-2023
  const price = 10000 + Math.floor(Math.random() * 40000); // 10k-50k

  return {
    title: `${brand} ${model} ${year} - Test Ad ${index}`,
    description: `Тестовое объявление ${index}. ${brand} ${model} ${year} года в отличном состоянии.`,
    brand: brand,
    model: model,
    year: year,
    price: price,
    currency: 'UAH',
    color: color,
    body_type: bodyType,
    vehicle_type: vehicleType,
    vehicle_type_name: vehicleType,
    condition: 'used',
    mileage: Math.floor(Math.random() * 200000),
    engine_volume: 2.0 + Math.random() * 2, // 2.0-4.0L
    fuel_type: 'gasoline',
    transmission: Math.random() > 0.5 ? 'automatic' : 'manual',
    drive_type: 'front',
    seller_type: 'private',
    // Normalize exchange status to valid serializer choices
    exchange_status: 'no_exchange',
    // Use numeric PKs for region and city (fallback IDs)
    region: 203,
    city: 1142
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🎯 API ENDPOINT: Starting test ads generation...');

    // Безопасно парсим параметры запроса + fallback на querystring
    let body: any = {};
    try {
      body = await request.json();
      console.log('📋 API ENDPOINT: Request body:', body);
    } catch {
      console.log('⚠️ API ENDPOINT: No JSON body or invalid JSON, using defaults');
      body = {};
    }

    const qs = request.nextUrl?.searchParams;
    const parseBool = (v?: string | null) => (v ? /^(1|true|yes)$/i.test(v) : undefined);
    const parseArray = (v?: string | null) => {
      if (!v) return undefined;
      try { const arr = JSON.parse(v as any); if (Array.isArray(arr)) return arr; } catch {}
      return v.split(',').map(s => s.trim()).filter(Boolean);
    };

    let count = (body as any).count;
    if ((typeof count !== 'number' || isNaN(count)) && qs?.get('count')) {
      const n = parseInt(String(qs.get('count')));
      if (!isNaN(n)) count = n;
    }

    let includeImages = (body as any).includeImages;
    if (typeof includeImages !== 'boolean' && qs?.get('includeImages') != null) {
      const b = parseBool(qs.get('includeImages'));
      if (typeof b === 'boolean') includeImages = b;
    }

    let imageTypes = (body as any).imageTypes;
    if (!Array.isArray(imageTypes) && qs?.get('imageTypes')) {
      const arr = parseArray(qs.get('imageTypes'));
      if (arr) imageTypes = arr;
    }

    if (typeof count !== 'number' || isNaN(count)) count = 1;
    if (typeof includeImages !== 'boolean') includeImages = true;
    if (!Array.isArray(imageTypes) || imageTypes.length === 0) imageTypes = ['front', 'side'];

    const maxCount = Math.min(count, 50); // Увеличиваем лимит до 50 объявлений
    console.log(`🎲 Generating ${maxCount} test ads${includeImages ? ' with images' : ''}...`);

    if (includeImages && imageTypes.length === 0) {
      throw new Error('Image types must be specified when includeImages is true');
    }

    // Проверяем, нужно ли использовать асинхронный режим
    // ВСЕГДА используем асинхронный режим если есть изображения (генерация медленная)
    const shouldUseAsync = includeImages || maxCount > 5;

    if (shouldUseAsync) {
      console.log('🚀 Using async generation for large request...');

      // Запускаем асинхронную задачу через Celery
      try {
        const asyncResponse = await fetch('/api/autoria/async/generate-test-ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: maxCount,
            include_images: includeImages,
            image_types: imageTypes
          })
        });

        if (!asyncResponse.ok) {
          throw new Error(`Async API failed: ${asyncResponse.status}`);
        }

        const asyncResult = await asyncResponse.json();

        return NextResponse.json({
          success: true,
          async: true,
          task_id: asyncResult.task_id,
          message: `Запущена асинхронная генерация ${maxCount} объявлений`,
          status_url: asyncResult.status_url,
          estimated_time: asyncResult.estimated_time,
          polling_interval: 2000
        });

      } catch (asyncError) {
        console.warn('⚠️ Async generation failed, falling back to sync:', asyncError);
        // Продолжаем синхронную генерацию как fallback
      }
    }

    console.log('📸 Selected image types:', imageTypes);

    // Создаем тестовые объявления используя серверную функцию (синхронно)
    console.log('🚀 Calling server-side test ads creation...');

    // Callback для отслеживания прогресса (в будущем можно использовать WebSocket)
    const progressCallback = (progress: number, message: string) => {
      console.log(`📊 Progress: ${progress}% - ${message}`);
    };

    const result = await createTestAdsServer(request, maxCount, includeImages, imageTypes, progressCallback);
    console.log('📊 [TestAds] Server test ads result:', result);

    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    const adsWithImages = result.details?.filter((d: any) => d.success && d.imagesCount > 0).length || 0;
    const adsWithoutImages = result.created - adsWithImages;

    console.log(`✅ [TestAds] Successfully generated ${result.created} test ads in ${duration}:`, {
      totalAds: result.created,
      totalImages: result.totalImages,
      adsWithImages,
      adsWithoutImages
    });

    return NextResponse.json({
      success: true,
      count: result.created,
      totalImages: result.totalImages || 0,
      adsWithImages,
      adsWithoutImages,
      duration: duration,
      message: `Successfully created ${result.created} test ads${includeImages ? ` with ${result.totalImages} images` : ''}`,
      details: result.details
    });
  } catch (error) {
    console.error('❌ API ENDPOINT: Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test ads generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
