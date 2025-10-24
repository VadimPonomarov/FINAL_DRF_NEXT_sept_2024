"use client";

import { tokenManager } from './tokenManager';
import { unifiedErrorHandler } from '@/utils/errors/unifiedErrorHandler';

interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  skipAuth?: boolean;
  skipRetry?: boolean;
}

/**
 * HTTP клиент для работы с API
 * Отвечает за: выполнение HTTP запросов, автоматическую авторизацию, retry логику
 */
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private useProxy: boolean;

  constructor(options: ApiClientOptions = {}) {
    const defaultBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    this.useProxy = false;
    this.baseUrl = options.baseUrl || defaultBaseUrl;
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 1;

    console.log(`[ApiClient] Initialized with baseUrl: ${this.baseUrl}`);
  }

  /**
   * Выполняет HTTP запрос с автоматическим управлением токенами
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      skipAuth = false,
      skipRetry = false
    } = options;

    // Подготавливаем заголовки
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Добавляем токен авторизации
    if (!skipAuth) {
      const tokens = await tokenManager.getTokens();
      if (tokens?.access) {
        requestHeaders['Authorization'] = `Bearer ${tokens.access}`;
      }
    }

    // Подготавливаем URL
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    // Создаем контроллер для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`[ApiClient] ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Если запрос успешен - возвращаем данные
      if (response.ok) {
        const data = await response.json();
        return data;
      }

      // Используем универсальный обработчик для ВСЕХ ошибок
      if (!skipRetry) {
        console.log(`[ApiClient] Got error ${response.status}, delegating to unified error handler...`);

        const result = await unifiedErrorHandler.handleHttpError(response, {
          retryCallback: async () => {
            // Retry запроса с skipRetry, чтобы избежать бесконечной рекурсии
            const retryResponse = await fetch(url, {
              method,
              headers: requestHeaders,
              body: body ? JSON.stringify(body) : undefined,
            });
            return retryResponse;
          },
          source: 'ApiClient',
          currentPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
          showToast: true,
          maxRetries: response.status >= 500 ? 2 : 1
        });

        // Если retry успешен - возвращаем данные
        if (result.retryResult && result.retryResult.ok) {
          const data = await result.retryResult.json();
          return data;
        }

        // Если retry неуспешен - пробрасываем ошибку
        if (result.shouldAbort) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      // Fallback для skipRetry
      const errorText = await response.text();
      console.error(`[ApiClient] Request failed: ${response.status} ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Обработка timeout ошибок
      if (error instanceof Error && error.name === 'AbortError') {
        await unifiedErrorHandler.handleNetworkError(
          new Error('Request timeout'),
          {
            source: 'ApiClient',
            showToast: true,
            customMessage: 'Превышено время ожидания запроса'
          }
        );
        throw new Error('Request timeout');
      }
      
      // Обработка сетевых ошибок
      if (error instanceof TypeError && error.message.includes('fetch')) {
        await unifiedErrorHandler.handleNetworkError(
          error,
          {
            source: 'ApiClient',
            showToast: true
          }
        );
      }
      
      throw error;
    }
  }

  // === УДОБНЫЕ HTTP МЕТОДЫ ===

  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Специальный метод для аутентификации (без токенов)
  async auth<T>(credentials: { email: string; password: string }): Promise<T> {
    return this.request<T>('/api/auth/login', {
      method: 'POST',
      body: credentials,
      skipAuth: true
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Экспортируем класс для создания дополнительных экземпляров
export default ApiClient;
