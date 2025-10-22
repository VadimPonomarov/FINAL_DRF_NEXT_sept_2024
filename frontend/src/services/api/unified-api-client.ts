/**
 * Унифицированный API клиент
 * 
 * Предоставляет единый интерфейс для работы с различными API endpoints
 * с автоматической обработкой аутентификации, кэширования и ошибок
 */

import { NextRequest } from 'next/server';
import { ApiProcedures, ApiProcedureOptions, ApiProcedureParams } from '@/utils/api/parameterized-helpers';
import { ServerAuthManager } from '@/utils/auth/serverAuth';
import { handleClientAuth } from '@/utils/auth/universalAuthHandler';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryOn: number[];
  };
  cacheConfig?: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
  };
}

export interface ApiRequestOptions extends ApiProcedureOptions {
  /** Использовать серверную аутентификацию */
  useServerAuth?: boolean;
  /** Пользовательские заголовки */
  customHeaders?: Record<string, string>;
  /** Таймаут запроса */
  timeout?: number;
}

/**
 * Унифицированный API клиент
 */
export class UnifiedApiClient {
  private config: ApiClientConfig;
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        retryOn: [500, 502, 503, 504]
      },
      cacheConfig: {
        enabled: false,
        defaultTtl: 300000,
        maxSize: 100
      },
      ...config
    };
  }

  /**
   * GET запрос
   */
  async get<T = any>(
    endpoint: string,
    query?: Record<string, any>,
    options: ApiRequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    return this.request<T>({
      endpoint: this.buildUrl(endpoint),
      method: 'GET',
      query: this.serializeQuery(query)
    }, options);
  }

  /**
   * POST запрос
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: ApiRequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    return this.request<T>({
      endpoint: this.buildUrl(endpoint),
      method: 'POST',
      body
    }, options);
  }

  /**
   * PUT запрос
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: ApiRequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    return this.request<T>({
      endpoint: this.buildUrl(endpoint),
      method: 'PUT',
      body
    }, options);
  }

  /**
   * PATCH запрос
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: ApiRequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    return this.request<T>({
      endpoint: this.buildUrl(endpoint),
      method: 'PATCH',
      body
    }, options);
  }

  /**
   * DELETE запрос
   */
  async delete<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    return this.request<T>({
      endpoint: this.buildUrl(endpoint),
      method: 'DELETE'
    }, options);
  }

  /**
   * Универсальный запрос
   */
  async request<T = any>(
    params: ApiProcedureParams,
    options: ApiRequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    try {
      // Проверяем кэш
      if (this.config.cacheConfig?.enabled && !options.enableCache === false) {
        const cacheKey = this.getCacheKey(params);
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          return { success: true, data: cached };
        }
      }

      // Подготавливаем заголовки
      const headers = await this.prepareHeaders(options);

      // Выполняем запрос
      const result = await this.executeRequest<T>({
        ...params,
        headers: {
          ...this.config.defaultHeaders,
          ...headers,
          ...params.headers
        }
      }, options);

      // Сохраняем в кэш при успехе
      if (result.success && this.config.cacheConfig?.enabled && !options.enableCache === false) {
        const cacheKey = this.getCacheKey(params);
        this.setCache(cacheKey, result.data, options.cacheTtl || this.config.cacheConfig.defaultTtl);
      }

      return result;

    } catch (error) {
      console.error('[UnifiedApiClient] Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Выполняет запрос с retry логикой
   */
  private async executeRequest<T>(
    params: ApiProcedureParams,
    options: ApiRequestOptions
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    const maxRetries = options.maxRetries || this.config.retryConfig!.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (options.useServerAuth) {
          // Серверная аутентификация
          return await this.executeServerRequest<T>(params, options);
        } else {
          // Клиентская аутентификация
          return await this.executeClientRequest<T>(params, options);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Проверяем, нужно ли повторять запрос
        if (attempt < maxRetries && this.shouldRetry(error, attempt)) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries'
    };
  }

  /**
   * Выполняет запрос с серверной аутентификацией
   */
  private async executeServerRequest<T>(
    params: ApiProcedureParams,
    options: ApiRequestOptions
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    // Здесь нужно передать NextRequest, но в текущей архитектуре это сложно
    // Поэтому используем клиентскую аутентификацию как fallback
    return this.executeClientRequest<T>(params, options);
  }

  /**
   * Выполняет запрос с клиентской аутентификацией
   */
  private async executeClientRequest<T>(
    params: ApiProcedureParams,
    options: ApiRequestOptions
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    const response = await handleClientAuth(params.endpoint, {
      method: params.method || 'GET',
      body: params.body ? JSON.stringify(params.body) : undefined,
      headers: params.headers
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      };
    }
  }

  /**
   * Подготавливает заголовки для запроса
   */
  private async prepareHeaders(options: ApiRequestOptions): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.customHeaders
    };

    // Добавляем авторизационные заголовки если нужно
    if (options.useServerAuth) {
      // Здесь можно добавить логику для серверной аутентификации
    }

    return headers;
  }

  /**
   * Строит полный URL
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const baseUrl = this.config.baseUrl.endsWith('/') 
      ? this.config.baseUrl.slice(0, -1) 
      : this.config.baseUrl;
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseUrl}${cleanEndpoint}`;
  }

  /**
   * Сериализует query параметры
   */
  private serializeQuery(query?: Record<string, any>): Record<string, string> | undefined {
    if (!query) return undefined;
    
    const serialized: Record<string, string> = {};
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        serialized[key] = String(value);
      }
    });
    
    return serialized;
  }

  /**
   * Определяет, нужно ли повторять запрос
   */
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.retryConfig!.maxRetries) {
      return false;
    }

    // Проверяем статус код
    if (error.status && this.config.retryConfig!.retryOn.includes(error.status)) {
      return true;
    }

    // Проверяем тип ошибки
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true;
    }

    return false;
  }

  /**
   * Рассчитывает задержку для retry
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryConfig!.retryDelay;
    const delay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, 10000); // Max 10 seconds
  }

  /**
   * Задержка
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Работа с кэшем
   */
  private getCacheKey(params: ApiProcedureParams): string {
    const key = `${params.method || 'GET'}_${params.endpoint}`;
    if (params.query) {
      const queryString = Object.entries(params.query)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      return `${key}_${queryString}`;
    }
    return key;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    // Очищаем старые записи если кэш переполнен
    if (this.cache.size >= this.config.cacheConfig!.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  /**
   * Очищает кэш
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Получает статистику кэша
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheConfig!.maxSize,
      hitRate: 0 // Можно добавить подсчет hit rate
    };
  }
}

/**
 * Фабрика для создания API клиентов
 */
export class ApiClientFactory {
  /**
   * Создает клиент для Backend API
   */
  static createBackendClient(): UnifiedApiClient {
    return new UnifiedApiClient({
      baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        retryOn: [500, 502, 503, 504]
      },
      cacheConfig: {
        enabled: true,
        defaultTtl: 300000, // 5 минут
        maxSize: 100
      }
    });
  }

  /**
   * Создает клиент для Dummy API
   */
  static createDummyClient(): UnifiedApiClient {
    return new UnifiedApiClient({
      baseUrl: process.env.NEXT_PUBLIC_DUMMY_BACKEND_URL || 'http://localhost:8001',
      timeout: 15000,
      retryConfig: {
        maxRetries: 2,
        retryDelay: 500,
        retryOn: [500, 502, 503]
      },
      cacheConfig: {
        enabled: true,
        defaultTtl: 600000, // 10 минут
        maxSize: 50
      }
    });
  }

  /**
   * Создает клиент для внешних API
   */
  static createExternalClient(baseUrl: string): UnifiedApiClient {
    return new UnifiedApiClient({
      baseUrl,
      timeout: 10000,
      retryConfig: {
        maxRetries: 2,
        retryDelay: 1000,
        retryOn: [500, 502, 503, 504]
      },
      cacheConfig: {
        enabled: false
      }
    });
  }
}
