/**
 * HTTP Client - специализированный модуль для HTTP запросов
 * Выделен из helpers.ts для соблюдения принципа единственной ответственности
 */

import { getAuthorizationHeaders } from "@/common/constants/headers";
import { AuthClient } from './auth-client';
import { redirect } from "next/navigation";

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  cache?: RequestCache;
  retryCount?: number;
  maxRetries?: number;
}

export class HttpClient {
  /**
   * Выполнить HTTP запрос с автоматической обработкой ошибок и ретраями
   */
  static async request<T = any>(
    endpoint: string,
    options: HttpRequestOptions = {}
  ): Promise<T | null> {
    const {
      method = 'GET',
      body,
      headers = {},
      cache = 'no-store',
      retryCount = 0,
      maxRetries = 1
    } = options;

    try {
      console.log(`[HttpClient] ${method} ${endpoint}`);

      const urlSearchParams = new URLSearchParams();
      const url = `${endpoint}${urlSearchParams.toString() ? `?${urlSearchParams.toString()}` : ''}`;

      // Определяем ключ для токенов
      const authProvider = await this.getAuthProvider();
      const tokenKey = authProvider === 'dummy' ? "dummy_auth" : "backend_auth";

      const response = await fetch(url, {
        headers: await getAuthorizationHeaders(),
        method,
        body: body ? JSON.stringify(body) : undefined,
        cache
      });

      const result = await this.handleResponse(response, tokenKey);

      // Если токен обновился и это первая попытка, повторяем запрос
      if (!result && response.status === 401 && retryCount < maxRetries) {
        console.log(`[HttpClient] Token refreshed, retrying request (attempt ${retryCount + 1}/${maxRetries})...`);
        return this.request(endpoint, { ...options, retryCount: retryCount + 1 });
      }

      // Если после обновления токена все еще 401, не повторяем
      if (!result && response.status === 401 && retryCount >= maxRetries) {
        console.error('[HttpClient] Still got 401 after token refresh, stopping retry to prevent infinite loop');
        redirect("/login");
      }

      return result;

    } catch (error) {
      console.error("[HttpClient] Request error:", error);
      return null;
    }
  }

  /**
   * GET запрос
   */
  static async get<T = any>(endpoint: string, options: Omit<HttpRequestOptions, 'method'> = {}): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST запрос
   */
  static async post<T = any>(endpoint: string, body?: any, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT запрос
   */
  static async put<T = any>(endpoint: string, body?: any, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE запрос
   */
  static async delete<T = any>(endpoint: string, options: Omit<HttpRequestOptions, 'method'> = {}): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Обработка ответа с автоматическим обновлением токенов
   */
  private static async handleResponse(response: Response, tokenKey: string): Promise<any> {
    if (!response.ok) {
      const errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      console.error(errorMessage);

      switch (response.status) {
        case 401: {
          console.log("[HttpClient] Error 401: Token not valid. Attempting to refresh...");
          const refreshResult = await AuthClient.refreshTokens(tokenKey);
          if (!refreshResult) {
            console.log("[HttpClient] Refresh failed after all attempts, redirecting to login...");
            redirect("/login");
          }
          console.log("[HttpClient] Refresh successful, returning null to trigger retry");
          return null;
        }

        case 403:
          console.log("Error 403: Access denied. Redirecting...");
          redirect("/login");
          break;

        case 404:
          console.log("Error 404: Resource not found. Redirecting...");
          redirect("/error");
          break;

        default:
          console.log(`Error ${response.status} occurred. Redirecting...`);
          redirect("/error");
          break;
      }
    }

    return response.json();
  }

  /**
   * Получить текущий провайдер аутентификации
   */
  private static async getAuthProvider(): Promise<string> {
    try {
      const { RedisClient } = await import('./redis-client');
      return await RedisClient.get("auth_provider") || "backend";
    } catch {
      return "backend";
    }
  }
}
