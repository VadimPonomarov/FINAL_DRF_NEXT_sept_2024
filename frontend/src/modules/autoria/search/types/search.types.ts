/**
 * Search module types (DRY)
 */

import type React from "react";
import { AdFilters, AdSortOptions } from "../../shared/types";
import type { CarAd } from "../../shared/types/autoria";

export interface SearchState {
  query: string;
  filters: AdFilters;
  sortOptions: AdSortOptions;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

export interface SearchResults {
  ads: CarAd[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchQuickFiltersState {
  with_images: boolean;
  my_ads: boolean;
  favorites: boolean;
  verified: boolean;
  vip: boolean;
  premium: boolean;
}

export interface SearchFiltersState {
  search: string;
  vehicle_type: string;
  brand: string;
  model: string;
  condition: string;
  year_from: string;
  year_to: string;
  price_from: string;
  price_to: string;
  region: string;
  city: string;
  page_size: number;
}

export interface UseSearchPageStateResult {
  filters: SearchFiltersState;
  quickFilters: SearchQuickFiltersState;
  invertFilters: boolean;
  regionId: string;
  loading: boolean;
  paginationLoading: boolean;
  totalCount: number;
  currentPage: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
  activeTab: "results" | "analytics";
  searchResults: CarAd[];
  togglingIds: Set<number>;
  deletingIds: Set<number>;
  setQuickFilters: React.Dispatch<React.SetStateAction<SearchQuickFiltersState>>;
  setInvertFilters: (value: boolean) => void;
  setRegionId: (value: string) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setActiveTab: (tab: "results" | "analytics") => void;
  updateSearchWithDebounce: (value: string) => void;
  clearSearchField: () => void;
  applyFilters: () => void;
  updateFilter: (key: keyof Omit<SearchFiltersState, "page_size">, value: string) => void;
  clearFilters: () => Promise<void>;
  handlePageChange: (page: number) => void;
  handleCountersUpdate: (adId: number, counters: { favorites_count: number; phone_views_count: number }) => void;
  handleDeleteAd: (adId: number, event?: React.MouseEvent) => Promise<void>;
  isOwner: (car: CarAd) => boolean;
  onSortChange: (field: string, order: "asc" | "desc") => void;
  onPageSizeChange: (pageSize: number) => void;
}
