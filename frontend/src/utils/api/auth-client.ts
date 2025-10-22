/**
 * Auth Client - специализированный модуль для аутентификации
 * Выделен из helpers.ts для соблюдения принципа единственной ответственности
 */

import { API_URLS, AuthProvider } from "@/common/constants/constants";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import { IBackendAuthCredentials, AuthResponse } from "@/common/interfaces/auth.interfaces";
import { RedisClient } from './redis-client';

export class AuthClient {
  /**
   * Аутентификация пользователя
   */
  static async authenticate(
    credentials: IDummyAuth | IBackendAuthCredentials
  ): Promise<AuthResponse> {
    console.log('[AuthClient] Function called with credentials:', credentials);
    
    try {
      const isDummyAuth = (cred: IDummyAuth | IBackendAuthCredentials): cred is IDummyAuth => {
        return "username" in cred;
      };

      const isUsingDummyAuth = isDummyAuth(credentials);
      console.log(`[AuthClient] Auth type: ${isUsingDummyAuth ? 'Dummy' : 'Backend'}`);

      // Формируем endpoint
      let endpoint: string;
      if (isUsingDummyAuth) {
        endpoint = `${API_URLS[AuthProvider.Dummy]}/auth/login`;
      } else {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs];
        endpoint = `${backendUrl}/api/auth/login`;
        console.log(`[AuthClient] Using endpoint: ${endpoint}`);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Сохраняем токены в Redis
      const redisKey = isUsingDummyAuth ? "dummy_auth" : "backend_auth";
      const tokenData = isUsingDummyAuth
        ? { access_token: data.access_token, refresh_token: data.refresh_token }
        : { access_token: data.access, refresh_token: data.refresh };

      await RedisClient.set(redisKey, JSON.stringify(tokenData));
      await RedisClient.set("auth_provider", isUsingDummyAuth ? AuthProvider.Dummy : AuthProvider.MyBackendDocs);

      console.log(`[AuthClient] Tokens saved to Redis with key: ${redisKey}`);
      return data;

    } catch (error) {
      console.error('[AuthClient] Authentication error:', error);
      throw error;
    }
  }

  /**
   * Обновление токенов
   */
  static async refreshTokens(key: string = "backend_auth", maxAttempts: number = 3): Promise<boolean> {
    console.log(`[AuthClient] Refreshing tokens for key: ${key}, attempts: ${maxAttempts}`);
    
    try {
      const tokenData = await RedisClient.get(key);
      if (!tokenData) {
        console.log(`[AuthClient] No token data found for key: ${key}`);
        return false;
      }

      const tokens = JSON.parse(tokenData);
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        console.log(`[AuthClient] No refresh token found for key: ${key}`);
        return false;
      }

      // Определяем endpoint для обновления токенов
      const authProvider = await RedisClient.get("auth_provider") || AuthProvider.MyBackendDocs;
      let refreshEndpoint: string;

      if (authProvider === AuthProvider.Dummy) {
        refreshEndpoint = `${API_URLS[AuthProvider.Dummy]}/auth/refresh`;
      } else {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs];
        refreshEndpoint = `${backendUrl}/api/auth/refresh`;
      }

      const response = await fetch(refreshEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: "no-store",
      });

      if (!response.ok) {
        console.log(`[AuthClient] Refresh failed with status: ${response.status}`);
        if (maxAttempts > 1) {
          console.log(`[AuthClient] Retrying refresh, attempts left: ${maxAttempts - 1}`);
          return this.refreshTokens(key, maxAttempts - 1);
        }
        return false;
      }

      const newTokens = await response.json();
      const updatedTokenData = authProvider === AuthProvider.Dummy
        ? { access_token: newTokens.access_token, refresh_token: newTokens.refresh_token }
        : { access_token: newTokens.access, refresh_token: newTokens.refresh };

      await RedisClient.set(key, JSON.stringify(updatedTokenData));
      console.log(`[AuthClient] Tokens refreshed successfully for key: ${key}`);
      return true;

    } catch (error) {
      console.error(`[AuthClient] Token refresh error for key ${key}:`, error);
      if (maxAttempts > 1) {
        console.log(`[AuthClient] Retrying refresh after error, attempts left: ${maxAttempts - 1}`);
        return this.refreshTokens(key, maxAttempts - 1);
      }
      return false;
    }
  }

  /**
   * Выход из системы
   */
  static async logout(): Promise<boolean> {
    try {
      // Очищаем все токены
      await RedisClient.delete("backend_auth");
      await RedisClient.delete("dummy_auth");
      await RedisClient.delete("auth_provider");
      
      console.log('[AuthClient] Logout successful');
      return true;
    } catch (error) {
      console.error('[AuthClient] Logout error:', error);
      return false;
    }
  }
}
