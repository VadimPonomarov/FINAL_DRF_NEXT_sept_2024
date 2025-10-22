import { BaseService } from './base-service';
import { AutoRiaApiTemplates } from '../../api/autoria/autoria-api-templates';
import { CarAd, SearchFilters } from '../../api/autoria/autoria.types';

/**
 * Search Service
 * Handles all search-related operations with best practices
 */
export class SearchService extends BaseService {
  private static instance: SearchService;

  private constructor() {
    super();
  }

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Search ads with filters
   */
  async searchAds(filters: SearchFilters): Promise<{ results: CarAd[]; count: number }> {
    return this.measurePerformance(async () => {
      const sanitizedFilters = this.sanitizeFilters(filters);
      const template = AutoRiaApiTemplates.searchAds(sanitizedFilters);
      const cacheKey = `search_ads_${JSON.stringify(sanitizedFilters)}`;
      
      const result = await this.executeWithCache(template, cacheKey, 2 * 60 * 1000); // 2 minutes cache
      
      return this.transformResponse(result);
    }, 'searchAds');
  }

  /**
   * Get ad details by ID
   */
  async getAdDetails(adId: number): Promise<CarAd> {
    this.validateId(adId);

    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.getAdDetails(adId);
      const cacheKey = `ad_details_${adId}`;
      
      const result = await this.executeWithCache(template, cacheKey, 5 * 60 * 1000); // 5 minutes cache
      
      return this.transformResponse(result);
    }, 'getAdDetails');
  }

  /**
   * Get user's ads
   */
  async getUserAds(userId?: number, filters?: SearchFilters): Promise<CarAd[]> {
    if (userId) {
      this.validateId(userId);
    }

    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.getUserAds(userId, filters);
      const cacheKey = `user_ads_${userId || 'current'}_${JSON.stringify(filters || {})}`;
      
      const result = await this.executeWithCache(template, cacheKey, 1 * 60 * 1000); // 1 minute cache
      
      return this.transformResponse(result);
    }, 'getUserAds');
  }

  /**
   * Search by text query
   */
  async searchByText(query: string, filters?: Omit<SearchFilters, 'search'>): Promise<CarAd[]> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    const searchFilters = { ...filters, search: query.trim() };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search by vehicle type
   */
  async searchByVehicleType(vehicleType: string, filters?: Omit<SearchFilters, 'vehicle_type'>): Promise<CarAd[]> {
    const searchFilters = { ...filters, vehicle_type: vehicleType };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search by brand
   */
  async searchByBrand(brand: string, filters?: Omit<SearchFilters, 'brand'>): Promise<CarAd[]> {
    const searchFilters = { ...filters, brand: brand };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search by model
   */
  async searchByModel(model: string, filters?: Omit<SearchFilters, 'model'>): Promise<CarAd[]> {
    const searchFilters = { ...filters, model: model };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search by price range
   */
  async searchByPriceRange(
    priceFrom?: number, 
    priceTo?: number, 
    filters?: Omit<SearchFilters, 'price_from' | 'price_to'>
  ): Promise<CarAd[]> {
    const searchFilters = { 
      ...filters, 
      ...(priceFrom !== undefined && { price_from: priceFrom }),
      ...(priceTo !== undefined && { price_to: priceTo })
    };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search by year range
   */
  async searchByYearRange(
    yearFrom?: number, 
    yearTo?: number, 
    filters?: Omit<SearchFilters, 'year_from' | 'year_to'>
  ): Promise<CarAd[]> {
    const searchFilters = { 
      ...filters, 
      ...(yearFrom !== undefined && { year_from: yearFrom }),
      ...(yearTo !== undefined && { year_to: yearTo })
    };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search by location
   */
  async searchByLocation(
    region?: string, 
    city?: string, 
    filters?: Omit<SearchFilters, 'region' | 'city'>
  ): Promise<CarAd[]> {
    const searchFilters = { 
      ...filters, 
      ...(region && { region }),
      ...(city && { city })
    };
    const result = await this.searchAds(searchFilters);
    return result.results;
  }

  /**
   * Search with pagination
   */
  async searchWithPagination(
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ results: CarAd[]; count: number; page: number; pageSize: number; totalPages: number }> {
    this.validatePagination(page, pageSize);

    const paginatedFilters = { 
      ...filters, 
      page, 
      page_size: pageSize 
    };

    return this.measurePerformance(async () => {
      const result = await this.searchAds(paginatedFilters);
      const totalPages = Math.ceil(result.count / pageSize);
      
      return {
        results: result.results,
        count: result.count,
        page,
        pageSize,
        totalPages
      };
    }, 'searchWithPagination');
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) {
      return [];
    }

    return this.measurePerformance(async () => {
      // This would typically call a suggestions endpoint
      // For now, we'll return empty array as placeholder
      this.log('search_suggestions', { query });
      return [];
    }, 'getSearchSuggestions');
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(): Promise<string[]> {
    return this.measurePerformance(async () => {
      // This would typically call a popular searches endpoint
      // For now, we'll return empty array as placeholder
      this.log('popular_searches');
      return [];
    }, 'getPopularSearches');
  }

  /**
   * Save search
   */
  async saveSearch(filters: SearchFilters, name?: string): Promise<void> {
    return this.measurePerformance(async () => {
      // This would typically call a save search endpoint
      this.log('save_search', { filters, name });
    }, 'saveSearch');
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<Array<{ id: number; name: string; filters: SearchFilters; created_at: string }>> {
    return this.measurePerformance(async () => {
      // This would typically call a get saved searches endpoint
      this.log('get_saved_searches');
      return [];
    }, 'getSavedSearches');
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(searchId: number): Promise<void> {
    this.validateId(searchId);

    return this.measurePerformance(async () => {
      // This would typically call a delete saved search endpoint
      this.log('delete_saved_search', { searchId });
    }, 'deleteSavedSearch');
  }

  /**
   * Clear search cache
   */
  clearSearchCache(): void {
    this.invalidateCache('search');
  }

  /**
   * Clear ad details cache
   */
  clearAdDetailsCache(adId?: number): void {
    this.invalidateCache('ad', adId);
  }
}
