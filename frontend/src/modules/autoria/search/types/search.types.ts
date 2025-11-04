/**
 * Search module types (DRY)
 */

import { AdFilters, AdSortOptions } from '../../shared/types';

export interface SearchState {
  query: string;
  filters: AdFilters;
  sortOptions: AdSortOptions;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

export interface SearchResults {
  ads: any[];
  total: number;
  page: number;
  pageSize: number;
}
