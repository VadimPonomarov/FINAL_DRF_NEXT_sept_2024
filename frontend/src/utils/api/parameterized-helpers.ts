/**
 * Параметризированные хелперы по типу процедур с параметрами
 * 
 * Этот модуль предоставляет унифицированные хелперы для API запросов
 * с параметрами, валидацией, кэшированием и обработкой ошибок
 */

import { NextRequest } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';
import { handleClientAuth } from '../auth/universalAuthHandler';

// Типы для параметров процедур
export interface ApiProcedureParams {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  timeout?: number;
}

export interface ApiProcedureOptions {
  /** Включить кэширование */
  enableCache?: boolean;
  /** TTL кэша в миллисекундах */
  cacheTtl?: number;
  /** Ключ кэша */
  cacheKey?: string;
  /** Включить retry логику */
  enableRetry?: boolean;
  /** Максимальное количество попыток */
  maxRetries?: number;
  /** Задержка между попытками */
  retryDelay?: number;
  /** Включить логирование */
  enableLogging?: boolean;
  /** Включить валидацию */
  enableValidation?: boolean;
  /** Схема валидации */
  validationSchema?: any;
}

export interface ApiProcedureResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  cached?: boolean;
  retries?: number;
  duration?: number;
}

/**
 * Базовый класс для параметризированных API процедур
 */
export class ApiProcedure {
  private static readonly DEFAULT_OPTIONS: Required<ApiProcedureOptions> = {
    enableCache: false,
    cacheTtl: 300000, // 5 минут
    cacheKey: '',
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: true,
    enableValidation: false,
    validationSchema: null
  };

  /**
   * Выполняет API процедуру с параметрами
   */
  static async execute<T = any>(
    params: ApiProcedureParams,
    options: ApiProcedureOptions = {}
  ): Promise<ApiProcedureResult<T>> {
    const startTime = performance.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (opts.enableLogging) {
      console.log(`[ApiProcedure] Executing ${params.method || 'GET'} ${params.endpoint}`);
    }

    try {
      // Валидация параметров
      if (opts.enableValidation) {
        this.validateParams(params, opts.validationSchema);
      }

      // Проверка кэша
      if (opts.enableCache && opts.cacheKey) {
        const cached = this.getFromCache<T>(opts.cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
            duration: performance.now() - startTime
          };
        }
      }

      // Выполнение запроса с retry логикой
      const result = await this.executeWithRetry(params, opts);
      
      // Сохранение в кэш при успехе
      if (result.success && opts.enableCache && opts.cacheKey) {
        this.setCache(opts.cacheKey, result.data, opts.cacheTtl);
      }

      return {
        ...result,
        duration: performance.now() - startTime
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (opts.enableLogging) {
        console.error(`[ApiProcedure] Error: ${errorMessage}`);
      }

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Выполняет запрос с retry логикой
   */
  private static async executeWithRetry<T>(
    params: ApiProcedureParams,
    options: Required<ApiProcedureOptions>
  ): Promise<ApiProcedureResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        if (options.enableLogging && attempt > 0) {
          console.log(`[ApiProcedure] Retry attempt ${attempt}/${options.maxRetries}`);
        }

        const response = await this.makeRequest(params);
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data,
            retries: attempt
          };
        }

