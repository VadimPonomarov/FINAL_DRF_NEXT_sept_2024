/**
 * Утилиты для маппинга данных между API и формой
 * Обеспечивает корректное преобразование данных в обе стороны
 */

import { CarAd, CarAdFormData } from '@/modules/autoria/shared/types/autoria';

/**
 * Преобразует данные из API (CarAd) в формат формы (CarAdFormData)
 */
export function mapApiDataToFormData(apiData: CarAd): Partial<CarAdFormData> {
  console.log('[DataMapper] Converting API data to form data:', apiData);
  console.log('[DataMapper] Key API fields:', {
    vehicle_type: apiData.vehicle_type,
    vehicle_type_name: apiData.vehicle_type_name,
    mark: apiData.mark,
    model: apiData.model,
    images: apiData.images?.length || 0,
    dynamic_fields: apiData.dynamic_fields ? Object.keys(apiData.dynamic_fields) : []
  });

  // Проверяем критические поля и логируем проблемы
  const criticalFields = {
    title: apiData.title,
    description: apiData.description,
    price: apiData.price,
    currency: apiData.currency,
    mark: apiData.mark,
    model: apiData.model
  };

  const missingCritical = Object.entries(criticalFields)
    .filter(([key, value]) => !value || value === '')
    .map(([key]) => key);

  if (missingCritical.length > 0) {
    console.error('[DataMapper] ❌ CRITICAL: Missing required fields from API:', missingCritical);
    console.error('[DataMapper] ❌ This will cause form initialization problems!');
  }

  // Функция для извлечения ID из объекта или возврата строки/числа как есть
  const extractId = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'object' && value.id) {
      return value.id.toString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return value.toString();
    }
    return undefined;
  };

  // Функция для извлечения названия из объекта или API данных
  const extractName = (value: any, nameField: string): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'object' && value[nameField]) {
      return value[nameField];
    }
    return undefined;
  };

  // 🧠 МЕМОИЗАЦИЯ: Кеш для извлечения значений
  const extractValueCache = new Map<string, any>();

  // Функция для извлечения значения из разных возможных источников с мемоизацией
  const extractValue = (primary: any, ...fallbacks: any[]): any => {
    // Создаем ключ кеша
    const cacheKey = JSON.stringify([primary, ...fallbacks]);

    // Проверяем кеш
    if (extractValueCache.has(cacheKey)) {
      return extractValueCache.get(cacheKey);
    }

    // Вычисляем значение
    let result = undefined;
    if (primary !== undefined && primary !== null && primary !== '') {
      result = primary;
    } else {
      for (const fallback of fallbacks) {
        if (fallback !== undefined && fallback !== null && fallback !== '') {
          result = fallback;
          break;
        }
      }
    }

    // Сохраняем в кеш (ограничиваем размер)
    if (extractValueCache.size > 500) {
      extractValueCache.clear();
    }
    extractValueCache.set(cacheKey, result);

    return result;
  };

  const formData: Partial<CarAdFormData> = {
    // ID для редактирования
    id: apiData.id,

    // ✅ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ - гарантируем их наличие
    title: apiData.title || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ в production
    description: apiData.description || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ в production

    // ✅ ОБЯЗАТЕЛЬНЫЕ: Связанные поля - для формы используем ID марки
    brand: extractId(apiData.mark) || extractId(apiData.brand) || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ
    mark: extractId(apiData.mark) || extractId(apiData.brand) || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ
    // Сохраняем ID отдельно для совместимости
    brand_id: extractId(apiData.mark) || extractId(apiData.brand) || '',
    mark_id: extractId(apiData.mark) || extractId(apiData.brand) || '',
    // Сохраняем названия для отображения в каскадных селектах
    brand_name: extractName(apiData.mark, 'name') || apiData.brand_name || apiData.mark_name || '',
    mark_name: extractName(apiData.mark, 'name') || apiData.mark_name || apiData.brand_name || '',

    // Тип транспорта - ID и название
    vehicle_type: extractId(apiData.vehicle_type as any) || extractValue(
      apiData.vehicle_type as any,
      apiData.dynamic_fields?.vehicle_type
    ) || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ
    vehicle_type_name: apiData.vehicle_type_name ||
                      (typeof apiData.vehicle_type === 'object' ? (apiData.vehicle_type as any)?.name : undefined) ||
                      extractName(apiData.vehicle_type as any, 'name') || '',

    // ✅ ОБЯЗАТЕЛЬНОЕ: Модель - это строка в нашей системе
    model: extractValue(
      typeof apiData.model === 'object' ? (apiData.model as any)?.name : (apiData.model as any),
      apiData.dynamic_fields?.model
    ) || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ в production

    // Дополнительная информация
    generation: extractValue(apiData.generation, apiData.dynamic_fields?.generation),
    modification: extractValue(apiData.modification, apiData.dynamic_fields?.modification),

    // Технические характеристики
    year: extractValue(
      apiData.year,
      apiData.car_specs?.year,  // Добавляем car_specs
      apiData.dynamic_fields?.year
    ),
    // ✅ СИНХРОНИЗАЦИЯ: mileage маппится из mileage_km (CarSpecificationModel)
    mileage: extractValue(
      apiData.mileage_km, // Приоритет backend полю
      apiData.mileage,
      apiData.car_specs?.mileage,  // Добавляем car_specs
      apiData.dynamic_fields?.mileage_km,
      apiData.dynamic_fields?.mileage
    ),
    mileage_km: extractValue(
      apiData.mileage_km,
      apiData.mileage,
      apiData.car_specs?.mileage,  // Добавляем car_specs
      apiData.dynamic_fields?.mileage_km,
      apiData.dynamic_fields?.mileage
    ),
    engine_volume: extractValue(
      apiData.engine_volume,
      apiData.car_specs?.engine_volume,  // Добавляем car_specs
      apiData.dynamic_fields?.engine_volume
    ),
    engine_power: extractValue(
      apiData.engine_power,
      apiData.dynamic_fields?.engine_power
    ),
    fuel_type: extractValue(
      apiData.fuel_type,
      apiData.car_specs?.fuel_type,  // Добавляем car_specs
      apiData.dynamic_fields?.fuel_type
    ),
    transmission: extractValue(
      apiData.transmission,
      apiData.transmission_type,
      apiData.car_specs?.transmission,  // Добавляем car_specs
      apiData.dynamic_fields?.transmission,
      apiData.dynamic_fields?.transmission_type
    ),
    drive_type: extractValue(
      apiData.drive_type,
      apiData.dynamic_fields?.drive_type
    ),
    body_type: extractValue(
      apiData.body_type,
      apiData.car_specs?.body_type,  // Добавляем car_specs
      apiData.dynamic_fields?.body_type
    ),
    color: extractValue(
      typeof apiData.color === 'object' ? apiData.color.name : apiData.color,
      apiData.car_specs?.color,  // Добавляем car_specs
      apiData.dynamic_fields?.color
    ),
    steering_wheel: extractValue(
      apiData.steering_wheel,
      apiData.dynamic_fields?.steering_wheel
    ),
    condition: extractValue(
      apiData.condition,
      apiData.car_specs?.condition,  // Добавляем car_specs
      apiData.dynamic_fields?.condition,
      'used' // значение по умолчанию
    ),
    vin_code: extractValue(
      apiData.vin_code,
      apiData.dynamic_fields?.vin_code,
      apiData.dynamic_fields?.vin
    ),
    license_plate: extractValue(
      apiData.license_plate,
      apiData.dynamic_fields?.license_plate
    ),
    number_of_doors: extractValue(
      apiData.number_of_doors,
      apiData.dynamic_fields?.number_of_doors
    ),
    number_of_seats: extractValue(
      apiData.number_of_seats,
      apiData.dynamic_fields?.number_of_seats
    ),

    // ✅ ОБЯЗАТЕЛЬНЫЕ: Ценообразование
    price: apiData.price || 0, // ❌ НЕ ДОЛЖНО БЫТЬ 0 в production
    currency: apiData.currency || 'UAH', // ✅ Имеет разумное значение по умолчанию

    // ✅ ОБЯЗАТЕЛЬНЫЕ: Местоположение - извлекаем ID и названия
    region: extractId(apiData.region) || extractValue(apiData.region, apiData.dynamic_fields?.region) || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ
    city: extractId(apiData.city) || extractValue(apiData.city, apiData.dynamic_fields?.city) || '', // ❌ НЕ ДОЛЖНО БЫТЬ ПУСТЫМ
    // Сохраняем названия для отображения в форме
    region_name: extractName(apiData.region, 'name') || apiData.region_name ||
                 (typeof apiData.region === 'string' ? apiData.region : undefined) || '',
    city_name: extractName(apiData.city, 'name') || apiData.city_name ||
               (typeof apiData.city === 'string' ? apiData.city : undefined) || '',

    // Контакты
    contacts: (apiData.contacts || []) as any[],
    contact_name: extractValue(
      apiData.contact_name,
      apiData.dynamic_fields?.contact_name
    ),
    phone: extractValue(
      apiData.phone,
      apiData.dynamic_fields?.phone
    ),

    // Дополнительная информация
    additional_info: extractValue(
      apiData.additional_info,
      apiData.dynamic_fields?.additional_info
    ),

    // Настройки контактов
    use_profile_contacts: extractValue(
      apiData.use_profile_contacts,
      apiData.dynamic_fields?.use_profile_contacts,
      true // По умолчанию true - включено
    ),

    // Тип продавца и обмен
    seller_type: extractValue(
      apiData.seller_type,
      apiData.dynamic_fields?.seller_type,
      'private'
    ),
    exchange_status: (() => {
      const raw = extractValue(
        apiData.exchange_status,
        apiData.dynamic_fields?.exchange_status,
        'no_exchange'
      );
      if (raw === 'no') return 'no_exchange';
      if (raw === 'possible_exchange') return 'possible';
      return raw;
    })(),

    // Метаданные
    is_urgent: extractValue(
      apiData.is_urgent,
      apiData.dynamic_fields?.is_urgent,
      false
    ),
    is_highlighted: extractValue(
      apiData.is_highlighted,
      apiData.dynamic_fields?.is_highlighted,
      false
    ),

    // Геокодирование
    geocode: extractValue(
      apiData.geocode,
      apiData.dynamic_fields?.geocode
    ),

    // Изображения: нормализуем под форму и сохраняем совместимость с компонентами формы
    images: ((apiData.images || []).map((img: any) => {
      const resolvedUrl = img?.image_display_url || img?.image_url || img?.url || img?.image;
      const imagePath = img?.image ?? (typeof resolvedUrl === 'string' && !resolvedUrl.startsWith('http') ? resolvedUrl : undefined);
      const displayUrl = img?.image_display_url ?? img?.image_url ?? (typeof resolvedUrl === 'string' && resolvedUrl.startsWith('http') ? resolvedUrl : undefined);
      return {
        id: img?.id,
        // сохраняем поля, которые ожидает ImagesForm
        image: imagePath,
        image_display_url: displayUrl,
        // IMPORTANT: url must always be set for gallery display
        url: resolvedUrl || displayUrl || imagePath,
        caption: img?.caption,
        is_primary: img?.is_primary || img?.is_main,
        is_main: img?.is_main || img?.is_primary,
        order: img?.order,
      };
    })) as any[],
    existing_images: ((apiData.existing_images || apiData.images || []).map((img: any) => {
      const resolvedUrl = img?.image_display_url || img?.image_url || img?.url || img?.image;
      const imagePath = img?.image ?? (typeof resolvedUrl === 'string' && !resolvedUrl.startsWith('http') ? resolvedUrl : undefined);
      const displayUrl = img?.image_display_url ?? (typeof resolvedUrl === 'string' && resolvedUrl.startsWith('http') ? resolvedUrl : undefined);
      return {
        id: img?.id,
        image: imagePath,
        image_display_url: displayUrl,
        url: resolvedUrl,
        caption: img?.caption,
        is_primary: img?.is_primary || img?.is_main,
        is_main: img?.is_main || img?.is_primary,
        order: img?.order,
      };
    })) as any[],

    // Dynamic fields для совместимості
    dynamic_fields: apiData.dynamic_fields || {},
  };

  console.log('[DataMapper] Mapped form data:', formData);
  console.log('[DataMapper] Key mapped fields:', {
    brand: formData.brand,
    model: formData.model,
    region: formData.region,
    city: formData.city,
    price: formData.price,
    currency: formData.currency,
    year: formData.year,
    mileage: formData.mileage
  });

  console.log('[DataMapper] ✅ Final form data created');
  console.log('[DataMapper] 🔍 Key fields check:', {
    vehicle_type: formData.vehicle_type,
    vehicle_type_name: formData.vehicle_type_name,
    brand: formData.brand,
    brand_name: formData.brand_name,
    model: formData.model,
    images_count: formData.images?.length || 0,
    first_image_url: (formData.images?.[0] as any)?.image_display_url || (formData.images?.[0] as any)?.url
  });

  return formData;
}

