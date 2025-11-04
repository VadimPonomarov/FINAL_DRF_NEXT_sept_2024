/**
 * Кеш для справочных данных
 * Решает проблему множественных запросов к одним и тем же данным
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class ReferenceDataCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 часа - данные стабильные

  /**
   * Получить данные из кеша или выполнить запрос
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Проверяем актуальность кеша
    if (cached && Date.now() < cached.expiry) {
      console.log(`[Cache] HIT for key: ${key}`);
      return cached.data;
    }

    console.log(`[Cache] MISS for key: ${key}, fetching...`);
    
    try {
      const data = await fetcher();
      
      // Сохраняем в кеш
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl
      });
      
      return data;
    } catch (error) {
      console.error(`[Cache] Error fetching data for key ${key}:`, error);
      
      // Возвращаем устаревшие данные если есть
      if (cached) {
        console.log(`[Cache] Returning stale data for key: ${key}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Очистить кеш
   */
  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
      console.log(`[Cache] Cleared key: ${key}`);
    } else {
      this.cache.clear();
      console.log(`[Cache] Cleared all cache`);
    }
  }

  /**
   * Получить статистику кеша
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, item]) => now < item.expiry).length,
      expiredEntries: entries.filter(([_, item]) => now >= item.expiry).length,
      cacheKeys: entries.map(([key]) => key)
    };
  }
}

// Singleton instance
export const referenceCache = new ReferenceDataCache();

/**
 * Хук для кешированных справочных данных с мемоизацией
 */
import { useMemo, useCallback } from 'react';

export function useCachedReferenceData() {
  // 🧠 МЕМОИЗАЦИЯ: Функции запросов мемоизированы с кешированием
  const fetchBrands = useCallback(async (search?: string) => {
    const cacheKey = `brands_${search || 'all'}`;

    return referenceCache.get(cacheKey, async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page_size', '50'); // Оптимизированный размер

      // 🚀 ДОЛГОЕ КЕШИРОВАНИЕ: Стабильные данные кешируются на 24 часа
      const response = await fetch(`/api/public/reference/brands?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800', // 24 часа кеш, 48 часов stale
        },
        // Агрессивное кеширование для стабильных данных
        cache: 'force-cache',
        next: {
          revalidate: 86400 // 24 часа
        }
      });

      if (!response.ok) throw new Error('Failed to fetch brands');

      const data = await response.json();
      return data.options || [];
    });
  }, []);

  const fetchVehicleTypes = useCallback(async () => {
    return referenceCache.get('vehicle_types', async () => {
      // 🚀 ДОЛГОЕ КЕШИРОВАНИЕ: Стабильные данные кешируются на 24 часа
      const response = await fetch('/api/public/reference/vehicle-types?page_size=30', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800', // 24 часа кеш
        },
        cache: 'force-cache',
        next: {
          revalidate: 86400 // 24 часа
        }
      });

      if (!response.ok) throw new Error('Failed to fetch vehicle types');

      const data = await response.json();
      return data.options || [];
    });
  }, []);

  const fetchColors = useCallback(async () => {
    return referenceCache.get('colors', async () => {
      // 🚀 ДОЛГОЕ КЕШИРОВАНИЕ: Стабильные данные кешируются на 24 часа
      const response = await fetch('/api/public/reference/colors?page_size=100', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800', // 24 часа кеш
        },
        cache: 'force-cache',
        next: {
          revalidate: 86400 // 24 часа
        }
      });

      if (!response.ok) throw new Error('Failed to fetch colors');

      const data = await response.json();
      return data.options || [];
    });
  }, []);

  const fetchRegions = useCallback(async () => {
    return referenceCache.get('regions', async () => {
      // 🚀 ДОЛГОЕ КЕШИРОВАНИЕ: Стабильные данные кешируются на 24 часа
      const response = await fetch('/api/public/reference/regions?page_size=30', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800', // 24 часа кеш
        },
        cache: 'force-cache',
        next: {
          revalidate: 86400 // 24 часа
        }
      });

      if (!response.ok) throw new Error('Failed to fetch regions');

      const data = await response.json();
      return data.options || [];
    });
  }, []);

  const fetchCities = useCallback(async (regionId: string) => {
    const cacheKey = `cities_${regionId}`;

    return referenceCache.get(cacheKey, async () => {
      // 🚀 ДОЛГОЕ КЕШИРОВАНИЕ: Стабильные данные кешируются на 24 часа
      const response = await fetch(`/api/public/reference/cities?region_id=${regionId}&page_size=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800', // 24 часа кеш
        },
        cache: 'force-cache',
        next: {
          revalidate: 86400 // 24 часа
        }
      });

      if (!response.ok) throw new Error('Failed to fetch cities');

      const data = await response.json();
      return data.options || [];
    });
  }, []);

  // 🧠 МЕМОИЗАЦИЯ: Возвращаемый объект мемоизирован
  return useMemo(() => ({
    fetchBrands,
    fetchVehicleTypes,
    fetchColors,
    fetchRegions,
    fetchCities,
    clearCache: referenceCache.clear.bind(referenceCache),
    getCacheStats: referenceCache.getStats.bind(referenceCache)
  }), [fetchBrands, fetchVehicleTypes, fetchColors, fetchRegions, fetchCities]);
}
