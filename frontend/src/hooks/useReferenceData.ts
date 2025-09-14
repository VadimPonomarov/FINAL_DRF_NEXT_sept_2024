/**
 * Hook for loading reference data from API
 * Provides brands, models, colors, regions, cities with loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { cachedFetch } from '@/utils/cachedFetch';

interface ReferenceItem {
  value: string;
  label: string;
}

interface UseReferenceDataReturn {
  // Data
  brands: ReferenceItem[];
  models: ReferenceItem[];
  colors: ReferenceItem[];
  regions: ReferenceItem[];
  cities: ReferenceItem[];
  
  // Loading states
  brandsLoading: boolean;
  modelsLoading: boolean;
  colorsLoading: boolean;
  regionsLoading: boolean;
  citiesLoading: boolean;
  
  // Error states
  brandsError: string | null;
  modelsError: string | null;
  colorsError: string | null;
  regionsError: string | null;
  citiesError: string | null;
  
  // Methods
  loadModels: (brandId: string | number) => Promise<void>;
  loadCities: (regionId: string | number) => Promise<void>;
  clearModels: () => void;
  clearCities: () => void;
}

export const useReferenceData = (): UseReferenceDataReturn => {
  // Data states
  const [brands, setBrands] = useState<ReferenceItem[]>([]);
  const [models, setModels] = useState<ReferenceItem[]>([]);
  const [colors, setColors] = useState<ReferenceItem[]>([]);
  const [regions, setRegions] = useState<ReferenceItem[]>([]);
  const [cities, setCities] = useState<ReferenceItem[]>([]);
  
  // Loading states
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [colorsLoading, setColorsLoading] = useState(false);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  
  // Error states
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [colorsError, setColorsError] = useState<string | null>(null);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  // Generic fetch function
  const fetchData = async (
    url: string,
    setData: (data: ReferenceItem[]) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void,
    logPrefix: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[${logPrefix}] Fetching from: ${url}`);

      // 🚀 КЕШИРОВАНИЕ: Определяем время кеширования в зависимости от типа данных
      let cacheTime = 300; // 5 минут по умолчанию
      let staleTime = 600;  // 10 минут stale по умолчанию

      if (url.includes('brands')) {
        cacheTime = 300;  // 5 минут для брендов
        staleTime = 600;
      } else if (url.includes('colors')) {
        cacheTime = 900;  // 15 минут для цветов
        staleTime = 1800;
      } else if (url.includes('regions')) {
        cacheTime = 1200; // 20 минут для регионов
        staleTime = 2400;
      }

      const data = await cachedFetch(url, {
        cacheTime,
        staleTime
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Обрабатываем структуру ответа с options или прямой массив
      const items = data.options || data;
      console.log(`[${logPrefix}] Loaded ${Array.isArray(items) ? items.length : 0} items`);
      setData(Array.isArray(items) ? items : []);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${logPrefix}] Error:`, errorMessage);
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load brands on mount
  useEffect(() => {
    fetchData(
      '/api/public/reference/brands',
      setBrands,
      setBrandsLoading,
      setBrandsError,
      'Brands'
    );
  }, []);

  // Load colors on mount
  useEffect(() => {
    fetchData(
      '/api/public/reference/colors',
      setColors,
      setColorsLoading,
      setColorsError,
      'Colors'
    );
  }, []);

  // Load regions on mount
  useEffect(() => {
    fetchData(
      '/api/public/reference/regions',
      setRegions,
      setRegionsLoading,
      setRegionsError,
      'Regions'
    );
  }, []);

  // Load models for specific brand
  const loadModels = useCallback(async (brandId: string | number) => {
    console.log('[useReferenceData] loadModels called with brandId:', brandId);

    if (!brandId) {
      console.log('[useReferenceData] No brandId provided, clearing models');
      setModels([]);
      return;
    }

    console.log('[useReferenceData] Loading models for brand:', brandId);
    await fetchData(
      `/api/public/reference/models?brand_id=${brandId}`,
      setModels,
      setModelsLoading,
      setModelsError,
      'Models'
    );
  }, []);

  // Load cities for specific region
  const loadCities = useCallback(async (regionId: string | number) => {
    console.log('[useReferenceData] loadCities called with regionId:', regionId);

    if (!regionId) {
      console.log('[useReferenceData] No regionId, clearing cities');
      setCities([]);
      return;
    }

    console.log('[useReferenceData] Fetching cities for region:', regionId);
    await fetchData(
      `/api/public/reference/cities?region_id=${regionId}`,
      setCities,
      setCitiesLoading,
      setCitiesError,
      'Cities'
    );
  }, []);

  // Clear models
  const clearModels = useCallback(() => {
    setModels([]);
    setModelsError(null);
  }, []);

  // Clear cities
  const clearCities = useCallback(() => {
    setCities([]);
    setCitiesError(null);
  }, []);

  return {
    // Data
    brands,
    models,
    colors,
    regions,
    cities,
    
    // Loading states
    brandsLoading,
    modelsLoading,
    colorsLoading,
    regionsLoading,
    citiesLoading,
    
    // Error states
    brandsError,
    modelsError,
    colorsError,
    regionsError,
    citiesError,
    
    // Methods
    loadModels,
    loadCities,
    clearModels,
    clearCities,
  };
};