/**
 * Преобразует данные из формы (CarAdFormData) в формат для API
 */
export function mapFormDataToApiData(formData: Partial<CarAdFormData>): Partial<CarAd> {
  console.log('[DataMapper] 🔍 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Converting form data to API data');
  console.log('[DataMapper] 📝 Входящие данные формы:', formData);
  console.log('[DataMapper] 🚗 Ключевые поля:', {
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    year: formData.year,
    mileage: formData.mileage,
    color: formData.color,
    region: formData.region,
    city: formData.city,
    price: formData.price,
  });

  // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: Проверяем ВСЕ обязательные поля
  const inputRequiredFields = {
    title: formData.title,
    description: formData.description,
    price: formData.price,
    currency: formData.currency,
    brand: formData.brand || formData.mark,
    model: formData.model,
    region: formData.region,
    city: formData.city
  };

  const missingFields = Object.entries(inputRequiredFields)
    .filter(([key, value]) => !value || value === '' || value === 0)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    console.error('[DataMapper] 🚨 CRITICAL: Missing required fields before API call:', missingFields);
    console.error('[DataMapper] 🚨 Form data:', formData);
    throw new Error(`Required fields are missing: ${missingFields.join(', ')}`);
  }

  const apiData: Partial<CarAd> = {
    // Основная информация
    title: formData.title,
    description: formData.description,

    // Модель остается строкой
    model: formData.model,

    // Тип транспорта: передаем ID в API (важно для корректного отображения типа на карточке)
    vehicle_type: (() => {
      const raw = (formData as any).vehicle_type ?? (formData.dynamic_fields as any)?.vehicle_type;
      if (raw === undefined || raw === null || raw === '') {
        console.error('[DataMapper] 🚨 CRITICAL: vehicle_type is missing in form data!', formData);
        return undefined;
      }
      const n = typeof raw === 'number' ? raw : parseInt(String(raw));
      if (isNaN(n)) {
        console.error('[DataMapper] 🚨 CRITICAL: vehicle_type is not a valid number!', raw);
        return undefined;
      }
      return n as any;
    })(),
    vehicle_type_name: (formData as any).vehicle_type_name,

    // ✅ СИНХРОНИЗАЦИЯ: Связанные поля - сериализатор использует 'make', модель 'mark'
    mark: (() => {
      // Приоритет: brand_id -> mark_id -> brand -> mark
      const candidates: Array<string | number | undefined> = [
        (formData as any).brand_id,
        (formData as any).mark_id,
        formData.brand,
        formData.mark
      ];
      for (const c of candidates) {
        if (c === undefined || c === null || c === '') continue;
        const n = typeof c === 'number' ? c : parseInt(String(c));
        if (!isNaN(n)) return n;
      }
      console.error('[DataMapper] 🚨 CRITICAL: mark/brand is missing in form data!', formData);
      throw new Error('Mark/Brand is required but missing in form data');
    })(),

    // ✅ СИНХРОНИЗАЦИЯ: Добавляем 'make' для совместимости с сериализатором
    make: (() => {
      const candidates: Array<string | number | undefined> = [
        (formData as any).brand_id,
        (formData as any).mark_id,
        formData.brand,
        formData.mark
      ];
      for (const c of candidates) {
        if (c === undefined || c === null || c === '') continue;
        const n = typeof c === 'number' ? c : parseInt(String(c));
        if (!isNaN(n)) return n;
      }
      console.error('[DataMapper] 🚨 CRITICAL: make/brand is missing in form data!', formData);
      throw new Error('Make/Brand is required but missing in form data');
    })(),

    // Технические характеристики
    fuel_type: formData.fuel_type,
    transmission_type: formData.transmission,
    drive_type: formData.drive_type,
    body_type: formData.body_type,
    color: formData.color,
    steering_wheel: formData.steering_wheel,
    condition: (() => {
      const m = formData.mileage ? parseInt(String(formData.mileage)) : undefined;
      const cond = formData.condition;
      if (cond === 'damaged') return 'damaged';
      if (typeof m === 'number' && !isNaN(m)) return m < 5000 ? 'new' : 'used';
      return cond || 'used';
    })(),
    vin_code: formData.vin_code,
    license_plate: formData.license_plate,
    number_of_doors: formData.number_of_doors,
    number_of_seats: formData.number_of_seats,

    // Ценообразование
    price: formData.price,
    currency: formData.currency,

    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Местоположение - ОБЯЗАТЕЛЬНЫЕ поля
    region: (() => {
      if (!formData.region) {
        console.error('[DataMapper] 🚨 CRITICAL: region is missing in form data!', formData);
        throw new Error('Region is required but missing in form data');
      }
      const regionId = parseInt(String(formData.region));
      if (isNaN(regionId)) {
        console.error('[DataMapper] 🚨 CRITICAL: region is not a valid number!', formData.region);
        throw new Error(`Region must be a valid number, got: ${formData.region}`);
      }
      return regionId;
    })(),
    city: (() => {
      if (!formData.city) {
        console.error('[DataMapper] 🚨 CRITICAL: city is missing in form data!', formData);
        throw new Error('City is required but missing in form data');
      }
      const cityId = parseInt(String(formData.city));
      if (isNaN(cityId)) {
        console.error('[DataMapper] 🚨 CRITICAL: city is not a valid number!', formData.city);
        throw new Error(`City must be a valid number, got: ${formData.city}`);
      }
      return cityId;
    })(),

    // Контакты
    contacts: (formData.contacts || []) as any[],
    contact_name: formData.contact_name,
    additional_info: formData.additional_info,
    use_profile_contacts: formData.use_profile_contacts,
    phone: formData.phone,

    // Изображения
    images: (formData.images || []) as any[],
    existing_images: (formData.existing_images || []) as any[],

    // Технические характеристики с parseInt/parseFloat
    year: formData.year ? parseInt(String(formData.year)) : undefined,
    mileage_km: formData.mileage ? parseInt(String(formData.mileage)) : undefined,
    engine_volume: formData.engine_volume ? parseFloat(String(formData.engine_volume)) : undefined,
    engine_power: formData.engine_power ? parseInt(String(formData.engine_power)) : undefined,
    generation: formData.generation,
    modification: formData.modification,

    // Дополнительные поля
    seller_type: formData.seller_type,
    exchange_status: (() => {
      const raw = formData.exchange_status;
      if (!raw) return 'no_exchange';
      if (raw === 'no') return 'no_exchange';
      if (raw === 'possible_exchange') return 'possible';
      return raw;
    })(),
    is_urgent: formData.is_urgent,
    is_highlighted: formData.is_highlighted,
    geocode: formData.geocode,

    // Dynamic fields - дублируем технические характеристики для совместимости
    dynamic_fields: {
      ...(formData.dynamic_fields || {}),
      vehicle_type: (formData as any).vehicle_type ?? (formData.dynamic_fields as any)?.vehicle_type,
      vehicle_type_name: (formData as any).vehicle_type_name ?? (formData.dynamic_fields as any)?.vehicle_type_name,
      brand_name: (formData as any).brand_name ?? (formData.dynamic_fields as any)?.brand_name,
      model: formData.model,
      year: formData.year,
      mileage: formData.mileage,
      mileage_km: formData.mileage, // Дублируем как mileage_km
      engine_volume: formData.engine_volume,
      engine_power: formData.engine_power,
      fuel_type: formData.fuel_type,
      transmission: formData.transmission, // Frontend поле
      transmission_type: formData.transmission || formData.transmission_type, // Backend поле
      drive_type: formData.drive_type,
      body_type: formData.body_type,
      color: formData.color,
      steering_wheel: formData.steering_wheel,
      condition: formData.condition,
      vin_code: formData.vin_code,
      license_plate: formData.license_plate,
      number_of_doors: formData.number_of_doors,
      number_of_seats: formData.number_of_seats,
      generation: formData.generation,
      modification: formData.modification,
      exchange_status: (() => { const raw = formData.exchange_status ?? (formData.dynamic_fields as any)?.exchange_status; if (!raw) return 'no_exchange'; if (raw === 'no') return 'no_exchange'; if (raw === 'possible_exchange') return 'possible'; return raw; })(),
    },
  };

  // Удаляем undefined значения, чтобы не отправлять их на сервер
  const cleanedApiData = Object.fromEntries(
    Object.entries(apiData).filter(([_, value]) => value !== undefined)
  );

  console.log('[DataMapper] Mapped API data:', cleanedApiData);
  console.log('[DataMapper] Removed undefined fields:',
    Object.keys(apiData).filter(key => apiData[key as keyof typeof apiData] === undefined)
  );

  // ✅ КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверяем обязательные поля
  const outputRequiredFields = {
    title: cleanedApiData.title,
    description: cleanedApiData.description,
    price: cleanedApiData.price,
    currency: cleanedApiData.currency,
    brand: cleanedApiData.brand,
    model: cleanedApiData.model,
    region: cleanedApiData.region,
    city: cleanedApiData.city
  };

  const emptyRequired = Object.entries(outputRequiredFields)
    .filter(([key, value]) => !value || value === '' || value === 0)
    .map(([key]) => key);

  if (emptyRequired.length > 0) {
    console.error('[DataMapper] 🚨 CRITICAL ERROR: Required fields are empty:', emptyRequired);
    console.error('[DataMapper] 🚨 This will cause form validation failures!');
    console.error('[DataMapper] 🚨 Original API data for debugging:', {
      title: apiData.title,
      description: apiData.description,
      price: apiData.price,
      currency: apiData.currency,
      mark: apiData.mark,
      model: apiData.model,
      region: apiData.region,
      city: apiData.city
    });
  }

  return cleanedApiData;
}

/**
 * Проверяет, есть ли значимые данные в объекте
 */
export function hasValidData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const keys = Object.keys(data);
  return keys.some(key => {
    const value = data[key];
    return value !== undefined && value !== null && value !== '';
  });
}
