/**
 * Сервис для работы с тестовыми объявлениями
 * 
 * Выносит логику из API routes в отдельный сервис
 * с параметризированными методами и обработкой ошибок
 */

import { NextRequest } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';
import { ApiProcedures, ApiProcedureOptions } from '@/utils/api/parameterized-helpers';
import { generateFullMockData } from '@/utils/mockData';
import { mapFormDataToApiData } from '@/utils/carAdDataMapper';
import type { CarAdFormData } from '@/types/autoria';

export interface TestAdsGenerationParams {
  count: number;
  includeImages: boolean;
  imageTypes: string[];
  userId?: number;
}

export interface TestAdsGenerationResult {
  success: boolean;
  created: number;
  totalImages: number;
  adsWithImages: number;
  adsWithoutImages: number;
  duration: string;
  details?: Array<{
    success: boolean;
    adId?: number;
    imagesCount?: number;
    error?: string;
  }>;
}

export interface TestAdsCleanupResult {
  success: boolean;
  deleted: number;
  message: string;
  duration: string;
  output?: string;
}

/**
 * Сервис для работы с тестовыми объявлениями
 */
export class TestAdsService {
  private static readonly DEFAULT_OPTIONS: ApiProcedureOptions = {
    enableCache: false,
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: true,
    enableValidation: true
  };

  /**
   * Генерирует тестовые объявления с изображениями
   */
  static async generateTestAds(
    request: NextRequest,
    params: TestAdsGenerationParams,
    options: ApiProcedureOptions = {}
  ): Promise<TestAdsGenerationResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log(`[TestAdsService] Generating ${params.count} test ads...`);

      // Валидация параметров
      this.validateGenerationParams(params);

      // Получаем пользователя
      const user = await this.getCurrentUser(request);
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Генерируем тестовые объявления
      const result = await this.createTestAdsWithImages(
        request,
        user.id,
        params.count,
        params.includeImages,
        params.imageTypes
      );

      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      const adsWithImages = result.details?.filter(d => d.success && d.imagesCount > 0).length || 0;
      const adsWithoutImages = result.created - adsWithImages;

