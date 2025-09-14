import { AuthApiResponse, RecipesResponse } from "@/common/interfaces/api.interfaces";
import { IUsersResponse } from "@/common/interfaces/users.interfaces";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import { API_URLS, AuthProvider } from "@/common/constants/constants.ts";
import { getBaseUrl } from "@/utils/api/getBaseUrl";

import { fetchData } from "./common";

export const dummyApiHelpers = {
  auth: async (credentials: IDummyAuth): Promise<AuthApiResponse> => {
    try {
      console.log("[Dummy Auth] Starting authentication");
      
      const response = await fetch(`${API_URLS[AuthProvider.Dummy]}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          expiresInMins: credentials.expiresInMins
        }),
        cache: 'no-store'
      });

      console.log("[Dummy Auth] Response status:", response.status);
      
      const data = await response.json();
      console.log("[Dummy Auth] Response structure:", {
        hasAccessToken: Boolean(data.accessToken),
        hasRefreshToken: Boolean(data.refreshToken)
      });

      if (!response.ok) {
        return {
          data: undefined,
          error: data.message || 'Authentication failed',
          status: response.status
        };
      }

      const baseUrl = getBaseUrl();

      // Сохранение токенов в Redis
      const redisResponse = await fetch(`${baseUrl}/api/redis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "dummy_auth",
          value: JSON.stringify({
            access: data.accessToken,
            refresh: data.refreshToken,
            refreshAttempts: 0
          })
        }),
      });

      console.log("[Dummy Auth] Redis save response:", {
        status: redisResponse.status,
        ok: redisResponse.ok
      });

      if (!redisResponse.ok) {
        console.warn('[Dummy Auth] ⚠️ Failed to save to Redis, but continuing with authentication');
        // Не возвращаем ошибку, так как данные могут быть сохранены в memory storage
      }

      return {
        data: {
          access: data.accessToken,
          refresh: data.refreshToken,
          user: {
            id: data.id,
            email: data.email
          }
        },
        status: response.status
      };
    } catch (error) {
      console.error("[Dummy Auth] Error:", error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Authentication failed',
        status: 500
      };
    }
  },

  fetchUsers: async (params?: Record<string, string>) => {
    return fetchData<IUsersResponse>('users', {
      params,
      callbackUrl: "/users",
      redirectOnError: true
    });
  },

  fetchRecipes: async (params?: Record<string, string>) => {
    return fetchData<RecipesResponse>('products', {
      params,
      callbackUrl: "/recipes",
      redirectOnError: true
    });
  },

  fetchRecipeById: async (id: string) => {
    return fetchData(`products/${id}`, {
      redirectOnError: true,
      callbackUrl: "/recipes"
    });
  },

  fetchRecipesByTag: async (tag: string) => {
    return fetchData(`products/category/${tag}`, {
      redirectOnError: true,
      callbackUrl: "/recipes"
    });
  },

  refresh: async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/redis?key=dummy_auth');
      if (!response.ok) return false;

      const { value: authData } = await response.json();
      if (!authData) return false;

      const parsedData = typeof authData === "string" ? JSON.parse(authData) : authData;
      if (!parsedData.refresh) return false;

      // Проверяем количество попыток рефреша
      const currentAttempts = parsedData.refreshAttempts || 0;
      if (currentAttempts >= 1) {
        console.error("Maximum refresh attempts reached");
        return false;
      }

      const refreshResponse = await fetch(`${API_URLS[AuthProvider.Dummy]}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: parsedData.refresh,
          expiresInMins: 30
        }),
        cache: 'no-store'
      });

      if (!refreshResponse.ok) return false;

      const data = await refreshResponse.json();
      
      // Сохраняем новые токены и увеличиваем счетчик попыток
      await fetch("/api/redis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "dummy_auth",
          value: JSON.stringify({
            access: data.accessToken,
            refresh: data.refreshToken,
            refreshAttempts: currentAttempts + 1
          })
        }),
      });

      return true;
    } catch (error) {
      console.error("Dummy refresh token error:", error);
      return false;
    }
  }
};