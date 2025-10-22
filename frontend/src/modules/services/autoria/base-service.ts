import { AutoRiaApiTemplates, ApiTemplate } from '../../api/autoria/autoria-api-templates';
import { AutoRiaApiResponse, AutoRiaApiOptions } from '../../api/autoria/autoria.types';
import { CacheManager } from './cache-manager';

/**
 * Base Service Class with Best Practices
 * - Single Responsibility Principle
 * - Dependency Injection
 * - Error Handling
 * - Caching
 * - Logging
 * - Retry Logic
 */
export abstract class BaseService {
  protected apiTemplates: AutoRiaApiTemplates;
  protected cacheManager: CacheManager;
  protected readonly maxRetries = 3;
  protected readonly retryDelay = 1000;

  constructor() {
    this.apiTemplates = AutoRiaApiTemplates.getInstance();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * Execute API template with smart caching and retry logic
   */
  protected async executeWithCache<T>(
    template: ApiTemplate<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<AutoRiaApiResponse<T>> {
    // Check smart cache first
    if (cacheKey) {
      const cached = this.cacheManager.get<T>(cacheKey);
      if (cached) {
        this.log('cache_hit', { cacheKey, template: template.endpoint });
        return { success: true, data: cached };
      }
    }

    // Execute with retry logic
    return this.executeWithRetry(template, cacheKey, ttl);
  }

  /**
   * Execute API template with retry logic
   */
  private async executeWithRetry<T>(
    template: ApiTemplate<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<AutoRiaApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.log('api_request', { 
          attempt: attempt + 1, 
          endpoint: template.endpoint,
          method: template.method 
        });

        const result = await this.apiTemplates.execute(template);

        // Cache successful result with smart TTL
        if (result.success && cacheKey) {
          this.cacheManager.set(cacheKey, result.data, ttl);
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.log('retry_scheduled', { 
            attempt: attempt + 1, 
            delay, 
            error: lastError.message 
          });
          await this.sleep(delay);
        }
      }
    }

    this.log('api_failed', { 
      endpoint: template.endpoint, 
      attempts: this.maxRetries + 1, 
      error: lastError?.message 
    });

    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries',
      status: 0
    };
  }

  /**
   * Smart cache management
   */
  public clearCache(pattern?: string): void {
    const removed = this.cacheManager.clear(pattern);
    this.log('cache_cleared', { pattern, removed });
  }

  /**
   * Invalidate related caches
   */
  protected invalidateCache(type: string, id?: number): void {
    this.cacheManager.invalidateRelated(type, id);
    this.log('cache_invalidated', { type, id });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Retry logic
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * baseDelay;
    return Math.min(baseDelay + jitter, 10000); // Max 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging with structured data
   */
  protected log(level: string, data: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      service: this.constructor.name,
      level,
      ...data
    };

    if (level === 'error' || level === 'api_failed') {
      console.error(`[${this.constructor.name}]`, logData);
    } else if (level === 'warning' || level === 'retry_scheduled') {
      console.warn(`[${this.constructor.name}]`, logData);
    } else {
      console.log(`[${this.constructor.name}]`, logData);
    }
  }

  /**
   * Validation helpers
   */
  protected validateRequired<T>(data: T, fields: (keyof T)[]): void {
    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new Error(`Required field '${String(field)}' is missing`);
      }
    }
  }

  protected validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid ID: ${id}. Must be a positive integer.`);
    }
  }

  protected validatePagination(page: number, pageSize: number): void {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page: ${page}. Must be a positive integer.`);
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error(`Invalid pageSize: ${pageSize}. Must be between 1 and 100.`);
    }
  }

  /**
   * Data transformation helpers
   */
  protected transformResponse<T>(response: AutoRiaApiResponse<T>): T {
    if (!response.success) {
      throw new Error(response.error || 'API request failed');
    }
    return response.data!;
  }

  protected sanitizeFilters(filters: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Error handling
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.log('error', { context, message, error });
    throw new Error(`${context}: ${message}`);
  }

  /**
   * Performance monitoring
   */
  protected async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      this.log('performance', {
        operation: operationName,
        duration: Math.round(duration),
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.log('performance', {
        operation: operationName,
        duration: Math.round(duration),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
}