        // Обработка ошибок HTTP
        if (response.status === 401 && options.enableRetry) {
          // Попытка обновления токенов через универсальный обработчик
          const retryResponse = await handleClientAuth(params.endpoint, {
            method: params.method || 'GET',
            body: params.body ? JSON.stringify(params.body) : undefined,
            headers: {
              'Content-Type': 'application/json',
              ...params.headers
            }
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return {
              success: true,
              data,
              retries: attempt
            };
          }
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < options.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, options.retryDelay);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries',
      retries: options.maxRetries
    };
  }

  /**
   * Выполняет HTTP запрос
   */
  private static async makeRequest(params: ApiProcedureParams): Promise<Response> {
    const url = new URL(params.endpoint, process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');
    
    // Добавляем query параметры
    if (params.query) {
      Object.entries(params.query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers = await getAuthorizationHeaders();
    
    return fetch(url.toString(), {
      method: params.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...params.headers
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
      cache: params.cache || 'no-store'
    });
  }

  /**
   * Валидация параметров
   */
  private static validateParams(params: ApiProcedureParams, schema?: any): void {
    if (!params.endpoint) {
      throw new Error('Endpoint is required');
    }

    if (schema) {
      // Здесь можно добавить валидацию по схеме (например, с помощью Joi или Yup)
      // Пока что базовая валидация
      if (params.method === 'POST' || params.method === 'PUT' || params.method === 'PATCH') {
        if (!params.body) {
          throw new Error('Body is required for POST/PUT/PATCH requests');
        }
      }
    }
  }

  /**
   * Расчет задержки для retry
   */
  private static calculateRetryDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, 10000); // Max 10 seconds
  }

  /**
   * Задержка
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Работа с кэшем
   */
  private static getFromCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`api_cache_${key}`);
      if (cached) {
        const { data, expires } = JSON.parse(cached);
        if (Date.now() < expires) {
          return data;
        } else {
          localStorage.removeItem(`api_cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('[ApiProcedure] Cache read error:', error);
    }
    return null;
  }

  private static setCache<T>(key: string, data: T, ttl: number): void {
    try {
      const expires = Date.now() + ttl;
      localStorage.setItem(`api_cache_${key}`, JSON.stringify({ data, expires }));
    } catch (error) {
      console.warn('[ApiProcedure] Cache write error:', error);
    }
  }
}

/**
 * Специализированные процедуры для разных типов операций
 */
export class ApiProcedures {
  /**
   * Процедура для получения данных (GET)
   */
  static async get<T = any>(
    endpoint: string,
    query?: Record<string, string | number | boolean>,
    options?: ApiProcedureOptions
  ): Promise<ApiProcedureResult<T>> {
    return ApiProcedure.execute<T>({
      endpoint,
      method: 'GET',
      query
    }, options);
  }

  /**
   * Процедура для создания данных (POST)
   */
  static async create<T = any>(
    endpoint: string,
    body: any,
    options?: ApiProcedureOptions
  ): Promise<ApiProcedureResult<T>> {
    return ApiProcedure.execute<T>({
      endpoint,
      method: 'POST',
      body
    }, options);
  }

  /**
   * Процедура для обновления данных (PUT)
   */
  static async update<T = any>(
    endpoint: string,
    body: any,
    options?: ApiProcedureOptions
  ): Promise<ApiProcedureResult<T>> {
    return ApiProcedure.execute<T>({
      endpoint,
      method: 'PUT',
      body
    }, options);
  }

  /**
   * Процедура для частичного обновления (PATCH)
   */
  static async patch<T = any>(
    endpoint: string,
    body: any,
    options?: ApiProcedureOptions
  ): Promise<ApiProcedureResult<T>> {
    return ApiProcedure.execute<T>({
      endpoint,
      method: 'PATCH',
      body
    }, options);
  }

  /**
   * Процедура для удаления данных (DELETE)
   */
  static async delete<T = any>(
    endpoint: string,
    options?: ApiProcedureOptions
  ): Promise<ApiProcedureResult<T>> {
    return ApiProcedure.execute<T>({
      endpoint,
      method: 'DELETE'
    }, options);
  }

  /**
   * Процедура для массовых операций
   */
  static async bulk<T = any>(
    endpoint: string,
    operations: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: any;
      id?: string | number;
    }>,
    options?: ApiProcedureOptions
  ): Promise<ApiProcedureResult<T[]>> {
    const results: T[] = [];
    const errors: string[] = [];

    for (const operation of operations) {
      try {
        const result = await ApiProcedure.execute<T>({
          endpoint: operation.id ? `${endpoint}/${operation.id}` : endpoint,
          method: operation.method,
          body: operation.data
        }, options);

        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push(result.error || 'Unknown error');
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }
}

/**
 * Утилиты для работы с API процедурами
 */
export class ApiProcedureUtils {
  /**
   * Создает параметры для пагинации
   */
  static createPaginationParams(page: number, pageSize: number, maxPageSize: number = 100) {
    return {
      page: Math.max(1, page),
      page_size: Math.min(maxPageSize, Math.max(1, pageSize))
    };
  }

  /**
   * Создает параметры для фильтрации
   */
  static createFilterParams(filters: Record<string, any>) {
    const params: Record<string, string> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });
    
    return params;
  }

  /**
   * Создает параметры для сортировки
   */
  static createSortParams(sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') {
    return {
      sort_by: sortBy,
      sort_order: sortOrder
    };
  }

  /**
   * Создает кэш ключ на основе параметров
   */
  static createCacheKey(endpoint: string, params?: Record<string, any>): string {
    const baseKey = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    if (params) {
      const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}_${value}`)
        .join('_');
      return `${baseKey}_${paramString}`;
    }
    return baseKey;
  }
}
