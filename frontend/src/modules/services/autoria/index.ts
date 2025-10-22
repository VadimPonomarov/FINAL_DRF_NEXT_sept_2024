/**
 * AutoRia Services Module
 * Centralized export of all AutoRia services with best practices
 */

// Base service
export { BaseService } from './base-service';

// Cache management
export { CacheManager } from './cache-manager';

// Specialized services
export { ModerationService } from './moderation-service';
export { SearchService } from './search-service';

// Service instances (singletons)
export const moderationService = ModerationService.getInstance();
export const searchService = SearchService.getInstance();
export const cacheManager = CacheManager.getInstance();

// Service factory for dependency injection
export class ServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getService<T>(serviceClass: new () => T): T {
    const className = serviceClass.name;
    
    if (!this.instances.has(className)) {
      this.instances.set(className, new serviceClass());
    }
    
    return this.instances.get(className);
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}

// Utility functions for service management
export const ServiceUtils = {
  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    cacheManager.clear();
  },

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheManager.getStats();
  },

  /**
   * Preload common data
   */
  async preloadCommonData(): Promise<void> {
    try {
      // Preload moderation stats
      await moderationService.getStats();
      
      // Preload reference data if needed
      // This would be implemented based on actual usage patterns
      
      console.log('[ServiceUtils] Common data preloaded successfully');
    } catch (error) {
      console.warn('[ServiceUtils] Failed to preload common data:', error);
    }
  },

  /**
   * Warm up caches
   */
  async warmUpCaches(): Promise<void> {
    try {
      await cacheManager.preloadFrequentData();
      await cacheManager.warmUpCache();
      console.log('[ServiceUtils] Caches warmed up successfully');
    } catch (error) {
      console.warn('[ServiceUtils] Failed to warm up caches:', error);
    }
  },

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    cache: any;
  }> {
    const services: Record<string, boolean> = {};
    
    try {
      // Test moderation service
      await moderationService.getStats();
      services.moderation = true;
    } catch {
      services.moderation = false;
    }

    try {
      // Test search service
      await searchService.searchAds({ page: 1, page_size: 1 });
      services.search = true;
    } catch {
      services.search = false;
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      cache: cacheManager.getStats()
    };
  }
};


