import type { SearchFiltersState, SearchQuickFiltersState } from "./types/search.types";

export const SORT_FIELD_MAPPING: Record<string, string> = {
  year: "year_sort",
  mileage: "mileage_sort",
  price: "price",
  created_at: "created_at",
  title: "title",
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const DEFAULT_SEARCH_FILTERS: SearchFiltersState = {
  search: "",
  vehicle_type: "",
  brand: "",
  model: "",
  condition: "",
  year_from: "",
  year_to: "",
  price_from: "",
  price_to: "",
  region: "",
  city: "",
  page_size: 20,
};

export const DEFAULT_QUICK_FILTERS: SearchQuickFiltersState = {
  with_images: false,
  my_ads: false,
  favorites: false,
  verified: false,
  vip: false,
  premium: false,
};

interface SearchParamsLike {
  get(name: string): string | null;
}

export const parseFiltersFromSearchParams = (
  params: SearchParamsLike,
  pageSize: number
): SearchFiltersState => ({
  search: params.get("search") || "",
  vehicle_type: params.get("vehicle_type") || "",
  brand: params.get("brand") || "",
  model: params.get("model") || "",
  condition: params.get("condition") || "",
  year_from: params.get("year_from") || "",
  year_to: params.get("year_to") || "",
  price_from: params.get("price_from") || "",
  price_to: params.get("price_to") || "",
  region: params.get("region") || "",
  city: params.get("city") || "",
  page_size: pageSize,
});

export const parseQuickFiltersFromSearchParams = (
  params: SearchParamsLike
): SearchQuickFiltersState => ({
  with_images: params.get("with_images") === "true",
  my_ads: params.get("my_ads") === "true",
  favorites: params.get("favorites") === "true",
  verified: params.get("verified") === "true",
  vip: false,
  premium: false,
});

export const buildSearchParams = (
  currentFilters: SearchFiltersState,
  page: number,
  sort: string,
  order: "asc" | "desc",
  quickFilters: SearchQuickFiltersState,
  invertFilters: boolean
): Record<string, string | number | boolean> => {
  const backendSortField = SORT_FIELD_MAPPING[sort] || sort;
  const ordering = order === "desc" ? `-${backendSortField}` : backendSortField;
  const searchParams: Record<string, string | number | boolean> = {
    page,
    page_size: currentFilters.page_size,
    ordering,
  };

  console.log("🔍 Search params before API call:", searchParams);
  console.log("🔍 Current page_size from filters:", currentFilters.page_size);
  console.log("🔍 Current page:", page);
  console.log("🔍 Full filters object:", currentFilters);

  if (currentFilters.search) searchParams.search = currentFilters.search;
  if (currentFilters.vehicle_type) searchParams.vehicle_type = currentFilters.vehicle_type;
  if (currentFilters.brand) searchParams.mark = currentFilters.brand;
  if (currentFilters.condition) searchParams.condition = currentFilters.condition;
  if (currentFilters.model) searchParams.model = currentFilters.model;

  if (currentFilters.region) {
    searchParams.region = currentFilters.region;
  }
  if (currentFilters.city) {
    searchParams.city = currentFilters.city;
  }
  if (currentFilters.year_from) searchParams.year_from = currentFilters.year_from;
  if (currentFilters.year_to) searchParams.year_to = currentFilters.year_to;
  if (currentFilters.price_from) {
    searchParams.price_min = currentFilters.price_from;
    searchParams.price_currency = "USD";
  }
  if (currentFilters.price_to) {
    searchParams.price_max = currentFilters.price_to;
    searchParams.price_currency = "USD";
  }

  if (quickFilters.with_images) {
    searchParams[invertFilters ? "invert_photos" : "with_photos_only"] = true;
  }
  if (quickFilters.my_ads) {
    searchParams[invertFilters ? "invert_my_ads" : "my_ads_only"] = true;
  }
  if (quickFilters.favorites) {
    searchParams[invertFilters ? "invert_favorites" : "favorites_only"] = true;
    if (!invertFilters) {
      searchParams["favorites"] = "true";
      searchParams["only_favorites"] = "true";
    }
  }
  if (quickFilters.verified) {
    searchParams.is_validated = !invertFilters;
  }

  console.log("🔍 API params:", searchParams);
  console.log("🔍 Quick filters:", quickFilters);

  return searchParams;
};
