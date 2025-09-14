import { NextRequest, NextResponse } from 'next/server';
import { serverFetchData } from '@/app/api/(helpers)/common';
import { getAuthorizationHeaders } from '@/common/constants/headers';

/**
 * Validates that the record is perfect and contains no fallback values.
 * Returns array of validation errors, empty array if perfect.
 */
function validatePerfectRecord(data: any): string[] {
  const errors: string[] = [];

  // 1. Check for required fields
  const requiredFields = ['title', 'description', 'mark', 'model', 'year', 'price'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 2. Check for fallback indicators in text fields
  const fallbackIndicators = ['unknown', 'default', 'fallback', 'placeholder', 'test', 'mock', 'undefined', 'null'];
  const textFields = ['title', 'description', 'model'];

  for (const field of textFields) {
    const value = String(data[field] || '').toLowerCase();
    for (const indicator of fallbackIndicators) {
      if (value.includes(indicator)) {
        errors.push(`Fallback value detected in ${field}: contains '${indicator}'`);
      }
    }
  }

  // 3. Check for realistic data ranges
  const year = data.year;
  if (year && (year < 1900 || year > 2025)) {
    errors.push(`Unrealistic year: ${year}`);
  }

  const price = data.price;
  if (price && (price <= 0 || price > 10000000)) {
    errors.push(`Unrealistic price: ${price}`);
  }

  // 4. Check for generic/template values
  const title = String(data.title || '').toLowerCase();
  const description = String(data.description || '').toLowerCase();

  if (title.includes('test ad') || title.includes('sample') || title.includes('example')) {
    errors.push(`Template title detected: ${data.title}`);
  }

  if (description.includes('lorem ipsum') || description.includes('sample description')) {
    errors.push(`Template description detected`);
  }

  return errors;
}

// Функция для получения ID марки из справочников с фильтром по типу ТС
async function getOrCreateMarkId(brandName: string, desiredVehicleType?: { id?: any; name?: any }): Promise<number | string> {
  try {
    console.log(`[getOrCreateMarkId] Looking for brand: "${brandName}"`);

    // Если передан пустой brandName, используем BMW как fallback
    if (!brandName || brandName.trim() === '') {
      console.log(`[getOrCreateMarkId] Empty brand name, using BMW as fallback`);
      brandName = 'BMW';
    }

    // Получаем заголовки авторизации
    const authHeaders = await getAuthorizationHeaders();
    console.log(`[getOrCreateMarkId] Using auth headers for marks lookup`);

    // Получаем список марок из справочника с большим лимитом
    const marksData = await serverFetchData('api/ads/reference/marks/', {
      method: 'GET',
      headers: authHeaders,
      redirectOnError: false,
      params: {
        page_size: '1000' // Получаем больше марок для поиска
      }
    });

    console.log(`[getOrCreateMarkId] Marks data received:`, {
      hasResults: !!marksData?.results,
      resultsCount: marksData?.results?.length || 0,
      firstMark: marksData?.results?.[0]
    });

    if (marksData?.results && marksData.results.length > 0) {
      const marks: any[] = marksData.results;

      // Нормализация типа ТС
      const normalizeVT = (raw?: any, rawName?: any): string => {
        const s = String(raw ?? '').toLowerCase().trim();
        const name = String(rawName ?? '').toLowerCase().trim();
        const byId: Record<string, string> = { '1': 'car', '2': 'truck', '3': 'motorcycle', '4': 'bus', '5': 'van', '6': 'trailer', '25': 'trailer' };
        if (byId[s]) return byId[s];
        const map: Record<string, string> = {
          'легковой': 'car', 'легковий': 'car', 'легковые автомобили': 'car', 'легкові автомобілі': 'car', 'автомобиль': 'car', 'auto': 'car', 'car': 'car',
          'грузовой': 'truck', 'грузовик': 'truck', 'вантажівка': 'truck', 'грузовые автомобили': 'truck', 'вантажні автомобілі': 'truck', 'truck': 'truck',
          'мотоцикл': 'motorcycle', 'мотоцикли': 'motorcycle', 'скутер': 'motorcycle', 'motorcycle': 'motorcycle',
          'автобус': 'bus', 'автобуси': 'bus', 'bus': 'bus',
          'фургон': 'van', 'мінівен': 'van', 'минивэн': 'van', 'van': 'van', 'minivan': 'van',
          'прицеп': 'trailer', 'полуприцеп': 'trailer', 'причеп': 'trailer', 'причепи': 'trailer', 'trailer': 'trailer'
        };
        if (map[s]) return map[s];
        if (map[name]) return map[name];
        return '';
      };

      const desiredKey = normalizeVT(desiredVehicleType?.id, desiredVehicleType?.name);

      // Фильтруем пул по типу ТС, если указан
      let pool = marks;
      if (desiredKey) {
        const byType = marks.filter(m => normalizeVT(m.vehicle_type, m.vehicle_type_name) === desiredKey);
        if (desiredKey === 'trailer' || byType.length === 0) {
          // Жестко исключаем прицепы из автогенерации
          const notTrailer = marks.filter(m => normalizeVT(m.vehicle_type, m.vehicle_type_name) !== 'trailer');
          if (notTrailer.length) pool = notTrailer;
        } else {
          pool = byType;
        }
      } else {
        const notTrailer = marks.filter(m => normalizeVT(m.vehicle_type, m.vehicle_type_name) !== 'trailer');
        if (notTrailer.length) pool = notTrailer;
      }

      // Ищем марку по точному совпадению имени в отфильтрованном пуле
      let foundMark = pool.find((mark: any) =>
        mark.name.toLowerCase() === brandName.toLowerCase()
      );

      // Если точного совпадения нет, ищем по частичному совпадению
      if (!foundMark) {
        foundMark = pool.find((mark: any) =>
          mark.name.toLowerCase().includes(brandName.toLowerCase()) ||
          brandName.toLowerCase().includes(mark.name.toLowerCase())
        );
      }

      if (foundMark) {
        console.log(`[getOrCreateMarkId] ✅ Found mark: "${foundMark.name}" (type=${normalizeVT(foundMark.vehicle_type, foundMark.vehicle_type_name)}) ID: ${foundMark.id}`);
        return foundMark.id;
      }

      // ❌ POPULAR BRANDS FALLBACK DISABLED: No more incorrect brand assignments
      // Если не найдена точная марка, НЕ применяем популярные марки как fallback
      console.log(`[getOrCreateMarkId] ❌ Brand "${brandName}" not found in pool, no popular fallback applied`);
      // Возвращаем null чтобы избежать неправильных шилдиков
      // return null;

      // ❌ FIRST AVAILABLE FALLBACK DISABLED: No more random brand assignments
      console.log(`[getOrCreateMarkId] ❌ Brand "${brandName}" not found, NO fallback to first available mark`);
      return brandName; // Возвращаем оригинальное название без подмены
    }

    // Если вообще нет марок в справочнике, возвращаем строку для создания
    console.log(`[getOrCreateMarkId] ❌ No marks found in reference, will use brand name as string: "${brandName}"`);
    return brandName; // Возвращаем название марки как строку
  } catch (error) {
    console.error(`[getOrCreateMarkId] ❌ Error getting mark ID:`, error);
    // В случае ошибки возвращаем название марки как строку
    return brandName || 'Unknown'; // ❌ NO BMW FALLBACK
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Car Ad Create API] 🚀 UPDATED API ENDPOINT - Creating new car advertisement...');
    console.log('[Car Ad Create API] 🔧 This is the UPDATED version with image processing!');

    // Получаем данные из запроса
    const formData = await request.json();
    console.log('[Car Ad Create API] 📋 Form data received:', {
      title: formData.title,
      mark: formData.mark,
      model: formData.model,
      year: formData.year,
      price: formData.price
    });

    // Валидация обязательных полей
    if (!formData.title || !formData.description) {
      return NextResponse.json({
        success: false,
        error: 'Title and description are required',
        field_errors: {
          title: !formData.title ? ['Title is required'] : [],
          description: !formData.description ? ['Description is required'] : []
        }
      }, { status: 400 });
    }

    // Подготавливаем данные для backend API в соответствии с CarAdCreateSerializer
    const backendData = {
      // Основная информация (CarAd model)
      title: formData.title,
      description: formData.description,
      account: 12, // ID аккаунта пользователя pvs.versia@gmail.com (из логов видно account_id: 12)

      // Связанные модели - используем существующие ID из справочников
      mark: await getOrCreateMarkId(formData.brand || formData.brand_name || 'BMW', { id: formData.vehicle_type, name: formData.vehicle_type_name }), // Получаем реальный ID марки
      model: formData.model || 'Unknown Model',
      generation: formData.generation || null,
      modification: formData.modification || null,

      // Ценообразование
      price: parseFloat(formData.price) || 0,
      currency: formData.currency || 'UAH',

      // Местоположение - проверяем и конвертируем в числа
      region: formData.region ? parseInt(formData.region) : null,
      city: formData.city ? parseInt(formData.city) : null,

      // Характеристики автомобиля (будут переданы в dynamic_fields)
      year: formData.year ? parseInt(formData.year) : null,
      mileage_km: formData.mileage_km || formData.mileage || 0,
      engine_volume: formData.engine_volume ? parseFloat(formData.engine_volume) : null,
      engine_power: formData.engine_power ? parseInt(formData.engine_power) : null,
      fuel_type: formData.fuel_type || null,
      transmission_type: formData.transmission_type || formData.transmission || null,
      drive_type: formData.drive_type || null,
      body_type: formData.body_type || null,
      color: formData.color || null,
      steering_wheel: formData.steering_wheel || null,
      condition: formData.condition || 'used',
      vin_code: formData.vin_code || null,
      license_plate: formData.license_plate || null,
      number_of_doors: formData.number_of_doors ? parseInt(formData.number_of_doors) : null,
      number_of_seats: formData.number_of_seats ? parseInt(formData.number_of_seats) : null,

      // Контакты - добавляем поддержку контактов
      contacts: formData.contacts || [],

      // Дополнительные поля
      seller_type: formData.seller_type || 'private',
      exchange_status: formData.exchange_status || 'no_exchange',
      additional_info: formData.additional_info,

      // Dynamic fields для дополнительных характеристик
      dynamic_fields: {
        ...formData.dynamic_fields,
        // Сохраняем все характеристики в dynamic_fields для совместимости
        year: formData.year ? parseInt(formData.year) : null,
        mileage: formData.mileage || formData.mileage_km || 0,
        engine_volume: formData.engine_volume ? parseFloat(formData.engine_volume) : null,
        engine_power: formData.engine_power ? parseInt(formData.engine_power) : null,
        fuel_type: formData.fuel_type || null,
        transmission: formData.transmission || formData.transmission_type || null,
        drive_type: formData.drive_type || null,
        body_type: formData.body_type || null,
        color: formData.color || null,
        condition: formData.condition || 'used',
        // Добавляем дополнительные поля из формы
        vehicle_type: formData.vehicle_type || null,
        vehicle_type_name: formData.vehicle_type_name || null,
        brand_name: formData.brand_name || null,
        steering_wheel: formData.steering_wheel,
        condition: formData.condition,
        vin_code: formData.vin_code,
        license_plate: formData.license_plate,
        number_of_doors: formData.number_of_doors,
        number_of_seats: formData.number_of_seats,
        // Метаданные
        is_urgent: formData.is_urgent || false,
        is_highlighted: formData.is_highlighted || false,
        // Дополнительная информация
        additional_info: formData.additional_info
      }
    };

    console.log('[Car Ad Create API] 🔄 Sending to backend:', {
      endpoint: 'api/ads/cars/create',
      dataKeys: Object.keys(backendData),
      hasContacts: !!backendData.contacts,
      contactsCount: backendData.contacts?.length || 0,
      contacts: backendData.contacts,
      hasDynamicFields: !!backendData.dynamic_fields,
      dynamicFieldsKeys: backendData.dynamic_fields ? Object.keys(backendData.dynamic_fields) : [],
      mark: backendData.mark,
      model: backendData.model
    });

    // Отладочная информация перед отправкой
    console.log('[Car Ad Create API] 🔄 Sending to backend:', {
      endpoint: 'api/ads/cars/create',
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
      dataKeys: Object.keys(backendData),
      criticalFields: {
        title: backendData.title,
        description: backendData.description,
        mark: backendData.mark,
        model: backendData.model,
        price: backendData.price,
        currency: backendData.currency,
        region: backendData.region,
        city: backendData.city,
        year: backendData.year
      }
    });

    // 🚨 STRICT VALIDATION: Only perfect records are sent to DB
    const validationErrors = validatePerfectRecord(backendData);

    if (validationErrors.length > 0) {
      console.log('[Car Ad Create API] ❌ PERFECT RECORD VALIDATION FAILED:', validationErrors);
      return NextResponse.json({
        success: false,
        error: 'Only perfect records are allowed in DB. Fix errors or regenerate data.',
        validation_errors: validationErrors,
        received_data: backendData
      }, { status: 400 });
    }

    // Получаем заголовки авторизации из существующей системы
    const authHeaders = await getAuthorizationHeaders();
    console.log('[Car Ad Create API] 🔑 Using auth headers:', {
      hasAuth: !!authHeaders.Authorization,
      authLength: authHeaders.Authorization?.length || 0
    });

    // Проверяем доступность backend перед отправкой данных
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('[Car Ad Create API] 🔍 Checking backend availability:', backendUrl);

    try {
      const healthCheck = await fetch(`${backendUrl}/api/health/`, {
        method: 'GET',
        headers: authHeaders
      });
      console.log('[Car Ad Create API] 🏥 Backend health check status:', healthCheck.status);

      if (!healthCheck.ok) {
        console.log('[Car Ad Create API] ⚠️ Backend health check failed, but continuing...');
      }
    } catch (healthError) {
      console.error('[Car Ad Create API] ❌ Backend health check error:', healthError.message);
      console.log('[Car Ad Create API] ⚠️ Backend may be unavailable, but continuing...');
    }

    console.log('[Car Ad Create API] 🚀 Sending to backend with validated data...');
    console.log('[Car Ad Create API] 📤 Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log('[Car Ad Create API] 📤 Endpoint:', 'api/ads/cars/create');
    console.log('[Car Ad Create API] 📤 Full URL:', `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ads/cars/create`);
    console.log('[Car Ad Create API] 📤 Auth headers:', Object.keys(authHeaders));
    console.log('[Car Ad Create API] 📤 Data to send:', JSON.stringify(backendData, null, 2));

    const result = await serverFetchData('api/ads/cars/create', {
      method: 'POST',
      body: backendData,
      headers: authHeaders,
      redirectOnError: false
    });

    console.log('[Car Ad Create API] 📡 Backend response:', result);
    console.log('[Car Ad Create API] 📡 Backend response type:', typeof result);

    if (!result) {
      console.log('[Car Ad Create API] ❌ No result from backend');
      return NextResponse.json({
        success: false,
        error: 'No response from backend',
      }, { status: 502 });
    }

    console.log('[Car Ad Create API] ✅ Advertisement created successfully:', {
      id: result.id,
      status: result.status,
      is_validated: result.is_validated
    });

    // Обрабатываем изображения, если они были переданы
    console.log('[Car Ad Create API] 🔍 Checking images in formData:', {
      hasImages: !!formData.images,
      imagesLength: formData.images?.length || 0,
      imagesType: typeof formData.images,
      images: formData.images
    });

    if (formData.images && formData.images.length > 0) {
      console.log('[Car Ad Create API] 📸 Processing images for ad:', result.id);

      try {
        const imagePromises = formData.images.map(async (imageUrl: string, index: number) => {
          console.log(`[Car Ad Create API] 📸 Adding image ${index + 1}:`, imageUrl);

          return await serverFetchData(`api/ads/${result.id}/images`, {
            method: 'POST',
            body: {
              image_url: imageUrl,
              caption: `Generated image ${index + 1} for ${result.title}`,
              is_primary: index === 0, // Первое изображение делаем главным
              order: index + 1
            },
            headers: authHeaders, // Используем те же заголовки авторизации
            redirectOnError: false
          });
        });

        const imageResults = await Promise.all(imagePromises);
        const successfulImages = imageResults.filter(img => img !== null);

        console.log('[Car Ad Create API] 📸 Images processed:', {
          total: formData.images.length,
          successful: successfulImages.length,
          failed: formData.images.length - successfulImages.length
        });

        // Обновляем результат с информацией об изображениях
        result.images = successfulImages;

      } catch (imageError) {
        console.error('[Car Ad Create API] ❌ Error processing images:', imageError);
        // Не прерываем выполнение, объявление уже создано
      }
    }

    // Возвращаем результат с информацией о валидации
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Объявление создано успешно',
      validation: {
        is_validated: result.is_validated,
        status: result.status,
        moderation_reason: result.moderation_reason,
        validation_errors: result.validation_errors
      }
    });

  } catch (error: any) {
    console.error('[Car Ad Create API] ❌ Error creating advertisement:', error);
    console.error('[Car Ad Create API] ❌ Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });

    // Обрабатываем различные типы ошибок от backend
    if (error.response) {
      const errorData = error.response.data;
      console.error('[Car Ad Create API] ❌ Backend error response:', errorData);

      // Ошибки валидации полей
      if (error.response.status === 400) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          message: errorData.detail || errorData.message || 'Validation error',
          field_errors: errorData.errors || errorData,
          validation_result: errorData.validation_result,
          backend_error: errorData
        }, { status: 400 });
      }

      // Ошибки модерации
      if (errorData.moderation) {
        return NextResponse.json({
          success: false,
          error: 'Moderation failed',
          moderation: errorData.moderation
        }, { status: 422 });
      }

      // Ошибки лимитов аккаунта
      if (error.response.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'Account limits exceeded',
          limits: errorData.limits
        }, { status: 403 });
      }

      // Другие HTTP ошибки
      return NextResponse.json({
        success: false,
        error: `Backend error: ${error.response.status}`,
        message: errorData.detail || errorData.message || 'Unknown backend error',
        backend_error: errorData
      }, { status: error.response.status });
    }

    // Общая ошибка
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET метод для получения формы создания (если нужно)
export async function GET(request: NextRequest) {
  try {
    console.log('[Car Ad Create API] 📤 Getting create form data...');

    // Можно вернуть данные для инициализации формы
    // Например, лимиты аккаунта, настройки по умолчанию и т.д.
    const limits = await fetchData('api/ads/cars/check-limits', {
      redirectOnError: false
    });

    return NextResponse.json({
      success: true,
      data: {
        limits: limits || null,
        defaults: {
          currency: 'UAH',
          condition: 'used',
          seller_type: 'private',
          exchange_status: 'no'
        }
      }
    });

  } catch (error: any) {
    console.error('[Car Ad Create API] ❌ Error getting form data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get form data',
      details: error.message
    }, { status: 500 });
  }
}
