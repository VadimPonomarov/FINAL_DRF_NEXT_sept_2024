/**
 * Утилиты для кешированных fetch запросов
 * Оптимизирует производительность выпадающих списков
 */

export interface CachedFetchOptions {
  // Время кеширования в секундах (по умолчанию 24 часа для стабильных данных)
  cacheTime?: number;
  // Время stale-while-revalidate в секундах (по умолчанию 48 часов)
  staleTime?: number;
  // Дополнительные заголовки
  headers?: Record<string, string>;
  // Метод запроса
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  // Тело запроса
  body?: any;
  // Тип кеширования браузера
  cacheType?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
}

/**
 * Кешированный fetch для справочных данных
 */
export async function cachedFetch(url: string, options: CachedFetchOptions = {}) {
  const {
    cacheTime = 86400, // 24 часа по умолчанию для стабильных справочных данных
    staleTime = 172800, // 48 часов stale по умолчанию
    headers = {},
    method = 'GET',
    body,
    cacheType = 'force-cache'
  } = options;

  console.log(`[CachedFetch] 🚀 Fetching ${url} with cache time: ${cacheTime}s`);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${cacheTime}, stale-while-revalidate=${staleTime}`,
      ...headers
    },
    cache: cacheType,
    ...(body && { body: JSON.stringify(body) })
  };

  // Для Next.js добавляем revalidate
  if (typeof window === 'undefined') {
    (fetchOptions as any).next = { 
      revalidate: cacheTime 
    };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    // Не вызываем редирект для ошибок 404 и 500
    if (response.status === 404 || response.status === 500) {
      console.warn(`[CachedFetch] ${response.status} error detected for ${url}, returning empty data`);
      return { options: [] };
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Специализированные функции для разных типов справочных данных
 */

// 🚀 БРЕНДЫ: Долгое кеширование для стабильных данных
export const fetchBrandsWithCache = async (search?: string, vehicleTypeId?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (vehicleTypeId) params.append('vehicle_type_id', vehicleTypeId);
  params.append('page_size', '50');

  return cachedFetch(`/api/public/reference/brands?${params}`, {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800  // 48 часов stale
  });
};

// 🚀 МОДЕЛИ: Долгое кеширование для стабильных данных
export const fetchModelsWithCache = async (brandId: string) => {
  const params = new URLSearchParams();
  params.append('brand_id', brandId);
  params.append('page_size', '100');

  return cachedFetch(`/api/public/reference/models?${params}`, {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800  // 48 часов stale
  });
};

// 🚀 ВСЕ СПРАВОЧНЫЕ ДАННЫЕ: Унифицированное долгое кеширование (данные стабильные)
export const fetchVehicleTypesWithCache = async () => {
  return cachedFetch('/api/public/reference/vehicle-types?page_size=30', {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800  // 48 часов stale
  });
};

export const fetchColorsWithCache = async () => {
  return cachedFetch('/api/public/reference/colors?page_size=100', {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800  // 48 часов stale
  });
};

export const fetchRegionsWithCache = async () => {
  return cachedFetch('/api/public/reference/regions?page_size=30', {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800  // 48 часов stale
  });
};

export const fetchCitiesWithCache = async (regionId: string) => {
  const params = new URLSearchParams();
  params.append('region_id', regionId);
  params.append('page_size', '50');

  return cachedFetch(`/api/public/reference/cities?${params}`, {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800  // 48 часов stale
  });
};

// 🚀 ОСТАЛЬНЫЕ СПРАВОЧНЫЕ ДАННЫЕ: Унифицированное долгое кеширование
export const fetchFuelTypesWithCache = async () => {
  return cachedFetch('/api/public/reference/fuel-types?page_size=20', {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800,  // 48 часов stale
    cacheType: 'no-cache'  // Отключаем браузерный кеш для избежания старых 404
  });
};

export const fetchTransmissionsWithCache = async () => {
  return cachedFetch('/api/public/reference/transmissions?page_size=10', {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800,  // 48 часов stale
    cacheType: 'no-cache'  // Отключаем браузерный кеш для избежания старых 404
  });
};

export const fetchBodyTypesWithCache = async () => {
  return cachedFetch('/api/public/reference/body-types?page_size=30', {
    cacheTime: 86400,  // 24 часа
    staleTime: 172800,  // 48 часов stale
    cacheType: 'no-cache'  // Отключаем браузерный кеш для избежания старых 404
  });
};

/**
 * Хук для кешированных справочных данных с оптимизированным кешированием
 */
export const useCachedReferenceAPI = () => {
  return {
    fetchBrands: fetchBrandsWithCache,
    fetchModels: fetchModelsWithCache,
    fetchVehicleTypes: fetchVehicleTypesWithCache,
    fetchColors: fetchColorsWithCache,
    fetchRegions: fetchRegionsWithCache,
    fetchCities: fetchCitiesWithCache,
    fetchFuelTypes: fetchFuelTypesWithCache,
    fetchTransmissions: fetchTransmissionsWithCache,
    fetchBodyTypes: fetchBodyTypesWithCache,
  };
};

/**
 * Утилита для предзагрузки критических справочных данных
 */
export const preloadCriticalReferenceData = async () => {
  console.log('[CachedFetch] 🚀 Preloading critical reference data...');
  
  try {
    // Параллельно загружаем самые важные справочники
    await Promise.all([
      fetchVehicleTypesWithCache(),
      fetchRegionsWithCache(),
      fetchColorsWithCache(),
      fetchFuelTypesWithCache(),
      fetchTransmissionsWithCache(),
      fetchBodyTypesWithCache()
    ]);
    
    console.log('[CachedFetch] ✅ Critical reference data preloaded');
  } catch (error) {
    console.error('[CachedFetch] ❌ Failed to preload reference data:', error);
  }
};

/**
 * Очистка кеша браузера для справочных данных
 */
export const clearReferenceDataCache = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    const referenceDataCaches = cacheNames.filter(name => 
      name.includes('reference') || name.includes('api/public')
    );
    
    await Promise.all(
      referenceDataCaches.map(cacheName => caches.delete(cacheName))
    );
    
    console.log('[CachedFetch] 🗑️ Reference data cache cleared');
  }
};

/**
 * Статистика кеширования
 */
export const getCacheStats = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    const stats = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        return {
          name,
          entries: keys.length,
          urls: keys.map(req => req.url)
        };
      })
    );
    
    return stats;
  }
  
  return [];
};
