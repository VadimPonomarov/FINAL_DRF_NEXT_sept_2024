import { AutoRiaApiResponse, AutoRiaApiOptions, CarAd, ModerationStats, ModerationAction, SearchFilters } from './autoria.types';
import { AutoRiaErrorHandler } from './autoria-error-handler';

/**
 * Unified AutoRia API Templates
 * Centralized system for all AutoRia endpoints with parameterized templates
 */

export interface ApiTemplate<T = any> {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, any>;
  body?: any;
  options?: AutoRiaApiOptions;
}

export class AutoRiaApiTemplates {
  private static instance: AutoRiaApiTemplates;
  private errorHandler: AutoRiaErrorHandler;
  private baseUrl: string;

  private constructor() {
    this.errorHandler = AutoRiaErrorHandler.getInstance();
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  }

  static getInstance(): AutoRiaApiTemplates {
    if (!AutoRiaApiTemplates.instance) {
      AutoRiaApiTemplates.instance = new AutoRiaApiTemplates();
    }
    return AutoRiaApiTemplates.instance;
  }

  /**
   * Execute API template with error handling and retry logic
   */
  async execute<T>(template: ApiTemplate<T>): Promise<AutoRiaApiResponse<T>> {
    const { endpoint, method, params, body, options = {} } = template;
    
    try {
      const url = this.buildUrl(endpoint, params);
      const response = await this.makeRequest(url, method, body, options);
      
      if (!response.ok) {
        const error = await this.errorHandler.handleHttpError(response, endpoint);
        return this.errorHandler.createErrorResponse(error);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      console.error(`[AutoRiaApiTemplates] Request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0
      };
    }
  }

  /**
   * Build URL with parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Make HTTP request with authentication
   */
  private async makeRequest(url: string, method: string, body?: any, options?: AutoRiaApiOptions): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers
    };

    // Add authentication headers if not skipped
    if (!options?.skipAuth) {
      const authHeaders = await this.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  }

  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Use existing auth logic from the project
      const response = await fetch('/api/auth/headers');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('[AutoRiaApiTemplates] Failed to get auth headers:', error);
    }
    
    return {};
  }

  // ==================== TEMPLATE DEFINITIONS ====================

  /**
   * MODERATION TEMPLATES
   */
  static getModerationStats(): ApiTemplate<ModerationStats> {
    return {
      endpoint: '/api/autoria/moderate/stats/',
      method: 'GET'
    };
  }

  static getModerationQueue(filters?: SearchFilters): ApiTemplate<CarAd[]> {
    return {
      endpoint: '/api/autoria/moderate/',
      method: 'GET',
      params: filters
    };
  }

  static moderateAd(adId: number, action: ModerationAction): ApiTemplate<CarAd> {
    return {
      endpoint: `/api/autoria/moderate/${adId}/`,
      method: 'POST',
      body: action
    };
  }

  static bulkModerate(adIds: number[], action: ModerationAction): ApiTemplate<CarAd[]> {
    return {
      endpoint: '/api/autoria/moderate/bulk/',
      method: 'POST',
      body: { ad_ids: adIds, ...action }
    };
  }

  /**
   * SEARCH TEMPLATES
   */
  static searchAds(filters: SearchFilters): ApiTemplate<{ results: CarAd[]; count: number }> {
    return {
      endpoint: '/api/autoria/search/',
      method: 'GET',
      params: filters
    };
  }

  static getAdDetails(adId: number): ApiTemplate<CarAd> {
    return {
      endpoint: `/api/autoria/ads/${adId}/`,
      method: 'GET'
    };
  }

  static getUserAds(userId?: number, filters?: SearchFilters): ApiTemplate<CarAd[]> {
    return {
      endpoint: userId ? `/api/autoria/users/${userId}/ads/` : '/api/autoria/ads/my/',
      method: 'GET',
      params: filters
    };
  }

  /**
   * AD MANAGEMENT TEMPLATES
   */
  static createAd(adData: Partial<CarAd>): ApiTemplate<CarAd> {
    return {
      endpoint: '/api/autoria/ads/create/',
      method: 'POST',
      body: adData
    };
  }

  static updateAd(adId: number, adData: Partial<CarAd>): ApiTemplate<CarAd> {
    return {
      endpoint: `/api/autoria/ads/${adId}/`,
      method: 'PUT',
      body: adData
    };
  }

  static deleteAd(adId: number): ApiTemplate<void> {
    return {
      endpoint: `/api/autoria/ads/${adId}/`,
      method: 'DELETE'
    };
  }

  static activateAd(adId: number): ApiTemplate<CarAd> {
    return {
      endpoint: `/api/autoria/ads/${adId}/activate/`,
      method: 'POST'
    };
  }

  static deactivateAd(adId: number): ApiTemplate<CarAd> {
    return {
      endpoint: `/api/autoria/ads/${adId}/deactivate/`,
      method: 'POST'
    };
  }

  /**
   * IMAGE MANAGEMENT TEMPLATES
   */
  static uploadAdImage(adId: number, imageData: { url: string; caption?: string; is_primary?: boolean }): ApiTemplate<CarAdImage> {
    return {
      endpoint: `/api/autoria/ads/${adId}/images/`,
      method: 'POST',
      body: imageData
    };
  }

  static deleteAdImage(adId: number, imageId: number): ApiTemplate<void> {
    return {
      endpoint: `/api/autoria/ads/${adId}/images/${imageId}/`,
      method: 'DELETE'
    };
  }

  static reorderAdImages(adId: number, imageIds: number[]): ApiTemplate<CarAdImage[]> {
    return {
      endpoint: `/api/autoria/ads/${adId}/images/reorder/`,
      method: 'POST',
      body: { image_ids: imageIds }
    };
  }

  /**
   * REFERENCE DATA TEMPLATES
   */
  static getVehicleTypes(): ApiTemplate<Array<{ id: number; name: string }>> {
    return {
      endpoint: '/api/autoria/reference/vehicle-types/',
      method: 'GET'
    };
  }

  static getBrands(vehicleTypeId?: number): ApiTemplate<Array<{ id: number; name: string }>> {
    return {
      endpoint: '/api/autoria/reference/brands/',
      method: 'GET',
      params: vehicleTypeId ? { vehicle_type_id: vehicleTypeId } : undefined
    };
  }

  static getModels(brandId: number): ApiTemplate<Array<{ id: number; name: string }>> {
    return {
      endpoint: '/api/autoria/reference/models/',
      method: 'GET',
      params: { brand_id: brandId }
    };
  }

  static getRegions(): ApiTemplate<Array<{ id: number; name: string }>> {
    return {
      endpoint: '/api/autoria/reference/regions/',
      method: 'GET'
    };
  }

  static getCities(regionId: number): ApiTemplate<Array<{ id: number; name: string }>> {
    return {
      endpoint: '/api/autoria/reference/cities/',
      method: 'GET',
      params: { region_id: regionId }
    };
  }

  /**
   * TEST DATA TEMPLATES
   */
  static generateTestAds(count: number, options?: { includeImages?: boolean; imageTypes?: string[] }): ApiTemplate<{ created: number; totalImages: number }> {
    return {
      endpoint: '/api/autoria/test-ads/generate/',
      method: 'POST',
      body: { count, ...options }
    };
  }

  static clearTestAds(): ApiTemplate<void> {
    return {
      endpoint: '/api/autoria/test-ads/clear/',
      method: 'POST'
    };
  }

  static getTestAdsStats(): ApiTemplate<{ total: number; withImages: number; withoutImages: number }> {
    return {
      endpoint: '/api/autoria/test-ads/stats/',
      method: 'GET'
    };
  }

  /**
   * USER MANAGEMENT TEMPLATES
   */
  static getUsers(): ApiTemplate<Array<{ id: number; email: string; is_superuser: boolean }>> {
    return {
      endpoint: '/api/autoria/users/',
      method: 'GET'
    };
  }

  static getUserProfile(userId?: number): ApiTemplate<{ id: number; email: string; is_superuser: boolean; account_type: string }> {
    return {
      endpoint: userId ? `/api/autoria/users/${userId}/` : '/api/autoria/users/me/',
      method: 'GET'
    };
  }

  /**
   * ANALYTICS TEMPLATES
   */
  static getAnalytics(filters?: { date_from?: string; date_to?: string; group_by?: string }): ApiTemplate<any> {
    return {
      endpoint: '/api/autoria/analytics/',
      method: 'GET',
      params: filters
    };
  }

  static getModerationAnalytics(): ApiTemplate<{ daily_stats: any[]; weekly_stats: any[] }> {
    return {
      endpoint: '/api/autoria/analytics/moderation/',
      method: 'GET'
    };
  }
}


