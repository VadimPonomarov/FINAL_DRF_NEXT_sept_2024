"use client";

import { AuthProvider } from "@/common/constants/constants";

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

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private useProxy: boolean;

  constructor(options: ApiClientOptions = {}) {
    // Use environment variable for backend URL
    const defaultBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    this.useProxy = false; // Direct backend requests
    this.baseUrl = options.baseUrl || defaultBaseUrl;
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 1;

    console.log(`[ApiClient] Initialized with baseUrl: ${this.baseUrl}`);
  }

  /**
   * Получает токены из Redis
   */
  private async getTokens(): Promise<{ access?: string; refresh?: string } | null> {
    try {
      const response = await fetch('/api/redis?key=backend_auth');
      if (!response.ok) return null;

      const data = await response.json();
      if (!data?.value) return null;

      const authData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return {
        access: authData.access,
        refresh: authData.refresh
      };
    } catch (error) {
      console.error('[ApiClient] Error getting tokens:', error);
      return null;
    }
  }

  /**
   * Обновляет токены через API
   */
  private async refreshTokens(): Promise<boolean> {
    try {
      console.log('[ApiClient] Refreshing tokens...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error('[ApiClient] Token refresh failed:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('[ApiClient] Token refresh successful');
      return !!data.access;
    } catch (error) {
      console.error('[ApiClient] Error refreshing tokens:', error);
      return false;
    }
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

    // Добавляем токен авторизации (если не пропускаем авторизацию)
    if (!skipAuth) {
      const tokens = await this.getTokens();
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

      // Если получили 401 и не пропускаем повтор, пытаемся обновить токены
      if (response.status === 401 && !skipAuth && !skipRetry) {
        console.log('[ApiClient] Got 401, attempting token refresh...');
        
        const refreshSuccess = await this.refreshTokens();
        if (refreshSuccess) {
          console.log('[ApiClient] Token refreshed, retrying request...');
          // Повторяем запрос с новыми токенами
          return this.request<T>(endpoint, { ...options, skipRetry: true });
        } else {
          console.error('[ApiClient] Token refresh failed, redirecting to login');
          // Можно добавить редирект на страницу логина
          throw new Error('Authentication failed');
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ApiClient] Request failed: ${response.status} ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  // Удобные методы для разных HTTP методов
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
      skipAuth: true // Не добавляем токены для запроса аутентификации
    });
  }
}

// Создаем единственный экземпляр клиента
export const apiClient = new ApiClient();

// Экспортируем класс для создания дополнительных экземпляров при необходимости
export default ApiClient;
