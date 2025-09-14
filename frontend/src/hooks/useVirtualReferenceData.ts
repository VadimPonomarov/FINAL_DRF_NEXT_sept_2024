/**
 * Hook for loading reference data with virtual scrolling and pagination
 */

import { useCallback } from 'react';
import { cachedFetch } from '@/utils/cachedFetch';

interface Option {
  value: string;
  label: string;
}

interface FetchResult {
  options: Option[];
  hasMore: boolean;
  total: number;
}

export const useVirtualReferenceData = () => {

  // Fetch vehicle types with pagination and search
  const fetchVehicleTypes = useCallback(async (
    search: string,
    page: number,
    pageSize: number
  ): Promise<FetchResult> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const url = `http://localhost:8000/api/ads/reference/vehicle-types/?${params.toString()}`;
      console.log(`[fetchVehicleTypes] Fetching: ${url}`);

      const response = await fetch(url);
      console.log(`[fetchVehicleTypes] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[fetchVehicleTypes] Error response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Vehicle Types API] Response:', data);

      // API повертає масив напряму, не в results
      const vehicleTypes = Array.isArray(data) ? data : data.value || [];

      const options = vehicleTypes.map((item: any) => ({
        value: item.id.toString(),
        label: item.name // Убираем иконку, чтобы избежать дублирования
      }));

      return {
        options,
        hasMore: false, // Vehicle types - невеликий список, пагінація не потрібна
        total: options.length
      };
    } catch (error) {
      console.error('[Vehicle Types API] Error:', error);
      return {
        options: [],
        hasMore: false,
        total: 0
      };
    }
  }, []);

  // Fetch brands with pagination and search
  const fetchBrands = useCallback(async (
    search: string,
    page: number,
    pageSize: number,
    vehicleTypeId?: string
  ): Promise<FetchResult> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }

      // Додаємо фільтр по типу транспорту
      if (vehicleTypeId) {
        params.append('vehicle_type', vehicleTypeId);
        console.log(`[fetchBrands] Adding vehicle_type filter: ${vehicleTypeId}`);
      }

      const url = `http://localhost:8000/api/ads/reference/marks/?${params.toString()}`;
      console.log(`[fetchBrands] Fetching: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[fetchBrands] API Response:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // API возвращает data.results, а не data.options
      let brands = data.results || [];

      // Фильтруем по типу транспорта на фронтенде, так как бэкенд фильтр не работает
      if (vehicleTypeId) {
        brands = brands.filter((item: any) => item.vehicle_type.toString() === vehicleTypeId.toString());
        console.log(`[fetchBrands] Filtered ${brands.length} brands for vehicle_type: ${vehicleTypeId}`);
      }

      const options = brands.map((item: any) => ({
        value: item.id.toString(),
        label: item.name
      }));

      console.log(`[fetchBrands] Loaded page ${page}, ${options.length} items`);

      return {
        options: options,
        hasMore: data.next !== null, // API возвращает next: true/false
        total: data.total || 0,
      };
      
    } catch (error) {
      console.error('[fetchBrands] Error:', error);
      return {
        options: [],
        hasMore: false,
        total: 0,
      };
    }
  }, []);

  // Fetch models with pagination and search
  const fetchModels = useCallback(async (
    brandId: string | number,
    search: string, 
    page: number, 
    pageSize: number
  ): Promise<FetchResult> => {
    try {
      const params = new URLSearchParams({
        brand_id: brandId.toString(),
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const url = `http://localhost:8000/api/ads/reference/models/?${params.toString()}`;
      console.log(`[fetchModels] Fetching: ${url}`);

      // 🚀 КЕШИРОВАНИЕ: Используем кешированный fetch для моделей
      const data = await cachedFetch(url, {
        cacheTime: 180, // 3 минуты (модели зависят от бренда)
        staleTime: 360  // 6 минут stale
      });

      if (data.error) {
        throw new Error(data.error);
      }

      
      console.log(`[fetchModels] Loaded page ${page}, ${data.options?.length || 0} items, hasMore: ${data.hasMore}`);
      
      return {
        options: data.options || [],
        hasMore: data.hasMore || false,
        total: data.total || 0,
      };
      
    } catch (error) {
      console.error('[fetchModels] Error:', error);
      return {
        options: [],
        hasMore: false,
        total: 0,
      };
    }
  }, []);

  // Fetch colors with pagination and search
  const fetchColors = useCallback(async (
    search: string, 
    page: number, 
    pageSize: number
  ): Promise<FetchResult> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const url = `http://localhost:8000/api/ads/reference/colors/?${params.toString()}`;
      console.log(`[fetchColors] Fetching: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log(`[fetchColors] Loaded page ${page}, ${data.options?.length || 0} items, hasMore: ${data.hasMore}`);
      
      return {
        options: data.options || [],
        hasMore: data.hasMore || false,
        total: data.total || 0,
      };
      
    } catch (error) {
      console.error('[fetchColors] Error:', error);
      return {
        options: [],
        hasMore: false,
        total: 0,
      };
    }
  }, []);

  // Fetch regions with pagination and search
  const fetchRegions = useCallback(async (
    search: string, 
    page: number, 
    pageSize: number
  ): Promise<FetchResult> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      // 🚀 КЕШИРОВАНИЕ: Используем кешированный fetch для регионов
      const url = `http://localhost:8000/api/ads/reference/regions/?${params.toString()}`;
      console.log(`[fetchRegions] Fetching via cached fetch: ${url}`);

      const data = await cachedFetch(url, {
        cacheTime: 1200, // 20 минут (регионы очень стабильные)
        staleTime: 2400  // 40 минут stale
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Transform Django response to expected format
      const transformedOptions = Array.isArray(data) ? data.map((region: any) => ({
        value: region.id?.toString(),
        label: region.name
      })) : [];

      console.log(`[fetchRegions] Loaded ${transformedOptions.length} regions from Django`);

      return {
        options: transformedOptions,
        hasMore: false, // Django returns all regions
        total: transformedOptions.length,
      };
      
    } catch (error) {
      console.error('[fetchRegions] Error:', error);
      return {
        options: [],
        hasMore: false,
        total: 0,
      };
    }
  }, []);

  // Fetch cities with pagination and search
  const fetchCities = useCallback(async (
    regionId: string | number,
    search: string,
    page: number,
    pageSize: number
  ): Promise<FetchResult> => {
    try {
      const params = new URLSearchParams({
        region: regionId.toString(), // Django uses 'region' not 'region_id'
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (search.trim()) {
        params.append('name__icontains', search.trim()); // Django filter field
      }

      // 🚀 КЕШИРОВАНИЕ: Используем кешированный fetch для городов
      const url = `http://localhost:8000/api/ads/reference/cities/?${params.toString()}`;
      console.log(`[fetchCities] Fetching via cached fetch: ${url}`);

      const data = await cachedFetch(url, {
        cacheTime: 900,  // 15 минут (города стабильные)
        staleTime: 1800  // 30 минут stale
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Transform Django paginated response to expected format
      const cities = data.results || [];
      const transformedOptions = cities.map((city: any) => ({
        value: city.id?.toString(),
        label: city.name
      }));

      console.log(`[fetchCities] Loaded page ${page}, ${transformedOptions.length} cities for region ${regionId}`);

      return {
        options: transformedOptions,
        hasMore: !!data.next, // Django pagination uses 'next' field
        total: data.count || transformedOptions.length,
      };

    } catch (error) {
      console.error('[fetchCities] Error:', error);
      return {
        options: [],
        hasMore: false,
        total: 0,
      };
    }
  }, []);

  return {
    fetchVehicleTypes,
    fetchBrands,
    fetchModels,
    fetchColors,
    fetchRegions,
    fetchCities,
  };
};