      return {
        success: true,
        created: result.created,
        totalImages: result.totalImages || 0,
        adsWithImages,
        adsWithoutImages,
        duration,
        details: result.details
      };

    } catch (error) {
      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      console.error('[TestAdsService] Generation failed:', error);
      
      return {
        success: false,
        created: 0,
        totalImages: 0,
        adsWithImages: 0,
        adsWithoutImages: 0,
        duration,
        details: [{
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  /**
   * Очищает все тестовые объявления
   */
  static async cleanupTestAds(
    request: NextRequest,
    options: ApiProcedureOptions = {}
  ): Promise<TestAdsCleanupResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log('[TestAdsService] Starting cleanup...');

      // Получаем авторизационные заголовки
      const authHeaders = await this.getAuthHeaders(request);

      // Выполняем очистку через API
      const result = await ApiProcedures.delete('/api/ads/cars/cleanup-all', {
        ...opts,
        headers: authHeaders
      });

      const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

      if (result.success) {
        return {
          success: true,
          deleted: result.data?.deleted || 0,
          message: result.data?.message || 'Cleanup completed',
          duration,
          output: result.data?.output
        };
      } else {
        throw new Error(result.error || 'Cleanup failed');
      }

    } catch (error) {
      const duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      console.error('[TestAdsService] Cleanup failed:', error);
      
      return {
        success: false,
        deleted: 0,
        message: error instanceof Error ? error.message : 'Cleanup failed',
        duration
      };
    }
  }

  /**
   * Получает статистику тестовых объявлений
   */
  static async getTestAdsStats(
    request: NextRequest,
    options: ApiProcedureOptions = {}
  ): Promise<{
    success: boolean;
    totalAds: number;
    totalImages: number;
    adsWithImages: number;
    adsWithoutImages: number;
    error?: string;
  }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Получаем статистику через API
      const result = await ApiProcedures.get('/api/ads/quick-stats', {}, {
        ...opts,
        enableCache: true,
        cacheTtl: 60000 // 1 минута
      });

      if (result.success && result.data) {
        return {
          success: true,
          totalAds: result.data.totalAds || 0,
          totalImages: result.data.totalImages || 0,
          adsWithImages: result.data.adsWithImages || 0,
          adsWithoutImages: result.data.adsWithoutImages || 0
        };
      } else {
        throw new Error(result.error || 'Failed to get stats');
      }

    } catch (error) {
      console.error('[TestAdsService] Stats failed:', error);
      
      return {
        success: false,
        totalAds: 0,
        totalImages: 0,
        adsWithImages: 0,
        adsWithoutImages: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Валидация параметров генерации
   */
  private static validateGenerationParams(params: TestAdsGenerationParams): void {
    if (!params.count || params.count < 1 || params.count > 50) {
      throw new Error('Count must be between 1 and 50');
    }

    if (params.includeImages && (!params.imageTypes || params.imageTypes.length === 0)) {
      throw new Error('Image types must be specified when includeImages is true');
    }

    const validImageTypes = ['front', 'side', 'rear', 'interior'];
    if (params.imageTypes && !params.imageTypes.every(type => validImageTypes.includes(type))) {
      throw new Error(`Invalid image types. Valid types: ${validImageTypes.join(', ')}`);
    }
  }

  /**
   * Получает текущего пользователя
   */
  private static async getCurrentUser(request: NextRequest): Promise<{ id: number } | null> {
    try {
      const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
      if (!isAuthenticated) {
        return null;
      }

      // Здесь можно добавить получение пользователя из токенов
      // Пока что возвращаем тестового пользователя
      return { id: 1 };
    } catch (error) {
      console.error('[TestAdsService] Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Получает авторизационные заголовки
   */
  private static async getAuthHeaders(request: NextRequest): Promise<Record<string, string>> {
    try {
      const tokens = await ServerAuthManager.getTokensFromRedis(request);
      if (!tokens) {
        throw new Error('No authentication tokens available');
      }

      return {
        'Authorization': `Bearer ${tokens.access}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('[TestAdsService] Failed to get auth headers:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Создает тестовые объявления с изображениями
   */
  private static async createTestAdsWithImages(
    request: NextRequest,
    userId: number,
    count: number,
    includeImages: boolean,
    imageTypes: string[]
  ): Promise<{
    created: number;
    totalImages: number;
    details: Array<{
      success: boolean;
      adId?: number;
      imagesCount?: number;
      error?: string;
    }>;
  }> {
    const details: Array<{
      success: boolean;
      adId?: number;
      imagesCount?: number;
      error?: string;
    }> = [];

    let totalImages = 0;

    for (let i = 0; i < count; i++) {
      try {
        // Генерируем мок данные
        const mockData = generateFullMockData();
        const carData = mapFormDataToApiData(mockData as CarAdFormData);

        // Создаем объявление
        const adResult = await this.createCarAd(request, carData, userId);
        
        if (adResult.success && adResult.adId) {
          let imagesCount = 0;

          // Генерируем изображения если нужно
          if (includeImages && imageTypes.length > 0) {
            const imageResult = await this.generateCarImages(
              request,
              adResult.adId,
              imageTypes
            );
            imagesCount = imageResult.imagesCount || 0;
            totalImages += imagesCount;
          }

          details.push({
            success: true,
            adId: adResult.adId,
            imagesCount
          });
        } else {
          details.push({
            success: false,
            error: adResult.error || 'Failed to create ad'
          });
        }

      } catch (error) {
        details.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      created: details.filter(d => d.success).length,
      totalImages,
      details
    };
  }

  /**
   * Создает объявление автомобиля
   */
  private static async createCarAd(
    request: NextRequest,
    carData: any,
    userId: number
  ): Promise<{ success: boolean; adId?: number; error?: string }> {
    try {
      const authHeaders = await this.getAuthHeaders(request);
      
      const result = await ApiProcedures.create('/api/ads/cars/', {
        ...carData,
        user: userId
      }, {
        headers: authHeaders,
        enableRetry: true,
        maxRetries: 2
      });

      if (result.success && result.data) {
        return {
          success: true,
          adId: result.data.id
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create ad'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Генерирует изображения для автомобиля
   */
  private static async generateCarImages(
    request: NextRequest,
    adId: number,
    imageTypes: string[]
  ): Promise<{ imagesCount: number; error?: string }> {
    try {
      const authHeaders = await this.getAuthHeaders(request);
      
      const result = await ApiProcedures.create('/api/car-images/generate', {
        car_ad_id: adId,
        angles: imageTypes
      }, {
        headers: authHeaders,
        enableRetry: true,
        maxRetries: 2
      });

      if (result.success && result.data) {
        return {
          imagesCount: result.data.images?.length || 0
        };
      } else {
        return {
          imagesCount: 0,
          error: result.error || 'Failed to generate images'
        };
      }

    } catch (error) {
      return {
        imagesCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
