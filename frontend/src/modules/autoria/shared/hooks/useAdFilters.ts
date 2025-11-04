/**
 * Reusable ad filters hook (DRY)
 * Used across: SearchPage, MyAdsPage, ModerationPage
 */

import { useState, useCallback } from 'react';
import { AdFilters, AdSortOptions } from '../types';

export interface UseAdFiltersReturn {
  filters: AdFilters;
  sortOptions: AdSortOptions;
  setFilter: <K extends keyof AdFilters>(key: K, value: AdFilters[K]) => void;
  setFilters: (filters: Partial<AdFilters>) => void;
  setSortOptions: (options: AdSortOptions) => void;
  resetFilters: () => void;
}

const defaultFilters: AdFilters = {};
const defaultSortOptions: AdSortOptions = {
  field: 'created_at',
  order: 'desc'
};

export const useAdFilters = (
  initialFilters: AdFilters = defaultFilters,
  initialSortOptions: AdSortOptions = defaultSortOptions
): UseAdFiltersReturn => {
  const [filters, setFiltersState] = useState<AdFilters>(initialFilters);
  const [sortOptions, setSortOptionsState] = useState<AdSortOptions>(initialSortOptions);

  const setFilter = useCallback(<K extends keyof AdFilters>(key: K, value: AdFilters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<AdFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const setSortOptions = useCallback((options: AdSortOptions) => {
    setSortOptionsState(options);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setSortOptionsState(defaultSortOptions);
  }, []);

  return {
    filters,
    sortOptions,
    setFilter,
    setFilters,
    setSortOptions,
    resetFilters
  };
};
