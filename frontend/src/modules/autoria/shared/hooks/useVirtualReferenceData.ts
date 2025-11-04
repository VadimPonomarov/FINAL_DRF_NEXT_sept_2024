/**
 * Hook for virtual reference data loading
 * Provides fetch functions for virtual selects
 */

import { useCallback } from 'react';

interface ReferenceItem {
  value: string;
  label: string;
}

interface UseVirtualReferenceDataReturn {
  fetchBrands: (search: string) => Promise<ReferenceItem[]>;
  fetchModels: (search: string, brandId?: string) => Promise<ReferenceItem[]>;
  fetchColors: (search: string) => Promise<ReferenceItem[]>;
  fetchVehicleTypes: (search: string) => Promise<ReferenceItem[]>;
  fetchRegions: (search: string) => Promise<ReferenceItem[]>;
  fetchCities: (search: string, regionId?: string) => Promise<ReferenceItem[]>;
}

export const useVirtualReferenceData = (): UseVirtualReferenceDataReturn => {
  
  // Generic fetch function
  const fetchData = useCallback(async (
    endpoint: string,
    search: string = '',
    additionalParams: Record<string, string> = {}
  ): Promise<ReferenceItem[]> => {
    try {
      const params = new URLSearchParams({
        search,
        page_size: '50',
        ...additionalParams
      });

      const url = `/api/public/reference/${endpoint}?${params.toString()}`;
      console.log(`[useVirtualReferenceData] Fetching from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.options || data || [];
      
      console.log(`[useVirtualReferenceData] Loaded ${items.length} items from ${endpoint}`);
      return Array.isArray(items) ? items : [];
      
    } catch (error) {
      console.error(`[useVirtualReferenceData] Error fetching ${endpoint}:`, error);
      return [];
    }
  }, []);

  const fetchBrands = useCallback(async (search: string = '') => {
    return fetchData('brands', search);
  }, [fetchData]);

  const fetchModels = useCallback(async (search: string = '', brandId?: string) => {
    const params = brandId ? { mark_id: brandId } : {}; // ИСПРАВЛЕНО: brand_id → mark_id
    return fetchData('models', search, params);
  }, [fetchData]);

  const fetchColors = useCallback(async (search: string = '') => {
    return fetchData('colors', search);
  }, [fetchData]);

  const fetchVehicleTypes = useCallback(async (search: string = '') => {
    return fetchData('vehicle-types', search);
  }, [fetchData]);

  const fetchRegions = useCallback(async (search: string = '') => {
    return fetchData('regions', search);
  }, [fetchData]);

  const fetchCities = useCallback(async (search: string = '', regionId?: string) => {
    const params = regionId ? { region_id: regionId } : {};
    return fetchData('cities', search, params);
  }, [fetchData]);

  return {
    fetchBrands,
    fetchModels,
    fetchColors,
    fetchVehicleTypes,
    fetchRegions,
    fetchCities,
  };
};
